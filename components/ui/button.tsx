import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/ui/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary/40",
  secondary:
    "border border-border bg-surface text-ink hover:bg-primary-soft focus-visible:ring-primary/40",
  ghost:
    "text-ink-muted hover:text-ink hover:bg-primary-soft/50 focus-visible:ring-primary/40",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40",
  link: "text-primary underline-offset-4 hover:underline focus-visible:ring-primary/40",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  asChild = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : "button"}
      disabled={disabled || loading}
      className={cn(
        "btn-press interactive inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-control)] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variant !== "link" && sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? "Loading…" : children}
    </Comp>
  );
}
