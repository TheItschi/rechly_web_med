import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HELP_GUIDES, HELP_REVIEWED, getHelpGuide } from "@/lib/help/guides";
import { createPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/env";
import GuideSections from "../GuideSections";
import s from "../help.module.css";
export const dynamicParams = false;
export function generateStaticParams() { return HELP_GUIDES.map(guide => ({ slug: guide.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const guide = getHelpGuide((await params).slug);
    if (!guide) notFound();
    return createPageMetadata({ title:`${guide.title} – Rechly Hilfe`, description:guide.description, path:`/hilfe/${guide.slug}`, type:"article", category:"Hilfe & Dokumentation" });
}
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
    const guide = getHelpGuide((await params).slug);
    if (!guide) notFound();
    const breadcrumb = { "@context":"https://schema.org", "@type":"BreadcrumbList", itemListElement:[
        {"@type":"ListItem",position:1,name:"Rechly",item:getSiteUrl()},
        {"@type":"ListItem",position:2,name:"Hilfe",item:`${getSiteUrl()}/hilfe`},
        {"@type":"ListItem",position:3,name:guide.title,item:`${getSiteUrl()}/hilfe/${guide.slug}`},
    ] };
    return <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html:JSON.stringify(breadcrumb).replace(/</g,"\\u003c") }} />
        <nav aria-label="Brotkrümelnavigation" className={s.breadcrumb}><Link href="/">Startseite</Link><span aria-hidden="true">/</span><Link href="/hilfe">Hilfe</Link><span aria-hidden="true">/</span><span aria-current="page">{guide.title}</span></nav>
        <header className={s.articleHeader}><p className={s.eyebrow}>{guide.category} · {guide.minutes} Min. Lesezeit</p><h1>{guide.title}</h1><p>{guide.description}</p></header>
        <p className={s.meta}>Stand: <time dateTime={HELP_REVIEWED}>18. November 2026</time> · Anleitung auf Deutsch · Menünamen können je nach Version abweichen.</p>
        <div className={s.articleGrid}>
            <details className={s.toc} open><summary>Auf dieser Seite</summary><nav aria-label="Artikelinhalt"><ol>{guide.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol></nav></details>
            <article className={s.article} aria-label={guide.title}>
                <GuideSections guide={guide} />
                <section className={`${s.support} ${s.noPrint}`}><h2>Weiterlesen</h2><div className={s.related}>{guide.related.map(slug => <Link key={slug} href={`/hilfe/${slug}`}>{getHelpGuide(slug)?.title} →</Link>)}</div><p><Link href="/hilfe">Alle Anleitungen</Link> · <Link href="/hilfe/handbuch">Handbuch als PDF speichern</Link></p></section>
            </article>
        </div>
    </>;
}
