import { test, expect } from "@playwright/test";
import {
  annotateServer,
  authStatePath,
  detectServer,
  e2e,
  skipNoAuth,
  skipNoSeed,
  skipNoServer,
} from "./helpers";

const calendarId = e2e.calendarId;
const calendarName = e2e.calendarName;

// All visible sidebar links (Overview omitted: it is the current page in these tests).
const sidebarLinks = [
  "Members",
  "Settings",
  "Teams",
  "Links",
  "Scheduling",
  "Policies",
  "Integrations",
  "API keys",
  "Sequences",
  "Availability",
  "Book",
  "Meetings",
] as const;

// Platform subpaths whose unauth redirect is NOT covered elsewhere.
// (bare /calendars/:id + settings + members owned by admin-calendar.spec;
//  /meetings owned by meetings.spec; /calendars owned by smoke.spec.)
const uncoveredSubpaths = [
  "teams",
  "links",
  "scheduling",
  "policies",
  "integrations",
  "api-keys",
  "sequences",
  "book",
  "availability",
] as const;

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

test.describe("calendar overview auth guards (unauthenticated)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  for (const sub of uncoveredSubpaths) {
    test(`/${sub} subpath redirects unauthenticated users to login`, async ({
      page,
    }) => {
      const path = `/calendars/${calendarId}/${sub}`;
      await page.goto(path);

      await expect(page).toHaveURL(
        `/login?callbackUrl=${encodeURIComponent(path)}`,
      );
    });
  }
});

test.describe("calendar overview + admin shell (authenticated)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("calendars list renders a calendar card or the empty state", async ({
    page,
  }) => {
    await page.goto("/calendars");

    await expect(
      page.getByRole("heading", { level: 1, name: "Calendars" }),
    ).toBeVisible();

    const card = page.getByRole("link", { name: calendarName });
    const empty = page.getByRole("heading", { name: /no calendars yet/i });
    await expect(card.or(empty).first()).toBeVisible();
  });

  test("admin shell header shows brand and calendars nav", async ({ page }) => {
    await page.goto("/calendars");

    const banner = page.getByRole("banner");
    await expect(banner.getByRole("img", { name: /logo/i })).toBeVisible();
    await expect(
      banner.getByRole("link", { name: "Calendars", exact: true }),
    ).toBeVisible();
  });

  test("overview renders stats, header, and copy-link button", async ({
    page,
  }) => {
    await page.goto(`/calendars/${calendarId}`);

    await expect(
      page.getByRole("heading", { level: 1, name: calendarName }),
    ).toBeVisible();

    // Members stat links to the members tab; upcoming-meetings stat is unique text.
    await expect(
      page.locator(`a[href="/calendars/${calendarId}?tab=members"]`),
    ).toBeVisible();
    await expect(page.getByText("Upcoming meetings")).toBeVisible();

    await expect(
      page.getByRole("button", { name: /copy link/i }),
    ).toBeVisible();
  });

  test("sidebar shows all calendar navigation links", async ({ page }) => {
    await page.goto(`/calendars/${calendarId}`);

    const sidebar = page.getByRole("navigation", {
      name: "Calendar navigation",
    });
    for (const label of sidebarLinks) {
      await expect(
        sidebar.getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }
  });

  test("clicking a sidebar link navigates and marks it active", async ({
    page,
  }) => {
    await page.goto(`/calendars/${calendarId}`);

    const sidebar = page.getByRole("navigation", {
      name: "Calendar navigation",
    });
    await sidebar.getByRole("link", { name: "Members", exact: true }).click();

    await expect(page).toHaveURL(`/calendars/${calendarId}/members`);
    await expect(
      sidebar.getByRole("link", { name: "Members", exact: true }),
    ).toHaveAttribute("aria-current", "page");

    // Breadcrumb stays the calendar trail (it does not append the subpage).
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(
      breadcrumb.getByRole("link", { name: "Calendars" }),
    ).toBeVisible();
    await expect(breadcrumb.getByText(calendarName)).toBeVisible();
  });

  test("unknown calendar id renders the not-found page", async ({ page }) => {
    await page.goto(`/calendars/${e2e.invalidId}`);

    await expect(
      page.getByRole("heading", { name: /page not found/i }),
    ).toBeVisible();
  });
});
