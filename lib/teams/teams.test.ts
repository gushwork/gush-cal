import { beforeEach, describe, expect, it } from "vitest";
import type { CalendarSettings } from "@/lib/types/platform";
import { defaultCalendarSettings } from "@/lib/types/platform";
import {
  calendarMembers,
  calendarSettings,
  teamMembers,
  teams,
} from "@/lib/db/schema";
import {
  createTeam,
  deleteTeam,
  getTeam,
  getTeamBySlug,
  getTeamMemberIds,
  listTeams,
  replaceTeamMembers,
  setTeamsDbForTest,
  updateTeam,
} from "./teams";
import { createTeamsTestDb } from "./test-db";
import { validateTeamSlug } from "./validate-team-slug";

const calendarId = "cal-1";
const memberA = "mem-a";
const memberB = "mem-b";

function seedMembers(store: ReturnType<typeof createTeamsTestDb>["store"]) {
  store.members.push(
    { id: memberA, calendarId },
    { id: memberB, calendarId },
    { id: "mem-other", calendarId: "cal-2" },
  );
}

function seedSettings(
  store: ReturnType<typeof createTeamsTestDb>["store"],
  defaultTeamId: string | null = null,
) {
  const settings: CalendarSettings = {
    ...defaultCalendarSettings(),
    scheduling: {
      ...defaultCalendarSettings().scheduling,
      defaultTeamId,
    },
  };
  store.settings.push({ calendarId, settings });
}

let testDb: ReturnType<typeof createTeamsTestDb>;

beforeEach(() => {
  testDb = createTeamsTestDb();
  seedMembers(testDb.store);
  seedSettings(testDb.store);
  setTeamsDbForTest(testDb.db as never);
});

describe("validateTeamSlug", () => {
  it("accepts lowercase alphanumeric hyphens", () => {
    expect(validateTeamSlug("enterprise")).toBeNull();
    expect(validateTeamSlug("team-2")).toBeNull();
  });

  it("rejects invalid slugs", () => {
    expect(validateTeamSlug("")).toMatch(/required/i);
    expect(validateTeamSlug("Team_1")).toMatch(/lowercase/i);
    expect(validateTeamSlug("-bad")).toMatch(/lowercase/i);
  });
});

describe("listTeams", () => {
  it("returns teams ordered by sortOrder", async () => {
    testDb.store.teams.push(
      { id: "t2", calendarId, name: "B", slug: "b", sortOrder: 2 },
      { id: "t1", calendarId, name: "A", slug: "a", sortOrder: 1 },
    );

    const result = await listTeams(calendarId);
    expect(result.map((t) => t.id)).toEqual(["t1", "t2"]);
  });
});

describe("getTeamBySlug", () => {
  it("finds team within calendar", async () => {
    testDb.store.teams.push({
      id: "t1",
      calendarId,
      name: "Enterprise",
      slug: "enterprise",
      sortOrder: 1,
    });

    const team = await getTeamBySlug(calendarId, "enterprise");
    expect(team?.id).toBe("t1");
    expect(await getTeamBySlug(calendarId, "missing")).toBeNull();
  });
});

describe("createTeam", () => {
  it("creates team with optional members", async () => {
    const result = await createTeam(calendarId, {
      name: "Enterprise",
      slug: "enterprise",
      memberIds: [memberA, memberB],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.team.slug).toBe("enterprise");
    expect(await getTeamMemberIds(result.team.id)).toEqual([memberA, memberB]);
  });

  it("rejects duplicate slug", async () => {
    testDb.store.teams.push({
      id: "t1",
      calendarId,
      name: "A",
      slug: "enterprise",
      sortOrder: 1,
    });

    const result = await createTeam(calendarId, {
      name: "B",
      slug: "enterprise",
    });
    expect(result).toEqual({ ok: false, code: "SLUG_TAKEN" });
  });

  it("rejects members from another calendar", async () => {
    const result = await createTeam(calendarId, {
      name: "Enterprise",
      slug: "enterprise",
      memberIds: ["mem-other"],
    });
    expect(result).toEqual({ ok: false, code: "INVALID_MEMBERS" });
  });
});

describe("updateTeam", () => {
  it("updates name and slug", async () => {
    testDb.store.teams.push({
      id: "t1",
      calendarId,
      name: "Old",
      slug: "old",
      sortOrder: 1,
    });

    const result = await updateTeam(calendarId, "t1", {
      name: "New",
      slug: "new-slug",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.team.name).toBe("New");
    expect(result.team.slug).toBe("new-slug");
  });
});

describe("replaceTeamMembers", () => {
  it("replaces membership set", async () => {
    testDb.store.teams.push({
      id: "t1",
      calendarId,
      name: "Team",
      slug: "team",
      sortOrder: 1,
    });
    testDb.store.teamMembers.push({ teamId: "t1", memberId: memberA });

    const result = await replaceTeamMembers(calendarId, "t1", [memberB]);
    expect(result.ok).toBe(true);
    expect(await getTeamMemberIds("t1")).toEqual([memberB]);
  });

  it("returns NOT_FOUND for missing team", async () => {
    const result = await replaceTeamMembers(calendarId, "missing", [memberA]);
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
  });

  it("clears all members when given an empty list", async () => {
    testDb.store.teams.push({
      id: "t1",
      calendarId,
      name: "Team",
      slug: "team",
      sortOrder: 1,
    });
    testDb.store.teamMembers.push(
      { teamId: "t1", memberId: memberA },
      { teamId: "t1", memberId: memberB },
    );

    const result = await replaceTeamMembers(calendarId, "t1", []);
    expect(result.ok).toBe(true);
    expect(await getTeamMemberIds("t1")).toEqual([]);
  });
});

describe("deleteTeam", () => {
  it("deletes team when not default", async () => {
    testDb.store.teams.push({
      id: "t1",
      calendarId,
      name: "Team",
      slug: "team",
      sortOrder: 1,
    });

    const result = await deleteTeam(calendarId, "t1");
    expect(result).toEqual({ ok: true });
    expect(await getTeam(calendarId, "t1")).toBeNull();
  });

  it("returns DEFAULT_TEAM when calendar default points to team", async () => {
    testDb.store.teams.push({
      id: "t1",
      calendarId,
      name: "Team",
      slug: "team",
      sortOrder: 1,
    });
    testDb.store.settings[0]!.settings.scheduling.defaultTeamId = "t1";

    const result = await deleteTeam(calendarId, "t1");
    expect(result).toEqual({ ok: false, code: "DEFAULT_TEAM" });
  });
});
