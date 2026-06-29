import { test, expect } from "@playwright/test";
import {
  annotateServer,
  detectServer,
  e2e,
  skipNoSeed,
  skipNoServer,
} from "./helpers";

// ponytail: reuse shared helpers + e2e manifest; no new infra.
const slug = e2e.calendarSlug;
const teamSlug = (e2e as { teamSlug?: string }).teamSlug ?? null;
const teamId = (e2e as { teamId?: string }).teamId ?? null;

type ResolveBody = {
  target?: {
    mode?: string;
    calendarId?: string;
    teamId?: string;
    memberId?: string;
  };
  error?: string;
};

type MetaBody = {
  teams?: { id: string; slug: string }[];
  settings?: { teamSelectionMode?: string };
};

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

test.describe("public resolve API", () => {
  test.beforeEach(({}, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  test("GET resolve returns 404 for unknown slug", async ({ request }) => {
    const res = await request.get(
      `/api/book/${e2e.invalidCalendarSlug}/resolve`,
    );
    expect(res.status()).toBe(404);
    await expect(res.json()).resolves.toMatchObject({
      error: "Calendar not found",
    });
  });

  test("GET resolve returns team target from default pool", async ({
    request,
  }) => {
    skipNoSeed();
    const res = await request.get(`/api/book/${slug}/resolve`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as ResolveBody;
    // Seed sets teamSelectionMode=url_with_default + defaultTeamId=teamId.
    expect(body.target?.mode).toBe("team");
    expect(body.target?.calendarId).toEqual(expect.any(String));
    if (teamId) {
      expect(body.target?.teamId).toBe(teamId);
    }
  });

  test("GET resolve?team=<slug> returns that team target", async ({
    request,
  }) => {
    skipNoSeed();
    test.skip(!teamSlug, "Seed missing teamSlug.");
    const res = await request.get(`/api/book/${slug}/resolve?team=${teamSlug}`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as ResolveBody;
    expect(body.target?.mode).toBe("team");
    if (teamId) {
      expect(body.target?.teamId).toBe(teamId);
    }
  });

  test("GET resolve?team=<unknown> returns 400 TEAM_REQUIRED", async ({
    request,
  }) => {
    skipNoSeed();
    const res = await request.get(
      `/api/book/${slug}/resolve?team=no-such-team-xyz`,
    );
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "TEAM_REQUIRED" });
  });

  test("GET resolve?teamId=<valid> returns team target", async ({
    request,
  }) => {
    skipNoSeed();
    test.skip(!teamId, "Seed missing teamId.");
    const res = await request.get(`/api/book/${slug}/resolve?teamId=${teamId}`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as ResolveBody;
    expect(body.target?.mode).toBe("team");
    expect(body.target?.teamId).toBe(teamId);
  });

  test("GET resolve?teamId=<unknown> returns 400 TEAM_REQUIRED", async ({
    request,
  }) => {
    skipNoSeed();
    const res = await request.get(
      `/api/book/${slug}/resolve?teamId=${e2e.invalidId}`,
    );
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "TEAM_REQUIRED" });
  });

  test("GET resolve?memberSlug=<unknown> returns 400 MEMBER_NOT_FOUND", async ({
    request,
  }) => {
    skipNoSeed();
    const res = await request.get(
      `/api/book/${slug}/resolve?memberSlug=no-such-member-xyz`,
    );
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "MEMBER_NOT_FOUND",
    });
  });

  test("GET resolve?email=<guest> still resolves a target", async ({
    request,
  }) => {
    skipNoSeed();
    // No Salesforce mapping in E2E → guest email falls through to team pool.
    const res = await request.get(
      `/api/book/${slug}/resolve?email=${encodeURIComponent("guest@example.com")}`,
    );
    expect(res.status()).toBe(200);
    const body = (await res.json()) as ResolveBody;
    expect(body.target?.calendarId).toEqual(expect.any(String));
    expect(["team", "owner", "member"]).toContain(body.target?.mode);
  });
});

test.describe("public booking page team picker", () => {
  test.beforeEach(({}, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  async function readMeta(page: import("@playwright/test").Page) {
    const res = await page.request.get(`/api/book/${slug}`);
    const meta = (await res.json()) as MetaBody;
    const teams = meta.teams ?? [];
    const mode = meta.settings?.teamSelectionMode ?? null;
    return { isMultiTeamUrlOnly: teams.length > 1 && mode === "url_only" };
  }

  test("single-team seed renders wizard without a team picker", async ({
    page,
  }) => {
    skipNoSeed();
    const { isMultiTeamUrlOnly } = await readMeta(page);
    test.skip(isMultiTeamUrlOnly, "Multi-team url_only — covered by picker test.");

    await page.goto(`/book/${slug}`);
    await expect(
      page.getByRole("button", { name: /continue/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /choose a team/i }),
    ).toHaveCount(0);
  });

  test("multi-team url_only calendar shows team picker before wizard", async ({
    page,
  }) => {
    skipNoSeed();
    const { isMultiTeamUrlOnly } = await readMeta(page);
    test.skip(
      !isMultiTeamUrlOnly,
      "Seed is not multi-team url_only; picker not reachable.",
    );

    await page.goto(`/book/${slug}`);
    await expect(
      page.getByRole("heading", { name: /choose a team/i }),
    ).toBeVisible();
  });
});
