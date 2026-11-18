import Link from "next/link";
import { HELP_GUIDES, HELP_REVIEWED } from "@/lib/help/guides";
import { createPageMetadata } from "@/lib/seo";
import GuideSearch from "./GuideSearch";
import s from "./help.module.css";
export const metadata = createPageMetadata({ title:"Rechly Hilfe: Anleitungen für Web und Desktop", description:"Rechly Schritt für Schritt: erste Rechnung, Angebote, Terminbuchung, Datensicherung und Lösungen für häufige Fehler. Kostenloses Benutzerhandbuch.", path:"/hilfe", category:"Hilfe & Dokumentation" });
export default function HelpPage() {
    return <>
        <header className={s.hero}>
            <p className={s.eyebrow}>Hilfe & Benutzerhandbuch</p>
            <h1>Rechly Schritt für Schritt.</h1>
            <p>Starte mit deiner ersten Rechnung. Entdecke weitere Funktionen, wenn du sie brauchst – mit kurzen Anleitungen und konkreten Lösungen für häufige Fragen.</p>
            <div className={s.actions}>
                <Link className={s.button} href="/hilfe/erste-schritte">In 5 Minuten loslegen <span aria-hidden="true">→</span></Link>
                <Link className={s.secondary} href="/hilfe/fehlerbehebung">Ein Problem lösen</Link>
            </div>
        </header>
        <GuideSearch guides={HELP_GUIDES} />
        <section className={s.support}>
            <h2>Lieber alles an einem Ort?</h2>
            <p>Das vollständige Handbuch lässt sich drucken oder als PDF speichern. So kannst du die Anleitungen auch offline nachlesen.</p>
            <Link href="/hilfe/handbuch">Handbuch öffnen →</Link>
            <p className={s.meta}>Zuletzt mit dem Quellstand abgeglichen: <time dateTime={HELP_REVIEWED}>18. November 2026</time>. Installierte Versionen und aktivierte Module können abweichen. Links zur Web-App benötigen eine Anmeldung.</p>
        </section>
        <section className={s.support}>
            <h2>Noch eine Frage offen?</h2>
            <p>Schreib an <a href="mailto:admin@rechly.de">admin@rechly.de</a>. Nenne die betroffene Version und die letzten Schritte. Bei Fehlern helfen die vollständige Meldung und ein Screenshot mit geschwärzten vertraulichen Angaben.</p>
        </section>
    </>;
}
