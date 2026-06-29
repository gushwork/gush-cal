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
const linksPath = `/api/calendars/${calendarId}/links`;

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

// UNAUTH: middleware 307 -> /login?callbackUrl=<path>. No seed/auth needed.
test.describe("booking links auth guards", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  const linkPath = `${linksPath}/${e2e.bookingLinkId}`;
  const guarded = [
    { method: "GET", path: linksPath },
    { method: "POST", path: linksPath },
    { method: "PATCH", path: linkPath },
    { method: "DELETE", path: linkPath },
  ] as const;

  for (const { method, path } of guarded) {
    test(`${method} ${path} redirects to login`, async ({ request }) => {
      const res = await request.fetch(path, { method, maxRedirects: 0 });

      expect(res.status()).toBeGreaterThanOrEqual(300);
      expect(res.status()).toBeLessThan(400);
      expect(res.headers().location).toContain(
        `/login?callbackUrl=${encodeURIComponent(path)}`,
      );
    });
  }

  test("/links page redirects unauthenticated to login", async ({ page }) => {
    const path = `/calendars/${calendarId}/links`;
    await page.goto(path);

    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(path)}`,
    );
  });
});

function uniqueSlug(prefix = "e2e-link"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ponytail: in-test create + delete. Leaks a random-slug throwaway only if an
// assertion fails mid-test; no afterAll because `request` is test-scoped.
async function createLink(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; kind: string; slug: string; enabled: boolean }> {
  const res = await request.post(linksPath, {
    data: { kind: "calendar", slug: uniqueSlug(), ...overrides },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).link;
}

test.describe("booking links CRUD authenticated", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("GET lists links (200)", async ({ request }) => {
    const res = await request.get(linksPath);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.links)).toBe(true);
  });

  test("POST creates a calendar link (201)", async ({ request }) => {
    const link = await createLink(request);
    expect(link.id).toBeTruthy();
    expect(link.kind).toBe("calendar");
    await request.delete(`${linksPath}/${link.id}`);
  });

  test("POST creates a team link (201)", async ({ request }) => {
    const link = await createLink(request, {
      kind: "team",
      teamId: e2e.teamId,
      slug: uniqueSlug("e2e-team-link"),
    });
    expect(link.kind).toBe("team");
    await request.delete(`${linksPath}/${link.id}`);
  });

  test("POST creates a member link (201)", async ({ request }) => {
    // explicit slug: avoids colliding with any seeded auto-derived member link.
    const link = await createLink(request, {
      kind: "member",
      memberId: e2e.memberId,
      slug: uniqueSlug("e2e-member-link"),
    });
    expect(link.kind).toBe("member");
    await request.delete(`${linksPath}/${link.id}`);
  });

  const badBodies = [
    { label: "invalid kind", data: { kind: "bogus", slug: uniqueSlug() } },
    { label: "team kind missing teamId", data: { kind: "team", slug: uniqueSlug() } },
    { label: "member kind missing memberId", data: { kind: "member" } },
    { label: "non-member missing slug", data: { kind: "calendar" } },
  ];

  for (const { label, data } of badBodies) {
    test(`POST rejects ${label} (400)`, async ({ request }) => {
      const res = await request.post(linksPath, { data });
      expect(res.status()).toBe(400);
      await expect(res.json()).resolves.toHaveProperty("error");
    });
  }

  test("POST slug conflict returns 409", async ({ request }) => {
    const slug = uniqueSlug("e2e-conflict");
    const link = await createLink(request, { slug });
    const res = await request.post(linksPath, {
      data: { kind: "calendar", slug },
    });
    expect(res.status()).toBe(409);
    await request.delete(`${linksPath}/${link.id}`);
  });

  test("PATCH disables, re-enables, and renames slug (200)", async ({
    request,
  }) => {
    const link = await createLink(request);

    const disabled = await request.patch(`${linksPath}/${link.id}`, {
      data: { enabled: false },
    });
    expect(disabled.status()).toBe(200);
    expect((await disabled.json()).link.enabled).toBe(false);

    const enabled = await request.patch(`${linksPath}/${link.id}`, {
      data: { enabled: true },
    });
    expect(enabled.status()).toBe(200);
    expect((await enabled.json()).link.enabled).toBe(true);

    const nextSlug = uniqueSlug("e2e-renamed");
    const renamed = await request.patch(`${linksPath}/${link.id}`, {
      data: { slug: nextSlug },
    });
    expect(renamed.status()).toBe(200);
    expect((await renamed.json()).link.slug).toBe(nextSlug);

    await request.delete(`${linksPath}/${link.id}`);
  });

  test("PATCH unknown link returns 404", async ({ request }) => {
    const res = await request.patch(`${linksPath}/${e2e.invalidId}`, {
      data: { enabled: false },
    });
    expect(res.status()).toBe(404);
  });

  test("DELETE removes a link (204) and is 404 on unknown", async ({
    request,
  }) => {
    const link = await createLink(request);
    const del = await request.delete(`${linksPath}/${link.id}`);
    expect(del.status()).toBe(204);

    // do NOT delete e2e.bookingLinkId (shared seed); use a missing id instead.
    const missing = await request.delete(`${linksPath}/${e2e.invalidId}`);
    expect(missing.status()).toBe(404);
  });
});

test.describe("links page authenticated", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("renders the link list and create UI", async ({ page }) => {
    await page.goto(`/calendars/${calendarId}/links`);

    await expect(
      page.getByRole("heading", { name: /booking links/i, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create link/i }),
    ).toBeVisible();

    // list renders as a table (seeded link) or an empty state.
    await expect(
      page
        .getByRole("columnheader", { name: /slug/i })
        .or(page.getByText(/no booking links/i)),
    ).toBeVisible();
  });
});
