"use client";

import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function CalendarsNavLink() {
  const pathname = usePathname();
  const isActive =
    pathname === "/calendars" || pathname.startsWith("/calendars/");

  return (
    <Link
      href="/calendars"
      className={cn(
        "interactive pb-0.5 font-medium",
        isActive
          ? "border-b-2 border-primary text-primary"
          : "text-neutral-500 hover:text-neutral-900",
      )}
    >
      Calendars
    </Link>
  );
}
