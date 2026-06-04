"use client";

import type { CSSProperties } from "react";
import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      duration={4000}
      offset={16}
      gap={8}
      theme="light"
      style={
        {
          fontFamily: "var(--font-body), system-ui, sans-serif",
          "--width": "min(24rem, calc(100vw - 2rem))",
        } as CSSProperties
      }
      toastOptions={{
        style: {
          background: "var(--surface)",
          color: "var(--ink)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
          borderRadius: "var(--radius-control)",
        },
        classNames: {
          success:
            "!border-success-ink/30 !bg-success-soft !text-success-ink",
          error:
            "!border-destructive/30 !bg-destructive-soft !text-destructive",
          info: "!border-primary/30 !bg-primary-soft !text-ink",
        },
      }}
    />
  );
}
