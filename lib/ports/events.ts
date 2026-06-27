import type { AppEventType } from "@/lib/types/platform";
import type { UtcInstant } from "@/lib/types";

export type EmitEventInput = {
  calendarId: string;
  eventType: AppEventType;
  payload: Record<string, unknown>;
  meetingId?: string;
};

export type WebhookPayload = {
  id: string;
  type: AppEventType;
  calendarId: string;
  meetingId?: string;
  occurredAt: UtcInstant;
  data: Record<string, unknown>;
};

export interface EventsPort {
  emit(input: EmitEventInput): Promise<void>;
  scheduleRelativeTriggers(meetingId: string): Promise<void>;
}
