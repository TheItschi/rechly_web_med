import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Anmelden",
    description:
        "Melde dich bei Rechly-Med an, um Rechnungen und Patienten zu verwalten.",
    alternates: {
        canonical: "/login",
    },
    robots: {
        index: false,
        follow: false,
    },
};

export default function LoginLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return children;
}
