import { Query } from "node-appwrite";
import { DB, T, type TermineStore } from "./store";
import type { AppointmentRow } from "./booking";
import { addMinutesUtc } from "./time";
import ICAL from "ical.js";

export interface OutboxRow {
    $id: string;
    kind: string;
    appointmentId: string;
    payload: string;
    status: "pending" | "sent" | "failed";
    attempts: number;
    nextAttemptAt?: string;
    lastError?: string;
}

export interface EmailMessage {
    to: string;
    subject: string;
    text: string;
    html: string;
    ics?: { filename: string; content: string };
}

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmtDateTime(isoUtc: string, tz: string, lang: "de" | "en"): string {
    const d = new Date(isoUtc);
    const date = new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", {
        timeZone: tz,
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(d);
    const time = new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
    return `${date}, ${time} Uhr`;
}

/** Minimal RFC5545 VEVENT. Sequence bumps on updates so calendars replace the event. */
export function buildIcs(args: {
    uid: string;
    startUtc: string;
    endUtc: string;
    summary: string;
    description?: string;
    location?: string;
    sequence?: number;
    cancelled?: boolean;
}): string {
    const cal = new ICAL.Component(["vcalendar", [], []]),
        event = new ICAL.Component("vevent");
    cal.addPropertyWithValue("version", "2.0");
    cal.addPropertyWithValue("prodid", "-//Rechly//Termine//DE");
    event.addPropertyWithValue("uid", `${args.uid}@rechly.de`);
    event.addPropertyWithValue("dtstamp", ICAL.Time.fromJSDate(new Date(), true));
    event.addPropertyWithValue("dtstart", ICAL.Time.fromJSDate(new Date(args.startUtc), true));
    event.addPropertyWithValue("dtend", ICAL.Time.fromJSDate(new Date(args.endUtc), true));
    event.addPropertyWithValue("summary", args.summary.replace(/\r/g, ""));
    if (args.description) event.addPropertyWithValue("description", args.description.replace(/\r/g, ""));
    if (args.location) event.addPropertyWithValue("location", args.location.replace(/\r/g, ""));
    event.addPropertyWithValue("sequence", args.sequence ?? 0);
    event.addPropertyWithValue("status", args.cancelled ? "CANCELLED" : "CONFIRMED");
    cal.addSubcomponent(event);
    return cal.toString();
}

export function confirmationEmail(
    appt: AppointmentRow,
    businessName: string,
    manageUrl: string,
    lang: "de" | "en" = "de",
): EmailMessage {
    const when = fmtDateTime(appt.startUtc, appt.businessTimezone, lang);
    const subject =
        lang === "de"
            ? `Terminbestätigung: ${appt.serviceNameSnapshot} am ${when}`
            : `Appointment confirmed: ${appt.serviceNameSnapshot} on ${when}`;
    const body =
        lang === "de"
            ? `Guten Tag ${appt.customerName},\n\nIhr Termin "${appt.serviceNameSnapshot}" bei ${businessName} findet statt am:\n${when}\nDauer: ${appt.durationMinutes} Minuten\n\nVerwalten oder stornieren: ${manageUrl}\n\nMit freundlichen Grüßen\n${businessName}`
            : `Hello ${appt.customerName},\n\nYour appointment "${appt.serviceNameSnapshot}" with ${businessName} is scheduled for:\n${when}\nDuration: ${appt.durationMinutes} minutes\n\nManage or cancel: ${manageUrl}\n\nBest regards\n${businessName}`;
    return {
        to: appt.customerEmail,
        subject,
        text: body,
        html: `<p>${esc(body).replace(/\n/g, "<br>")}</p>`,
        ics: {
            filename: "termin.ics",
            content: buildIcs({
                uid: appt.$id ?? appt.serviceId,
                startUtc: appt.startUtc,
                endUtc: addMinutesUtc(appt.startUtc, appt.durationMinutes),
                summary: `${appt.serviceNameSnapshot} — ${businessName}`,
                description: `Manage: ${manageUrl}`,
            }),
        },
    };
}

export function bookingRequestEmail(
    appt: AppointmentRow,
    businessName: string,
    manageUrl: string,
    lang: "de" | "en" = "de",
): EmailMessage {
    const when = fmtDateTime(appt.startUtc, appt.businessTimezone, lang);
    const subject =
        lang === "de"
            ? `Buchungsanfrage erhalten: ${appt.serviceNameSnapshot} am ${when}`
            : `Booking request received: ${appt.serviceNameSnapshot} on ${when}`;
    const body =
        lang === "de"
            ? `Guten Tag ${appt.customerName},\n\nvielen Dank für Ihre Terminanfrage bei ${businessName}.\n\nAngefragter Termin: ${appt.serviceNameSnapshot}\nDatum & Uhrzeit: ${when}\nDauer: ${appt.durationMinutes} Minuten\n\nIhre Anfrage wird derzeit geprüft. Sobald der Termin vom Inhaber bestätigt wurde, erhalten Sie eine verbindliche Bestätigung mit Kalendereintrag per E-Mail.\n\nStatus der Buchung verfolgen: ${manageUrl}\n\nMit freundlichen Grüßen\n${businessName}`
            : `Hello ${appt.customerName},\n\nThank you for your booking request with ${businessName}.\n\nRequested appointment: ${appt.serviceNameSnapshot}\nDate & Time: ${when}\nDuration: ${appt.durationMinutes} minutes\n\nYour request is being reviewed. Once approved, you will receive a confirmation with calendar invite by email.\n\nTrack booking status: ${manageUrl}\n\nBest regards\n${businessName}`;
    return {
        to: appt.customerEmail,
        subject,
        text: body,
        html: `<p>${esc(body).replace(/\n/g, "<br>")}</p>`,
    };
}

export function newBookingRequestOwnerNotification(
    appt: AppointmentRow,
    ownerEmail: string,
    businessName: string,
    dashboardUrl: string,
    lang: "de" | "en" = "de",
): EmailMessage {
    const when = fmtDateTime(appt.startUtc, appt.businessTimezone, lang);
    const subject =
        lang === "de"
            ? `Neue Terminanfrage von ${appt.customerName} (${appt.serviceNameSnapshot})`
            : `New booking request from ${appt.customerName} (${appt.serviceNameSnapshot})`;
    const body =
        lang === "de"
            ? `Guten Tag,\n\nSie haben eine neue Terminanfrage über Ihre Buchungsseite erhalten:\n\nKunde: ${appt.customerName}\nE-Mail: ${appt.customerEmail}${appt.customerPhone ? `\nTelefon: ${appt.customerPhone}` : ""}\nLeistung: ${appt.serviceNameSnapshot}\nTermin: ${when} (${appt.durationMinutes} Min)${appt.customerNote ? `\nAnmerkung des Kunden: ${appt.customerNote}` : ""}\n\nBitte prüfen und bestätigen Sie die Anfrage in Ihrem Rechly Dashboard:\n${dashboardUrl}\n\nMit freundlichen Grüßen\nRechly`
            : `Hello,\n\nYou have received a new booking request on your booking page:\n\nCustomer: ${appt.customerName}\nEmail: ${appt.customerEmail}${appt.customerPhone ? `\nPhone: ${appt.customerPhone}` : ""}\nService: ${appt.serviceNameSnapshot}\nAppointment: ${when} (${appt.durationMinutes} min)${appt.customerNote ? `\nCustomer note: ${appt.customerNote}` : ""}\n\nPlease review and confirm the request in your Rechly Dashboard:\n${dashboardUrl}\n\nBest regards\nRechly`;
    return {
        to: ownerEmail,
        subject,
        text: body,
        html: `<p>${esc(body).replace(/\n/g, "<br>")}</p>`,
    };
}

export interface MailSender {
    send(msg: EmailMessage, idempotencyKey?: string): Promise<void>;
}

/** Resend HTTP API sender. No API key → throws, jobs stay queued (never blocks booking). */
export function resendSender(apiKey: string | undefined): MailSender {
    return {
        async send(msg: EmailMessage, idempotencyKey?: string) {
            if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
            const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
                },
                signal: AbortSignal.timeout(15000),
                body: JSON.stringify({
                    from:
                        process.env.TERMINE_FROM_EMAIL ||
                        process.env.RESEND_FROM_EMAIL ||
                        "Rechly Termine <no-reply@rechly.de>",
                    to: [msg.to],
                    subject: msg.subject,
                    text: msg.text,
                    html: msg.html,
                    ...(msg.ics
                        ? {
                              attachments: [
                                  {
                                      filename: msg.ics.filename,
                                      content: Buffer.from(msg.ics.content).toString("base64"),
                                  },
                              ],
                          }
                        : {}),
                }),
            });
            if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
        },
    };
}

/** Claim due outbox jobs (bounded batch, oldest attempts first). */
export async function claimOutboxJobs(
    store: TermineStore,
    limit = 10,
    nowIso?: string,
): Promise<OutboxRow[]> {
    const now = nowIso ?? new Date().toISOString();
    const res = await store.db.listDocuments(DB, T.OUTBOX, [
        Query.equal("userId", store.userId),
        Query.equal("status", "pending"),
        Query.limit(100),
    ]);
    return (res.documents as unknown as OutboxRow[])
        .filter((j) => j.attempts < 8 && (!j.nextAttemptAt || j.nextAttemptAt <= now))
        .sort((a, b) => a.attempts - b.attempts)
        .slice(0, limit);
}

export async function markOutboxSent(store: TermineStore, jobId: string): Promise<void> {
    await store.db.updateDocument(DB, T.OUTBOX, jobId, { status: "sent", attempts: 0, lastError: null });
}

export async function markOutboxFailed(
    store: TermineStore,
    jobId: string,
    attempts: number,
    error: string,
): Promise<void> {
    const next = new Date(Date.now() + Math.min(2 ** attempts, 120) * 60_000).toISOString();
    await store.db.updateDocument(DB, T.OUTBOX, jobId, {
        status: attempts + 1 >= 8 ? "failed" : "pending",
        attempts: attempts + 1,
        nextAttemptAt: next,
        lastError: error.slice(0, 500),
    });
}
