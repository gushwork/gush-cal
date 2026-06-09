import { cn } from "@/lib/ui/cn";

export type ChipShape = "control" | "pill";
export type ChipTone = "choice" | "filter";

export type ChipProps = {
  selected?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  shape?: ChipShape;
  tone?: ChipTone;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  "aria-pressed"?: boolean;
};

const sizes = {
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-1.5 text-sm",
} as const;

export function Chip({
  selected = false,
  disabled = false,
  size = "md",
  shape = "pill",
  tone = "choice",
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
        "interactive inline-flex cursor-pointer items-center justify-center gap-1.5 border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        shape === "pill"
          ? "rounded-[var(--radius-pill)]"
          : "rounded-[var(--radius-control)]",
        sizes[size],
        tone === "choice"
          ? selected
            ? "border-primary bg-primary text-white"
            : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-25"
          : selected
            ? "border-neutral-300 bg-neutral-100 text-neutral-900"
            : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:text-neutral-600",
        className,
      )}
    >
      {children}
    </button>
  );
}
