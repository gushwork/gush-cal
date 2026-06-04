"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <DialogPrimitive.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-control)] border border-border bg-surface p-6 shadow-[var(--shadow-md)] focus:outline-none",
          )}
        >
          <DialogPrimitive.Title className="text-title font-display font-semibold text-ink">
            {title}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description className="mt-2 text-sm text-ink-muted">
              {description}
            </DialogPrimitive.Description>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="secondary" size="sm">
                {cancelLabel}
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="button"
              variant={variant === "destructive" ? "destructive" : "primary"}
              size="sm"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
