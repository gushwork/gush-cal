import { cn } from "@/lib/ui/cn";

export type ChipShape = "control" | "pill";

export type ChipProps = {
  selected?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  shape?: ChipShape;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  "aria-pressed"?: boolean;
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
} as const;

export function Chip({
  selected = false,
  disabled = false,
  size = "md",
  shape = "control",
  children,
  onClick,
  className,
  "aria-pressed": ariaPressed,
}: ChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={ariaPressed ?? selected}
      onClick={onClick}
      className={cn(
        "interactive inline-flex cursor-pointer items-center justify-center border font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        shape === "pill" ? "rounded-[var(--radius-pill)]" : "rounded-[var(--radius-control)]",
        sizes[size],
        selected
          ? "border-primary bg-primary text-white"
          : "border-border bg-surface text-ink hover:border-primary hover:bg-primary-soft",
        className,
      )}
    >
      {children}
    </button>
  );
}
