/**
 * Idempotent E2E seed — stable IDs in tests/e2e/fixtures/manifest.json
 *
 * Usage: DATABASE_URL=... USE_STUBS=1 npx tsx scripts/seed-e2e.ts
 * Check: npx tsx scripts/seed-e2e.ts --check
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { DEFAULT_WORKING_HOURS } from "@/components/calendar-admin/validation";
import { getDb } from "@/lib/db/client";
import {
  apiKeys,
  bookingLinks,
  calendarMembers,
  calendarSettings,
  calendars,
  emailSequenceSteps,
  emailSequences,
  meetingManageTokens,
  meetings,
  salesforceFieldMaps,
  schedulers,
  teamMembers,
  teams,
  webhookEndpoints,
} from "@/lib/db/schema";
import { hashApiKey } from "@/lib/events/api-key-auth";
import { hashManageToken } from "@/lib/meeting-tokens/tokens";
import { defaultCalendarSettings } from "@/lib/types/platform";
import { e2e } from "../tests/e2e/fixtures";

const MEETING_STARTS_AT = "2030-06-10T14:00:00.000Z";
const MANAGE_MEETING_STARTS_AT = "2030-07-15T15:00:00.000Z";
const FAR_FUTURE = "2031-01-01T00:00:00.000Z";
const PAST = "2020-01-01T00:00:00.000Z";

async function seed(): Promise<void> {
  const db = getDb();

  await db
    .insert(schedulers)
    .values({
      id: e2e.schedulerId,
      email: e2e.schedulerEmail,
      name: "E2E Scheduler",
      googleSub: e2e.schedulerGoogleSub,
      createdAt: "2026-01-01T00:00:00.000Z",
    })
    .onConflictDoUpdate({
      target: schedulers.id,
      set: {
        email: e2e.schedulerEmail,
        name: "E2E Scheduler",
        googleSub: e2e.schedulerGoogleSub,
      },
    });

  await db
    .insert(calendars)
    .values({
      id: e2e.calendarId,
      schedulerId: e2e.schedulerId,
      name: e2e.calendarName,
      slug: e2e.calendarSlug,
      bookingWindowDays: 14,
      minNoticeHours: 0,
      defaultMaxPerDay: 4,
      defaultMaxPerWeek: 20,
      defaultWorkingHours: DEFAULT_WORKING_HOURS,
      timezone: "America/New_York",
      durations: [30, 60],
      createdAt: "2026-01-01T00:00:00.000Z",
    })
    .onConflictDoUpdate({
      target: calendars.id,
      set: {
        name: e2e.calendarName,
        slug: e2e.calendarSlug,
        minNoticeHours: 0,
      },
    });

  const settings = defaultCalendarSettings();
  settings.scheduling.defaultTeamId = e2e.teamId;

  await db
    .insert(calendarSettings)
    .values({ calendarId: e2e.calendarId, settings })
    .onConflictDoUpdate({
      target: calendarSettings.calendarId,
      set: { settings },
    });

  await db
    .insert(calendarMembers)
    .values({
      id: e2e.memberId,
      calendarId: e2e.calendarId,
      email: e2e.memberEmail,
      displayName: "E2E Member",
      sortOrder: 0,
      assignmentWeight: 100,
    })
    .onConflictDoUpdate({
      target: calendarMembers.id,
      set: {
        email: e2e.memberEmail,
        displayName: "E2E Member",
      },
    });

  await db
    .insert(calendarMembers)
    .values({
      id: e2e.secondMemberId,
      calendarId: e2e.calendarId,
      email: e2e.secondMemberEmail,
      displayName: "E2E Member Two",
      sortOrder: 1,
      assignmentWeight: 100,
    })
    .onConflictDoUpdate({
      target: calendarMembers.id,
      set: {
        email: e2e.secondMemberEmail,
        displayName: "E2E Member Two",
      },
    });

  await db
    .insert(teams)
    .values({
      id: e2e.teamId,
      calendarId: e2e.calendarId,
      name: "E2E Team",
      slug: e2e.teamSlug,
      sortOrder: 0,
    })
    .onConflictDoUpdate({
      target: teams.id,
      set: { name: "E2E Team", slug: e2e.teamSlug },
    });

  await db
    .insert(teamMembers)
    .values({ teamId: e2e.teamId, memberId: e2e.memberId })
    .onConflictDoNothing();

  await db
    .insert(teamMembers)
    .values({ teamId: e2e.teamId, memberId: e2e.secondMemberId })
    .onConflictDoNothing();

  await db
    .insert(bookingLinks)
    .values({
      id: e2e.bookingLinkId,
      calendarId: e2e.calendarId,
      kind: "calendar",
      slug: e2e.calendarSlug,
      enabled: true,
    })
    .onConflictDoUpdate({
      target: bookingLinks.id,
      set: { slug: e2e.calendarSlug, enabled: true },
    });

  await db
    .insert(meetings)
    .values({
      id: e2e.meetingId,
      calendarId: e2e.calendarId,
      assignedMemberId: e2e.memberId,
      teamId: e2e.teamId,
      bookingLinkId: e2e.bookingLinkId,
      startsAt: MEETING_STARTS_AT,
      durationMinutes: 30,
      subject: "E2E seeded meeting",
      body: "Seeded for cancel API tests",
      invitees: [e2e.memberEmail],
      googleEventId: "e2e-google-event-001",
      meetLink: "https://meet.example/e2e",
      bookedBy: "guest",
      guestEmail: "guest@example.com",
    })
    .onConflictDoUpdate({
      target: meetings.id,
      set: {
        startsAt: MEETING_STARTS_AT,
        subject: "E2E seeded meeting",
        googleEventId: "e2e-google-event-001",
        cancelledAt: null,
      },
    });

  // Dedicated meeting for manage-token mutation flows (cancel/reschedule)
  // so the cancel-API meeting above is not disturbed by parallel specs.
  await db
    .insert(meetings)
    .values({
      id: e2e.manageMeetingId,
      calendarId: e2e.calendarId,
      assignedMemberId: e2e.memberId,
      teamId: e2e.teamId,
      bookingLinkId: e2e.bookingLinkId,
      startsAt: MANAGE_MEETING_STARTS_AT,
      durationMinutes: 30,
      subject: "E2E manage meeting",
      body: "Seeded for manage-token tests",
      invitees: [e2e.memberEmail],
      googleEventId: "e2e-google-event-002",
      meetLink: "https://meet.example/e2e-manage",
      bookedBy: "guest",
      guestEmail: "guest-manage@example.com",
    })
    .onConflictDoUpdate({
      target: meetings.id,
      set: {
        startsAt: MANAGE_MEETING_STARTS_AT,
        subject: "E2E manage meeting",
        googleEventId: "e2e-google-event-002",
        cancelledAt: null,
      },
    });

  // Manage tokens (hashed). Valid token points at the manage meeting.
  await db
    .insert(meetingManageTokens)
    .values({
      id: e2e.manageTokenId,
      meetingId: e2e.manageMeetingId,
      tokenHash: hashManageToken(e2e.manageTokenPlaintext),
      expiresAt: FAR_FUTURE,
      revokedAt: null,
    })
    .onConflictDoUpdate({
      target: meetingManageTokens.id,
      set: {
        tokenHash: hashManageToken(e2e.manageTokenPlaintext),
        meetingId: e2e.manageMeetingId,
        expiresAt: FAR_FUTURE,
        revokedAt: null,
      },
    });

  await db
    .insert(meetingManageTokens)
    .values({
      meetingId: e2e.manageMeetingId,
      tokenHash: hashManageToken(e2e.revokedManageTokenPlaintext),
      expiresAt: FAR_FUTURE,
      revokedAt: PAST,
    })
    .onConflictDoUpdate({
      target: meetingManageTokens.tokenHash,
      set: { expiresAt: FAR_FUTURE, revokedAt: PAST },
    });

  await db
    .insert(meetingManageTokens)
    .values({
      meetingId: e2e.manageMeetingId,
      tokenHash: hashManageToken(e2e.expiredManageTokenPlaintext),
      expiresAt: PAST,
      revokedAt: null,
    })
    .onConflictDoUpdate({
      target: meetingManageTokens.tokenHash,
      set: { expiresAt: PAST, revokedAt: null },
    });

  // API keys (hashed). One active, one revoked.
  await db
    .insert(apiKeys)
    .values({
      id: e2e.apiKeyId,
      calendarId: e2e.calendarId,
      keyHash: hashApiKey(e2e.apiKeyPlaintext),
      name: "E2E active key",
      createdBy: e2e.schedulerId,
      createdAt: "2026-01-01T00:00:00.000Z",
      revokedAt: null,
    })
    .onConflictDoUpdate({
      target: apiKeys.id,
      set: {
        keyHash: hashApiKey(e2e.apiKeyPlaintext),
        name: "E2E active key",
        revokedAt: null,
      },
    });

  await db
    .insert(apiKeys)
    .values({
      id: e2e.revokedApiKeyId,
      calendarId: e2e.calendarId,
      keyHash: hashApiKey(e2e.revokedApiKeyPlaintext),
      name: "E2E revoked key",
      createdBy: e2e.schedulerId,
      createdAt: "2026-01-01T00:00:00.000Z",
      revokedAt: PAST,
    })
    .onConflictDoUpdate({
      target: apiKeys.id,
      set: {
        keyHash: hashApiKey(e2e.revokedApiKeyPlaintext),
        name: "E2E revoked key",
        revokedAt: PAST,
      },
    });

  await db
    .insert(webhookEndpoints)
    .values({
      id: e2e.webhookEndpointId,
      calendarId: e2e.calendarId,
      url: "https://webhook.example/e2e",
      secret: "e2e-webhook-secret",
      enabledEvents: ["meeting.booked", "meeting.cancelled"],
    })
    .onConflictDoUpdate({
      target: webhookEndpoints.id,
      set: {
        url: "https://webhook.example/e2e",
        enabledEvents: ["meeting.booked", "meeting.cancelled"],
      },
    });

  await db
    .insert(emailSequences)
    .values({
      id: e2e.sequenceId,
      calendarId: e2e.calendarId,
      name: "E2E sequence",
      enabled: true,
      triggerEvent: "meeting.booked",
    })
    .onConflictDoUpdate({
      target: emailSequences.id,
      set: { name: "E2E sequence", enabled: true, triggerEvent: "meeting.booked" },
    });

  await db
    .insert(emailSequenceSteps)
    .values({
      id: e2e.sequenceStepId,
      sequenceId: e2e.sequenceId,
      stepOrder: 0,
      delayMinutes: 60,
      timingAnchor: "after_booking",
      action: "send_email",
      subjectTemplate: "Hi {{guestEmail}}",
      bodyTemplate: "Your meeting is at {{startsAt}}",
    })
    .onConflictDoUpdate({
      target: emailSequenceSteps.id,
      set: { delayMinutes: 60, action: "send_email" },
    });

  await db
    .insert(salesforceFieldMaps)
    .values({
      id: e2e.salesforceFieldMapId,
      calendarId: e2e.calendarId,
      eventType: "book",
      objectApiName: "Event",
      lookupByEmail: true,
      createIfMissing: false,
      fieldMappings: [
        { source: "guestEmail", targetFieldApiName: "Email" },
      ],
    })
    .onConflictDoUpdate({
      target: salesforceFieldMaps.id,
      set: { objectApiName: "Event", eventType: "book" },
    });

  // Second calendar under a DIFFERENT scheduler — for cross-tenant/IDOR tests.
  await db
    .insert(schedulers)
    .values({
      id: e2e.secondSchedulerId,
      email: e2e.secondSchedulerEmail,
      name: "E2E Scheduler Two",
      googleSub: e2e.secondSchedulerGoogleSub,
      createdAt: "2026-01-01T00:00:00.000Z",
    })
    .onConflictDoUpdate({
      target: schedulers.id,
      set: {
        email: e2e.secondSchedulerEmail,
        googleSub: e2e.secondSchedulerGoogleSub,
      },
    });

  await db
    .insert(calendars)
    .values({
      id: e2e.secondCalendarId,
      schedulerId: e2e.secondSchedulerId,
      name: "E2E Demo Calendar Two",
      slug: e2e.secondCalendarSlug,
      bookingWindowDays: 14,
      minNoticeHours: 0,
      defaultMaxPerDay: 4,
      defaultMaxPerWeek: 20,
      defaultWorkingHours: DEFAULT_WORKING_HOURS,
      timezone: "America/New_York",
      durations: [30, 60],
      createdAt: "2026-01-01T00:00:00.000Z",
    })
    .onConflictDoUpdate({
      target: calendars.id,
      set: { slug: e2e.secondCalendarSlug, minNoticeHours: 0 },
    });

  await db
    .insert(calendarMembers)
    .values({
      id: e2e.secondCalendarMemberId,
      calendarId: e2e.secondCalendarId,
      email: "e2e-member-cal2@example.com",
      displayName: "E2E Member Cal2",
      sortOrder: 0,
      assignmentWeight: 100,
    })
    .onConflictDoUpdate({
      target: calendarMembers.id,
      set: { email: "e2e-member-cal2@example.com" },
    });

  await db
    .insert(meetings)
    .values({
      id: e2e.secondMeetingId,
      calendarId: e2e.secondCalendarId,
      assignedMemberId: e2e.secondCalendarMemberId,
      startsAt: "2030-08-20T15:00:00.000Z",
      durationMinutes: 30,
      subject: "E2E cal2 meeting",
      body: "Seeded on second calendar for cross-tenant tests",
      invitees: ["e2e-member-cal2@example.com"],
      googleEventId: "e2e-google-event-003",
      meetLink: "https://meet.example/e2e-cal2",
      bookedBy: "guest",
      guestEmail: "guest-cal2@example.com",
    })
    .onConflictDoUpdate({
      target: meetings.id,
      set: {
        startsAt: "2030-08-20T15:00:00.000Z",
        googleEventId: "e2e-google-event-003",
        cancelledAt: null,
      },
    });

  console.log(`seed-e2e: ok — calendar /book/${e2e.calendarSlug}`);
}

async function check(): Promise<void> {
  const db = getDb();
  const [calendar] = await db
    .select({ id: calendars.id, slug: calendars.slug })
    .from(calendars)
    .where(eq(calendars.id, e2e.calendarId))
    .limit(1);

  if (!calendar || calendar.slug !== e2e.calendarSlug) {
    throw new Error("seed-e2e check failed: calendar missing");
  }

  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(eq(meetings.id, e2e.meetingId))
    .limit(1);

  if (!meeting) {
    throw new Error("seed-e2e check failed: meeting missing");
  }

  console.log("seed-e2e: check passed");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn("seed-e2e: DATABASE_URL unset — skip (specs may use server-only paths)");
    return;
  }

  if (process.argv.includes("--check")) {
    await check();
    return;
  }

  await seed();
  await check();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
