import { redirect } from "next/navigation";

export default function LegacyTermineCalendarRedirect() {
    redirect("/dashboard/calendar");
}
