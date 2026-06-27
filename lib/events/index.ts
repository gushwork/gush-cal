import type { EventsPort } from "@/lib/ports/events";
import { emitEvent } from "./emit";
import { scheduleRelativeTriggers } from "./scheduler";

export function createEventsPort(): EventsPort {
  return {
    emit: emitEvent,
    scheduleRelativeTriggers,
  };
}

export { emitEvent } from "./emit";
export { scheduleRelativeTriggers, processDueTriggers } from "./scheduler";
export { insertOutboxEvent, processOutboxBatch } from "./outbox";
export {
  authenticateApiKey,
  generateApiKey,
  hashApiKey,
  requireApiKeyAuth,
  signWebhookPayload,
} from "./api-key-auth";
export { deliverWebhook } from "./deliver-webhook";
export {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  revokeApiKey,
} from "./api-keys";
export {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  listWebhookEndpoints,
  updateWebhookEndpoint,
} from "./webhooks";
