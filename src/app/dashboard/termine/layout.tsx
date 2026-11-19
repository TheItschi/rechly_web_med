import type { Metadata } from "next";
import { VerifiedOnly } from "@/components/dashboard/VerifyEmail";

export const metadata: Metadata = {
    title: "Termine",
    robots: { index: false, follow: false, noarchive: true },
};

export default function TermineLayout({ children }: { children: React.ReactNode }) {
    return <VerifiedOnly>{children}</VerifiedOnly>;
}
