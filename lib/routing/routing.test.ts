import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarTeamPoolSettings } from "@/lib/types/platform";
import { defaultCalendarSettings } from "@/lib/types/platform";
import type { EventsPort } from "@/lib/ports/events";
import type { SalesforcePort } from "@/lib/ports/salesforce";
import { resolveBookingLink } from "@/lib/booking-links/links";
import { getTeam, getTeamBySlug } from "@/lib/teams/teams";
import { applyTeamSelectionMode, applyUnbookableOwnerFallback } from "./policies";
import { loadCalendarRoutingSettings } from "./load-settings";
import { loadCalendarSchedulingSettings } from "@/lib/scheduling/load-scheduling-settings";
import { parseBookingUrlContext, parseResolveQuery } from "./parse-request-path";
import { resolveBookingTarget, setRoutingDbForTest } from "./resolve-target";
import { createRoutingPort } from "./index";

vi.mock("@/lib/teams/teams", () => ({
  getTeamBySlug: vi.fn(),
  getTeam: vi.fn(),
}));

vi.mock("@/lib/booking-links/links", () => ({
  resolveBookingLink: vi.fn(),
}));

vi.mock("./load-settings", () => ({
  loadCalendarRoutingSettings: vi.fn(),
}));

vi.mock("@/lib/scheduling/load-scheduling-settings", () => ({
  loadCalendarSchedulingSettings: vi.fn(),
}));

const calendarId = "cal-1";
const defaultTeamId = "team-default";
const memberId = "mem-1";
const teamId = "team-1";

function teamPoolSettings(
  overrides: Partial<CalendarTeamPoolSettings> = {},
): CalendarTeamPoolSettings {
  return {
    ...defaultCalendarSettings().scheduling,
    defaultTeamId,
    ...overrides,
  };
}

function routingSettings() {
  return defaultCalendarSettings().routing;
}

function createTestDb(members: { id: string; email: string }[] = []) {
  const store = { members: members.map((m) => ({ ...m, calendarId })) };
  const db = {
    select: () => ({
      from: () => ({
        where: async () => store.members,
      }),
    }),
  };
  return db;
}

function createDeps(overrides?: {
  salesforce?: Partial<SalesforcePort>;
  events?: Partial<EventsPort>;
}) {
  const emit = vi.fn();
  return {
    deps: {
      salesforce: {
        lookupLeadOwner: vi.fn().mockResolvedValue({ ok: false, code: "NOT_FOUND" }),
        syncFieldMap: vi.fn(),
        ...overrides?.salesforce,
      } as SalesforcePort,
      events: {
        emit,
        scheduleRelativeTriggers: vi.fn(),
        ...overrides?.events,
      } as EventsPort,
    },
    emit,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setRoutingDbForTest(createTestDb([{ id: memberId, email: "owner@acme.com" }]) as never);
  vi.mocked(loadCalendarRoutingSettings).mockResolvedValue(routingSettings());
  vi.mocked(loadCalendarSchedulingSettings).mockResolvedValue(teamPoolSettings());
});

describe("parseBookingUrlContext", () => {
  it("parses team path segments", () => {
    expect(
      parseBookingUrlContext("acme", "/book/acme/t/enterprise", new URLSearchParams()),
    ).toEqual({ calendarSlug: "acme", teamSlug: "enterprise" });
  });

  it("parses member path segments", () => {
    expect(
      parseBookingUrlContext("acme", "/book/acme/m/jane", new URLSearchParams()),
    ).toEqual({ calendarSlug: "acme", memberSlug: "jane" });
  });

  it("uses team query param when path has no team segment", () => {
    expect(
      parseBookingUrlContext("acme", "/book/acme", new URLSearchParams("team=sales")),
    ).toEqual({ calendarSlug: "acme", teamSlug: "sales" });
  });
});

describe("parseResolveQuery", () => {
  it("maps resolve query params to url context", () => {
    const params = new URLSearchParams(
      "email=guest@acme.com&team=enterprise&memberSlug=jane",
    );
    expect(parseResolveQuery("acme", params)).toEqual({
      urlContext: {
        calendarSlug: "acme",
        teamSlug: "enterprise",
        memberSlug: "jane",
      },
      guestEmail: "guest@acme.com",
    });
  });
});

describe("policies", () => {
  it("applyTeamSelectionMode returns TEAM_REQUIRED for url_only without form team", () => {
    const settings = teamPoolSettings({
      teamSelectionMode: "url_only",
      defaultTeamId,
    });
    expect(applyTeamSelectionMode(calendarId, settings)).toEqual({
      ok: false,
      code: "TEAM_REQUIRED",
    });
  });

  it("applyTeamSelectionMode uses default team for url_with_default", () => {
    const settings = teamPoolSettings({ teamSelectionMode: "url_with_default" });
    expect(applyTeamSelectionMode(calendarId, settings)).toEqual({
      ok: true,
      target: { mode: "team", calendarId, teamId: defaultTeamId },
    });
  });

  it("applyTeamSelectionMode prefers teamIdFromForm", () => {
    const settings = teamPoolSettings({ teamSelectionMode: "url_only" });
    expect(applyTeamSelectionMode(calendarId, settings, "team-form")).toEqual({
      ok: true,
      target: { mode: "team", calendarId, teamId: "team-form" },
    });
  });

  it.each([
    "fallback_team_pool",
    "fallback_team_pool_reassign",
  ] as const)("applyUnbookableOwnerFallback uses default team for %s", (policy) => {
    const settings = teamPoolSettings();
    expect(applyUnbookableOwnerFallback(calendarId, settings)).toEqual({
      ok: true,
      target: { mode: "team", calendarId, teamId: defaultTeamId },
    });
  });

  it("applyUnbookableOwnerFallback returns TEAM_REQUIRED without default team", () => {
    const settings = teamPoolSettings({ defaultTeamId: null });
    expect(applyUnbookableOwnerFallback(calendarId, settings)).toEqual({
      ok: false,
      code: "TEAM_REQUIRED",
    });
  });
});

describe("resolveBookingTarget", () => {
  it("resolves member slug to member mode", async () => {
    vi.mocked(resolveBookingLink).mockResolvedValue({
      link: {
        id: "link-1",
        calendarId,
        kind: "member",
        slug: "jane",
        teamId: null,
        memberId,
        redirectOverride: null,
        enabled: true,
      },
      memberId,
    });

    const { deps } = createDeps();
    const result = await resolveBookingTarget(
      {
        calendarId,
        urlContext: { calendarSlug: "acme", memberSlug: "jane" },
      },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      target: { mode: "member", calendarId, memberId },
    });
  });

  it("returns MEMBER_NOT_FOUND for unknown member slug", async () => {
    vi.mocked(resolveBookingLink).mockResolvedValue(null);
    const { deps } = createDeps();

    const result = await resolveBookingTarget(
      {
        calendarId,
        urlContext: { calendarSlug: "acme", memberSlug: "missing" },
      },
      deps,
    );

    expect(result).toEqual({ ok: false, code: "MEMBER_NOT_FOUND" });
  });

  it("resolves SF owner email to owner mode when member exists", async () => {
    const { deps } = createDeps({
      salesforce: {
        lookupLeadOwner: vi.fn().mockResolvedValue({
          ok: true,
          ownerEmail: "owner@acme.com",
          recordId: "sf-1",
          recordType: "Lead",
        }),
      },
    });

    const result = await resolveBookingTarget(
      {
        calendarId,
        urlContext: { calendarSlug: "acme" },
        guestEmail: "guest@acme.com",
      },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      target: { mode: "owner", calendarId, memberId },
    });
  });

  it("falls back to team pool when SF owner is not a member", async () => {
    setRoutingDbForTest(createTestDb([]) as never);
    const { deps, emit } = createDeps({
      salesforce: {
        lookupLeadOwner: vi.fn().mockResolvedValue({
          ok: true,
          ownerEmail: "stranger@acme.com",
          recordId: "sf-1",
          recordType: "Lead",
        }),
      },
    });

    const result = await resolveBookingTarget(
      {
        calendarId,
        urlContext: { calendarSlug: "acme" },
        guestEmail: "guest@acme.com",
      },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      target: { mode: "team", calendarId, teamId: defaultTeamId },
    });
    expect(emit).toHaveBeenCalledWith({
      calendarId,
      eventType: "routing.owner_overflow",
      payload: {
        guestEmail: "guest@acme.com",
        ownerEmail: "stranger@acme.com",
        teamId: defaultTeamId,
      },
    });
  });

  it("resolves team slug to team mode", async () => {
    vi.mocked(getTeamBySlug).mockResolvedValue({
      id: teamId,
      calendarId,
      name: "Enterprise",
      slug: "enterprise",
      sortOrder: 1,
    });
    const { deps } = createDeps();

    const result = await resolveBookingTarget(
      {
        calendarId,
        urlContext: { calendarSlug: "acme", teamSlug: "enterprise" },
      },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      target: { mode: "team", calendarId, teamId },
    });
  });

  it("uses teamIdFromForm when provided", async () => {
    vi.mocked(getTeam).mockResolvedValue({
      id: teamId,
      calendarId,
      name: "Enterprise",
      slug: "enterprise",
      sortOrder: 1,
    });
    const { deps } = createDeps();

    const result = await resolveBookingTarget(
      {
        calendarId,
        urlContext: { calendarSlug: "acme" },
        teamIdFromForm: teamId,
      },
      deps,
    );

    expect(result).toEqual({
      ok: true,
      target: { mode: "team", calendarId, teamId },
    });
  });

  it("returns TEAM_REQUIRED for url_only without team", async () => {
    vi.mocked(loadCalendarSchedulingSettings).mockResolvedValue(
      teamPoolSettings({ teamSelectionMode: "url_only" }),
    );
    const { deps } = createDeps();

    const result = await resolveBookingTarget(
      { calendarId, urlContext: { calendarSlug: "acme" } },
      deps,
    );

    expect(result).toEqual({ ok: false, code: "TEAM_REQUIRED" });
  });

  it("skips SF lookup when member slug is present", async () => {
    vi.mocked(resolveBookingLink).mockResolvedValue({
      link: {
        id: "link-1",
        calendarId,
        kind: "member",
        slug: "jane",
        teamId: null,
        memberId,
        redirectOverride: null,
        enabled: true,
      },
      memberId,
    });
    const lookupLeadOwner = vi.fn();
    const { deps } = createDeps({ salesforce: { lookupLeadOwner } });

    await resolveBookingTarget(
      {
        calendarId,
        urlContext: { calendarSlug: "acme", memberSlug: "jane" },
        guestEmail: "guest@acme.com",
      },
      deps,
    );

    expect(lookupLeadOwner).not.toHaveBeenCalled();
  });
});

describe("createRoutingPort", () => {
  it("exposes resolveBookingTarget", async () => {
    vi.mocked(resolveBookingLink).mockResolvedValue({
      link: {
        id: "link-1",
        calendarId,
        kind: "member",
        slug: "jane",
        teamId: null,
        memberId,
        redirectOverride: null,
        enabled: true,
      },
      memberId,
    });

    const port = createRoutingPort({
      salesforce: {
        lookupLeadOwner: vi.fn(),
        syncFieldMap: vi.fn(),
      },
      events: { emit: vi.fn(), scheduleRelativeTriggers: vi.fn() },
    });

    const result = await port.resolveBookingTarget({
      calendarId,
      urlContext: { calendarSlug: "acme", memberSlug: "jane" },
    });

    expect(result.ok).toBe(true);
  });
});
