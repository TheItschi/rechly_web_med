import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { getSiteUrl } from "@/lib/env";

type KeywordSection = {
    title: string;
    body: string[];
    bullets?: string[];
};

type KeywordFaq = {
    question: string;
    answer: string;
};

type KeywordLink = {
    href: string;
    title: string;
    description: string;
};

type KeywordHowToStep = {
    name: string;
    text: string;
};

type KeywordHowTo = {
    title: string;
    steps: KeywordHowToStep[];
};

interface KeywordLandingPageProps {
    path: string;
    title: string;
    eyebrow: string;
    intro: string;
    summary: string;
    keywordPills: string[];
    sections: KeywordSection[];
    faqs: KeywordFaq[];
    clusterLinks: KeywordLink[];
    /** Optional numbered guide rendered after the hero, with HowTo schema */
    howTo?: KeywordHowTo;
}

const siteUrl = getSiteUrl();

export default function KeywordLandingPage({
    path,
    title,
    eyebrow,
    intro,
    summary,
    keywordPills,
    sections,
    faqs,
    clusterLinks,
    howTo,
}: KeywordLandingPageProps) {
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            ...(howTo
                ? [
                      {
                          "@type": "HowTo",
                          "@id": `${siteUrl}${path}#howto`,
                          url: `${siteUrl}${path}#howto`,
                          name: howTo.title,
                          inLanguage: "de-DE",
                          step: howTo.steps.map((step, index) => ({
                              "@type": "HowToStep",
                              position: index + 1,
                              name: step.name,
                              text: step.text,
                          })),
                      },
                  ]
                : []),
            {
                "@type": "SoftwareApplication",
                "@id": `${siteUrl}${path}#software`,
                name: "Rechly Rechnungssoftware",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web, Windows 10, Windows 11, macOS",
                inLanguage: "de-DE",
                url: `${siteUrl}${path}`,
                isAccessibleForFree: true,
                offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "EUR",
                    availability: "https://schema.org/InStock",
                },
            },
            {
                "@type": "WebPage",
                "@id": `${siteUrl}${path}#webpage`,
                name: title,
                url: `${siteUrl}${path}`,
                description: summary,
                inLanguage: "de-DE",
                isPartOf: {
                    "@type": "WebSite",
                    "@id": `${siteUrl}/#website`,
                },
            },
            {
                "@type": "BreadcrumbList",
                "@id": `${siteUrl}${path}#breadcrumb`,
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "Startseite",
                        item: siteUrl,
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: title,
                        item: `${siteUrl}${path}`,
                    },
                ],
            },
            {
                "@type": "FAQPage",
                "@id": `${siteUrl}${path}#faq`,
                mainEntity: faqs.map((faq) => ({
                    "@type": "Question",
                    name: faq.question,
                    acceptedAnswer: {
                        "@type": "Answer",
                        text: faq.answer,
                    },
                })),
            },
        ],
    };

    return (
        <div style={{ minHeight: "100vh", background: "#fff" }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData),
                }}
            />

            <Navbar />

            <main>
                <section
                    style={{
                        padding: "clamp(96px, 12vw, 136px) clamp(16px, 4vw, 24px) 48px",
                        background:
                            "linear-gradient(180deg, #eef6ff 0%, #ffffff 70%)",
                    }}
                >
                    <div style={{ maxWidth: 980, margin: "0 auto" }}>
                        <nav
                            aria-label="Brotkrümelnavigation"
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                alignItems: "center",
                                marginBottom: 24,
                                color: "#64748b",
                                fontSize: 14,
                            }}
                        >
                            <Link href="/" style={{ color: "#1d4ed8" }}>
                                Startseite
                            </Link>
                            <span aria-hidden="true">/</span>
                            <span aria-current="page">{title}</span>
                        </nav>
                        <div className="landing-eyebrow">{eyebrow}</div>
                        <h1
                            style={{
                                marginTop: 18,
                                marginBottom: 16,
                                fontSize: "clamp(1.85rem, 5.5vw, 2.75rem)",
                                lineHeight: 1.15,
                                color: "#0f172a",
                                fontWeight: 800,
                                maxWidth: 760,
                                overflowWrap: "break-word",
                                wordBreak: "break-word",
                            }}
                        >
                            {title}
                        </h1>
                        <p
                            style={{
                                maxWidth: 760,
                                fontSize: 19,
                                lineHeight: 1.7,
                                color: "#475569",
                                marginBottom: 20,
                            }}
                        >
                            {intro}
                        </p>
                        <p
                            style={{
                                maxWidth: 760,
                                fontSize: 16,
                                lineHeight: 1.75,
                                color: "#64748b",
                                marginBottom: 28,
                            }}
                        >
                            {summary}
                        </p>

                        <p
                            style={{
                                maxWidth: 760,
                                fontSize: 14,
                                lineHeight: 1.65,
                                color: "#64748b",
                                marginBottom: 24,
                            }}
                        >
                            Redaktionell aktualisiert: Oktober 2026 · Allgemeine
                            Information, keine Steuer- oder Rechtsberatung.
                            Offizielle Grundlagen findest du beim{" "}
                            <a
                                href="https://www.gesetze-im-internet.de/ustg_1980/__14.html"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Bundesministerium der Justiz (§ 14 UStG)
                            </a>
                            .
                        </p>

                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 10,
                            }}
                        >
                            {keywordPills.map((keyword) => (
                                <span
                                    key={keyword}
                                    style={{
                                        padding: "8px 12px",
                                        borderRadius: 999,
                                        background: "#f8fafc",
                                        border: "1px solid rgba(15, 23, 42, 0.08)",
                                        color: "#334155",
                                        fontSize: 14,
                                        fontWeight: 600,
                                    }}
                                >
                                    {keyword}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {howTo ? (
                    <section style={{ padding: "0 clamp(16px, 4vw, 24px) 40px" }}>
                        <div style={{ maxWidth: 980, margin: "0 auto" }}>
                            <article
                                style={{
                                    padding: "clamp(20px, 4vw, 28px)",
                                    borderRadius: 24,
                                    border: "1px solid rgba(15, 23, 42, 0.08)",
                                    background: "#ffffff",
                                    boxShadow:
                                        "0 18px 40px rgba(15, 23, 42, 0.05)",
                                }}
                            >
                                <h2
                                    style={{
                                        marginBottom: 20,
                                        fontSize: "clamp(1.35rem, 4vw, 1.75rem)",
                                        color: "#0f172a",
                                        fontWeight: 700,
                                    }}
                                >
                                    {howTo.title}
                                </h2>
                                <ol
                                    style={{
                                        margin: 0,
                                        paddingLeft: 0,
                                        listStyle: "none",
                                        display: "grid",
                                        gap: 18,
                                    }}
                                >
                                    {howTo.steps.map((step, index) => (
                                        <li
                                            key={step.name}
                                            style={{
                                                display: "flex",
                                                gap: 16,
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <span
                                                aria-hidden
                                                style={{
                                                    flexShrink: 0,
                                                    width: 34,
                                                    height: 34,
                                                    borderRadius: 999,
                                                    background: "#eef6ff",
                                                    color: "#1d4ed8",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontWeight: 700,
                                                    fontSize: 15,
                                                }}
                                            >
                                                {index + 1}
                                            </span>
                                            <span>
                                                <strong
                                                    style={{
                                                        display: "block",
                                                        color: "#0f172a",
                                                        fontSize: 17,
                                                        marginBottom: 4,
                                                    }}
                                                >
                                                    {step.name}
                                                </strong>
                                                <span
                                                    style={{
                                                        color: "#475569",
                                                        fontSize: 15.5,
                                                        lineHeight: 1.7,
                                                    }}
                                                >
                                                    {step.text}
                                                </span>
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </article>
                        </div>
                    </section>
                ) : null}

                <section style={{ padding: "0 clamp(16px, 4vw, 24px) 40px" }}>
                    <div style={{ maxWidth: 980, margin: "0 auto" }}>
                        <div
                            style={{
                                display: "grid",
                                gap: 20,
                            }}
                        >
                            {sections.map((section) => (
                                <article
                                    key={section.title}
                                    style={{
                                        padding: "clamp(20px, 4vw, 28px)",
                                        borderRadius: 24,
                                        border: "1px solid rgba(15, 23, 42, 0.08)",
                                        background: "#ffffff",
                                        boxShadow:
                                            "0 18px 40px rgba(15, 23, 42, 0.05)",
                                    }}
                                >
                                    <h2
                                        style={{
                                            marginBottom: 16,
                                            fontSize: "clamp(1.35rem, 4vw, 1.75rem)",
                                            color: "#0f172a",
                                            fontWeight: 700,
                                        }}
                                    >
                                        {section.title}
                                    </h2>
                                    {section.body.map((paragraph) => (
                                        <p
                                            key={paragraph}
                                            style={{
                                                color: "#475569",
                                                fontSize: 16,
                                                lineHeight: 1.75,
                                                marginBottom: 14,
                                            }}
                                        >
                                            {paragraph}
                                        </p>
                                    ))}
                                    {section.bullets?.length ? (
                                        <ul
                                            style={{
                                                margin: "10px 0 0",
                                                paddingLeft: 20,
                                                color: "#334155",
                                                lineHeight: 1.8,
                                                fontSize: 15,
                                            }}
                                        >
                                            {section.bullets.map((bullet) => (
                                                <li key={bullet}>{bullet}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section style={{ padding: "0 clamp(16px, 4vw, 24px) 40px" }}>
                    <div style={{ maxWidth: 980, margin: "0 auto" }}>
                        <div
                            style={{
                                padding: "clamp(24px, 5vw, 30px)",
                                borderRadius: 26,
                                background:
                                    "linear-gradient(160deg, #0f172a 0%, #1e3a8a 100%)",
                                color: "#f8fafc",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "clamp(1.35rem, 4vw, 1.75rem)",
                                    fontWeight: 700,
                                    marginBottom: 10,
                                }}
                            >
                                Rechly kostenlos ausprobieren
                            </div>
                            <p
                                style={{
                                    fontSize: 16,
                                    lineHeight: 1.75,
                                    color: "rgba(226, 232, 240, 0.92)",
                                    marginBottom: 18,
                                    maxWidth: 740,
                                }}
                            >
                                Wenn du eine deutsche Rechnungssoftware suchst,
                                mit der du schnell starten und deine Prozesse
                                später weiter ausbauen kannst, ist Rechly die
                                offene Basis dafür.
                            </p>
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 12,
                                }}
                            >
                                <Link
                                    href="/tools/rechnungsgenerator"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minHeight: 46,
                                        padding: "0 18px",
                                        borderRadius: 12,
                                        background: "#f8fafc",
                                        color: "#0f172a",
                                        fontWeight: 700,
                                        textDecoration: "none",
                                    }}
                                >
                                    Online-Rechnungsgenerator (ohne Anmeldung)
                                </Link>
                                <Link
                                    href="/desktop"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minHeight: 46,
                                        padding: "0 18px",
                                        borderRadius: 12,
                                        background: "rgba(255, 255, 255, 0.12)",
                                        border: "1px solid rgba(248, 250, 252, 0.28)",
                                        color: "#f8fafc",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                    }}
                                >
                                    Desktop-App Download (100 % Offline)
                                </Link>
                                <Link
                                    href="/register"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minHeight: 46,
                                        padding: "0 18px",
                                        borderRadius: 12,
                                        border: "1px solid rgba(248, 250, 252, 0.24)",
                                        color: "#f8fafc",
                                        fontWeight: 600,
                                        textDecoration: "none",
                                    }}
                                >
                                    Kostenloses Konto erstellen
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section style={{ padding: "0 clamp(16px, 4vw, 24px) clamp(48px, 8vw, 80px)" }}>
                    <div style={{ maxWidth: 980, margin: "0 auto" }}>
                        <h2
                            style={{
                                marginBottom: 18,
                                fontSize: "clamp(1.35rem, 4vw, 1.875rem)",
                                color: "#0f172a",
                                fontWeight: 700,
                            }}
                        >
                            Häufige Fragen
                        </h2>
                        <div
                            style={{
                                display: "grid",
                                gap: 16,
                                marginBottom: 36,
                            }}
                        >
                            {faqs.map((faq) => (
                                <article
                                    key={faq.question}
                                    style={{
                                        padding: 24,
                                        borderRadius: 20,
                                        background: "#f8fafc",
                                        border: "1px solid rgba(15, 23, 42, 0.06)",
                                    }}
                                >
                                    <h3
                                        style={{
                                            marginBottom: 10,
                                            fontSize: 18,
                                            color: "#0f172a",
                                            fontWeight: 700,
                                        }}
                                    >
                                        {faq.question}
                                    </h3>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: 15,
                                            lineHeight: 1.75,
                                            color: "#475569",
                                        }}
                                    >
                                        {faq.answer}
                                    </p>
                                </article>
                            ))}
                        </div>

                        <h2
                            style={{
                                marginBottom: 18,
                                fontSize: 30,
                                color: "#0f172a",
                                fontWeight: 700,
                            }}
                        >
                            Mehr zu deutschen Rechnungsprozessen
                        </h2>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: 18,
                            }}
                        >
                            {clusterLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    style={{ textDecoration: "none" }}
                                >
                                    <article
                                        style={{
                                            height: "100%",
                                            padding: 24,
                                            borderRadius: 20,
                                            border: "1px solid rgba(15, 23, 42, 0.08)",
                                            background: "#ffffff",
                                            boxShadow:
                                                "0 14px 30px rgba(15, 23, 42, 0.05)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                marginBottom: 10,
                                                fontSize: 19,
                                                fontWeight: 700,
                                                color: "#0f172a",
                                            }}
                                        >
                                            {link.title}
                                        </div>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: 14,
                                                lineHeight: 1.7,
                                                color: "#64748b",
                                            }}
                                        >
                                            {link.description}
                                        </p>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
