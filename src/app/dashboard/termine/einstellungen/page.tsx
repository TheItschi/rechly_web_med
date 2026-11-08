import { redirect } from "next/navigation";

export default function LegacyTermineSettingsRedirect() {
    redirect("/dashboard/settings?tab=booking");
}
