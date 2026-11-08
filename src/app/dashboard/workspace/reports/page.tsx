import { notFound } from "next/navigation";
import ProjectReports from "@/components/workspace/ProjectReports";
import { isWorkspaceEnabled } from "@/lib/features";

export default function Page() {
    if (!isWorkspaceEnabled()) notFound();
    return <ProjectReports />;
}
