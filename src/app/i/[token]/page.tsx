import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getPublicInvoice } from "@/lib/publicInvoice";

export const metadata: Metadata = {
    title: "Rechnung ansehen",
    robots: { index: false, follow: false },
};

const fmt = (value: number) =>
    value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("de-DE") : "—";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: "Bezahlt", color: "#1c6b4a", bg: "#ecfdf5" },
    sent: { label: "Offen", color: "#8a5a12", bg: "#fdf6e3" },
    draft: { label: "Entwurf", color: "#526174", bg: "#f1f5f9" },
    cancelled: { label: "Storniert", color: "#9f2d2d", bg: "#fdecec" },
};

export default async function PublicInvoicePage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const invoice = await getPublicInvoice(token).catch(() => null);
    if (!invoice) notFound();

    const status = STATUS[invoice.status] ?? STATUS.draft;
    const qr = invoice.girocodePayload
        ? await QRCode.toDataURL(invoice.girocodePayload, { width: 180, margin: 1 }).catch(() => null)
        : null;

    return (
        <div style={{ minHeight: "100vh", background: "#f6f8fc", color: "#152438", padding: "36px 16px 56px" }}>
            <main
                style={{
                    maxWidth: 760,
                    margin: "0 auto",
                    background: "#fff",
                    border: "1px solid #e3e9f1",
                    borderRadius: 12,
                    padding: "clamp(22px, 4vw, 40px)",
                }}
            >
                <header
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                        borderBottom: "1px solid #e3e9f1",
                        paddingBottom: 20,
                        marginBottom: 20,
                    }}
                >
                    <div>
                        <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#2855d9" }}>
                            RECHNUNG {invoice.invoiceNumber}
                        </p>
                        <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.02em" }}>{invoice.sellerName}</h1>
                        {invoice.sellerCity && (
                            <p style={{ margin: "4px 0 0", color: "#526174", fontSize: 14 }}>{invoice.sellerCity}</p>
                        )}
                    </div>
                    <span
                        style={{
                            alignSelf: "flex-start",
                            padding: "4px 12px",
                            borderRadius: 999,
                            background: status.bg,
                            color: status.color,
                            fontSize: 13,
                            fontWeight: 700,
                        }}
                    >
                        {status.label}
                    </span>
                </header>

                <div style={{ display: "flex", gap: 28, flexWrap: "wrap", fontSize: 14, color: "#33475e", marginBottom: 22 }}>
                    <span>
                        Rechnungsdatum: <strong>{fmtDate(invoice.issueDate)}</strong>
                    </span>
                    {invoice.dueDate && (
                        <span>
                            Fällig bis: <strong>{fmtDate(invoice.dueDate)}</strong>
                        </span>
                    )}
                    {invoice.buyerName && (
                        <span>
                            Empfänger: <strong>{invoice.buyerName}</strong>
                        </span>
                    )}
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", color: "#526174", fontSize: 12 }}>
                                <th style={{ padding: "8px 6px", borderBottom: "1px solid #e3e9f1" }}>Leistung</th>
                                <th style={{ padding: "8px 6px", borderBottom: "1px solid #e3e9f1" }}>Menge</th>
                                <th style={{ padding: "8px 6px", borderBottom: "1px solid #e3e9f1" }}>Einzelpreis</th>
                                <th style={{ padding: "8px 6px", borderBottom: "1px solid #e3e9f1" }}>MwSt.</th>
                                <th style={{ padding: "8px 6px", borderBottom: "1px solid #e3e9f1", textAlign: "right" }}>Betrag</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, i) => (
                                <tr key={i}>
                                    <td style={{ padding: "10px 6px", borderBottom: "1px solid #eef2f8" }}>{item.description}</td>
                                    <td style={{ padding: "10px 6px", borderBottom: "1px solid #eef2f8" }}>
                                        {item.quantity} {item.unitOfMeasure}
                                    </td>
                                    <td style={{ padding: "10px 6px", borderBottom: "1px solid #eef2f8" }}>{fmt(item.price)}</td>
                                    <td style={{ padding: "10px 6px", borderBottom: "1px solid #eef2f8" }}>{item.taxRatePercent} %</td>
                                    <td style={{ padding: "10px 6px", borderBottom: "1px solid #eef2f8", textAlign: "right" }}>{fmt(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginLeft: "auto", maxWidth: 300, marginTop: 18, fontSize: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", color: "#526174" }}>
                        <span>Netto</span>
                        <span>{fmt(invoice.subtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", color: "#526174" }}>
                        <span>Umsatzsteuer</span>
                        <span>{fmt(invoice.totalVat)}</span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "10px 0 0",
                            marginTop: 6,
                            borderTop: "1px solid #e3e9f1",
                            fontSize: 17,
                            fontWeight: 700,
                        }}
                    >
                        <span>Gesamtbetrag</span>
                        <span style={{ color: "#2855d9" }}>{fmt(invoice.totalGross)}</span>
                    </div>
                </div>

                {invoice.status !== "paid" && (qr || invoice.sellerIban) && (
                    <section
                        style={{
                            display: "flex",
                            gap: 22,
                            flexWrap: "wrap",
                            alignItems: "center",
                            marginTop: 28,
                            padding: 20,
                            border: "1px solid #e3e9f1",
                            borderRadius: 10,
                            background: "#f8fafc",
                        }}
                    >
                        {qr && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={qr} alt="GiroCode QR-Code zur Zahlung" width={150} height={150} style={{ borderRadius: 8 }} />
                        )}
                        <div style={{ fontSize: 14, lineHeight: 1.65 }}>
                            <strong style={{ fontSize: 15 }}>So zahlen Sie:</strong>
                            <p style={{ margin: "6px 0", color: "#33475e" }}>
                                {qr
                                    ? "QR-Code mit Ihrer Banking-App scannen — Betrag und Verwendungszweck sind bereits ausgefüllt."
                                    : "Bitte überweisen Sie den Gesamtbetrag mit der Rechnungsnummer als Verwendungszweck."}
                            </p>
                            {invoice.sellerIban && (
                                <p style={{ margin: 0, color: "#33475e" }}>
                                    IBAN: <strong>{invoice.sellerIban}</strong>
                                    <br />
                                    Verwendungszweck: <strong>{invoice.invoiceNumber}</strong>
                                </p>
                            )}
                            {invoice.paymentTerms && <p style={{ margin: "6px 0 0", color: "#526174" }}>{invoice.paymentTerms}</p>}
                        </div>
                    </section>
                )}

                {invoice.notes && (
                    <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.65, color: "#526174" }}>{invoice.notes}</p>
                )}

                <footer style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #e3e9f1", fontSize: 12.5, color: "#8494ab" }}>
                    Bereitgestellt über Rechly — kostenlose Open-Source-Rechnungssoftware.
                </footer>
            </main>
        </div>
    );
}
