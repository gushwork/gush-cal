import { test, expect, type APIResponse } from "@playwright/test";
import {
  annotateServer,
  authStatePath,
  detectServer,
  e2e,
  skipNoAuth,
  skipNoServer,
} from "./helpers";

const calendarId = e2e.calendarId;
const sf = `/api/calendars/${calendarId}/salesforce`;
const fieldMaps = `${sf}/field-maps`;
const webhooks = `/api/calendars/${calendarId}/webhooks`;
const integrationsPage = `/calendars/${calendarId}/integrations`;

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

function expectLoginRedirect(res: APIResponse, path: string) {
  expect(res.status()).toBeGreaterThanOrEqual(300);
  expect(res.status()).toBeLessThan(400);
  expect(res.headers().location).toContain(
    `/login?callbackUrl=${encodeURIComponent(path)}`,
  );
}

// Protected admin routes: middleware 307s to /login before the handler runs.
const protectedRoutes: { method: string; path: string }[] = [
  { method: "GET", path: sf },
  { method: "GET", path: `${sf}/connect` },
  { method: "GET", path: fieldMaps },
  { method: "POST", path: fieldMaps },
  { method: "PATCH", path: `${fieldMaps}/${e2e.salesforceFieldMapId}` },
  { method: "DELETE", path: `${fieldMaps}/${e2e.salesforceFieldMapId}` },
  { method: "GET", path: webhooks },
  { method: "POST", path: webhooks },
  { method: "PATCH", path: `${webhooks}/${e2e.webhookEndpointId}` },
  { method: "DELETE", path: `${webhooks}/${e2e.webhookEndpointId}` },
];

test.describe("integrations API auth guards", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  for (const { method, path } of protectedRoutes) {
    test(`${method} ${path} redirects unauthenticated to login`, async ({
      request,
    }) => {
      const res = await request.fetch(path, { method, maxRedirects: 0 });
      expectLoginRedirect(res, path);
    });
  }

  test("integrations page redirects unauthenticated to login", async ({
    page,
  }) => {
    await page.goto(integrationsPage);
    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(integrationsPage)}`,
    );
  });
});

test.describe("integrations API authenticated", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("salesforce status returns 200 with connected flag", async ({
    request,
  }) => {
    const res = await request.get(sf);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { connected: boolean };
    expect(typeof body.connected).toBe("boolean");
  });

  test("field maps list returns 200 and omits no seeded map", async ({
    request,
  }) => {
    const res = await request.get(fieldMaps);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { fieldMaps: { id: string }[] };
    expect(Array.isArray(body.fieldMaps)).toBe(true);
    expect(body.fieldMaps.some((m) => m.id === e2e.salesforceFieldMapId)).toBe(
      true,
    );
  });

  test("create + patch + delete a throwaway field map", async ({ request }) => {
    const created = await request.post(fieldMaps, {
      data: {
        eventType: "reassign",
        objectApiName: "Contact",
        fieldMappings: [{ source: "guestEmail", targetFieldApiName: "Email" }],
      },
    });
    expect(created.status()).toBe(201);
    const { fieldMap } = (await created.json()) as {
      fieldMap: { id: string; objectApiName: string };
    };
    expect(fieldMap.id).toBeTruthy();

    const patched = await request.patch(`${fieldMaps}/${fieldMap.id}`, {
      data: { objectApiName: "Lead" },
    });
    expect(patched.status()).toBe(200);
    const patchedBody = (await patched.json()) as {
      fieldMap: { objectApiName: string };
    };
    expect(patchedBody.fieldMap.objectApiName).toBe("Lead");

    const deleted = await request.delete(`${fieldMaps}/${fieldMap.id}`);
    expect(deleted.status()).toBe(204);
  });

  test("field map create rejects bad eventType", async ({ request }) => {
    const res = await request.post(fieldMaps, {
      data: {
        eventType: "garbage",
        objectApiName: "Contact",
        fieldMappings: [{ source: "guestEmail", targetFieldApiName: "Email" }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("field map create rejects missing objectApiName", async ({ request }) => {
    const res = await request.post(fieldMaps, {
      data: {
        eventType: "book",
        fieldMappings: [{ source: "guestEmail", targetFieldApiName: "Email" }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("field map delete returns 404 for unknown id", async ({ request }) => {
    const res = await request.delete(`${fieldMaps}/${e2e.invalidId}`);
    expect(res.status()).toBe(404);
  });

  test("webhooks list returns 200 and never leaks secret", async ({
    request,
  }) => {
    const res = await request.get(webhooks);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      endpoints: Record<string, unknown>[];
    };
    expect(Array.isArray(body.endpoints)).toBe(true);
    expect(body.endpoints.some((e) => e.id === e2e.webhookEndpointId)).toBe(
      true,
    );
    for (const endpoint of body.endpoints) {
      expect(endpoint).not.toHaveProperty("secret");
    }
  });

  test("create + patch + delete a throwaway webhook, then 404", async ({
    request,
  }) => {
    const created = await request.post(webhooks, {
      data: {
        url: "https://example.com/e2e-throwaway",
        enabledEvents: ["meeting.booked"],
      },
    });
    expect(created.status()).toBe(201);
    const { endpoint } = (await created.json()) as {
      endpoint: { id: string };
    };
    expect(endpoint.id).toBeTruthy();

    const patched = await request.patch(`${webhooks}/${endpoint.id}`, {
      data: { enabledEvents: ["meeting.booked", "meeting.cancelled"] },
    });
    expect(patched.status()).toBe(200);
    const patchedBody = (await patched.json()) as {
      endpoint: Record<string, unknown> & { enabledEvents: string[] };
    };
    expect(patchedBody.endpoint.enabledEvents).toHaveLength(2);
    expect(patchedBody.endpoint).not.toHaveProperty("secret");

    const deleted = await request.delete(`${webhooks}/${endpoint.id}`);
    expect(deleted.status()).toBe(204);

    const missing = await request.delete(`${webhooks}/${endpoint.id}`);
    expect(missing.status()).toBe(404);
  });

  test("webhook create rejects missing url", async ({ request }) => {
    const res = await request.post(webhooks, {
      data: { url: "", enabledEvents: ["meeting.booked"] },
    });
    expect(res.status()).toBe(400);
  });

  test("webhook create rejects empty enabledEvents", async ({ request }) => {
    const res = await request.post(webhooks, {
      data: { url: "https://example.com/e2e", enabledEvents: [] },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("integrations page authenticated", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("renders salesforce connect, field maps, and webhooks", async ({
    page,
  }) => {
    await page.goto(integrationsPage);
    await expect(
      page.getByRole("heading", { name: "Integrations", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /connect salesforce/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Field maps" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Webhooks" })).toBeVisible();
    await expect(page.getByText("https://webhook.example/e2e")).toBeVisible();
  });
});
