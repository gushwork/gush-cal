"use client";

import { Button } from "@/components/ui";
import { useState } from "react";

type CopyLinkButtonProps = {
  url: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
};

export function CopyLinkButton({
  url,
  variant = "primary",
  size = "md",
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} onClick={() => void handleCopy()}>
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}
