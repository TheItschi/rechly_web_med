import { notFound } from "next/navigation";
import CalendarWorkspace from "@/components/workspace/CalendarWorkspace";
import { isWorkspaceEnabled } from "@/lib/features";

export default function Page() {
    if (!isWorkspaceEnabled()) notFound();
    return <CalendarWorkspace />;
}
