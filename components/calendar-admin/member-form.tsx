"use client";

import { AdvancedSettingsSection } from "@/components/calendar-admin/advanced-settings-section";
import { WorkingHoursEditor } from "@/components/calendar-admin/working-hours-editor";
import { TimezoneSelect } from "@/components/calendar-admin/timezone-select";
import { Button, Checkbox, Input, Label } from "@/components/ui";
import type {
  CalendarMember,
  IanaTimezone,
  WorkingHours,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

type MemberFormShared = {
  calendarId: string;
  calendarDefaultDay: number;
  calendarDefaultWeek: number;
  calendarDefaultWorkingHours: WorkingHours;
  calendarTimezone: IanaTimezone;
};

type MemberFormProps =
  | ({ mode: "create" } & MemberFormShared)
  | ({ mode: "edit"; member: CalendarMember } & MemberFormShared);

export function memberHasHoursOverride(
  override: WorkingHours | null | undefined,
): boolean {
  return override != null && override.length > 0;
}

export function initialUseCalendarDefaultHours(
  override: WorkingHours | null | undefined,
): boolean {
  return !memberHasHoursOverride(override);
}

export function initialMemberWorkingHours(
  override: WorkingHours | null | undefined,
  calendarDefaultWorkingHours: WorkingHours,
): WorkingHours {
  return memberHasHoursOverride(override)
    ? override!
    : calendarDefaultWorkingHours;
}

export function initialMemberTimezone(
  memberTimezone: IanaTimezone | null | undefined,
  calendarTimezone: IanaTimezone,
): IanaTimezone {
  return memberTimezone ?? calendarTimezone;
}

export function memberAdvancedDefaultOpen(member: CalendarMember | null): boolean {
  if (!member) {
    return false;
  }
  return (
    member.maxPerDayOverride != null ||
    member.maxPerWeekOverride != null ||
    memberHasHoursOverride(member.workingHoursOverride) ||
    member.assignmentWeight !== 100
  );
}

export function buildMemberSavePayload(fields: {
  email: string;
  displayName?: string;
  maxPerDayOverride?: number;
  maxPerWeekOverride?: number;
  useCalendarDefaultHours: boolean;
  workingHoursOverride: WorkingHours;
  timezone: IanaTimezone;
  assignmentWeight?: number;
}) {
  const payload: Record<string, unknown> = {
    email: fields.email,
    displayName: fields.displayName,
    maxPerDayOverride: fields.maxPerDayOverride,
    maxPerWeekOverride: fields.maxPerWeekOverride,
    assignmentWeight: fields.assignmentWeight,
  };

  if (fields.useCalendarDefaultHours) {
    payload.workingHoursOverride = null;
    payload.timezone = null;
    return payload;
  }

  payload.workingHoursOverride = fields.workingHoursOverride;
  payload.timezone = fields.timezone;
  return payload;
}

export function MemberForm(props: MemberFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const member = isEdit ? props.member : null;

  const [email, setEmail] = useState(isEdit ? props.member.email : "");
  const [displayName, setDisplayName] = useState(
    isEdit ? (props.member.displayName ?? "") : "",
  );
  const [maxPerDayOverride, setMaxPerDayOverride] = useState(
    isEdit ? (props.member.maxPerDayOverride?.toString() ?? "") : "",
  );
  const [maxPerWeekOverride, setMaxPerWeekOverride] = useState(
    isEdit ? (props.member.maxPerWeekOverride?.toString() ?? "") : "",
  );
  const [assignmentWeight, setAssignmentWeight] = useState(
    isEdit ? String(props.member.assignmentWeight) : "100",
  );
  const [useCalendarDefaultHours, setUseCalendarDefaultHours] = useState(() =>
    initialUseCalendarDefaultHours(member?.workingHoursOverride),
  );
  const [workingHoursOverride, setWorkingHoursOverride] = useState(() =>
    initialMemberWorkingHours(
      member?.workingHoursOverride,
      props.calendarDefaultWorkingHours,
    ),
  );
  const [memberTimezone, setMemberTimezone] = useState(() =>
    initialMemberTimezone(member?.timezone, props.calendarTimezone),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = buildMemberSavePayload({
      email,
      displayName: displayName || undefined,
      maxPerDayOverride: maxPerDayOverride
        ? Number(maxPerDayOverride)
        : undefined,
      maxPerWeekOverride: maxPerWeekOverride
        ? Number(maxPerWeekOverride)
        : undefined,
      assignmentWeight: Number(assignmentWeight),
      useCalendarDefaultHours,
      workingHoursOverride,
      timezone: memberTimezone,
    });

    const url =
      props.mode === "create"
        ? `/api/calendars/${props.calendarId}/members`
        : `/api/calendars/${props.calendarId}/members/${props.member.id}`;
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

    router.push(`/calendars/${props.calendarId}?tab=members`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <h3 className="text-heading font-semibold text-ink">Standard settings</h3>

          <Label className="space-y-1.5">
            Email
            <Input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Label>

          <Label className="space-y-1.5">
            Display name
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Label>
        </div>

        <AdvancedSettingsSection
          description="Cap overrides, assignment weight, and custom working hours."
          defaultOpen={memberAdvancedDefaultOpen(member)}
        >
          <div className="grid grid-cols-2 gap-4">
            <Label className="space-y-1.5">
              Max / day override
              <Input
                type="number"
                value={maxPerDayOverride}
                onChange={(e) => setMaxPerDayOverride(e.target.value)}
                placeholder={`Default ${props.calendarDefaultDay}`}
              />
              <span className="block text-xs text-ink-muted">
                Leave blank to use calendar default ({props.calendarDefaultDay}/day).
              </span>
            </Label>
            <Label className="space-y-1.5">
              Max / week override
              <Input
                type="number"
                value={maxPerWeekOverride}
                onChange={(e) => setMaxPerWeekOverride(e.target.value)}
                placeholder={`Default ${props.calendarDefaultWeek}`}
              />
              <span className="block text-xs text-ink-muted">
                Leave blank to use calendar default ({props.calendarDefaultWeek}/week).
              </span>
            </Label>
          </div>

          <Label className="space-y-1.5">
            Assignment weight
            <Input
              type="number"
              min={1}
              max={1000}
              required
              value={assignmentWeight}
              onChange={(e) => setAssignmentWeight(e.target.value)}
            />
            <span className="block text-xs text-ink-muted">
              Used when scheduling mode is Weighted round robin (1–1000, default 100).
            </span>
          </Label>

          <div className="space-y-4 border-t border-border pt-4">
            <Label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={useCalendarDefaultHours}
                disabled={saving}
                onChange={(e) => setUseCalendarDefaultHours(e.target.checked)}
              />
              <span className="text-sm font-medium text-ink">
                Use calendar default hours
              </span>
            </Label>

            {!useCalendarDefaultHours && (
              <div className="space-y-4">
                <p className="text-xs text-ink-muted">
                  Hours interpreted in member timezone.
                </p>
                <TimezoneSelect
                  value={memberTimezone}
                  onChange={setMemberTimezone}
                  label="Member timezone"
                  disabled={saving}
                />
                <WorkingHoursEditor
                  value={workingHoursOverride}
                  onChange={setWorkingHoursOverride}
                  disabled={saving}
                />
              </div>
            )}
          </div>
        </AdvancedSettingsSection>
      </div>

      <div className="sticky bottom-0 -mx-6 mt-8 flex gap-3 border-t border-border bg-surface px-6 py-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            router.push(`/calendars/${props.calendarId}?tab=members`)
          }
        >
          Cancel
        </Button>
        <Button type="submit" loading={saving} className="flex-1 sm:flex-none">
          {isEdit ? "Save Member" : "Add Member"}
        </Button>
      </div>
    </form>
  );
}
