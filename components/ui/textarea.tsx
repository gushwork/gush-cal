import { cn } from "@/lib/ui/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
};

export function Textarea({
  className,
  error,
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaProps) {
  return (
    <textarea
      aria-invalid={ariaInvalid ?? (error ? true : undefined)}
      className={cn(
        "focus-ring leading-ui w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary",
        error && "border-destructive focus:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
