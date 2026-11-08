import { redirect } from "next/navigation";

export default function LegacyTermineAvailabilityRedirect() {
    redirect("/dashboard/termine/buchungen?tab=availability");
}
