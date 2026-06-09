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
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-100 bg-white px-6 py-12 text-center shadow-s3",
        className,
      )}
    >
      {Icon && (
        <Icon className="mb-4 h-10 w-10 text-neutral-500" aria-hidden />
      )}
      <h2 className="font-grotesk text-title font-semibold text-neutral-900">
        {title}
      </h2>
      {description && (
        <p className="prose-measure mt-2 text-sm leading-body text-neutral-500">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
