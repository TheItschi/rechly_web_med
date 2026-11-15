import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { getRepoUrl, getSiteUrl } from "@/lib/env";
import { createPageMetadata } from "@/lib/seo";

const siteUrl = getSiteUrl();
const repoUrl = getRepoUrl();
const path = "/open-source";

export const metadata = createPageMetadata({
    title: "Open-Source Rechnungssoftware",
    description:
        "Rechly ist offene Rechnungssoftware unter AGPL-3.0: Quellcode prüfen, selbst hosten, Fehler melden und gemeinsam Funktionen entwickeln.",
    path,
});

const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "WebPage",
            "@id": `${siteUrl}${path}#webpage`,
            name: "Rechly als Open-Source Rechnungssoftware",
            url: `${siteUrl}${path}`,
            inLanguage: "de-DE",
            isPartOf: { "@id": `${siteUrl}/#website` },
            about: { "@id": `${siteUrl}/#source-code` },
        },
        {
            "@type": "SoftwareSourceCode",
            "@id": `${siteUrl}/#source-code`,
            name: "Rechly",
            codeRepository: repoUrl,
            license: `${repoUrl}/blob/main/LICENSE`,
            programmingLanguage: "TypeScript",
            runtimePlatform: "Web",
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
                    name: "Open Source",
                    item: `${siteUrl}${path}`,
                },
            ],
        },
    ],
};

export default function OpenSourcePage() {
    return (
        <div style={{ minHeight: "100vh", background: "#fff" }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />
            <Navbar />
            <main style={{ padding: "128px 24px 80px" }}>
                <article style={{ maxWidth: 860, margin: "0 auto" }}>
                    <nav
                        aria-label="Brotkrümelnavigation"
                        style={{ marginBottom: 24, color: "#526174" }}
                    >
                        <Link href="/">Startseite</Link>
                        <span aria-hidden="true"> / </span>
                        <span aria-current="page">Open Source</span>
                    </nav>
                    <p className="landing-eyebrow">TRANSPARENT ENTWICKELT</p>
                    <h1
                        style={{
                            fontSize: 46,
                            lineHeight: 1.1,
                            margin: "16px 0 20px",
                            color: "#152438",
                        }}
                    >
                        Open-Source Rechnungssoftware, die du prüfen und
                        mitgestalten kannst
                    </h1>
                    <p
                        style={{
                            fontSize: 19,
                            lineHeight: 1.75,
                            color: "#526174",
                            maxWidth: 760,
                        }}
                    >
                        Rechly wird öffentlich auf GitHub entwickelt. Du kannst
                        nachvollziehen, wie Funktionen umgesetzt werden,
                        Verbesserungsvorschläge einreichen, Fehler melden oder
                        eine eigene Instanz betreiben.
                    </p>

                    <section style={{ marginTop: 52 }}>
                        <h2 style={{ fontSize: 26, letterSpacing: "-0.02em", color: "#152438" }}>AGPL-3.0: offen mit klaren Regeln</h2>
                        <p style={{ lineHeight: 1.75, color: "#526174", marginTop: 12 }}>
                            Der Quellcode steht unter der GNU Affero General Public License v3.0. Die Lizenz erlaubt Nutzung,
                            Prüfung, Anpassung und Weitergabe. Wer eine veränderte Version als Netzwerkdienst anbietet,
                            stellt den zugehörigen Quellcode ebenfalls bereit.
                        </p>
                    </section>

                    <section style={{ marginTop: 44 }}>
                        <h2 style={{ fontSize: 26, letterSpacing: "-0.02em", color: "#152438" }}>Warum Open Source bei Rechnungssoftware wichtig ist</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, marginTop: 20 }}>
                            {[
                                ["Kein Lock-in", "Deine Daten bleiben exportierbar — als PDF, XRechnung, CSV und DATEV. Kein geschlossenes Dateiformat."],
                                ["Prüfbare Sicherheit", "Jede Funktion und jeder Datenfluss ist im Code nachvollziehbar und unabhängig prüfbar."],
                                ["Selbst hosten", "Betreibe Rechly auf eigener Infrastruktur — mit der Compose-Vorlage unter deploy/."],
                                ["Kein Abo-Risiko", "Kein Anbieter kann dir Tarife erhöhen oder den Zugang sperren. Die Software gehört der Community."],
                            ].map(([title, text]) => (
                                <article key={title} style={{ border: "1px solid #e3e9f1", borderRadius: 10, padding: 20 }}>
                                    <h3 style={{ fontSize: 15.5, fontWeight: 650, margin: "0 0 8px", color: "#152438" }}>{title}</h3>
                                    <p style={{ fontSize: 14, lineHeight: 1.65, color: "#526174", margin: 0 }}>{text}</p>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section style={{ marginTop: 44 }}>
                        <h2 style={{ fontSize: 26, letterSpacing: "-0.02em", color: "#152438" }}>In drei Schritten selbst hosten</h2>
                        <ol style={{ lineHeight: 1.8, color: "#33475e", marginTop: 14, paddingLeft: 22 }}>
                            <li><strong>Repository klonen</strong> und <code>.env.example</code> als <code>.env.local</code> mit deiner Appwrite-Instanz füllen.</li>
                            <li><strong>Schema anwenden:</strong> <code>appwrite.config.json</code> per Appwrite CLI deployen (<code>npx appwrite deploy</code>).</li>
                            <li><strong>Starten:</strong> <code>npm install &amp;&amp; npm run build &amp;&amp; npm run start</code> — Details in <code>docs/SELF_HOSTING.md</code>.</li>
                        </ol>
                    </section>

                    <section style={{ marginTop: 44, background: "#152438", borderRadius: 10, padding: "28px 26px", color: "#eef3fa" }}>
                        <h2 style={{ fontSize: 23, letterSpacing: "-0.02em", margin: "0 0 10px" }}>Mitmachen und beitragen</h2>
                        <p style={{ lineHeight: 1.7, color: "#b9c9de", margin: 0, maxWidth: 640 }}>
                            Beiträge sind willkommen — von Fehlerberichten und Übersetzungen bis zu Dokumentation, Design und Code.
                            Bitte beachte vor einem Pull Request die vorhandenen Contribution- und Sicherheitsrichtlinien im Repository.
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
                            <a href={repoUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "12px 18px", borderRadius: 8, background: "#2855d9", color: "#fff", fontWeight: 650 }}>
                                Quellcode auf GitHub
                            </a>
                            <a href={`${repoUrl}/issues`} target="_blank" rel="noopener noreferrer" style={{ padding: "12px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.35)", color: "#fff", fontWeight: 650 }}>
                                Issue melden
                            </a>
                            <Link href="/register" style={{ padding: "12px 18px", borderRadius: 8, color: "#9db8f5", fontWeight: 650 }}>
                                Oder direkt kostenlos nutzen
                            </Link>
                        </div>
                    </section>
                </article>
            </main>
            <Footer />
        </div>
    );
}
