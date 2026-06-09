import { cn } from "@/lib/ui/cn";

export type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "count" | "muted" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  className?: string;
};

const variants = {
  default: "bg-primary-25 text-primary-500",
  count: "min-w-[1.25rem] bg-primary text-white",
  muted: "border border-neutral-100 bg-neutral-25 text-neutral-600",
  success: "bg-gw-green-100 text-gw-green-700",
  warning: "bg-gw-orange-100 text-gw-orange-700",
  error: "bg-gw-red-100 text-gw-red-700",
  info: "bg-gw-blue-100 text-gw-blue-700",
};

const sizes = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-xs",
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
        "inline-flex items-center justify-center rounded-full font-medium",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
