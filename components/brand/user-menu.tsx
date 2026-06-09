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
        className="interactive flex items-center gap-2 rounded-md px-2 py-1.5"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={displayName} size="sm" />
        <span className="hidden text-sm text-neutral-500 sm:inline">{email}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-48 rounded-lg border border-neutral-100 bg-white p-2 shadow-s4"
        >
          <p className="px-2 py-1.5 text-xs text-neutral-500">{email}</p>
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
