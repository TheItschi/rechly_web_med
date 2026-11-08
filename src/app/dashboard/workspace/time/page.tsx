import { notFound } from "next/navigation";
import TimeTracking from "@/components/workspace/TimeTracking";
export default function Page() { if (process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED !== "1") notFound(); return <TimeTracking />; }
