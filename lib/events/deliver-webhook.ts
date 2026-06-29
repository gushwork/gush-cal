import type { WebhookPayload } from "@/lib/ports/events";
import { signWebhookPayload } from "./api-key-auth";
import { validateWebhookUrl } from "./webhooks";

const WEBHOOK_TIMEOUT_MS = 10_000;

export async function deliverWebhook(
  url: string,
  secret: string,
  envelope: WebhookPayload,
): Promise<boolean> {
  // Defense-in-depth: refuse to call private/loopback URLs even if one was
  // persisted before validation existed.
  if (validateWebhookUrl(url) !== null) {
    return false;
  }

  const rawBody = JSON.stringify(envelope);
  const signature = signWebhookPayload(secret, rawBody);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    return response.ok;
  } catch {
    return false;
  }
}
