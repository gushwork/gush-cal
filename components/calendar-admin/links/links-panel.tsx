"use client";

import { AdminPanelSkeleton } from "@/components/calendar-admin/admin-panel-skeleton";
import { CopyLinkButton } from "@/components/calendar-admin/copy-link-button";
import { SlugEditor } from "@/components/calendar-admin/slug-editor";
import { AlertBanner, Button, EmptyState, Input, Label } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import type { CalendarMember } from "@/lib/types";
import type { BookingLink, BookingLinkKind, Team } from "@/lib/types/platform";
import { Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type LinksPanelProps = {
  calendarId: string;
  calendarName: string;
  members: CalendarMember[];
};

export function LinksPanel({
  calendarId,
  calendarName,
  members,
}: LinksPanelProps) {
  const router = useRouter();
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<BookingLinkKind>("team");
  const [slug, setSlug] = useState("");
  const [teamId, setTeamId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [linksRes, teamsRes] = await Promise.all([
        fetch(`/api/calendars/${calendarId}/links`),
        fetch(`/api/calendars/${calendarId}/teams`),
      ]);
      const linksData = (await linksRes.json()) as {
        links?: BookingLink[];
        error?: string;
      };
      const teamsData = (await teamsRes.json()) as {
        teams?: Team[];
        error?: string;
      };
      if (!linksRes.ok) {
        throw new Error(linksData.error ?? "Failed to load links");
      }
      setLinks(linksData.links ?? []);
      setTeams(teamsData.teams ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load links");
    } finally {
      setLoading(false);
    }
  }, [calendarId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { kind };
      if (kind === "team") {
        body.teamId = teamId;
        body.slug = slug.trim();
      } else if (kind === "member") {
        body.memberId = memberId;
        if (slug.trim()) {
          body.slug = slug.trim();
        }
      } else {
        body.slug = slug.trim();
      }

      const res = await fetch(`/api/calendars/${calendarId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create link");
      }
      toast("Link created", { variant: "success" });
      setSlug("");
      setTeamId("");
      setMemberId("");
      await loadData();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setSaving(false);
    }
  }

  async function saveLinkSlug(linkId: string, slug: string): Promise<string | null> {
    const res = await fetch(`/api/calendars/${calendarId}/links/${linkId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      return data.error ?? "Failed to update slug";
    }
    toast("Slug updated", { variant: "success" });
    await loadData();
    router.refresh();
    return null;
  }

  async function handleToggle(link: BookingLink) {
    const res = await fetch(
      `/api/calendars/${calendarId}/links/${link.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !link.enabled }),
      },
    );
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast(data.error ?? "Failed to update link", { variant: "error" });
      return;
    }
    await loadData();
  }

  async function handleDelete(link: BookingLink) {
    if (!window.confirm("Delete this booking link?")) {
      return;
    }
    const res = await fetch(
      `/api/calendars/${calendarId}/links/${link.id}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast(data.error ?? "Failed to delete link", { variant: "error" });
      return;
    }
    toast("Link deleted", { variant: "success" });
    await loadData();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-grotesk text-2xl font-semibold text-neutral-900">
          Booking links
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Public URLs for team, member, and calendar booking on {calendarName}.
        </p>
      </div>

      {error ? (
        <AlertBanner variant="error" className="mb-4">
          {error}
        </AlertBanner>
      ) : null}

      {!loading ? (
      <form
        onSubmit={handleCreate}
        className="mb-6 space-y-4 rounded-xl border border-neutral-100 bg-white p-4 shadow-s3"
      >
        <h2 className="font-grotesk text-lg font-medium text-neutral-900">
          Create link
        </h2>
        <Label className="block space-y-1.5">
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as BookingLinkKind)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <option value="team">Team</option>
            <option value="member">Member</option>
            <option value="calendar">Calendar</option>
          </select>
        </Label>
        {kind === "team" ? (
          <Label className="block space-y-1.5">
            Team
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select team…</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </Label>
        ) : null}
        {kind === "member" ? (
          <Label className="block space-y-1.5">
            Member
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select member…</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName ?? member.email}
                </option>
              ))}
            </select>
          </Label>
        ) : null}
        {kind !== "member" ? (
          <Label className="block space-y-1.5">
            Slug
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </Label>
        ) : (
          <Label className="block space-y-1.5">
            Slug (optional)
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </Label>
        )}
        <Button type="submit" loading={saving} loadingLabel="Creating link…">
          Create link
        </Button>
      </form>
      ) : null}

      {loading ? (
        <AdminPanelSkeleton section="links" />
      ) : links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No booking links"
          description="Create a link to share team or member booking URLs."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-s3">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-y border-neutral-100 bg-neutral-25 text-xs font-semibold uppercase tracking-wide text-neutral-600">
              <tr>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr
                  key={link.id}
                  className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-25"
                >
                  <td className="px-4 py-3 capitalize text-neutral-900">
                    {link.kind}
                  </td>
                  <td className="px-4 py-3">
                    <SlugEditor
                      value={link.slug}
                      compact
                      onSave={(nextSlug) => saveLinkSlug(link.id, nextSlug)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        link.enabled
                          ? "inline-flex rounded-full bg-gw-green-100 px-2.5 py-0.5 text-xs font-medium text-gw-green-700"
                          : "inline-flex rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600"
                      }
                    >
                      {link.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {link.publicUrl ? (
                        <CopyLinkButton
                          url={
                            link.publicUrl.startsWith("http")
                              ? link.publicUrl
                              : `${window.location.origin}${link.publicUrl}`
                          }
                          variant="secondary"
                          size="sm"
                        />
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleToggle(link)}
                      >
                        {link.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleDelete(link)}
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
        </div>
      )}
    </div>
  );
}
