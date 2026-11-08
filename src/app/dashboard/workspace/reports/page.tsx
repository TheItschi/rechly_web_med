import { notFound } from "next/navigation";
import ProjectReports from "@/components/workspace/ProjectReports";
export default function Page() { if (process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED !== "1") notFound(); return <ProjectReports />; }
