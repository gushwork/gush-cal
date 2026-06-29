import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  e2e,
  detectServer,
  skipNoServer,
  skipNoAuth,
  skipNoSeed,
  authStatePath,
  annotateServer,
  bearer,
} from "./helpers";

const calendarId = e2e.calendarId;
const keysPath = `/api/calendars/${calendarId}/keys`;
const keyItemPath = `/api/calendars/${calendarId}/keys/${e2e.apiKeyId}`;
const pagePath = `/calendars/${calendarId}/api-keys`;

let serverAvailable = false;
test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

function expectLoginRedirect(
  status: number,
  location: string | undefined,
  path: string,
): void {
  expect(status).toBeGreaterThanOrEqual(300);
  expect(status).toBeLessThan(400);
  expect(location).toContain(`/login?callbackUrl=${encodeURIComponent(path)}`);
}

async function createKey(request: APIRequestContext, name: string) {
  const res = await request.post(keysPath, { data: { name } });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as {
    key: { id: string; name: string; plaintextKey: string; revokedAt: string | null };
  };
  return body.key;
}

test.describe("api keys API auth guards (unauthenticated)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  // unauth requests are redirected by middleware before the handler runs,
  // so referencing e2e.apiKeyId here never mutates the seeded key.
  test("GET keys list redirects to login", async ({ request }) => {
    const res = await request.get(keysPath, { maxRedirects: 0 });
    expectLoginRedirect(res.status(), res.headers().location, keysPath);
  });

  test("POST keys create redirects to login", async ({ request }) => {
    const res = await request.post(keysPath, {
      maxRedirects: 0,
      data: { name: "should-not-create" },
    });
    expectLoginRedirect(res.status(), res.headers().location, keysPath);
  });

  test("PATCH key redirects to login", async ({ request }) => {
    const res = await request.patch(keyItemPath, { maxRedirects: 0 });
    expectLoginRedirect(res.status(), res.headers().location, keyItemPath);
  });

  test("DELETE key redirects to login", async ({ request }) => {
    const res = await request.delete(keyItemPath, { maxRedirects: 0 });
    expectLoginRedirect(res.status(), res.headers().location, keyItemPath);
  });
});

test.describe("api keys page auth guard (unauthenticated)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto(pagePath);
    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(pagePath)}`,
    );
  });
});

test.describe("api keys API (authenticated)", () => {
  test.use({ storageState: authStatePath! });

  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test("lists keys with metadata only, never secrets", async ({ request }) => {
    const res = await request.get(keysPath);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { keys: Array<Record<string, unknown>> };
    expect(Array.isArray(body.keys)).toBe(true);
    for (const key of body.keys) {
      expect(key).not.toHaveProperty("keyHash");
      expect(key).not.toHaveProperty("plaintextKey");
      expect(typeof key.id).toBe("string");
      expect(typeof key.name).toBe("string");
      expect(key).toHaveProperty("createdAt");
      expect(key).toHaveProperty("lastUsedAt");
      expect(key).toHaveProperty("revokedAt");
    }
  });

  test("creates key returning plaintext exactly once", async ({ request }) => {
    const key = await createKey(request, `e2e-create-${Date.now()}`);
    expect(key.plaintextKey).toMatch(/^gw_/);

    // plaintext (and hash) must not resurface on list
    const list = await request.get(keysPath);
    const found = (
      (await list.json()) as { keys: Array<Record<string, unknown>> }
    ).keys.find((k) => k.id === key.id);
    expect(found).toBeTruthy();
    expect(found).not.toHaveProperty("plaintextKey");
    expect(found).not.toHaveProperty("keyHash");

    await request.delete(`${keysPath}/${key.id}`);
  });

  test("rejects create with missing name (400)", async ({ request }) => {
    const res = await request.post(keysPath, { data: {} });
    expect(res.status()).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/name/i),
    });
  });

  test("revokes key via PATCH (200, revokedAt set)", async ({ request }) => {
    const key = await createKey(request, `e2e-revoke-${Date.now()}`);
    const res = await request.patch(`${keysPath}/${key.id}`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { key: { revokedAt: string | null } };
    expect(body.key.revokedAt).toBeTruthy();

    // already revoked -> 404 on re-revoke
    const again = await request.patch(`${keysPath}/${key.id}`);
    expect(again.status()).toBe(404);

    await request.delete(`${keysPath}/${key.id}`);
  });

  test("deletes key (204) and 404s unknown ids", async ({ request }) => {
    const key = await createKey(request, `e2e-delete-${Date.now()}`);
    const del = await request.delete(`${keysPath}/${key.id}`);
    expect(del.status()).toBe(204);

    const again = await request.delete(`${keysPath}/${key.id}`);
    expect(again.status()).toBe(404);

    const unknown = await request.delete(`${keysPath}/${e2e.invalidId}`);
    expect(unknown.status()).toBe(404);
  });

  test("404s list/create on unknown calendar", async ({ request }) => {
    const base = `/api/calendars/${e2e.invalidId}/keys`;
    expect((await request.get(base)).status()).toBe(404);
    expect(
      (await request.post(base, { data: { name: "x" } })).status(),
    ).toBe(404);
  });
});

test.describe("api keys page (authenticated)", () => {
  test.use({ storageState: authStatePath! });

  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test("renders key list, usage metadata, and create UI", async ({ page }) => {
    skipNoSeed();
    await page.goto(pagePath);

    await expect(
      page.getByRole("heading", { name: "API keys", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create api key/i }),
    ).toBeVisible();
    await expect(page.getByPlaceholder(/production webhook client/i)).toBeVisible();

    await expect(
      page.getByRole("columnheader", { name: /last used/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /created by/i }),
    ).toBeVisible();
    await expect(page.getByText("E2E active key")).toBeVisible();
  });
});

test.describe("api keys consumption (authenticated + seeded)", () => {
  test.use({ storageState: authStatePath! });

  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    skipNoSeed();
    annotateServer(testInfo);
  });

  test("freshly created key authenticates against /api/v1", async ({
    request,
  }) => {
    const key = await createKey(request, `e2e-v1-${Date.now()}`);
    const v1 = `/api/v1/calendars/${calendarId}/meetings`;

    // valid fresh key -> auth accepted (fails later on duration validation, not 401)
    const ok = await request.post(v1, {
      headers: bearer(key.plaintextKey),
      data: { durationMinutes: 999 },
    });
    expect(ok.status()).not.toBe(401);

    // invalid key -> 401
    const bad = await request.post(v1, {
      headers: bearer(e2e.invalidApiKey),
      data: { durationMinutes: 999 },
    });
    expect(bad.status()).toBe(401);

    await request.delete(`${keysPath}/${key.id}`);
  });
});
