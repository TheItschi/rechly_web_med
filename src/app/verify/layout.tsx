import type { Metadata } from "next";

export const metadata: Metadata = {
    title: { absolute: "E-Mail bestätigen | Rechly" },
    robots: { index: false, follow: false },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
