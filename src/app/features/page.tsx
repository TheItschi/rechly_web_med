import { createPageMetadata } from "@/lib/seo";
import FeaturesClient from "./FeaturesClient";

export const metadata = createPageMetadata({
    title: "Rechnungsprogramm Funktionen: Alles inklusive für 0 €",
    description:
        "Rechnungen, E-Rechnung (XRechnung & ZUGFeRD), Angebote, DATEV, Terminbuchung, Projekte & Zeiterfassung — alle Funktionen kostenlos ohne Limits. Jetzt vergleichen!",
    path: "/features",
});

export default function FeaturesPage() {
    return <FeaturesClient />;
}
