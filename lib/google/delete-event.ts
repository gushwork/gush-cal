import { isStubGoogleEventId } from "@/lib/stubs/google-calendar-stub";
import { createImpersonatedClient } from "./calendar-client";
import { isGoogleNotFoundError } from "./google-errors";

export async function deleteEvent(
  organizerEmail: string,
  googleEventId: string,
): Promise<void> {
  if (isStubGoogleEventId(googleEventId)) {
    return;
  }

  const calendar = createImpersonatedClient(organizerEmail);

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
      sendUpdates: "all",
    });
  } catch (error) {
    if (isGoogleNotFoundError(error)) {
      return;
    }
    throw error;
  }
}
