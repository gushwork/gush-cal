import { cn } from "@/lib/ui/cn";

export type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "count" | "muted";
  className?: string;
};

const variants = {
  default: "bg-primary-soft text-primary",
  count: "bg-primary text-white min-w-[1.25rem]",
  muted: "bg-paper text-ink-muted border border-border",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
