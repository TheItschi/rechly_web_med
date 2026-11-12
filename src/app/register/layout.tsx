import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Registrieren",
    description:
        "Erstelle dein Rechly-Med-Konto für die Privatliquidation.",
    alternates: {
        canonical: "/register",
    },
    robots: {
        index: false,
        follow: false,
    },
};

export default function RegisterLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return children;
}
