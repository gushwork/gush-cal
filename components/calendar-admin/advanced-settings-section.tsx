"use client";

import { cn } from "@/lib/ui/cn";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

export type AdvancedSettingsSectionProps = {
  title?: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function AdvancedSettingsSection({
  title = "Advanced settings",
  description,
  defaultOpen = false,
  children,
  className,
}: AdvancedSettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className={cn("border-t border-border pt-6", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h3 className="font-grotesk text-base font-medium text-neutral-900">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-neutral-500 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="mt-4 space-y-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
