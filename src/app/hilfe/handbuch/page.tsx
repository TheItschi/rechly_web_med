import Link from "next/link";
import { HELP_GUIDES, HELP_REVIEWED } from "@/lib/help/guides";
import { createPageMetadata } from "@/lib/seo";
import GuideSections from "../GuideSections";
import PrintButton from "./PrintButton";
import s from "../help.module.css";
export const metadata = createPageMetadata({ title:"Rechly Benutzerhandbuch zum Drucken", description:"Alle Rechly-Anleitungen in einer Ansicht: drucken oder als PDF für die Offline-Nutzung speichern.", path:"/hilfe/handbuch", noIndex:true });
export default function HandbookPage() {
    return <>
        <header className={s.articleHeader}><p className={s.eyebrow}>Web & Desktop · Benutzerhandbuch</p><h1>Dein Rechly-Handbuch.</h1><p>Alle Anleitungen in einer Ansicht. Wähle im Druckdialog „Als PDF speichern“, um das Handbuch offline zu lesen.</p></header>
        <p className={s.meta}>Stand: <time dateTime={HELP_REVIEWED}>18. November 2026</time> · https://rechly.de/hilfe · Support: admin@rechly.de</p>
        <div className={`${s.actions} ${s.noPrint}`}><PrintButton /><Link href="/hilfe">Zur Hilfe-Übersicht</Link></div>
        <nav aria-label="Handbuchinhalt" className={s.manualContents}><ol>{HELP_GUIDES.map(guide => <li key={guide.slug}><a href={`#${guide.slug}`}>{guide.title}</a></li>)}</ol></nav>
        {HELP_GUIDES.map(guide => <article className={s.manualArticle} key={guide.slug} id={guide.slug} aria-labelledby={`${guide.slug}-title`}><h2 id={`${guide.slug}-title`}>{guide.title}</h2><GuideSections guide={guide} manual /></article>)}
    </>;
}
