"use client";
import s from "../help.module.css";
export default function PrintButton() {
    return <button className={s.button} type="button" onClick={() => window.print()}>Drucken / als PDF speichern</button>;
}
