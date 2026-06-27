"use client";

import { AdminPanelSkeleton } from "@/components/calendar-admin/admin-panel-skeleton";
import { SlugEditor } from "@/components/calendar-admin/slug-editor";
import {
  AlertBanner,
  Button,
  Checkbox,
  EmptyState,
  Input,
  Label,
} from "@/components/ui";
import { toast } from "@/components/ui/toast";
import type { CalendarMember } from "@/lib/types";
import type { Team } from "@/lib/types/platform";
import { cn } from "@/lib/ui/cn";
import { ChevronDown, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type TeamsPanelProps = {
  calendarId: string;
  calendarName: string;
  members: CalendarMember[];
};

type MemberCheckboxListProps = {
  members: CalendarMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

function memberIdsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, index) => id === sortedB[index]);
}

function MemberCheckboxList({
  members,
  selectedIds,
  onChange,
}: MemberCheckboxListProps) {
  function toggleMember(memberId: string) {
    onChange(
      selectedIds.includes(memberId)
        ? selectedIds.filter((id) => id !== memberId)
        : [...selectedIds, memberId],
    );
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-neutral-900">Members</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange(members.map((member) => member.id))}
        >
          Select all
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([])}
        >
          Clear all
        </Button>
      </div>
      <ul className="mt-2 space-y-2">
        {members.map((member) => (
          <li key={member.id}>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedIds.includes(member.id)}
                onChange={() => toggleMember(member.id)}
              />
              <span>{member.displayName ?? member.email}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export function TeamsPanel({
  calendarId,
  calendarName,
  members,
}: TeamsPanelProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadedMembersByTeamId, setLoadedMembersByTeamId] = useState<
    Record<string, string[]>
  >({});
  const [memberDraftsByTeamId, setMemberDraftsByTeamId] = useState<
    Record<string, string[]>
  >({});
  const [loadingMembersId, setLoadingMembersId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [createMemberIds, setCreateMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/teams`);
      const data = (await res.json()) as { teams?: Team[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load teams");
      }
      setTeams(data.teams ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  async function loadTeamMembers(teamId: string) {
    setLoadingMembersId(teamId);
    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/teams/${teamId}/members`,
      );
      const data = (await res.json()) as { memberIds?: string[]; error?: string };
      if (!res.ok) {
        toast(data.error ?? "Failed to load team members", { variant: "error" });
        return;
      }
      const loaded = data.memberIds ?? [];
      setLoadedMembersByTeamId((prev) => ({ ...prev, [teamId]: loaded }));
      setMemberDraftsByTeamId((prev) => ({ ...prev, [teamId]: loaded }));
    } finally {
      setLoadingMembersId(null);
    }
  }

  async function toggleExpand(teamId: string) {
    if (expandedId === teamId) {
      setExpandedId(null);
      return;
    }

    const currentExpanded = expandedId;
    if (
      currentExpanded &&
      memberDraftsByTeamId[currentExpanded] &&
      loadedMembersByTeamId[currentExpanded] &&
      !memberIdsEqual(
        memberDraftsByTeamId[currentExpanded],
        loadedMembersByTeamId[currentExpanded],
      )
    ) {
      if (
        !window.confirm(
          "You have unsaved member changes. Discard them?",
        )
      ) {
        return;
      }
    }

    setExpandedId(teamId);

    if (memberDraftsByTeamId[teamId]) {
      return;
    }

    await loadTeamMembers(teamId);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendars/${calendarId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          memberIds: createMemberIds,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create team");
      }
      toast("Team created", { variant: "success" });
      setName("");
      setSlug("");
      setCreateMemberIds([]);
      setShowForm(false);
      await loadTeams();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setSaving(false);
    }
  }

  async function saveTeamSlug(teamId: string, slug: string): Promise<string | null> {
    const res = await fetch(`/api/calendars/${calendarId}/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      return data.error ?? "Failed to update slug";
    }
    toast("Slug updated", { variant: "success" });
    await loadTeams();
    router.refresh();
    return null;
  }

  async function saveTeamMembers(teamId: string) {
    const memberIds = memberDraftsByTeamId[teamId] ?? [];
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/calendars/${calendarId}/teams/${teamId}/members`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIds }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save members");
      }
      toast("Members updated", { variant: "success" });
      await loadTeamMembers(teamId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save members");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(team: Team) {
    if (!window.confirm(`Delete team “${team.name}”?`)) {
      return;
    }
    const res = await fetch(
      `/api/calendars/${calendarId}/teams/${team.id}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast(data.error ?? "Failed to delete team", { variant: "error" });
      return;
    }
    if (expandedId === team.id) {
      setExpandedId(null);
    }
    setLoadedMembersByTeamId((prev) => {
      const next = { ...prev };
      delete next[team.id];
      return next;
    });
    setMemberDraftsByTeamId((prev) => {
      const next = { ...prev };
      delete next[team.id];
      return next;
    });
    toast("Team deleted", { variant: "success" });
    await loadTeams();
    router.refresh();
  }

  function renderMembersEditor(teamId: string) {
    if (loadingMembersId === teamId) {
      return (
        <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading members">
          <div className="h-6 w-24 animate-pulse rounded bg-neutral-100" />
          <div className="h-24 animate-pulse rounded bg-neutral-100" />
        </div>
      );
    }

    const drafts = memberDraftsByTeamId[teamId] ?? [];
    const loaded = loadedMembersByTeamId[teamId];
    const isDirty = loaded != null && !memberIdsEqual(drafts, loaded);

    return (
      <div className="space-y-4">
        <MemberCheckboxList
          members={members}
          selectedIds={drafts}
          onChange={(ids) =>
            setMemberDraftsByTeamId((prev) => ({ ...prev, [teamId]: ids }))
          }
        />
        <Button
          type="button"
          loading={saving}
          loadingLabel="Saving members…"
          disabled={!isDirty}
          onClick={() => void saveTeamMembers(teamId)}
        >
          Save members
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-grotesk text-2xl font-semibold text-neutral-900">
          Teams
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Group members for routing and team booking links on {calendarName}.
        </p>
      </div>

      {error ? (
        <AlertBanner variant="error" className="mb-4">
          {error}
        </AlertBanner>
      ) : null}

      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => setShowForm((open) => !open)}>
          {showForm ? "Cancel" : "Add team"}
        </Button>
      </div>

      {showForm && !loading ? (
        <form
          onSubmit={handleCreate}
          className="mb-6 space-y-4 rounded-xl border border-neutral-100 bg-white p-4 shadow-s3"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="block space-y-1.5">
              Name
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Label>
            <Label className="block space-y-1.5">
              URL slug
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                placeholder="sales-team"
              />
            </Label>
          </div>
          <MemberCheckboxList
            members={members}
            selectedIds={createMemberIds}
            onChange={setCreateMemberIds}
          />
          <Button type="submit" loading={saving} loadingLabel="Creating team…">
            Create team
          </Button>
        </form>
      ) : null}

      {loading ? (
        <AdminPanelSkeleton section="teams" />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Create a team to route bookings to a member pool."
        />
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const isExpanded = expandedId === team.id;
            const memberCount = loadedMembersByTeamId[team.id]?.length;

            return (
              <div
                key={team.id}
                className="rounded-xl border border-neutral-100 bg-white shadow-s3"
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`team-panel-${team.id}`}
                    id={`team-header-${team.id}`}
                    onClick={() => void toggleExpand(team.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left text-sm transition-colors hover:bg-neutral-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 text-neutral-500 transition-transform",
                        isExpanded && "rotate-180",
                      )}
                    />
                    <span className="min-w-0 flex-1 py-0.5">
                      <span className="block font-medium text-neutral-900">
                        {team.name}
                      </span>
                      <span className="text-neutral-500">
                        {memberCount != null
                          ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
                          : team.slug}
                      </span>
                    </span>
                  </button>
                  <div className="hidden shrink-0 sm:block">
                    <SlugEditor
                      value={team.slug}
                      compact
                      onSave={(nextSlug) => saveTeamSlug(team.id, nextSlug)}
                    />
                  </div>
                  <Button
                    className="shrink-0"
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleDelete(team)}
                  >
                    Delete
                  </Button>
                </div>

                {isExpanded ? (
                  <div
                    id={`team-panel-${team.id}`}
                    role="region"
                    aria-labelledby={`team-header-${team.id}`}
                    className="border-t border-neutral-100 px-4 py-4 sm:px-5"
                  >
                    <div className="mb-4 sm:hidden">
                      <SlugEditor
                        value={team.slug}
                        compact
                        onSave={(nextSlug) => saveTeamSlug(team.id, nextSlug)}
                      />
                    </div>
                    {renderMembersEditor(team.id)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
