import { redirect } from "next/navigation";

export default function LegacyTermineStartRedirect() {
    redirect("/dashboard/settings?tab=booking");
}
