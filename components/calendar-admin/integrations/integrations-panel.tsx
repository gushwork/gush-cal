"use client";

import { AdminPanelSkeleton } from "@/components/calendar-admin/admin-panel-skeleton";
import { AlertBanner, Button, Checkbox, Input, Label } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import type {
  AppEventType,
  FieldMapping,
  SalesforceEventType,
  SalesforceFieldMap,
} from "@/lib/types/platform";
import { useCallback, useEffect, useState } from "react";

type ConnectionStatus = {
  connected: boolean;
  instanceUrl?: string;
  connectedAt?: string;
};

type WebhookEndpoint = {
  id: string;
  url: string;
  enabledEvents: AppEventType[];
  enabled: boolean;
};

const FIELD_SOURCES: FieldMapping["source"][] = [
  "guestEmail",
  "startsAt",
  "memberEmail",
  "meetingId",
  "teamSlug",
  "static",
];

const EVENT_TYPES: AppEventType[] = [
  "meeting.booked",
  "meeting.cancelled",
  "meeting.rescheduled",
  "meeting.reassigned",
  "meeting.before",
  "meeting.after",
  "salesforce.sync_succeeded",
  "salesforce.sync_failed",
  "booking.duplicate_blocked",
  "routing.owner_overflow",
];

const SF_EVENT_TYPES: SalesforceEventType[] = [
  "book",
  "cancel",
  "reschedule",
  "reassign",
];

const DEFAULT_MAP_ROWS: FieldMapping[] = [
  { source: "guestEmail", targetFieldApiName: "WhoId" },
];

type FieldMapDraft = {
  eventType: SalesforceEventType;
  objectApiName: string;
  fieldMappings: FieldMapping[];
};

type WebhookDraft = {
  url: string;
  enabledEvents: AppEventType[];
};

type IntegrationsPanelProps = {
  calendarId: string;
  calendarName: string;
};

function FieldMapForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
}: {
  draft: FieldMapDraft;
  onChange: (draft: FieldMapDraft) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel: string;
  saving?: boolean;
}) {
  function updateMapRow(index: number, patch: Partial<FieldMapping>) {
    onChange({
      ...draft,
      fieldMappings: draft.fieldMappings.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="block space-y-1.5">
          Event
          <select
            value={draft.eventType}
            onChange={(e) =>
              onChange({
                ...draft,
                eventType: e.target.value as SalesforceEventType,
              })
            }
            className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
          >
            {SF_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Label>
        <Label className="block space-y-1.5">
          Object API name
          <Input
            value={draft.objectApiName}
            onChange={(e) =>
              onChange({ ...draft, objectApiName: e.target.value })
            }
          />
        </Label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-y border-neutral-100 bg-neutral-25 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            <tr>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Target field</th>
              <th className="px-2 py-2">Static value</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {draft.fieldMappings.map((row, index) => (
              <tr key={index} className="border-b border-neutral-100">
                <td className="px-2 py-2">
                  <select
                    value={row.source}
                    onChange={(e) =>
                      updateMapRow(index, {
                        source: e.target.value as FieldMapping["source"],
                      })
                    }
                    className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm"
                  >
                    {FIELD_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={row.targetFieldApiName}
                    onChange={(e) =>
                      updateMapRow(index, {
                        targetFieldApiName: e.target.value,
                      })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    value={row.staticValue ?? ""}
                    disabled={row.source !== "static"}
                    onChange={(e) =>
                      updateMapRow(index, { staticValue: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      onChange({
                        ...draft,
                        fieldMappings: draft.fieldMappings.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onChange({
              ...draft,
              fieldMappings: [
                ...draft.fieldMappings,
                { source: "guestEmail", targetFieldApiName: "" },
              ],
            })
          }
        >
          Add row
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function WebhookForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  saving,
}: {
  draft: WebhookDraft;
  onChange: (draft: WebhookDraft) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel: string;
  saving?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Label className="block space-y-1.5">
        Endpoint URL
        <Input
          value={draft.url}
          onChange={(e) => onChange({ ...draft, url: e.target.value })}
          required
          type="url"
        />
      </Label>
      <fieldset>
        <legend className="text-sm font-medium">Events</legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {EVENT_TYPES.map((event) => (
            <label key={event} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.enabledEvents.includes(event)}
                onChange={() =>
                  onChange({
                    ...draft,
                    enabledEvents: draft.enabledEvents.includes(event)
                      ? draft.enabledEvents.filter((e) => e !== event)
                      : [...draft.enabledEvents, event],
                  })
                }
              />
              {event}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function mapToDraft(map: SalesforceFieldMap): FieldMapDraft {
  return {
    eventType: map.eventType,
    objectApiName: map.objectApiName,
    fieldMappings: map.fieldMappings.map((row) => ({ ...row })),
  };
}

export function IntegrationsPanel({
  calendarId,
  calendarName,
}: IntegrationsPanelProps) {
  const [sfStatus, setSfStatus] = useState<ConnectionStatus>({ connected: false });
  const [fieldMaps, setFieldMaps] = useState<SalesforceFieldMap[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateMap, setShowCreateMap] = useState(false);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [createMapDraft, setCreateMapDraft] = useState<FieldMapDraft>({
    eventType: "book",
    objectApiName: "Event",
    fieldMappings: DEFAULT_MAP_ROWS,
  });
  const [editMapDraft, setEditMapDraft] = useState<FieldMapDraft | null>(null);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
  const [createWebhookDraft, setCreateWebhookDraft] = useState<WebhookDraft>({
    url: "",
    enabledEvents: ["meeting.booked"],
  });
  const [editWebhookDraft, setEditWebhookDraft] = useState<WebhookDraft | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sfRes, mapsRes, hooksRes] = await Promise.all([
        fetch(`/api/calendars/${calendarId}/salesforce`),
        fetch(`/api/calendars/${calendarId}/salesforce/field-maps`),
        fetch(`/api/calendars/${calendarId}/webhooks`),
      ]);
      const sfData = (await sfRes.json()) as ConnectionStatus;
      const mapsData = (await mapsRes.json()) as {
        fieldMaps?: SalesforceFieldMap[];
      };
      const hooksData = (await hooksRes.json()) as {
        endpoints?: WebhookEndpoint[];
      };
      setSfStatus(sfData);
      setFieldMaps(mapsData.fieldMaps ?? []);
      setWebhooks(hooksData.endpoints ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function connectSalesforce(stub = false) {
    if (stub) {
      const res = await fetch(
        `/api/calendars/${calendarId}/salesforce/connect?stub=1`,
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast(data.error ?? "Connect failed", { variant: "error" });
        return;
      }
      toast("Salesforce connected (stub)", { variant: "success" });
      await loadAll();
      return;
    }
    window.location.href = `/api/calendars/${calendarId}/salesforce/connect`;
  }

  async function disconnectSalesforce() {
    const res = await fetch(`/api/calendars/${calendarId}/salesforce`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast("Failed to disconnect", { variant: "error" });
      return;
    }
    toast("Salesforce disconnected", { variant: "success" });
    await loadAll();
  }

  async function createFieldMap(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(
      `/api/calendars/${calendarId}/salesforce/field-maps`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createMapDraft),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast(data.error ?? "Failed to create field map", { variant: "error" });
      return;
    }
    toast("Field map created", { variant: "success" });
    setShowCreateMap(false);
    setCreateMapDraft({
      eventType: "book",
      objectApiName: "Event",
      fieldMappings: DEFAULT_MAP_ROWS,
    });
    await loadAll();
  }

  function startEditMap(map: SalesforceFieldMap) {
    setEditingMapId(map.id);
    setEditMapDraft(mapToDraft(map));
    setShowCreateMap(false);
  }

  function cancelEditMap() {
    setEditingMapId(null);
    setEditMapDraft(null);
  }

  async function updateFieldMap(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMapId || !editMapDraft) {
      return;
    }
    setSaving(true);
    const res = await fetch(
      `/api/calendars/${calendarId}/salesforce/field-maps/${editingMapId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editMapDraft),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast(data.error ?? "Failed to update field map", { variant: "error" });
      return;
    }
    toast("Field map updated", { variant: "success" });
    cancelEditMap();
    await loadAll();
  }

  async function deleteFieldMap(map: SalesforceFieldMap) {
    if (
      !window.confirm(
        `Delete field map for ${map.eventType} → ${map.objectApiName}?`,
      )
    ) {
      return;
    }
    const res = await fetch(
      `/api/calendars/${calendarId}/salesforce/field-maps/${map.id}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast("Failed to delete field map", { variant: "error" });
      return;
    }
    toast("Field map deleted", { variant: "success" });
    if (editingMapId === map.id) {
      cancelEditMap();
    }
    await loadAll();
  }

  async function createWebhook(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/calendars/${calendarId}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: createWebhookDraft.url.trim(),
        enabledEvents: createWebhookDraft.enabledEvents,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast(data.error ?? "Failed to create webhook", { variant: "error" });
      return;
    }
    toast("Webhook created", { variant: "success" });
    setShowCreateWebhook(false);
    setCreateWebhookDraft({ url: "", enabledEvents: ["meeting.booked"] });
    await loadAll();
  }

  function startEditWebhook(hook: WebhookEndpoint) {
    setEditingWebhookId(hook.id);
    setEditWebhookDraft({
      url: hook.url,
      enabledEvents: [...hook.enabledEvents],
    });
    setShowCreateWebhook(false);
  }

  function cancelEditWebhook() {
    setEditingWebhookId(null);
    setEditWebhookDraft(null);
  }

  async function updateWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWebhookId || !editWebhookDraft) {
      return;
    }
    setSaving(true);
    const res = await fetch(
      `/api/calendars/${calendarId}/webhooks/${editingWebhookId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: editWebhookDraft.url.trim(),
          enabledEvents: editWebhookDraft.enabledEvents,
        }),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast(data.error ?? "Failed to update webhook", { variant: "error" });
      return;
    }
    toast("Webhook updated", { variant: "success" });
    cancelEditWebhook();
    await loadAll();
  }

  async function toggleWebhookEnabled(hook: WebhookEndpoint) {
    const res = await fetch(
      `/api/calendars/${calendarId}/webhooks/${hook.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !hook.enabled }),
      },
    );
    if (!res.ok) {
      toast("Failed to update webhook", { variant: "error" });
      return;
    }
    toast(hook.enabled ? "Webhook disabled" : "Webhook enabled", {
      variant: "success",
    });
    await loadAll();
  }

  async function deleteWebhook(hook: WebhookEndpoint) {
    if (!window.confirm(`Delete webhook ${hook.url}?`)) {
      return;
    }
    const res = await fetch(
      `/api/calendars/${calendarId}/webhooks/${hook.id}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast("Failed to delete webhook", { variant: "error" });
      return;
    }
    toast("Webhook deleted", { variant: "success" });
    if (editingWebhookId === hook.id) {
      cancelEditWebhook();
    }
    await loadAll();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-grotesk text-2xl font-semibold text-neutral-900">
          Integrations
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Salesforce and webhooks for {calendarName}.
        </p>
      </div>

      {error ? (
        <AlertBanner variant="error" className="mb-4">
          {error}
        </AlertBanner>
      ) : null}

      {loading ? (
        <AdminPanelSkeleton section="integrations" />
      ) : (
        <div className="space-y-8">
          <section className="rounded-xl border border-neutral-100 bg-white p-4 shadow-s3">
            <h2 className="font-grotesk text-lg font-medium text-neutral-900">
              Salesforce
            </h2>
            {sfStatus.connected ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-neutral-600">
                  Connected to {sfStatus.instanceUrl}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void disconnectSalesforce()}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={() => void connectSalesforce(false)}>
                  Connect Salesforce
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void connectSalesforce(true)}
                >
                  Stub connect (dev)
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-neutral-100 bg-white p-4 shadow-s3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-grotesk text-lg font-medium text-neutral-900">
                Field maps
              </h2>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateMap((open) => !open);
                  cancelEditMap();
                }}
              >
                {showCreateMap ? "Cancel" : "Add field map"}
              </Button>
            </div>

            {fieldMaps.length > 0 ? (
              <ul className="mt-4 divide-y divide-neutral-100 rounded-lg border border-neutral-100">
                {fieldMaps.map((map) => (
                  <li key={map.id} className="p-3">
                    {editingMapId === map.id && editMapDraft ? (
                      <FieldMapForm
                        draft={editMapDraft}
                        onChange={setEditMapDraft}
                        onSubmit={updateFieldMap}
                        onCancel={cancelEditMap}
                        submitLabel="Save changes"
                        saving={saving}
                      />
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 text-sm">
                          <p className="font-medium text-neutral-900">
                            {map.eventType} → {map.objectApiName}
                          </p>
                          <p className="mt-0.5 text-neutral-500">
                            {map.fieldMappings.length} field
                            {map.fieldMappings.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => startEditMap(map)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => void deleteFieldMap(map)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">
                No field maps yet. Add one to sync meeting data to Salesforce.
              </p>
            )}

            {showCreateMap ? (
              <div className="mt-4 border-t border-neutral-100 pt-4">
                <FieldMapForm
                  draft={createMapDraft}
                  onChange={setCreateMapDraft}
                  onSubmit={createFieldMap}
                  submitLabel="Save field map"
                  saving={saving}
                />
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-neutral-100 bg-white p-4 shadow-s3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-grotesk text-lg font-medium text-neutral-900">
                Webhooks
              </h2>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateWebhook((open) => !open);
                  cancelEditWebhook();
                }}
              >
                {showCreateWebhook ? "Cancel" : "Add webhook"}
              </Button>
            </div>

            {webhooks.length > 0 ? (
              <ul className="mt-4 divide-y divide-neutral-100 rounded-lg border border-neutral-100">
                {webhooks.map((hook) => (
                  <li key={hook.id} className="p-3">
                    {editingWebhookId === hook.id && editWebhookDraft ? (
                      <WebhookForm
                        draft={editWebhookDraft}
                        onChange={setEditWebhookDraft}
                        onSubmit={updateWebhook}
                        onCancel={cancelEditWebhook}
                        submitLabel="Save changes"
                        saving={saving}
                      />
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 text-sm">
                          <p className="break-all font-medium text-neutral-900">
                            {hook.url}
                          </p>
                          <p className="mt-0.5 text-neutral-500">
                            {hook.enabledEvents.join(", ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                            <Checkbox
                              checked={hook.enabled}
                              onChange={() => void toggleWebhookEnabled(hook)}
                            />
                            {hook.enabled ? "Enabled" : "Disabled"}
                          </label>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => startEditWebhook(hook)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => void deleteWebhook(hook)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">
                No webhooks yet. Add one to receive event notifications.
              </p>
            )}

            {showCreateWebhook ? (
              <div className="mt-4 border-t border-neutral-100 pt-4">
                <WebhookForm
                  draft={createWebhookDraft}
                  onChange={setCreateWebhookDraft}
                  onSubmit={createWebhook}
                  submitLabel="Add webhook"
                  saving={saving}
                />
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
