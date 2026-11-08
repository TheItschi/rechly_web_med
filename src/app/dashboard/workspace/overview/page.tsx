import { notFound } from "next/navigation";
import WorkspaceOverview from "@/components/workspace/WorkspaceOverview";
export default function Page() { if (process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED !== "1") notFound(); return <WorkspaceOverview />; }
