import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Rechly – Kostenlose Rechnungssoftware mit Projekten und Terminbuchung";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "64px",
                    background: "linear-gradient(135deg, #f8fafc 0%, #dbeafe 48%, #bfdbfe 100%)",
                    color: "#0f172a",
                    fontFamily: "Arial",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "18px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 64,
                            height: 64,
                            borderRadius: 16,
                            background: "#2855d9",
                            color: "white",
                            fontSize: 40,
                            fontWeight: 800,
                        }}
                    >
                        R
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "24px",
                                fontWeight: 700,
                            }}
                        >
                            Rechly
                        </div>
                        <div
                            style={{
                                fontSize: "18px",
                                color: "#334155",
                            }}
                        >
                            Rechnungssoftware für Deutschland
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "18px",
                        maxWidth: "900px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "64px",
                            lineHeight: 1.06,
                            fontWeight: 800,
                            letterSpacing: "-0.04em",
                        }}
                    >
                        Rechnungen. Termine. Mehr Freiraum.
                    </div>
                    <div
                        style={{
                            fontSize: "30px",
                            lineHeight: 1.3,
                            color: "#1e293b",
                        }}
                    >
                        Kostenlose Open-Source-Rechnungssoftware für Selbstständige und kleine Unternehmen. Im
                        Web oder lokal am Desktop.
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: "16px",
                        fontSize: "22px",
                        color: "#1d4ed8",
                    }}
                >
                    <div>Rechnungen</div>
                    <div>E-Rechnungen</div>
                    <div>Projekte</div>
                    <div>Terminbuchung</div>
                </div>
            </div>
        ),
        size,
    );
}
