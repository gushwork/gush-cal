import type {
  FreeBusyRequest,
  FreeBusyResult,
} from "@/lib/ports/google-calendar";
import {
  createImpersonatedClient,
  freeBusySubjectEmail,
} from "./calendar-client";

type CalendarFreeBusyEntry = {
  busy?: Array<{ start?: string | null; end?: string | null }> | null;
  errors?: Array<{ reason?: string | null }> | null;
};

function findCalendarEntry(
  calendars: Record<string, CalendarFreeBusyEntry> | null | undefined,
  email: string,
): CalendarFreeBusyEntry | undefined {
  if (!calendars) {
    return undefined;
  }

  if (calendars[email]) {
    return calendars[email];
  }

  const target = email.toLowerCase();
  for (const [key, entry] of Object.entries(calendars)) {
    if (key.toLowerCase() === target) {
      return entry;
    }
  }

  return undefined;
}

function mapGoogleApiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "GOOGLE_API_ERROR";
  }

  const message = error.message;
  if (
    message.includes("DECODER routines") ||
    message.includes("ERR_OSSL") ||
    message.includes("private key")
  ) {
    return "INVALID_SERVICE_ACCOUNT_KEY";
  }
  if (message.includes("unauthorized_client")) {
    return "DWD_NOT_AUTHORIZED";
  }
  if (message.includes("invalid_grant")) {
    return "INVALID_GRANT";
  }

  return message.slice(0, 120) || "GOOGLE_API_ERROR";
}

export async function queryFreeBusy(
  req: FreeBusyRequest,
): Promise<FreeBusyResult> {
  const byEmail: FreeBusyResult["byEmail"] = {};

  try {
    const subject = freeBusySubjectEmail(req.memberEmails);
    const calendar = createImpersonatedClient(subject);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: req.timeMin,
        timeMax: req.timeMax,
        items: req.memberEmails.map((email) => ({ id: email })),
      },
    });

    for (const email of req.memberEmails) {
      const entry = findCalendarEntry(response.data.calendars, email);

      if (!entry) {
        byEmail[email] = { status: "error", code: "NOT_FOUND" };
        continue;
      }

      if (entry.errors?.length) {
        byEmail[email] = {
          status: "error",
          code: entry.errors[0]?.reason ?? "UNKNOWN",
        };
        continue;
      }

      byEmail[email] = {
        status: "ok",
        busy: (entry.busy ?? []).flatMap((block) => {
          if (!block.start || !block.end) {
            return [];
          }
          return [{ start: block.start, end: block.end }];
        }),
      };
    }
  } catch (error) {
    const code = mapGoogleApiError(error);
    for (const email of req.memberEmails) {
      byEmail[email] = { status: "error", code };
    }
  }

  return { byEmail };
}
