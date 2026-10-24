"use client";

import { cn } from "@/lib/ui/cn";
import {
  CalendarClock,
  Clock,
  GitBranch,
  KeyRound,
  LayoutGrid,
  Link2,
  Mail,
  Plug,
  Settings,
  Shield,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export type CalendarSidebarProps = {
  calendarId: string;
};

function buildGroups(calendarId: string): NavGroup[] {
  const base = `/calendars/${calendarId}`;
  return [
    {
      label: "Calendar",
      items: [
        { id: "overview", label: "Overview", href: base, icon: LayoutGrid, exact: true },
        { id: "members", label: "Members", href: `${base}/members`, icon: Users },
        { id: "settings", label: "Settings", href: `${base}/settings`, icon: Settings },
      ],
    },
    {
      label: "Platform",
      items: [
        { id: "teams", label: "Teams", href: `${base}/teams`, icon: Users },
        { id: "links", label: "Links", href: `${base}/links`, icon: Link2 },
        {
          id: "scheduling",
          label: "Scheduling",
          href: `${base}/scheduling`,
          icon: GitBranch,
        },
        { id: "policies", label: "Policies", href: `${base}/policies`, icon: Shield },
        {
          id: "integrations",
          label: "Integrations",
          href: `${base}/integrations`,
          icon: Plug,
        },
        {
          id: "api-keys",
          label: "API keys",
          href: `${base}/api-keys`,
          icon: KeyRound,
        },
        {
          id: "sequences",
          label: "Sequences",
          href: `${base}/sequences`,
          icon: Mail,
        },
      ],
    },
    {
      label: "Actions",
      items: [
        { id: "book", label: "Book", href: `${base}/book`, icon: Video },
        {
          id: "availability",
          label: "Availability",
          href: `${base}/availability`,
          icon: Clock,
        },
        {
          id: "meetings",
          label: "Meetings",
          href: `${base}/meetings`,
          icon: CalendarClock,
        },
      ],
    },
  ];
}

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function CalendarSidebar({ calendarId }: CalendarSidebarProps) {
  const pathname = usePathname();
  const groups = buildGroups(calendarId);
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  // Below lg the nav is a horizontal strip; center the active item in it.
  // Only the strip scrolls (never the page); a no-op for the vertical sidebar.
  useEffect(() => {
    const nav = navRef.current;
    const link = activeRef.current;
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) {
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    nav.scrollLeft +=
      linkRect.left - navRect.left - (navRect.width - linkRect.width) / 2;
  }, [pathname]);

  return (
    <nav
      ref={navRef}
      aria-label="Calendar navigation"
      className="-mx-[var(--page-px)] w-auto min-w-0 shrink-0 overflow-x-auto px-[var(--page-px)] [scrollbar-width:none] lg:mx-0 lg:w-56 lg:overflow-visible lg:px-0"
    >
      <div className="flex w-max items-center gap-1 lg:block lg:w-auto lg:space-y-6">
        {groups.map((group, groupIndex) => (
          <div
            key={group.label}
            className={cn(
              "flex items-center gap-1 lg:block",
              groupIndex > 0 &&
                "border-l border-neutral-100 pl-1 lg:border-0 lg:pl-0",
            )}
          >
            <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wide text-neutral-600 lg:block">
              {group.label}
            </p>
            <ul className="flex gap-1 lg:block lg:space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      ref={active ? activeRef : undefined}
                      href={item.href}
                      className={cn(
                        "interactive flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors lg:gap-2.5 lg:rounded-md lg:py-2",
                        active
                          ? "bg-neutral-100 text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-25 hover:text-neutral-900",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
