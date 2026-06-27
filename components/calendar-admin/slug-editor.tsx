"use client";

import { AlertBanner, Button, Input } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";

export type SlugEditorProps = {
  value: string;
  onSave: (slug: string) => Promise<string | null>;
  prefix?: string;
  className?: string;
  compact?: boolean;
};

export function SlugEditor({
  value: initialValue,
  onSave,
  prefix,
  className,
  compact = false,
}: SlugEditorProps) {
  const [editing, setEditing] = useState(false);
  const [slug, setSlug] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSlug(initialValue);
  }, [initialValue]);

  const isDirty = slug.trim().toLowerCase() !== initialValue;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);
    const saveError = await onSave(slug.trim());
    setSaving(false);

    if (saveError) {
      setError(saveError);
      return;
    }

    setEditing(false);
  }

  function handleCancel() {
    setSlug(initialValue);
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="font-mono text-sm text-neutral-600">
          {prefix ? (
            <span className="text-neutral-400">{prefix}</span>
          ) : null}
          {initialValue}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => setEditing(true)}
          aria-label={`Edit slug ${initialValue}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className={cn("space-y-2", className)}>
      {error ? (
        <AlertBanner variant="error" className="text-xs">
          {error}
        </AlertBanner>
      ) : null}
      <div className={cn("flex flex-wrap items-center gap-2", compact && "flex-col items-stretch sm:flex-row sm:items-center")}>
        {prefix ? (
          <span className="shrink-0 text-xs text-neutral-400">{prefix}</span>
        ) : null}
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="h-8 min-w-[8rem] text-sm"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <div className="flex gap-1">
          <Button type="submit" size="sm" disabled={saving || !isDirty}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
