"use client";

import { AdminPanelSkeleton } from "@/components/calendar-admin/admin-panel-skeleton";
import { AlertBanner, Button, Label } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import type { CalendarMember } from "@/lib/types";
import type {
  AssignmentMode,
  CalendarSettings,
  RescheduleAssignmentMode,
  Team,
  TeamSelectionMode,
} from "@/lib/types/platform";
import { defaultCalendarSettings } from "@/lib/types/platform";
import { useCallback, useEffect, useState } from "react";

type SchedulingPanelProps = {
  calendarId: string;
  calendarName: string;
  teams: Team[];
  members: CalendarMember[];
};

const ASSIGNMENT_MODE_OPTIONS: {
  value: AssignmentMode;
  label: string;
  description: string;
}[] = [
  {
    value: "first_free",
    label: "First free",
    description: "Assign the eligible member with the lowest sort order.",
  },
  {
    value: "strict_round_robin",
    label: "Strict round robin",
    description: "Rotate through eligible members in sort order every booking.",
  },
  {
    value: "load_balanced_round_robin",
    label: "Load balanced round robin",
    description: "Prefer members with fewer meetings this week, then today.",
  },
  {
    value: "weighted_round_robin",
    label: "Weighted round robin",
    description: "Distribute bookings by each member's assignment weight.",
  },
  {
    value: "random",
    label: "Random",
    description: "Pick uniformly at random among eligible members.",
  },
];

function EnumSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  description,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  description?: string;
}) {
  return (
    <Label className="block min-w-0 space-y-1.5">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="min-w-0 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description ? (
        <span className="block text-xs text-neutral-500">{description}</span>
      ) : null}
    </Label>
  );
}

export function SchedulingPanel({
  calendarId,
  calendarName,
  teams,
  members: initialMembers,
}: SchedulingPanelProps) {
  const [settings, setSettings] = useState<CalendarSettings>(
    defaultCalendarSettings(),
  );
  const [members, setMembers] = useState(initialMembers);
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>({});
  const [savingWeightId, setSavingWeightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/settings`);
      const data = (await res.json()) as {
        settings?: CalendarSettings;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load settings");
      }
      setSettings(data.settings ?? defaultCalendarSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setWeightDrafts(
      Object.fromEntries(
        initialMembers.map((member) => [
          member.id,
          String(member.assignmentWeight),
        ]),
      ),
    );
    setMembers(initialMembers);
  }, [initialMembers]);

  function patchScheduling<K extends keyof CalendarSettings["scheduling"]>(
    key: K,
    value: CalendarSettings["scheduling"][K],
  ) {
    setSettings((current) => ({
      ...current,
      scheduling: { ...current.scheduling, [key]: value },
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduling: settings.scheduling }),
      });
      const data = (await res.json()) as {
        settings?: CalendarSettings;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save settings");
      }
      setSettings(data.settings ?? settings);
      toast("Scheduling saved", { variant: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function saveMemberWeight(memberId: string) {
    const raw = weightDrafts[memberId];
    const weight = Number(raw);
    if (!Number.isInteger(weight) || weight < 1 || weight > 1000) {
      toast("Weight must be an integer from 1 to 1000", { variant: "error" });
      return;
    }

    setSavingWeightId(memberId);
    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentWeight: weight }),
        },
      );
      const data = (await res.json()) as {
        member?: CalendarMember;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save weight");
      }
      if (data.member) {
        setMembers((current) =>
          current.map((member) =>
            member.id === memberId ? data.member! : member,
          ),
        );
      }
      toast("Member weight saved", { variant: "success" });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to save weight",
        { variant: "error" },
      );
    } finally {
      setSavingWeightId(null);
    }
  }

  const selectedMode = ASSIGNMENT_MODE_OPTIONS.find(
    (option) => option.value === settings.scheduling.assignmentMode,
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-grotesk text-2xl font-semibold text-neutral-900">
          Scheduling
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Member assignment and team pool settings for {calendarName}.
        </p>
      </div>

      {error ? (
        <AlertBanner variant="error" className="mb-4">
          {error}
        </AlertBanner>
      ) : null}

      {loading ? (
        <AdminPanelSkeleton section="scheduling" />
      ) : (
        <form
          onSubmit={handleSave}
          className="min-w-0 space-y-8 rounded-xl border border-neutral-100 bg-white p-4 shadow-s3 sm:p-5"
        >
          <section className="space-y-4">
            <h2 className="font-grotesk text-lg font-medium text-neutral-900">
              Member assignment
            </h2>
            <EnumSelect<AssignmentMode>
              label="Assignment mode"
              value={settings.scheduling.assignmentMode}
              options={ASSIGNMENT_MODE_OPTIONS.map(({ value, label }) => ({
                value,
                label,
              }))}
              description={selectedMode?.description}
              onChange={(value) => patchScheduling("assignmentMode", value)}
            />
          </section>

          <section className="space-y-4 border-t border-neutral-100 pt-6">
            <h2 className="font-grotesk text-lg font-medium text-neutral-900">
              Team pool
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <EnumSelect<TeamSelectionMode>
                label="Team selection mode"
                value={settings.scheduling.teamSelectionMode}
                options={[
                  { value: "url_only", label: "URL only" },
                  { value: "url_with_default", label: "URL with default team" },
                ]}
                onChange={(value) => patchScheduling("teamSelectionMode", value)}
              />
              <Label className="block space-y-1.5">
                Default team
                <select
                  value={settings.scheduling.defaultTeamId ?? ""}
                  onChange={(e) =>
                    patchScheduling(
                      "defaultTeamId",
                      e.target.value ? e.target.value : null,
                    )
                  }
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </Label>
            </div>
          </section>

          <section className="space-y-4 border-t border-neutral-100 pt-6">
            <h2 className="font-grotesk text-lg font-medium text-neutral-900">
              Reschedule
            </h2>
            <EnumSelect<RescheduleAssignmentMode>
              label="Reschedule assignment"
              value={settings.scheduling.rescheduleAssignment}
              options={[
                { value: "keep_member", label: "Keep member" },
                { value: "rerun_round_robin", label: "Re-run assignment" },
              ]}
              description="When rescheduling, keep the same member or run the configured assignment mode again."
              onChange={(value) => patchScheduling("rescheduleAssignment", value)}
            />
          </section>

          {settings.scheduling.assignmentMode === "weighted_round_robin" ? (
            <section className="space-y-4 border-t border-neutral-100 pt-6">
              <div>
                <h2 className="font-grotesk text-lg font-medium text-neutral-900">
                  Member weights
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Higher weight receives a larger share of bookings.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-y border-neutral-100 bg-neutral-25 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                      <th className="px-3 py-2">Member</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Weight</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-neutral-100 last:border-0 hover:bg-neutral-25"
                      >
                        <td className="px-3 py-2 font-medium text-neutral-900">
                          {member.displayName ?? member.email}
                        </td>
                        <td className="px-3 py-2 text-neutral-600">
                          {member.email}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            value={weightDrafts[member.id] ?? "100"}
                            onChange={(e) =>
                              setWeightDrafts((current) => ({
                                ...current,
                                [member.id]: e.target.value,
                              }))
                            }
                            className="w-24 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={savingWeightId === member.id}
                            loadingLabel="Saving…"
                            onClick={() => void saveMemberWeight(member.id)}
                          >
                            Save
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <Button
            type="submit"
            loading={saving}
            loadingLabel="Saving scheduling…"
          >
            Save scheduling
          </Button>
        </form>
      )}
    </div>
  );
}
