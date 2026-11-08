import { redirect } from "next/navigation";

export default function LegacyTermineServicesRedirect() {
    redirect("/dashboard/products?tab=services");
}
