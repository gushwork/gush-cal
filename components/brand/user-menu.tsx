"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { useEffect, useRef, useState } from "react";

export type UserMenuProps = {
  email: string;
  signOutAction: () => void | Promise<void>;
  className?: string;
};

export function UserMenu({ email, signOutAction, className }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const displayName = email.split("@")[0] ?? email;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        className="interactive flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={displayName} size="sm" />
        <span className="hidden text-sm text-ink-muted sm:inline">{email}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-48 rounded-[var(--radius-control)] border border-border bg-surface p-2 shadow-[var(--shadow-md)]"
        >
          <p className="px-2 py-1.5 text-xs text-ink-muted">{email}</p>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              Sign out
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
