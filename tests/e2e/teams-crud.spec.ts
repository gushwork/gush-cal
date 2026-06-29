import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  annotateServer,
  authStatePath,
  detectServer,
  e2e,
  skipNoAuth,
  skipNoServer,
} from "./helpers";

const calendarId = e2e.calendarId;
const teamsPath = `/api/calendars/${calendarId}/teams`;

let serverAvailable = false;
test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

function uniqueSlug(): string {
  return `e2e-crud-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// ponytail: throwaway team per mutating test → no races on the seeded default
// team (e2e.teamId is calendarSettings.defaultTeamId; deleting it is a 409).
async function createThrowawayTeam(
  request: APIRequestContext,
  memberIds: string[] = [],
): Promise<{ id: string; slug: string }> {
  const res = await request.post(teamsPath, {
    data: { name: "Throwaway", slug: uniqueSlug(), memberIds },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { team: { id: string; slug: string } }).team;
}

test.describe("teams routes redirect unauthenticated", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  const teamId = e2e.teamId;
  const apiRoutes = [
    { method: "GET", path: teamsPath },
    { method: "POST", path: teamsPath },
    { method: "PATCH", path: `${teamsPath}/${teamId}` },
    { method: "DELETE", path: `${teamsPath}/${teamId}` },
    { method: "GET", path: `${teamsPath}/${teamId}/members` },
    { method: "PUT", path: `${teamsPath}/${teamId}/members` },
  ] as const;

  for (const { method, path } of apiRoutes) {
    test(`${method} ${path} redirects to login`, async ({ request }) => {
      const res = await request.fetch(path, { method, maxRedirects: 0 });
      expect(res.status()).toBeGreaterThanOrEqual(300);
      expect(res.status()).toBeLessThan(400);
      expect(res.headers().location).toContain(
        `/login?callbackUrl=${encodeURIComponent(path)}`,
      );
    });
  }

  test("teams page redirects to login", async ({ page }) => {
    const path = `/calendars/${calendarId}/teams`;
    await page.goto(path);
    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(path)}`,
    );
  });
});

test.describe("teams CRUD (authenticated)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("lists teams including the seeded team", async ({ request }) => {
    const res = await request.get(teamsPath);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { teams: { id: string }[] };
    expect(Array.isArray(body.teams)).toBe(true);
    expect(body.teams.some((t) => t.id === e2e.teamId)).toBe(true);
  });

  test("creates a team", async ({ request }) => {
    const slug = uniqueSlug();
    const res = await request.post(teamsPath, {
      data: { name: "CRUD Team", slug },
    });
    expect(res.status()).toBe(201);
    const { team } = (await res.json()) as {
      team: { id: string; slug: string; name: string };
    };
    expect(team.slug).toBe(slug);
    expect(team.name).toBe("CRUD Team");
    await request.delete(`${teamsPath}/${team.id}`);
  });

  test("rejects an invalid slug", async ({ request }) => {
    const res = await request.post(teamsPath, {
      data: { name: "Bad Slug", slug: "Has Spaces!" },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects a duplicate slug", async ({ request }) => {
    const res = await request.post(teamsPath, {
      data: { name: "Dup", slug: e2e.teamSlug },
    });
    expect(res.status()).toBe(409);
  });

  test("renames a team and updates its slug", async ({ request }) => {
    const team = await createThrowawayTeam(request);
    const newSlug = uniqueSlug();
    const res = await request.patch(`${teamsPath}/${team.id}`, {
      data: { name: "Renamed", slug: newSlug },
    });
    expect(res.status()).toBe(200);
    const { team: updated } = (await res.json()) as {
      team: { name: string; slug: string };
    };
    expect(updated.name).toBe("Renamed");
    expect(updated.slug).toBe(newSlug);
    // ponytail: team-slug→booking_links sync (lib/teams/teams.ts) not observable
    // here — no team booking link is seeded for a throwaway team. See BUGS report.
    await request.delete(`${teamsPath}/${team.id}`);
  });

  test("deletes a team", async ({ request }) => {
    const team = await createThrowawayTeam(request);
    const res = await request.delete(`${teamsPath}/${team.id}`);
    expect(res.status()).toBe(204);
  });

  test("returns 404 deleting an unknown team", async ({ request }) => {
    const res = await request.delete(`${teamsPath}/${e2e.invalidId}`);
    expect(res.status()).toBe(404);
  });

  test("lists team member ids", async ({ request }) => {
    const team = await createThrowawayTeam(request, [e2e.memberId]);
    const res = await request.get(`${teamsPath}/${team.id}/members`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { memberIds: string[] };
    expect(Array.isArray(body.memberIds)).toBe(true);
    expect(body.memberIds).toContain(e2e.memberId);
    await request.delete(`${teamsPath}/${team.id}`);
  });

  test("replaces team members", async ({ request }) => {
    const team = await createThrowawayTeam(request);
    const res = await request.put(`${teamsPath}/${team.id}/members`, {
      data: { memberIds: [e2e.memberId, e2e.secondMemberId] },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { memberIds: string[] };
    expect(body.memberIds).toEqual(
      expect.arrayContaining([e2e.memberId, e2e.secondMemberId]),
    );
    await request.delete(`${teamsPath}/${team.id}`);
  });

  test("rejects members not on the calendar", async ({ request }) => {
    const team = await createThrowawayTeam(request);
    const res = await request.put(`${teamsPath}/${team.id}/members`, {
      data: { memberIds: [e2e.invalidId] },
    });
    expect(res.status()).toBe(400);
    await request.delete(`${teamsPath}/${team.id}`);
  });
});

test.describe("teams page (authenticated)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("renders the team list and add UI", async ({ page }) => {
    await page.goto(`/calendars/${calendarId}/teams`);
    await expect(
      page.getByRole("heading", { name: "Teams", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /add team/i }),
    ).toBeVisible();
    await expect(page.getByText("E2E Team")).toBeVisible();
  });
});
