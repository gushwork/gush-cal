"use client";

import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Header link to the App Admin platform usage dashboard (App Admins only). */
export function AdminNavLink() {
  const pathname = usePathname();
  const isActive = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <Link
      href="/admin"
      className={cn(
        "interactive pb-0.5 font-medium",
        isActive
          ? "border-b-2 border-primary text-primary"
          : "text-neutral-500 hover:text-neutral-900",
      )}
    >
      Admin
    </Link>
  );
}
