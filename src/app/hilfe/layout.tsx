import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import s from "./help.module.css";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
    return <div className={s.root} lang="de">
        <a className={s.skip} href="#hilfe-inhalt">Zum Inhalt springen</a>
        <div className={s.chrome}><Navbar /></div>
        <main id="hilfe-inhalt" className={s.container}>{children}</main>
        <div className={s.chrome}><Footer /></div>
    </div>;
}
