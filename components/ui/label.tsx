import { cn } from "@/lib/ui/cn";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={cn("label-secondary block", className)}
      {...props}
    >
      {children}
    </label>
  );
}
