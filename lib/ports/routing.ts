import type { BookingTarget, BookingUrlContext } from "@/lib/types/platform";

export type ResolveBookingTargetInput = {
  calendarId: string;
  urlContext: BookingUrlContext;
  guestEmail?: string;
  teamIdFromForm?: string;
};

export type ResolveBookingTargetResult =
  | { ok: true; target: BookingTarget }
  | {
      ok: false;
      code: "TEAM_REQUIRED" | "MEMBER_NOT_FOUND" | "CALENDAR_NOT_FOUND";
    };

export interface RoutingPort {
  resolveBookingTarget(
    input: ResolveBookingTargetInput,
  ): Promise<ResolveBookingTargetResult>;
}
