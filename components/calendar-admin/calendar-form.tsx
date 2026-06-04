"use client";

import {
  AlertBanner,
  Button,
  DurationChipGroup,
  Input,
  Label,
} from "@/components/ui";
import { toast } from "@/components/ui/toast";
import {
  TimezoneSelect,
  WorkingHoursEditor,
} from "@/components/calendar-admin/working-hours-editor";
import { ALLOWED_DURATIONS } from "@/lib/constants";
import type { Calendar, IanaTimezone, WorkingHours } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_WORKING_HOURS } from "./validation";

type CalendarFormProps =
  | { mode: "create" }
  | { mode: "edit"; calendar: Calendar };

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-heading font-semibold text-ink">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function getBrowserTimezone(): IanaTimezone {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function buildCalendarSavePayload(fields: {
  name: string;
  bookingWindowDays: number;
  minNoticeHours: number;
  defaultMaxPerDay: number;
  defaultMaxPerWeek: number;
  defaultWorkingHours: WorkingHours;
  timezone: IanaTimezone;
  durations: number[];
}) {
  return {
    name: fields.name,
    bookingWindowDays: fields.bookingWindowDays,
    minNoticeHours: fields.minNoticeHours,
    defaultMaxPerDay: fields.defaultMaxPerDay,
    defaultMaxPerWeek: fields.defaultMaxPerWeek,
    defaultWorkingHours: fields.defaultWorkingHours,
    timezone: fields.timezone,
    durations: fields.durations,
  };
}

export function CalendarForm(props: CalendarFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.calendar : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [bookingWindowDays, setBookingWindowDays] = useState(
    initial?.bookingWindowDays ?? 14,
  );
  const [minNoticeHours, setMinNoticeHours] = useState(
    initial?.minNoticeHours ?? 0,
  );
  const [defaultMaxPerDay, setDefaultMaxPerDay] = useState(
    initial?.defaultMaxPerDay ?? 3,
  );
  const [defaultMaxPerWeek, setDefaultMaxPerWeek] = useState(
    initial?.defaultMaxPerWeek ?? 15,
  );
  const [durations, setDurations] = useState<number[]>(
    initial?.durations ?? [30, 60],
  );
  const [defaultWorkingHours, setDefaultWorkingHours] = useState<WorkingHours>(
    initial?.defaultWorkingHours ?? DEFAULT_WORKING_HOURS,
  );
  const [timezone, setTimezone] = useState<IanaTimezone>(
    initial?.timezone ?? getBrowserTimezone(),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = buildCalendarSavePayload({
      name,
      bookingWindowDays,
      minNoticeHours,
      defaultMaxPerDay,
      defaultMaxPerWeek,
      defaultWorkingHours,
      timezone,
      durations,
    });

    const url =
      props.mode === "create"
        ? "/api/calendars"
        : `/api/calendars/${props.calendar.id}`;
    const method = props.mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Save failed");
      return;
    }

    const data = (await res.json()) as { calendar: Calendar };
    toast(isEdit ? "Calendar saved" : "Calendar created", { variant: "success" });
    router.push(`/calendars/${data.calendar.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <FormSection title="General">
        <Label className="space-y-1.5">
          Name
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Label>
      </FormSection>

      <FormSection
        title="Booking rules"
        description="Control how far ahead invitees can schedule and minimum notice."
      >
        <Label className="block max-w-xs space-y-1.5">
          Booking window (days)
          <Input
            type="number"
            min={1}
            required
            value={bookingWindowDays}
            onChange={(e) => setBookingWindowDays(Number(e.target.value))}
          />
          <span className="block text-xs text-ink-muted">
            How far ahead invitees can schedule.
          </span>
        </Label>

        <Label className="block max-w-xs space-y-1.5">
          Minimum notice (hours)
          <Input
            type="number"
            min={0}
            max={720}
            required
            value={minNoticeHours}
            onChange={(e) => setMinNoticeHours(Number(e.target.value))}
          />
          <span className="block text-xs text-ink-muted">
            Earliest bookable slot must be at least this many hours away.
          </span>
        </Label>
      </FormSection>

      <FormSection title="Meeting limits">
        <div className="grid grid-cols-2 gap-4">
          <Label className="space-y-1.5">
            Max meetings / day
            <Input
              type="number"
              required
              value={defaultMaxPerDay}
              onChange={(e) => setDefaultMaxPerDay(Number(e.target.value))}
            />
          </Label>
          <Label className="space-y-1.5">
            Max meetings / week
            <Input
              type="number"
              required
              value={defaultMaxPerWeek}
              onChange={(e) => setDefaultMaxPerWeek(Number(e.target.value))}
            />
          </Label>
        </div>
      </FormSection>

      <FormSection
        title="Durations"
        description="Select one or more meeting lengths invitees can book."
      >
        <DurationChipGroup
          values={[...ALLOWED_DURATIONS]}
          selected={durations}
          onChange={(selected) => {
            if (Array.isArray(selected)) {
              setDurations([...selected].sort((a, b) => a - b));
            }
          }}
          mode="multi"
        />
      </FormSection>

      <FormSection
        title="Timezone and working hours"
        description={`Availability windows are interpreted in ${timezone}. Per-member overrides can be set on the member edit page.`}
      >
        <TimezoneSelect
          value={timezone}
          onChange={setTimezone}
          label="Calendar timezone"
          disabled={saving}
        />
        <WorkingHoursEditor
          value={defaultWorkingHours}
          onChange={setDefaultWorkingHours}
          disabled={saving}
        />
      </FormSection>

      <Button type="submit" loading={saving}>
        {isEdit ? "Save Changes" : "Create Calendar"}
      </Button>
    </form>
  );
}
