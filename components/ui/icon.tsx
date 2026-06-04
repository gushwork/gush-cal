import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/ui/cn";

export type IconProps = {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

const sizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

export function Icon({ icon: IconComponent, size = "md", className, label }: IconProps) {
  return (
    <IconComponent
      className={cn("shrink-0", sizes[size], className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  );
}
