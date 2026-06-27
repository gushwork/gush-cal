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
  loadingLabel?: string;
  asChild?: boolean;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-600 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  secondary:
    "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-25 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  ghost:
    "text-neutral-500 hover:bg-neutral-25 hover:text-neutral-900 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 focus-visible:ring-[3px]",
  link: "text-primary underline-offset-4 hover:underline focus-visible:ring-primary/40",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-9 gap-2 px-4 text-sm",
  lg: "h-10 gap-2 px-6 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
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
        "btn-press interactive inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4",
        variant !== "link" && sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? (loadingLabel ?? "Loading…") : children}
    </Comp>
  );
}
