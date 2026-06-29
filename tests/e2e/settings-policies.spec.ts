import { test, expect } from "@playwright/test";
import {
  annotateServer,
  authStatePath,
  detectServer,
  e2e,
  skipNoAuth,
  skipNoServer,
} from "./helpers";

const calendarId = e2e.calendarId;
const settingsPath = `/api/calendars/${calendarId}/settings`;
const policiesPath = `/calendars/${calendarId}/policies`;
const schedulingPath = `/calendars/${calendarId}/scheduling`;
const unknownSettingsPath = `/api/calendars/${e2e.invalidId}/settings`;

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

test.describe("calendar settings auth guards (unauth)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  test("GET settings redirects unauthenticated requests to login", async ({
    request,
  }) => {
    const response = await request.get(settingsPath, { maxRedirects: 0 });

    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers().location).toContain(
      `/login?callbackUrl=${encodeURIComponent(settingsPath)}`,
    );
  });

  test("PATCH settings redirects unauthenticated requests to login", async ({
    request,
  }) => {
    const response = await request.patch(settingsPath, {
      data: { routing: { ownerNoSlotsPolicy: "strict_owner" } },
      maxRedirects: 0,
    });

    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers().location).toContain(
      `/login?callbackUrl=${encodeURIComponent(settingsPath)}`,
    );
  });

  test("policies page redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto(policiesPath);
    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(policiesPath)}`,
    );
  });

  test("scheduling page redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto(schedulingPath);
    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(schedulingPath)}`,
    );
  });
});

test.describe("calendar settings API (authed)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("GET returns settings (routing + scheduling present)", async ({
    request,
  }) => {
    const response = await request.get(settingsPath);

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      settings: { routing: unknown; scheduling: unknown };
    };
    expect(body.settings).toBeTruthy();
    expect(body.settings.routing).toBeTruthy();
    expect(body.settings.scheduling).toBeTruthy();
  });

  test("PATCH routing settings round-trips", async ({ request }) => {
    const before = (await (await request.get(settingsPath)).json()).settings;

    const response = await request.patch(settingsPath, {
      data: {
        routing: {
          unbookableOwnerPolicy: "fallback_team_pool",
          ownerNoSlotsPolicy: "strict_owner",
        },
      },
    });

    expect(response.status()).toBe(200);
    const routing = (await response.json()).settings.routing;
    expect(routing.unbookableOwnerPolicy).toBe("fallback_team_pool");
    expect(routing.ownerNoSlotsPolicy).toBe("strict_owner");

    await request.patch(settingsPath, { data: { routing: before.routing } });
  });

  test("PATCH scheduling settings round-trips", async ({ request }) => {
    const before = (await (await request.get(settingsPath)).json()).settings;

    const response = await request.patch(settingsPath, {
      data: {
        scheduling: {
          assignmentMode: "random",
          teamSelectionMode: "url_only",
          // seeded team — keeps referential integrity intact for other specs
          defaultTeamId: e2e.teamId,
        },
      },
    });

    expect(response.status()).toBe(200);
    const scheduling = (await response.json()).settings.scheduling;
    expect(scheduling.assignmentMode).toBe("random");
    expect(scheduling.teamSelectionMode).toBe("url_only");
    expect(scheduling.defaultTeamId).toBe(e2e.teamId);

    await request.patch(settingsPath, {
      data: {
        scheduling: {
          assignmentMode: before.scheduling.assignmentMode,
          teamSelectionMode: before.scheduling.teamSelectionMode,
          defaultTeamId: before.scheduling.defaultTeamId,
        },
      },
    });
  });

  // Invalid enums (routing AND nested duplicate/redirect/salesforceSync) are
  // coerced to valid values — no arbitrary jsonb persists (enum bypass closed).
  test("PATCH coerces invalid enums to valid values", async ({ request }) => {
    const before = (await (await request.get(settingsPath)).json()).settings;

    const response = await request.patch(settingsPath, {
      data: {
        routing: { unbookableOwnerPolicy: "TOTALLY_BOGUS" },
        duplicate: { scope: "BOGUS_SCOPE" },
      },
    });

    expect(response.status()).toBe(200);
    const settings = (await response.json()).settings;
    expect([
      "fallback_team_pool",
      "fallback_team_pool_reassign",
    ]).toContain(settings.routing.unbookableOwnerPolicy);
    expect([
      "calendar",
      "scheduler",
      "deployment",
      "salesforce_connection",
    ]).toContain(settings.duplicate.scope);
    expect(settings.duplicate.scope).not.toBe("BOGUS_SCOPE");

    await request.patch(settingsPath, {
      data: { routing: before.routing, duplicate: before.duplicate },
    });
  });

  // defaultTeamId now has a referential-integrity check: unknown/foreign id → 400.
  test("PATCH rejects a non-existent defaultTeamId with 400", async ({
    request,
  }) => {
    const response = await request.patch(settingsPath, {
      data: { scheduling: { defaultTeamId: e2e.invalidId } },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/defaultTeamId/i),
    });
  });

  test("GET unknown calendar returns 404", async ({ request }) => {
    const response = await request.get(unknownSettingsPath);
    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Calendar not found",
    });
  });

  test("PATCH unknown calendar returns 404", async ({ request }) => {
    const response = await request.patch(unknownSettingsPath, {
      data: { routing: { ownerNoSlotsPolicy: "strict_owner" } },
    });
    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Calendar not found",
    });
  });
});

test.describe("policies + scheduling pages (authed)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("policies panel renders, toggles a setting, saves", async ({ page }) => {
    const before = (await (await page.request.get(settingsPath)).json())
      .settings;

    await page.goto(policiesPath);
    await expect(
      page.getByRole("heading", { name: "Policies", level: 1 }),
    ).toBeVisible();

    await page
      .getByLabel("Unbookable owner policy")
      .selectOption("fallback_team_pool");
    await page.getByRole("button", { name: "Save policies" }).click();
    await expect(page.getByText("Policies saved")).toBeVisible();

    await page.request.patch(settingsPath, { data: { routing: before.routing } });
  });

  test("scheduling panel renders, toggles a setting, saves", async ({
    page,
  }) => {
    const before = (await (await page.request.get(settingsPath)).json())
      .settings;

    await page.goto(schedulingPath);
    await expect(
      page.getByRole("heading", { name: "Scheduling", level: 1 }),
    ).toBeVisible();

    await page.getByLabel("Assignment mode").selectOption("random");
    await page.getByRole("button", { name: "Save scheduling" }).click();
    await expect(page.getByText("Scheduling saved")).toBeVisible();

    await page.request.patch(settingsPath, {
      data: {
        scheduling: { assignmentMode: before.scheduling.assignmentMode },
      },
    });
  });
});
