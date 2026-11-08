import { notFound } from "next/navigation";
import Workspace from "@/components/dashboard/Workspace";

export default function WorkspacePage() {
    if (process.env.NEXT_PUBLIC_RECHLY_WORKSPACE_ENABLED !== "1") notFound();
    return <Workspace />;
}
