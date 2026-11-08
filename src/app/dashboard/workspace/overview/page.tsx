import { notFound } from "next/navigation";
import WorkspaceOverview from "@/components/workspace/WorkspaceOverview";
import { isWorkspaceEnabled } from "@/lib/features";

export default function Page() {
    if (!isWorkspaceEnabled()) notFound();
    return <WorkspaceOverview />;
}
