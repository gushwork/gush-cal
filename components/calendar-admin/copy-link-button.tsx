"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/ui/cn";
import { Check, Link2 } from "lucide-react";
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
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => void handleCopy()}
      className="gap-2"
    >
      <span
        className={cn(
          "inline-flex transition-transform duration-200",
          copied && "scale-110",
        )}
        aria-hidden
      >
        {copied ? (
          <Check className="h-4 w-4 text-success-ink" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
      </span>
      {copied ? "Copied!" : "Copy link"}
    </Button>
  );
}
