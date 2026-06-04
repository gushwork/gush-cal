import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/ui/cn";
import { Label } from "./label";

export type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {hint && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {isValidElement(children)
        ? cloneElement(
            children as React.ReactElement<{
              id?: string;
              "aria-describedby"?: string;
              "aria-invalid"?: boolean;
              error?: string;
            }>,
            {
              id,
              "aria-describedby": describedBy,
              "aria-invalid": error ? true : undefined,
              error,
            },
          )
        : children}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
