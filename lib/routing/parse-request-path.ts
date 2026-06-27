import type { BookingUrlContext } from "@/lib/types/platform";
import { parseBookingPath } from "./paths";

export function parseBookingUrlContext(
  calendarSlug: string,
  pathname: string,
  searchParams: URLSearchParams,
): BookingUrlContext {
  const pathSegments = pathname
    .replace(/^\/+/, "")
    .replace(/^book\//, "")
    .split("/")
    .filter(Boolean);

  const parsed = parseBookingPath(pathSegments);
  const context: BookingUrlContext = parsed ?? { calendarSlug };

  const teamFromQuery = searchParams.get("team");
  if (!context.teamSlug && teamFromQuery) {
    return { ...context, teamSlug: teamFromQuery };
  }

  return context;
}

export function parseResolveQuery(
  calendarSlug: string,
  searchParams: URLSearchParams,
): { urlContext: BookingUrlContext; guestEmail?: string } {
  const teamSlug = searchParams.get("team") ?? undefined;
  const memberSlug = searchParams.get("memberSlug") ?? undefined;
  const email = searchParams.get("email") ?? undefined;

  return {
    urlContext: {
      calendarSlug,
      ...(teamSlug ? { teamSlug } : {}),
      ...(memberSlug ? { memberSlug } : {}),
    },
    ...(email ? { guestEmail: email } : {}),
  };
}
