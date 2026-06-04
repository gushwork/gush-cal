"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { Check, Link2 } from "lucide-react";
import { useState } from "react";

type CopyLinkButtonProps = {
  url: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
};

export function CopyLinkButton({
  url,
  variant = "primary",
  size = "md",
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => void handleCopy()}
      className="gap-2"
    >
      <span
        className={cn(
          "inline-flex transition-transform duration-200",
          copied && "scale-110",
        )}
        aria-hidden
      >
        {copied ? (
          <Check className="h-4 w-4 text-success-ink" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
      </span>
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}

type CalendarTab = "overview" | "members" | "settings";

export function CalendarTabsNav({
  calendarId,
  activeTab,
}: {
  calendarId: string;
  activeTab: CalendarTab;
}) {
  const tabs: { id: CalendarTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "members", label: "Members" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <nav aria-label="Calendar sections" className="mb-6 border-b border-border">
      <ul className="-mb-px flex gap-6 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <li key={tab.id} className="shrink-0">
              <a
                href={`/calendars/${calendarId}?tab=${tab.id}`}
                className={cn(
                  "interactive inline-block border-b-2 pb-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-muted hover:border-border hover:text-ink",
                )}
                aria-current={isActive ? "page" : undefined}
                onFocus={(e) => {
                  e.currentTarget.scrollIntoView({
                    inline: "nearest",
                    block: "nearest",
                  });
                }}
              >
                {tab.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
