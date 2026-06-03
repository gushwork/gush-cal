import { cn } from "@/lib/ui/cn";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  error?: string;
};

export function Label({ className, children, error, ...props }: LabelProps) {
  return (
    <label
      className={cn("block text-sm font-medium text-ink", className)}
      {...props}
    >
      {children}
      {error && <span className="mt-1 block text-xs text-primary">{error}</span>}
    </label>
  );
}
