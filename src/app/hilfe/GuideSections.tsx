import Link from "next/link";
import type { HelpGuide } from "@/lib/help/guides";
import s from "./help.module.css";

export default function GuideSections({ guide, manual = false }: { guide: HelpGuide; manual?: boolean }) {
    const Heading = manual ? "h3" : "h2";
    return guide.sections.map(section => <section key={section.id} id={manual ? `${guide.slug}-${section.id}` : section.id} className={s.section}>
        <Heading>{section.title}</Heading>
        {section.paragraphs?.map(text => <p key={text}>{text}</p>)}
        {section.steps && <ol>{section.steps.map(text => <li key={text}>{text}</li>)}</ol>}
        {section.bullets && <ul>{section.bullets.map(text => <li key={text}>{text}</li>)}</ul>}
        {section.table && <div className={s.tableWrap} role="region" aria-label={section.title} tabIndex={0}>
            <table className={s.table}>
                <caption className="sr-only">{section.title}</caption>
                <thead><tr>{section.table.headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
                <tbody>{section.table.rows.map(row => <tr key={row[0]}>{row.map((cell, i) => i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>)}</tr>)}</tbody>
            </table>
        </div>}
        {section.note && <aside className={s.note}>{section.note}</aside>}
        {section.links && <div className={s.links}>{section.links.map(link => <Link key={link.href} href={link.href}>{link.label} <span aria-hidden="true">→</span></Link>)}</div>}
    </section>);
}
