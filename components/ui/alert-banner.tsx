import { cn } from "@/lib/ui/cn";

export type AlertBannerVariant = "error" | "warning" | "info" | "success";

export type AlertBannerProps = {
  variant: AlertBannerVariant;
  children: React.ReactNode;
  className?: string;
};

const variantStyles: Record<AlertBannerVariant, string> = {
  error: "border-gw-red-100 bg-gw-red-100 text-gw-red-700",
  warning: "border-gw-orange-100 bg-gw-orange-100 text-gw-orange-700",
  info: "border-gw-blue-100 bg-gw-blue-100 text-gw-blue-700",
  success: "border-gw-green-100 bg-gw-green-100 text-gw-green-700",
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
