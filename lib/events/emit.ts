import type { EmitEventInput } from "@/lib/ports/events";
import { insertOutboxEvent } from "./outbox";

export async function emitEvent(input: EmitEventInput): Promise<void> {
  await insertOutboxEvent(input);
}
