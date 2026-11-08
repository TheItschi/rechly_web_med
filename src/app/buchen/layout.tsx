import type { Metadata } from "next";
import "./buchen.css";

export const metadata: Metadata = {
    title: "Online buchen",
    robots: { index: true, follow: true },
};

export default function BuchenLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
