import { redirect } from "next/navigation";

export default function LegacyTermineOverviewRedirect() {
    redirect("/dashboard/termine/buchungen");
}
