import { test, expect } from "@playwright/test";
import {
  e2e,
  annotateServer,
  authStatePath,
  bookingWindow,
  detectServer,
  skipNoAuth,
  skipNoSeed,
  skipNoServer,
} from "./helpers";

const calendarId = e2e.calendarId;
const availabilityApi = `/api/calendars/${calendarId}/availability`;
const availabilityPage = `/calendars/${calendarId}/availability`;

type MemberBusyBlock = {
  memberId: string;
  email: string;
  status: "accessible" | "inaccessible";
  errorCode?: string;
  busy: Array<{ start: string; end: string }>;
};

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

// UNAUTH: middleware redirects admin route + API to /login before handler runs.
test.describe("availability auth guards", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  test("API redirects unauthenticated requests to login", async ({
    request,
  }) => {
    const response = await request.get(availabilityApi, { maxRedirects: 0 });

    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(response.headers().location).toContain(
      `/login?callbackUrl=${encodeURIComponent(availabilityApi)}`,
    );
  });

  test("page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto(availabilityPage);

    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(availabilityPage)}`,
    );
  });
});

// AUTHED API: FreeBusy member columns. Needs server + seed + storage state.
test.describe("availability API (authed)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("returns 200 with one busy-block column per member, none hidden", async ({
    request,
  }) => {
    const { from, to } = bookingWindow();
    const response = await request.get(
      `${availabilityApi}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );

    expect(response.status()).toBe(200);

    const body = (await response.json()) as { members: MemberBusyBlock[] };
    expect(Array.isArray(body.members)).toBe(true);

    // Invariant: every seeded member is present — never hidden.
    const emails = body.members.map((member) => member.email);
    expect(emails).toContain(e2e.memberEmail);
    expect(emails).toContain(e2e.secondMemberEmail);

    for (const member of body.members) {
      expect(typeof member.memberId).toBe("string");
      expect(typeof member.email).toBe("string");
      expect(Array.isArray(member.busy)).toBe(true);

      // CONTEXT invariant: inaccessible member shows a reason and is NEVER
      // faked as busy.
      if (member.status === "inaccessible") {
        expect(member.errorCode).toBeTruthy();
        expect(member.busy).toEqual([]);
      } else {
        expect(member.status).toBe("accessible");
      }
    }
  });

  test("returns 400 when from/to query params are missing", async ({
    request,
  }) => {
    const response = await request.get(availabilityApi);

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/missing/i),
    });
  });

  test("returns 400 when only one bound is provided", async ({ request }) => {
    const { from } = bookingWindow();
    const response = await request.get(
      `${availabilityApi}?from=${encodeURIComponent(from)}`,
    );

    expect(response.status()).toBe(400);
  });

  test("returns 404 for an unknown calendar id", async ({ request }) => {
    const { from, to } = bookingWindow();
    const response = await request.get(
      `/api/calendars/${e2e.invalidId}/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );

    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Calendar not found",
    });
  });
});

// AUTHED PAGE: the FreeBusy grid + bookable overlay UI.
test.describe("availability page (authed)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("renders the grid with a column per member and a bookable overlay", async ({
    page,
  }) => {
    await page.goto(availabilityPage);

    await expect(page.getByTestId("availability-toolbar")).toBeVisible();
    await expect(page.getByTestId("viewer-timezone")).toBeVisible();

    // Both seeded members render their own column — invariant: none hidden.
    await expect(
      page.getByTestId(`member-column-${e2e.memberId}`),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByTestId(`member-column-${e2e.secondMemberId}`),
    ).toBeVisible();

    await expect(page.getByTestId("bookable-overlay")).toBeVisible();
  });

  test("day navigation writes ?date= and ?view=day to the URL", async ({
    page,
  }) => {
    await page.goto(availabilityPage);
    await expect(page.getByTestId("availability-toolbar")).toBeVisible();

    await page.getByTestId("nav-next").click();

    await expect(page).toHaveURL(/[?&]date=\d{4}-\d{2}-\d{2}/);
    await expect(page).toHaveURL(/[?&]view=day/);
  });

  test("week toggle renders the week grid and reflects view=week in the URL", async ({
    page,
  }) => {
    await page.goto(availabilityPage);
    await expect(page.getByTestId("availability-toolbar")).toBeVisible();

    await page.getByTestId("view-week").click();

    await expect(page).toHaveURL(/[?&]view=week/);
    await expect(page.getByTestId("week-grid")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("view-day").click();
    await expect(page).toHaveURL(/[?&]view=day/);
  });
});
