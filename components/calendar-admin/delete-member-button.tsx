"use client";

import { Dialog, Button } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/ui/cn";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DeleteMemberButtonProps = {
  calendarId: string;
  memberId: string;
  memberName: string;
  compact?: boolean;
  header?: boolean;
};

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function DeleteMemberButton({
  calendarId,
  memberId,
  memberName,
  compact = false,
  header = false,
}: DeleteMemberButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setRemoving(true);
    setError(null);

    const res = await fetch(
      `/api/calendars/${calendarId}/members/${memberId}`,
      { method: "DELETE" },
    );

    setRemoving(false);

    if (!res.ok) {
      let message = "Remove failed";
      try {
        const data = (await res.json()) as { error?: string };
        message = data.error ?? message;
      } catch {
        // ignore non-JSON error bodies
      }
      if (compact) {
        toast(message, { variant: "error" });
      } else {
        setError(message);
      }
      return;
    }

    router.push(`/calendars/${calendarId}?tab=members`);
    router.refresh();
  }

  const removeControl = header ? (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={removing}
      aria-label={removing ? "Removing member" : "Remove member"}
      onClick={() => setOpen(true)}
    >
      <TrashIcon className="mr-1.5 h-4 w-4" />
      Remove
    </Button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={removing}
      aria-label={removing ? "Removing member" : "Remove member"}
      title="Remove member"
      className={cn(
        "text-ink-muted hover:text-destructive",
        compact &&
          "opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:focus-visible:opacity-100",
      )}
      onClick={(e) => {
        if (compact) {
          e.preventDefault();
          e.stopPropagation();
        }
        setOpen(true);
      }}
    >
      <TrashIcon className="h-4 w-4" />
    </Button>
  );

  const dialog = (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Remove member?"
      description={`Remove ${memberName} from this calendar? They will no longer share availability.`}
      confirmLabel={removing ? "Removing…" : "Remove"}
      cancelLabel="Cancel"
      variant="destructive"
      onConfirm={() => void handleRemove()}
    />
  );

  if (compact) {
    return (
      <>
        {removeControl}
        {dialog}
      </>
    );
  }

  if (header) {
    return (
      <div className="flex flex-col items-end gap-2">
        {error && (
          <p className="rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {removeControl}
        {dialog}
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-border pt-6">
      {error && (
        <p className="rounded-lg bg-destructive-soft px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {removeControl}
      {dialog}
    </div>
  );
}
