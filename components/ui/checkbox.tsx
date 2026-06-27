import { Check } from "lucide-react";
import { cn } from "@/lib/ui/cn";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <span className="relative inline-grid size-4 shrink-0 place-items-center">
      <input
        type="checkbox"
        className={cn(
          "peer col-start-1 row-start-1 size-4 cursor-pointer appearance-none rounded-sm border border-neutral-200 bg-white shadow-sm transition-[color,box-shadow,background-color,border-color] outline-none",
          "checked:border-primary checked:bg-primary",
          "hover:border-neutral-300 hover:bg-neutral-25 hover:checked:border-primary-600 hover:checked:bg-primary-600",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <Check
        className="pointer-events-none col-start-1 row-start-1 size-2.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
        strokeWidth={3}
        aria-hidden
      />
    </span>
  );
}
