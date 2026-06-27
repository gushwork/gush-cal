"use client";

import { AdminPanelSkeleton } from "@/components/calendar-admin/admin-panel-skeleton";
import { AlertBanner, Button, EmptyState, Input, Label } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import type { ApiKeySummary } from "@/lib/events/api-keys";
import { KeyRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ApiKeysPanelProps = {
  calendarId: string;
  calendarName: string;
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Never";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ApiKeysPanel({ calendarId, calendarName }: ApiKeysPanelProps) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyName, setApiKeyName] = useState("");
  const [newPlaintextKey, setNewPlaintextKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/keys`);
      const data = (await res.json()) as { keys?: ApiKeySummary[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load API keys");
      }
      setKeys(data.keys ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: apiKeyName.trim() }),
      });
      const data = (await res.json()) as {
        key?: ApiKeySummary & { plaintextKey: string };
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create API key");
      }
      setNewPlaintextKey(data.key?.plaintextKey ?? null);
      setApiKeyName("");
      toast("API key created — copy it now", { variant: "success" });
      await loadKeys();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to create API key",
        { variant: "error" },
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(key: ApiKeySummary) {
    if (!window.confirm(`Revoke API key “${key.name}”? It will stop working immediately.`)) {
      return;
    }
    const res = await fetch(
      `/api/calendars/${calendarId}/keys/${key.id}`,
      { method: "PATCH" },
    );
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast(data.error ?? "Failed to revoke key", { variant: "error" });
      return;
    }
    toast("API key revoked", { variant: "success" });
    await loadKeys();
  }

  async function handleDelete(key: ApiKeySummary) {
    if (!window.confirm(`Delete API key “${key.name}”? This cannot be undone.`)) {
      return;
    }
    const res = await fetch(
      `/api/calendars/${calendarId}/keys/${key.id}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast(data.error ?? "Failed to delete key", { variant: "error" });
      return;
    }
    toast("API key deleted", { variant: "success" });
    await loadKeys();
  }

  const activeKeys = keys.filter((key) => !key.revokedAt);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-grotesk text-2xl font-semibold text-neutral-900">
          API keys
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Programmatic access for {calendarName}. Keys are shown once at creation.
        </p>
      </div>

      {error ? (
        <AlertBanner variant="error" className="mb-4">
          {error}
        </AlertBanner>
      ) : null}

      {newPlaintextKey ? (
        <AlertBanner variant="info" className="mb-4">
          Copy your new key now — it will not be shown again:{" "}
          <code className="font-mono">{newPlaintextKey}</code>
        </AlertBanner>
      ) : null}

      <form
        onSubmit={handleCreate}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-neutral-100 bg-white p-4 shadow-s3"
      >
        <Label className="block min-w-[12rem] flex-1 space-y-1.5">
          Key name
          <Input
            value={apiKeyName}
            onChange={(e) => setApiKeyName(e.target.value)}
            required
            placeholder="Production webhook client"
          />
        </Label>
        <Button type="submit" disabled={creating}>
          {creating ? "Creating…" : "Create API key"}
        </Button>
      </form>

      {loading ? (
        <AdminPanelSkeleton section="api keys" />
      ) : keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Create a key to authenticate calendar API requests."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-s3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-neutral-100 bg-neutral-25 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Created by</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last used</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {key.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {key.createdBy
                        ? `${key.createdBy.name} (${key.createdBy.email})`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {formatTimestamp(key.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {formatTimestamp(key.lastUsedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          key.revokedAt
                            ? "text-neutral-400"
                            : "text-emerald-700"
                        }
                      >
                        {key.revokedAt ? "Revoked" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!key.revokedAt ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleRevoke(key)}
                          >
                            Revoke
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleDelete(key)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeKeys.length === 0 && keys.length > 0 ? (
            <p className="border-t border-neutral-100 px-4 py-3 text-sm text-neutral-500">
              All keys are revoked. Delete unused keys or create a new key to restore API access.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
