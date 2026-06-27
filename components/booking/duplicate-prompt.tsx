"use client";

import { AlertBanner, Button } from "@/components/ui";

type DuplicatePromptProps = {
  manageUrl: string;
  onContinue: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export function DuplicatePrompt({
  manageUrl,
  onContinue,
  onCancel,
  loading = false,
}: DuplicatePromptProps) {
  return (
    <div
      className="space-y-4 rounded-xl border border-neutral-100 bg-white p-4 shadow-s3"
      data-testid="duplicate-prompt"
    >
      <AlertBanner variant="warning">
        You already have a meeting scheduled with this email.
      </AlertBanner>
      <p className="text-sm text-neutral-600">
        You can manage your existing booking or continue to book another time.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <a href={manageUrl} target="_blank" rel="noreferrer">
            Manage existing meeting
          </a>
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Pick another time
        </Button>
        <Button type="button" onClick={onContinue} loading={loading}>
          Continue anyway
        </Button>
      </div>
    </div>
  );
}
