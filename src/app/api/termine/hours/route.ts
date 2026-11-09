import { NextResponse, type NextRequest } from "next/server";
import { businessContext, authFail } from "../_lib";
import { DB, T, TermineError, recordId } from "@/lib/termine/store";
import { validDate, wallToMinutes, minutesToWall } from "@/lib/termine/time";

function fail(error: unknown, fallback: string) {
    const auth = authFail(error);
    if (auth) return auth;
    if (error instanceof TermineError)
        return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: fallback }, { status: 500 });
}

const WALL = /^([01]?\d|2[0-3]):([0-5]\d)$/;
function validPeriods(v: unknown, label: string) {
    if (!Array.isArray(v)) throw new TermineError(`Ungültige ${label}.`);
    if (v.length > 4) throw new TermineError(`Maximal 4 ${label} pro Tag.`);
    const periods = v.map((p) => {
        if (
            !p ||
            typeof p !== "object" ||
            !WALL.test(String((p as { start?: unknown }).start ?? "")) ||
            !WALL.test(String((p as { end?: unknown }).end ?? ""))
        ) {
            throw new TermineError(`Ungültige ${label} (Format HH:MM).`);
        }
        const start = wallToMinutes(String((p as { start: string }).start)),
            end = wallToMinutes(String((p as { end: string }).end));
        if (end <= start) throw new TermineError("Das Ende muss nach dem Beginn liegen.");
        return { start: minutesToWall(start), end: minutesToWall(end) };
    });
    periods.sort((a, b) => a.start.localeCompare(b.start));
    if (periods.some((p, i) => i > 0 && p.start < periods[i - 1].end))
        throw new TermineError("Zeiträume dürfen sich nicht überschneiden.");
    return periods;
}

/** Full working-hours configuration (week + date overrides). */
export async function GET() {
    try {
        const { store } = await businessContext();
        return NextResponse.json({ hours: await store.list(T.HOURS, []) });
    } catch (error) {
        return fail(error, "Arbeitszeiten konnten nicht geladen werden.");
    }
}

/**
 * Upsert one schedule entry. Body: { kind: "week", day: "0".."6" } or
 * { kind: "override", date: "YYYY-MM-DD" } plus { closed, periods, breaks }.
 * Deterministic $id makes repeat setup idempotent.
 */
export async function POST(request: NextRequest) {
    try {
        const { store, userId } = await businessContext();
        let body: Record<string, unknown>;
        try {
            body = await request.json();
            if (!body || typeof body !== "object") throw new Error();
        } catch {
            return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
        }
        const kind = body.kind === "override" ? "override" : "week";
        let natural: string;
        if (kind === "week") {
            const day = String(body.day ?? "");
            if (!/^[0-6]$/.test(day))
                return NextResponse.json({ error: "Ungültiger Wochentag." }, { status: 400 });
            natural = `week:${day}`;
        } else {
            const date = String(body.date ?? "");
            if (!validDate(date)) return NextResponse.json({ error: "Ungültiges Datum." }, { status: 400 });
            natural = `override:${date}`;
        }
        const closed = body.closed === true;
        const periods = validPeriods(body.periods ?? [], "Zeiträume");
        const breaks = validPeriods(body.breaks ?? [], "Pausen");
        if (!closed && periods.length === 0 && kind === "week") {
            // An empty open day is allowed (treated as closed); keep explicit flag.
        }
        const id = recordId(userId, `hours:${natural}`);
        const fields = {
            userId,
            kind,
            day: kind === "week" ? String(body.day) : undefined,
            date: kind === "override" ? String(body.date) : undefined,
            closed,
            periods: JSON.stringify(periods),
            breaks: JSON.stringify(breaks),
        };
        let row;
        try {
            row = await store.db.getDocument(DB, T.HOURS, id);
            if ((row as unknown as { userId: string }).userId !== userId)
                throw new TermineError("Datensatz nicht gefunden.", 404);
            row = await store.db.updateDocument(DB, T.HOURS, id, fields);
        } catch (error) {
            if (error instanceof TermineError) throw error;
            if ((error as { code?: number }).code !== 404) throw error;
            row = await store.db.createDocument(DB, T.HOURS, id, fields, store.perms());
        }
        return NextResponse.json({ hours: row });
    } catch (error) {
        return fail(error, "Arbeitszeiten konnten nicht gespeichert werden.");
    }
}
