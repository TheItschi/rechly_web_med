import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getSiteUrl } from "@/lib/env";

export const runtime = "edge";

const siteUrl = getSiteUrl();

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const rawTitle =
        searchParams.get("title") ||
        "Rechnungen & E-Rechnungen kostenlos online erstellen";
    const rawCategory =
        searchParams.get("category") ||
        "Open-Source Business-Superapp für Deutschland";

    const title = rawTitle.replace(/\s*\|\s*Rechly$/i, "").slice(0, 110);
    const category = rawCategory.slice(0, 65);

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "60px 64px",
                    background:
                        "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #1d4ed8 100%)",
                    color: "#f8fafc",
                    fontFamily: "Arial, sans-serif",
                }}
            >
                {/* Top Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "16px",
                        }}
                    >
                        {/* @vercel/og renders JSX to PNG at request time — next/image pipeline doesn't apply */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`${siteUrl}/logo.png`}
                            alt="Rechly"
                            width="56"
                            height="56"
                            style={{ borderRadius: "14px" }}
                        />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <div
                                style={{
                                    fontSize: "26px",
                                    fontWeight: 800,
                                    color: "#ffffff",
                                }}
                            >
                                rechly.de
                            </div>
                            <div
                                style={{
                                    fontSize: "16px",
                                    color: "#93c5fd",
                                }}
                            >
                                Kostenlose Business-Superapp & Rechnungssoftware
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            background: "rgba(59, 130, 246, 0.28)",
                            border: "1px solid rgba(147, 197, 253, 0.4)",
                            color: "#e0f2fe",
                            padding: "8px 18px",
                            borderRadius: "999px",
                            fontSize: "17px",
                            fontWeight: 700,
                        }}
                    >
                        {category}
                    </div>
                </div>

                {/* Main Title */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        maxWidth: "1020px",
                    }}
                >
                    <div
                        style={{
                            fontSize: title.length > 65 ? "46px" : "56px",
                            lineHeight: 1.14,
                            fontWeight: 800,
                            letterSpacing: "-0.03em",
                            color: "#ffffff",
                        }}
                    >
                        {title}
                    </div>
                </div>

                {/* Bottom Trust Bar */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "28px",
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#bfdbfe",
                        borderTop: "1px solid rgba(255,255,255,0.16)",
                        paddingTop: "24px",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        ✓ 100% Kostenlos
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        ✓ Ohne Anmeldung nutzbar
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        ✓ XRechnung & ZUGFeRD
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        ✓ DSGVO-konform
                    </div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        },
    );
}
