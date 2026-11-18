"use client";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { useLanguage } from "@/contexts/LanguageContext";

/** A new tab keeps the current form and its unsaved inputs in place. */
export default function HelpLink({ href, label }: { href: string; label: string }) {
    const { language } = useLanguage();
    const text = language === "de" ? label : "Help guide (German)";
    return <a href={href} target="_blank" rel="noopener noreferrer"
        aria-label={`${text} (${language === "de" ? "öffnet einen neuen Tab" : "opens in a new tab"})`}
        style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, marginBottom:12 }}>
        <QuestionCircleOutlined /> {text} <span aria-hidden="true">↗</span>
    </a>;
}
