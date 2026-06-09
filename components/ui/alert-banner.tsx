import { cn } from "@/lib/ui/cn";

export type AlertBannerVariant = "error" | "warning" | "info" | "success";

export type AlertBannerProps = {
  variant: AlertBannerVariant;
  children: React.ReactNode;
  className?: string;
};

const variantStyles: Record<AlertBannerVariant, string> = {
  error: "border-status-error-100 bg-status-error-100 text-status-error-700",
  warning: "border-status-warning-100 bg-status-warning-100 text-status-warning-700",
  info: "border-status-info-100 bg-status-info-100 text-status-info-700",
  success: "border-status-success-100 bg-status-success-100 text-status-success-700",
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
        "rounded-lg border px-4 py-3 text-sm",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
