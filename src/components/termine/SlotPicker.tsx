"use client";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Select, Skeleton, Space, Typography } from "antd";

export interface BookingSlot {
    startUtc: string;
    staffId: string;
}
export const bookingDay = (instant: string, zone: string) =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(instant));
export const bookingWhen = (instant: string, zone: string) =>
    new Intl.DateTimeFormat("de-DE", { timeZone: zone, dateStyle: "full", timeStyle: "short" }).format(
        new Date(instant),
    );
const dateLabel = (day: string) =>
    new Date(day + "T12:00:00Z").toLocaleDateString("de-DE", {
        timeZone: "UTC",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

/** Shared by new bookings and rescheduling; obsolete requests never replace newer results. */
export default function SlotPicker({
    endpoint,
    timezone,
    maxHorizonDays = 60,
    value,
    onChange,
    disabled = false,
}: {
    endpoint: string;
    timezone: string;
    maxHorizonDays?: number;
    value: BookingSlot | null;
    onChange: (slot: BookingSlot | null) => void;
    disabled?: boolean;
}) {
    const today = bookingDay(new Date().toISOString(), timezone);
    const [month, setMonth] = useState(today.slice(0, 7)),
        [selectedDay, setSelectedDay] = useState(""),
        [zone, setZone] = useState(timezone);
    const [slots, setSlots] = useState<BookingSlot[]>([]),
        [loading, setLoading] = useState(true),
        [error, setError] = useState(""),
        [revision, setRevision] = useState(0);
    const first = month + "-01",
        monthDate = new Date(first + "T12:00:00Z"),
        daysInMonth = new Date(
            Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0),
        ).getUTCDate();
    const firstAllowedMonth = bookingDay(new Date().toISOString(), zone).slice(0, 7);
    const lastAllowed = bookingDay(new Date(Date.now() + maxHorizonDays * 86400000).toISOString(), zone);
    const zones = useMemo(
        () =>
            Array.from(
                new Set([
                    timezone,
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                    "UTC",
                    ...Intl.supportedValuesOf("timeZone"),
                ]),
            ).map((value) => ({ value, label: value.replace(/_/g, " ") })),
        [timezone],
    );
    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        setLoading(true);
        setError("");
        setSlots([]);
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set("from", first);
        url.searchParams.set("days", String(daysInMonth));
        url.searchParams.set("timezone", zone);
        fetch(url, { signal: controller.signal, cache: "no-store" })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Verfügbarkeit konnte nicht geladen werden.");
                return Object.values(data.slots || {}).flat() as BookingSlot[];
            })
            .then((data) => {
                if (active) setSlots(data);
            })
            .catch((error) => {
                if (active) setError(error.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
            controller.abort();
        };
    }, [endpoint, first, daysInMonth, revision, zone]);
    const grouped = useMemo(() => {
        const result: Record<string, BookingSlot[]> = {};
        for (const slot of slots) (result[bookingDay(slot.startUtc, zone)] ??= []).push(slot);
        return result;
    }, [slots, zone]);
    const day = grouped[selectedDay]?.length ? selectedDay : Object.keys(grouped).sort()[0] || "";
    const offset = (monthDate.getUTCDay() + 6) % 7;
    const move = (amount: number) => {
        const date = new Date(first + "T12:00:00Z");
        date.setUTCMonth(date.getUTCMonth() + amount);
        setMonth(date.toISOString().slice(0, 7));
        setSelectedDay("");
        onChange(null);
    };
    return (
        <div className="booking-picker" aria-busy={loading}>
            <div className="booking-picker-toolbar">
                <Space>
                    <Button
                        aria-label="Vorheriger Monat"
                        disabled={disabled || month <= firstAllowedMonth}
                        onClick={() => move(-1)}
                    >
                        ←
                    </Button>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                        {monthDate.toLocaleDateString("de-DE", {
                            timeZone: "UTC",
                            month: "long",
                            year: "numeric",
                        })}
                    </Typography.Title>
                    <Button
                        aria-label="Nächster Monat"
                        disabled={disabled || month >= lastAllowed.slice(0, 7)}
                        onClick={() => move(1)}
                    >
                        →
                    </Button>
                </Space>
                <Button
                    size="small"
                    disabled={disabled || loading}
                    onClick={() => {
                        onChange(null);
                        setRevision((r) => r + 1);
                    }}
                >
                    Aktualisieren
                </Button>
            </div>
            <label className="booking-zone">
                Zeitzone
                <Select
                    aria-label="Zeitzone"
                    showSearch
                    optionFilterProp="label"
                    options={zones}
                    value={zone}
                    disabled={disabled}
                    onChange={(v) => {
                        setZone(v);
                        setSelectedDay("");
                        onChange(null);
                    }}
                />
            </label>
            {error ? (
                <Alert
                    type="error"
                    showIcon
                    title={error}
                    action={<Button onClick={() => setRevision((r) => r + 1)}>Erneut versuchen</Button>}
                />
            ) : loading ? (
                <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
                <div className="booking-picker-columns">
                    <div>
                        <div className="booking-calendar" aria-label="Verfügbare Tage">
                            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
                                <span className="booking-weekday" key={d}>
                                    {d}
                                </span>
                            ))}
                            {Array.from({ length: offset }, (_, i) => (
                                <span key={"empty" + i} />
                            ))}
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const date = month + "-" + String(i + 1).padStart(2, "0"),
                                    available = !!grouped[date]?.length;
                                return (
                                    <button
                                        key={date}
                                        type="button"
                                        aria-label={dateLabel(date)}
                                        aria-pressed={day === date}
                                        disabled={disabled || !available}
                                        className={day === date ? "selected" : ""}
                                        onClick={() => {
                                            setSelectedDay(date);
                                            onChange(null);
                                        }}
                                    >
                                        {i + 1}
                                        {available && <span className="booking-day-dot" />}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="booking-muted">
                            Markierte Tage sind buchbar. Die Verfügbarkeit wird vor dem Buchen erneut geprüft.
                        </p>
                    </div>
                    <div>
                        <Typography.Title level={5} style={{ marginTop: 0 }}>
                            {day ? dateLabel(day) : "Keine freien Termine"}
                        </Typography.Title>
                        {!day ? (
                            <Alert
                                type="info"
                                title="In diesem Monat ist nichts mehr frei."
                                description="Wählen Sie den nächsten Monat oder kontaktieren Sie das Unternehmen."
                            />
                        ) : (
                            <div className="buchen-times">
                                {(grouped[day] || []).map((slot) => (
                                    <button
                                        key={slot.startUtc + slot.staffId}
                                        type="button"
                                        disabled={disabled}
                                        aria-pressed={value?.startUtc === slot.startUtc}
                                        className={
                                            "buchen-time" +
                                            (value?.startUtc === slot.startUtc ? " buchen-time--active" : "")
                                        }
                                        onClick={() => onChange(slot)}
                                    >
                                        {new Date(slot.startUtc).toLocaleTimeString("de-DE", {
                                            timeZone: zone,
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            timeZoneName: "short",
                                        })}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
