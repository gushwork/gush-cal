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

  return (
    <nav
      aria-label="Calendar navigation"
      className="w-full min-w-0 shrink-0 lg:w-56"
    >
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={cn(
                        "interactive flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
