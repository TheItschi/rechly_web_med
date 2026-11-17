import { NextResponse } from "next/server";
import { readUpdateStatus } from "@/lib/updateStatus";

export const dynamic = "force-dynamic";

/** Poll target for the dashboard banner while `scripts/update.mjs` runs. */
export async function GET() {
    return NextResponse.json(readUpdateStatus());
}
