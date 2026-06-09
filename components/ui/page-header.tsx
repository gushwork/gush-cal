import Link from "next/link";
import { cn } from "@/lib/ui/cn";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  compact?: boolean;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  compact = false,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        compact ? "mb-[var(--section-gap)]" : "mb-8",
        className,
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          className="interactive mb-3 inline-block text-sm text-neutral-500 hover:text-primary"
        >
          ← {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-grotesk text-[28px] leading-heading font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {subtitle && (
        <p className="prose-measure mt-2 text-sm leading-body text-neutral-500">
          {subtitle}
        </p>
      )}
    </header>
  );
}
