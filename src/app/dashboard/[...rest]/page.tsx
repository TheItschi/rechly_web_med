import { notFound } from "next/navigation";

/** Renders the dashboard 404 (inside the dashboard shell) for unknown dashboard routes. */
export default function DashboardCatchAll() {
    notFound();
}
