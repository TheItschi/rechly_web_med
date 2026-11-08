import { notFound } from "next/navigation";
import CalendarWorkspace from "@/components/workspace/CalendarWorkspace";
import { isTermineEnabled, isWorkspaceEnabled } from "@/lib/features";

export default function UnifiedCalendarPage() {
    if (!isWorkspaceEnabled() && !isTermineEnabled()) notFound();
    return <CalendarWorkspace />;
}
