import { notFound } from "next/navigation";
import TimeTracking from "@/components/workspace/TimeTracking";
import { isWorkspaceEnabled } from "@/lib/features";

export default function Page() {
    if (!isWorkspaceEnabled()) notFound();
    return <TimeTracking />;
}
