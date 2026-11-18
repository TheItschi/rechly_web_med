"use client";
import { useState } from "react";
import Link from "next/link";
import type { HelpGuide } from "@/lib/help/guides";
import s from "./help.module.css";
const normalize = (value: string) => value.toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss");
export default function GuideSearch({ guides }: { guides: HelpGuide[] }) {
    const [query, setQuery] = useState("");
    const words = normalize(query).trim().split(/\s+/).filter(Boolean);
    const results = guides.filter(guide => words.every(word => normalize(JSON.stringify(guide)).includes(word)));
    return <section aria-label="Anleitungen finden">
        <div className={s.search}>
            <label htmlFor="hilfe-suche">Was möchtest du erledigen?</label>
            <div className={s.searchRow}>
                <input id="hilfe-suche" type="search" autoComplete="off" placeholder="Zum Beispiel: erste Rechnung, Lieferadresse, Backup …" value={query} onChange={e => setQuery(e.target.value)} aria-controls="hilfe-ergebnisse" />
                {query && <button type="button" className={s.secondary} onClick={() => setQuery("")}>Zurücksetzen</button>}
            </div>
            <p role="status" className={s.meta}>{results.length} {results.length === 1 ? "Anleitung" : "Anleitungen"}{query.trim() ? ` für „${query.trim()}“` : " · auf Deutsch"}</p>
        </div>
        <noscript>Die Suche benötigt JavaScript. Alle Anleitungen sind unten direkt verlinkt.</noscript>
        <div id="hilfe-ergebnisse" className={s.grid}>
            {results.map(guide => <Link key={guide.slug} href={`/hilfe/${guide.slug}`} className={s.card}>
                <small>{guide.category} · {guide.minutes} Min.</small>
                <h2>{guide.title}</h2><p>{guide.description}</p><span>Anleitung lesen →</span>
            </Link>)}
        </div>
        {results.length === 0 && <p>Keine passende Anleitung gefunden. Versuche einen kürzeren Suchbegriff oder öffne die <Link href="/hilfe/fehlerbehebung">Fehlerbehebung</Link>.</p>}
    </section>;
}
