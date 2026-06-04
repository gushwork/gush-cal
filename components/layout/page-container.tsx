import { cn } from "@/lib/ui/cn";

export type PageContainerVariant =
  | "default"
  | "narrow"
  | "form-wide"
  | "booking"
  | "grid";

export type PageContainerProps = {
  variant?: PageContainerVariant;
  children: React.ReactNode;
  className?: string;
};

const variants: Record<PageContainerVariant, string> = {
  default:
    "mx-auto w-full max-w-[var(--content-admin)] px-[var(--page-px)] py-[var(--page-py)]",
  narrow:
    "mx-auto w-full max-w-[var(--content-form)] px-[var(--page-px)] py-[var(--page-py)]",
  "form-wide":
    "mx-auto w-full max-w-[var(--content-form-wide)] px-[var(--page-px)] py-[var(--page-py)]",
  booking:
    "mx-auto w-full max-w-[var(--content-booking)] px-[var(--page-px)] py-[var(--page-py)]",
  grid:
    "flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden px-[var(--page-px)]",
};

export function PageContainer({
  variant = "default",
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn(variants[variant], className)}>{children}</div>
  );
}
