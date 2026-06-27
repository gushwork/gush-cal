import type { WebhookPayload } from "@/lib/ports/events";
import { signWebhookPayload } from "./api-key-auth";

const WEBHOOK_TIMEOUT_MS = 10_000;

export async function deliverWebhook(
  url: string,
  secret: string,
  envelope: WebhookPayload,
): Promise<boolean> {
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
