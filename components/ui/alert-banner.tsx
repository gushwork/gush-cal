import { cn } from "@/lib/ui/cn";

export type AlertBannerVariant = "error" | "warning" | "info" | "success";

export type AlertBannerProps = {
  variant: AlertBannerVariant;
  children: React.ReactNode;
  className?: string;
};

const variantStyles: Record<AlertBannerVariant, string> = {
  error: "border-destructive/30 bg-destructive-soft text-destructive",
  warning: "border-accent/30 bg-accent-soft text-accent",
  info: "border-primary/30 bg-primary-soft text-ink",
  success: "border-success-ink/30 bg-success-soft text-success-ink",
};

export function AlertBanner({
  variant,
  children,
  className,
}: AlertBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-[var(--radius-control)] border px-4 py-3 text-sm",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
