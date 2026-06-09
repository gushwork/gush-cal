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
        "min-h-20 w-full min-w-0 rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm text-neutral-900 shadow-sm transition-[color,box-shadow] outline-none placeholder:text-neutral-500 selection:bg-primary selection:text-white focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-destructive focus-visible:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
