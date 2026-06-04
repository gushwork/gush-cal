import { cn } from "@/lib/ui/cn";

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export type AvatarProps = {
  name: string;
  size?: "sm" | "md";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
} as const;

export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-medium text-primary",
        sizes[size],
        className,
      )}
    >
      {initialsFromName(name)}
    </span>
  );
}
