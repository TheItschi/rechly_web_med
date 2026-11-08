import { notFound } from "next/navigation";
import Workspace from "@/components/dashboard/Workspace";
import { isWorkspaceEnabled } from "@/lib/features";

export default function WorkspacePage() {
    if (!isWorkspaceEnabled()) notFound();
    return <Workspace />;
}
