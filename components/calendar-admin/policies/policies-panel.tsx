"use client";

import { AdminPanelSkeleton } from "@/components/calendar-admin/admin-panel-skeleton";
import { AlertBanner, Button, Label } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import type {
  CalendarSettings,
  DuplicateScope,
  DuplicateUxMode,
  ManageUrlInjection,
  OwnerNoSlotsPolicy,
  PostBookMode,
  SyncMode,
  UnbookableOwnerPolicy,
} from "@/lib/types/platform";
import { defaultCalendarSettings } from "@/lib/types/platform";
import { useCallback, useEffect, useState } from "react";

type PoliciesPanelProps = {
  calendarId: string;
  calendarName: string;
};

function EnumSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
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
    </Label>
  );
}

export function PoliciesPanel({
  calendarId,
  calendarName,
}: PoliciesPanelProps) {
  const [settings, setSettings] = useState<CalendarSettings>(
    defaultCalendarSettings(),
  );
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as {
        settings?: CalendarSettings;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save settings");
      }
      setSettings(data.settings ?? settings);
      toast("Policies saved", { variant: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function patchRouting<K extends keyof CalendarSettings["routing"]>(
    key: K,
    value: CalendarSettings["routing"][K],
  ) {
    setSettings((current) => ({
      ...current,
      routing: { ...current.routing, [key]: value },
    }));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-grotesk text-2xl font-semibold text-neutral-900">
          Policies
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Routing, duplicate handling, and post-book behavior for {calendarName}.
        </p>
      </div>

      {error ? (
        <AlertBanner variant="error" className="mb-4">
          {error}
        </AlertBanner>
      ) : null}

      {loading ? (
        <AdminPanelSkeleton section="policies" />
      ) : (
        <form
          onSubmit={handleSave}
          className="min-w-0 space-y-8 rounded-xl border border-neutral-100 bg-white p-4 shadow-s3 sm:p-5"
        >
          <section className="space-y-4">
            <h2 className="font-grotesk text-lg font-medium text-neutral-900">
              Routing
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <EnumSelect<UnbookableOwnerPolicy>
                label="Unbookable owner policy"
                value={settings.routing.unbookableOwnerPolicy}
                options={[
                  {
                    value: "fallback_team_pool",
                    label: "Fallback to team pool",
                  },
                  {
                    value: "fallback_team_pool_reassign",
                    label: "Fallback and reassign",
                  },
                ]}
                onChange={(value) => patchRouting("unbookableOwnerPolicy", value)}
              />
              <EnumSelect<OwnerNoSlotsPolicy>
                label="Owner has no slots"
                value={settings.routing.ownerNoSlotsPolicy}
                options={[
                  { value: "strict_owner", label: "Strict owner" },
                  { value: "overflow_team_pool", label: "Overflow to team pool" },
                ]}
                onChange={(value) => patchRouting("ownerNoSlotsPolicy", value)}
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-neutral-100 pt-6">
            <h2 className="font-grotesk text-lg font-medium text-neutral-900">
              Duplicate bookings
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <EnumSelect<DuplicateScope>
                label="Scope"
                value={settings.duplicate.scope}
                options={[
                  { value: "calendar", label: "Calendar" },
                  { value: "scheduler", label: "Scheduler" },
                  { value: "deployment", label: "Deployment" },
                  {
                    value: "salesforce_connection",
                    label: "Salesforce connection",
                  },
                ]}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    duplicate: { ...current.duplicate, scope: value },
                  }))
                }
              />
              <EnumSelect<DuplicateUxMode>
                label="Guest UX"
                value={settings.duplicate.uxMode}
                options={[
                  { value: "hard_block", label: "Hard block" },
                  { value: "soft_warn", label: "Soft warn" },
                ]}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    duplicate: { ...current.duplicate, uxMode: value },
                  }))
                }
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-neutral-100 pt-6">
            <h2 className="font-grotesk text-lg font-medium text-neutral-900">
              Post-book redirect
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <EnumSelect<PostBookMode>
                label="After booking"
                value={settings.redirect.postBookMode}
                options={[
                  { value: "confirmation_page", label: "Confirmation page" },
                  { value: "redirect", label: "Redirect URL" },
                ]}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    redirect: { ...current.redirect, postBookMode: value },
                  }))
                }
              />
              <EnumSelect<ManageUrlInjection>
                label="Manage link in emails"
                value={settings.manageUrlInjection}
                options={[
                  { value: "auto_inject", label: "Auto inject" },
                  { value: "template_opt_in", label: "Template opt-in" },
                ]}
                onChange={(value) =>
                  setSettings((current) => ({
                    ...current,
                    manageUrlInjection: value,
                  }))
                }
              />
              {settings.redirect.postBookMode === "redirect" ? (
                <Label className="block space-y-1.5 sm:col-span-2">
                  Redirect URL template
                  <input
                    type="text"
                    value={settings.redirect.redirectUrlTemplate ?? ""}
                    onChange={(e) =>
                      setSettings((current) => ({
                        ...current,
                        redirect: {
                          ...current.redirect,
                          redirectUrlTemplate: e.target.value || null,
                        },
                      }))
                    }
                    placeholder="https://example.com/thanks?meeting={{meetingId}}"
                    className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                  />
                </Label>
              ) : null}
            </div>
          </section>

          <section className="space-y-4 border-t border-neutral-100 pt-6">
            <h2 className="font-grotesk text-lg font-medium text-neutral-900">
              Salesforce sync timing
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["onBook", "On book"],
                  ["onCancel", "On cancel"],
                  ["onReschedule", "On reschedule"],
                  ["onReassign", "On reassign"],
                ] as const
              ).map(([key, label]) => (
                <EnumSelect<SyncMode>
                  key={key}
                  label={label}
                  value={settings.salesforceSync[key]}
                  options={[
                    { value: "sync", label: "Sync" },
                    { value: "async", label: "Async" },
                  ]}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      salesforceSync: {
                        ...current.salesforceSync,
                        [key]: value,
                      },
                    }))
                  }
                />
              ))}
            </div>
          </section>

          <Button type="submit" loading={saving} loadingLabel="Saving policies…">
            Save policies
          </Button>
        </form>
      )}
    </div>
  );
}
