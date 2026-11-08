import { redirect } from "next/navigation";

export default function LegacyTermineStaffRedirect() {
    redirect("/dashboard/termine/buchungen?tab=staff");
}
