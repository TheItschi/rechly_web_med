import { notFound } from "next/navigation";
import CalendarWorkspace from "@/components/workspace/CalendarWorkspace";
export default function Page() { if (process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED !== "1") notFound(); return <CalendarWorkspace />; }
