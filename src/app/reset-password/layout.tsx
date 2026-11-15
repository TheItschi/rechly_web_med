import type { Metadata } from "next";

export const metadata: Metadata = {
    title: { absolute: "Neues Passwort setzen | Rechly" },
    robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
    return children;
}
