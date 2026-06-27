"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";
import { LayoutGrid, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type UserMenuProps = {
  email: string;
  name?: string;
  signOutAction: () => void | Promise<void>;
  className?: string;
};

export function UserMenu({ email, name, signOutAction, className }: UserMenuProps) {
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

  const displayName = name?.trim() || email.split("@")[0] || email;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        className="interactive flex items-center gap-2 rounded-md px-2 py-1.5"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={displayName} size="sm" />
        <span className="hidden flex-col items-start sm:flex">
          <span className="text-sm font-medium text-neutral-900">{displayName}</span>
          <span className="text-xs text-neutral-500">{email}</span>
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-52 rounded-lg border border-neutral-100 bg-white p-2 shadow-s4"
        >
          <div className="px-2 py-2">
            <p className="text-sm font-medium text-neutral-900">{displayName}</p>
            <p className="text-xs text-neutral-500">{email}</p>
          </div>
          <div className="my-1 border-t border-neutral-100" />
          <Link
            href="/calendars"
            role="menuitem"
            className="interactive flex items-center gap-2 rounded-md px-2 py-2 text-sm text-neutral-700 hover:bg-neutral-25 hover:text-neutral-900"
            onClick={() => setOpen(false)}
          >
            <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
            Calendars
          </Link>
          <div className="my-1 border-t border-neutral-100" />
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              role="menuitem"
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              Sign out
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
