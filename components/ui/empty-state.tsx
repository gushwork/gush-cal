import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui/cn";

export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-control)] border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <Icon className="mb-4 h-10 w-10 text-ink-muted" aria-hidden />
      )}
      <h2 className="text-title font-display font-semibold text-ink">{title}</h2>
      {description && (
        <p className="prose-measure mt-2 text-sm leading-body text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
