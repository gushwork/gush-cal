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
          className="interactive mb-3 inline-block text-sm text-ink-muted hover:text-primary"
        >
          ← {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-title leading-heading font-display font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {subtitle && (
        <p className="prose-measure mt-2 text-sm leading-body text-ink-muted">
          {subtitle}
        </p>
      )}
    </header>
  );
}
