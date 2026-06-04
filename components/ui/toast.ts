import { toast as sonner } from "sonner";

export type ToastVariant = "success" | "error" | "info";

type ToastOptions = { variant?: ToastVariant; duration?: number };

export function toast(message: string, options?: ToastOptions) {
  const duration = options?.duration ?? 4000;
  const variant = options?.variant ?? "info";

  if (variant === "success") {
    sonner.success(message, { duration });
    return;
  }
  if (variant === "error") {
    sonner.error(message, { duration });
    return;
  }
  sonner(message, { duration });
}

export function useToast() {
  return { toast };
}
