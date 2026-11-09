import { Query } from "node-appwrite";
import { DB, T, TermineStore, atomic, newId, newToken, tokenHash, type Row } from "./store";
import { loadSettings, type AppointmentRow } from "./booking";
import { addMinutesUtc } from "./time";
import {
    bookingRequestEmail,
    confirmationEmail,
    buildIcs,
    markOutboxFailed,
    markOutboxSent,
    resendSender,
    type EmailMessage,
    type MailSender,
    type OutboxRow,
} from "./notify";
import { getSiteUrl } from "../env";

type PreparedMessage = Omit<EmailMessage, "html">;
interface Payload {
    manageToken?: string;
    startUtc?: string;
    message?: PreparedMessage;
    ownerMessage?: PreparedMessage;
}
function textMessage(message: EmailMessage): PreparedMessage {
    const { html: _html, ...rest } = message;
    return rest;
}
function htmlMessage(message: PreparedMessage): EmailMessage {
    return {
        ...message,
        html: `<p>${message.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`,
    };
}

/** Both inline delivery and cron use the same leased outbox and provider keys. */
export async function deliverJob(
    store: TermineStore,
    id: string,
    sender: MailSender,
): Promise<"sent" | "queued" | "skipped"> {
    let claimed: { job: OutboxRow; payload: Payload } | null;
    try {
        claimed = await atomic(store.db, store.userId, async (tx) => {
            const job = await tx.own<Row & OutboxRow>(T.OUTBOX, id);
            if (job.status !== "pending" || (job.nextAttemptAt && Date.parse(job.nextAttemptAt) > Date.now()))
                return null;
            if (job.attempts >= 8) {
                await tx.db.updateDocument(
                    DB,
                    T.OUTBOX,
                    id,
                    { status: "failed" },
                    undefined,
                    tx.transactionId,
                );
                return null;
            }
            const appt = await tx.own<AppointmentRow>(T.APPOINTMENTS, job.appointmentId),
                settings = await loadSettings(tx);
            if (!settings) throw new Error("Booking settings unavailable");
            const payload: Payload = JSON.parse(job.payload);
            const cancelled = job.kind.startsWith("booking_cancelled");
            const stale = cancelled
                ? !appt.status.startsWith("CANCELLED")
                : (job.kind === "booking_request"
                      ? appt.status !== "PENDING"
                      : !["PENDING", "CONFIRMED"].includes(appt.status)) ||
                  (!!payload.startUtc && payload.startUtc !== appt.startUtc);
            if (stale) {
                await tx.db.updateDocument(
                    DB,
                    T.OUTBOX,
                    id,
                    { status: "sent", lastError: "Superseded by a newer booking state" },
                    undefined,
                    tx.transactionId,
                );
                return null;
            }
            if (!payload.message) {
                if (!payload.manageToken) {
                    payload.manageToken = newToken();
                    await tx.db.createDocument(
                        DB,
                        T.TOKENS,
                        newId(),
                        {
                            userId: tx.userId,
                            appointmentId: appt.$id,
                            purpose: "manage",
                            tokenHash: tokenHash(payload.manageToken),
                            expiresAt: addMinutesUtc(appt.startUtc, 90 * 24 * 60),
                        },
                        tx.perms(),
                        tx.transactionId,
                    );
                }
                const url = new URL(`/buchen/verwalten/${payload.manageToken}`, getSiteUrl()).toString(),
                    lang = settings.language === "en" ? "en" : "de";
                let message =
                    appt.status === "PENDING"
                        ? bookingRequestEmail(appt, settings.displayName, url, lang)
                        : confirmationEmail(appt, settings.displayName, url, lang);
                if (cancelled || job.kind === "booking_rescheduled") {
                    const heading = cancelled
                        ? lang === "de"
                            ? "Termin storniert"
                            : "Appointment cancelled"
                        : lang === "de"
                          ? "Termin verschoben"
                          : "Appointment rescheduled";
                    const when = new Date(appt.startUtc).toLocaleString(lang === "de" ? "de-DE" : "en-GB", {
                        timeZone: appt.businessTimezone,
                        dateStyle: "full",
                        timeStyle: "short",
                    });
                    message = {
                        to: appt.customerEmail,
                        subject: `${heading}: ${appt.serviceNameSnapshot}`,
                        text: `${heading}\n\n${settings.displayName}\n${appt.serviceNameSnapshot}\n${when} (${appt.businessTimezone})${appt.status === "PENDING" ? (lang === "de" ? "\nIhre Anfrage wartet weiterhin auf Bestätigung." : "\nYour request is still awaiting approval.") : ""}\n\n${url}`,
                        html: "",
                    };
                }
                if (appt.status !== "PENDING")
                    message.ics = {
                        filename: "termin.ics",
                        content: buildIcs({
                            uid: appt.$id,
                            startUtc: appt.startUtc,
                            endUtc: addMinutesUtc(appt.startUtc, appt.durationMinutes),
                            summary: `${appt.serviceNameSnapshot} — ${settings.displayName}`,
                            sequence: Math.floor(Date.parse(appt.$updatedAt) / 1000),
                            cancelled,
                        }),
                    };
                payload.message = textMessage(message);
                let contact = (settings as unknown as { contactEmail?: string }).contactEmail;
                if (!contact) {
                    const company = await tx.list<Row & { email?: string }>("user_company");
                    contact = company[0]?.email;
                }
                if (contact)
                    payload.ownerMessage = {
                        to: contact,
                        subject: message.subject,
                        text: `${appt.customerName}\n${message.subject}\n${new Date(appt.startUtc).toLocaleString("de-DE", { timeZone: appt.businessTimezone })} (${appt.businessTimezone})\n\n${new URL("/dashboard/calendar", getSiteUrl())}`,
                    };
            }
            await tx.db.updateDocument(
                DB,
                T.OUTBOX,
                id,
                {
                    payload: JSON.stringify(payload),
                    nextAttemptAt: new Date(Date.now() + 5 * 60000).toISOString(),
                },
                undefined,
                tx.transactionId,
            );
            return { job, payload };
        });
    } catch {
        return "queued";
    }
    if (!claimed) return "skipped";
    try {
        await sender.send(htmlMessage(claimed.payload.message!), `termine-${id}-customer`);
        if (claimed.payload.ownerMessage)
            await sender.send(htmlMessage(claimed.payload.ownerMessage), `termine-${id}-owner`);
        await markOutboxSent(store, id);
        return "sent";
    } catch (error) {
        await markOutboxFailed(
            store,
            id,
            claimed.job.attempts,
            error instanceof Error ? error.message : "Delivery failed",
        );
        return "queued";
    }
}

export async function deliverAppointment(store: TermineStore, appointmentId: string, sender: MailSender) {
    const jobs = await store.list<Row & OutboxRow>(T.OUTBOX, [
        Query.equal("appointmentId", appointmentId),
        Query.equal("status", "pending"),
    ]);
    const results = [];
    for (const job of jobs) results.push(await deliverJob(store, job.$id, sender));
    return results.includes("queued") ? "queued" : results.includes("sent") ? "sent" : "queued";
}

/** Delivery failure must never turn a committed booking change into an HTTP failure. */
export async function attemptDelivery(store: TermineStore, appointmentId: string) {
    if (!process.env.RESEND_API_KEY) return "queued";
    try {
        return await deliverAppointment(store, appointmentId, resendSender(process.env.RESEND_API_KEY));
    } catch {
        return "queued";
    }
}
