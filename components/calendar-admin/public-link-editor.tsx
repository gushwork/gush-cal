"use client";

import { publicBookingUrl } from "@/components/calendar-admin/validation";
import { AlertBanner, Button, Dialog, Input, Label } from "@/components/ui";
import type { Calendar } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type PublicLinkEditorProps = {
  calendarId: string;
  slug: string;
  showHeading?: boolean;
};

export function PublicLinkEditor({
  calendarId,
  slug: initialSlug,
  showHeading = true,
}: PublicLinkEditorProps) {
  const router = useRouter();
  const [slug, setSlug] = useState(initialSlug);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [randomizeOpen, setRandomizeOpen] = useState(false);

  useEffect(() => {
    setSlug(initialSlug);
  }, [initialSlug]);

  const bookingUrl = publicBookingUrl(slug);
  const isDirty = slug.trim().toLowerCase() !== initialSlug;

  async function patchSlug(body: { slug?: string; randomizeSlug?: boolean }) {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/calendars/${calendarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to update link");
      return;
    }

    const data = (await res.json()) as { calendar: Calendar };
    setSlug(data.calendar.slug);
    router.refresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) {
      return;
    }
    await patchSlug({ slug: slug.trim() });
  }

  async function handleRandomize() {
    await patchSlug({ randomizeSlug: true });
  }

  return (
    <div className="space-y-4">
      {showHeading ? (
        <div>
          <h3 className="text-heading font-semibold text-ink">Link slug</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Share the public URL with invitees. Changing the slug invalidates the
            previous link immediately.
          </p>
        </div>
      ) : null}

      {error ? (
        <AlertBanner variant="error">{error}</AlertBanner>
      ) : null}

      <p className="break-all text-sm text-ink">
        <a
          href={bookingUrl}
          className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
          target="_blank"
          rel="noreferrer"
        >
          {bookingUrl}
        </a>
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <Label className="block space-y-1.5">
          Link slug
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="eng-panel"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="block text-xs text-ink-muted">
            Lowercase letters, numbers, and hyphens only (3–64 characters).
          </span>
        </Label>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="sm" disabled={saving || !isDirty}>
            {saving ? "Saving…" : "Save slug"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => setRandomizeOpen(true)}
          >
            Randomize
          </Button>
        </div>
      </form>

      <Dialog
        open={randomizeOpen}
        onOpenChange={setRandomizeOpen}
        title="Randomize public link?"
        description="The current booking URL will stop working. Anyone with the old link will no longer be able to book."
        confirmLabel="Randomize"
        variant="destructive"
        onConfirm={() => void handleRandomize()}
      />
    </div>
  );
}
