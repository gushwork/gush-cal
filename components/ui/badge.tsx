import { cn } from "@/lib/ui/cn";

export type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "count" | "muted";
  size?: "sm" | "md";
  className?: string;
};

const variants = {
  default: "bg-primary-soft text-primary",
  count: "bg-primary text-white min-w-[1.25rem]",
  muted: "bg-paper text-ink-muted border border-border",
};

const sizes = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-pill)] font-medium",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
