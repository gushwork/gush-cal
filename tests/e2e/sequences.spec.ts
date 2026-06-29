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
const sequenceId = e2e.sequenceId;
const invalidId = e2e.invalidId;

const seqBase = `/api/calendars/${calendarId}/sequences`;
const oneSeq = `${seqBase}/${sequenceId}`;
const stepsPath = `${oneSeq}/steps`;
const pagePath = `/calendars/${calendarId}/sequences`;

let serverAvailable = false;

test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

function expectLoginRedirect(response: APIResponse, path: string): void {
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(response.headers().location).toContain(
    `/login?callbackUrl=${encodeURIComponent(path)}`,
  );
}

test.describe("sequences API auth guards (unauthenticated)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  const cases: { method: string; path: string }[] = [
    { method: "GET", path: seqBase },
    { method: "POST", path: seqBase },
    { method: "GET", path: oneSeq },
    { method: "PATCH", path: oneSeq },
    { method: "DELETE", path: oneSeq },
    { method: "GET", path: stepsPath },
    { method: "PUT", path: stepsPath },
  ];

  for (const { method, path } of cases) {
    test(`${method} ${path} redirects to login`, async ({ request }) => {
      const response = await request.fetch(path, { method, maxRedirects: 0 });
      expectLoginRedirect(response, path);
    });
  }

  test("sequences page redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto(pagePath);
    await expect(page).toHaveURL(
      `/login?callbackUrl=${encodeURIComponent(pagePath)}`,
    );
  });
});

test.describe("sequences API (authenticated)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  // Throwaway sequences are created disabled so any leftover never fires.
  async function createThrowaway(
    request: import("@playwright/test").APIRequestContext,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request.post(seqBase, {
      data: {
        name: `e2e-throwaway-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        triggerEvent: "meeting.booked",
        enabled: false,
        ...overrides,
      },
    });
    expect(res.status()).toBe(201);
    const { sequence } = (await res.json()) as { sequence: { id: string } };
    return sequence.id;
  }

  test("lists sequences and includes the seeded sequence", async ({
    request,
  }) => {
    const res = await request.get(seqBase);
    expect(res.status()).toBe(200);
    const { sequences } = (await res.json()) as {
      sequences: { id: string }[];
    };
    expect(Array.isArray(sequences)).toBe(true);
    expect(sequences.map((s) => s.id)).toContain(sequenceId);
  });

  test("gets a single sequence; unknown id → 404", async ({ request }) => {
    const ok = await request.get(oneSeq);
    expect(ok.status()).toBe(200);
    const body = (await ok.json()) as { sequence: { id: string } };
    expect(body.sequence.id).toBe(sequenceId);

    const missing = await request.get(`${seqBase}/${invalidId}`);
    expect(missing.status()).toBe(404);
  });

  test("creates a sequence → 201", async ({ request }) => {
    const id = await createThrowaway(request);
    expect(id).toBeTruthy();
    await request.delete(`${seqBase}/${id}`);
  });

  test("rejects missing name → 400", async ({ request }) => {
    const res = await request.post(seqBase, {
      data: { triggerEvent: "meeting.booked" },
    });
    expect(res.status()).toBe(400);
  });

  // BUG: triggerEvent enum not validated — currently returns 201 (see report).
  test("rejects invalid triggerEvent → 400", async ({ request }) => {
    const res = await request.post(seqBase, {
      data: { name: "e2e-bad-trigger", triggerEvent: "not.a.real.event" },
    });
    expect(res.status()).toBe(400);
    if (res.status() === 201) {
      const { sequence } = (await res.json()) as { sequence: { id: string } };
      await request.delete(`${seqBase}/${sequence.id}`);
    }
  });

  test("patches enable/disable + rename → 200", async ({ request }) => {
    const id = await createThrowaway(request, { enabled: true });
    const renamed = `e2e-renamed-${Date.now()}`;
    const res = await request.patch(`${seqBase}/${id}`, {
      data: { enabled: false, name: renamed },
    });
    expect(res.status()).toBe(200);
    const { sequence } = (await res.json()) as {
      sequence: { name: string; enabled: boolean };
    };
    expect(sequence.name).toBe(renamed);
    expect(sequence.enabled).toBe(false);
    await request.delete(`${seqBase}/${id}`);
  });

  test("deletes a sequence → 204; unknown id → 404", async ({ request }) => {
    const id = await createThrowaway(request);
    const del = await request.delete(`${seqBase}/${id}`);
    expect(del.status()).toBe(204);

    const missing = await request.delete(`${seqBase}/${invalidId}`);
    expect(missing.status()).toBe(404);
  });

  test("lists steps for the seeded sequence → 200", async ({ request }) => {
    const res = await request.get(stepsPath);
    expect(res.status()).toBe(200);
    const { steps } = (await res.json()) as { steps: unknown[] };
    expect(Array.isArray(steps)).toBe(true);
  });

  test("replaces steps across anchors and actions → 200", async ({
    request,
  }) => {
    const id = await createThrowaway(request);
    const sent = [
      {
        order: 1,
        delayMinutes: 0,
        timingAnchor: "after_booking",
        action: "send_email",
        subjectTemplate: "Booked",
        bodyTemplate: "Thanks for booking",
      },
      {
        order: 2,
        delayMinutes: 60,
        timingAnchor: "before_meeting",
        action: "webhook",
      },
      {
        order: 3,
        delayMinutes: 30,
        timingAnchor: "after_meeting",
        action: "both",
        subjectTemplate: "Follow up",
      },
    ];
    const res = await request.put(`${seqBase}/${id}/steps`, {
      data: { steps: sent },
    });
    expect(res.status()).toBe(200);
    const { steps } = (await res.json()) as {
      steps: {
        order: number;
        timingAnchor: string;
        action: string;
        delayMinutes: number;
      }[];
    };
    expect(steps.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(steps.map((s) => s.timingAnchor)).toEqual([
      "after_booking",
      "before_meeting",
      "after_meeting",
    ]);
    expect(steps.map((s) => s.action)).toEqual(["send_email", "webhook", "both"]);
    await request.delete(`${seqBase}/${id}`);
  });

  test("rejects invalid step action → 400", async ({ request }) => {
    const res = await request.put(stepsPath, {
      data: { steps: [{ order: 1, delayMinutes: 0, action: "nope" }] },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects invalid timingAnchor → 400", async ({ request }) => {
    const res = await request.put(stepsPath, {
      data: {
        steps: [
          {
            order: 1,
            delayMinutes: 0,
            timingAnchor: "whenever",
            action: "send_email",
            subjectTemplate: "x",
          },
        ],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects negative delayMinutes → 400", async ({ request }) => {
    const res = await request.put(stepsPath, {
      data: {
        steps: [
          {
            order: 1,
            delayMinutes: -5,
            action: "send_email",
            subjectTemplate: "x",
          },
        ],
      },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("sequences page (authenticated)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("renders the sequence list and step editor UI", async ({ page }) => {
    await page.goto(pagePath);

    await expect(
      page.getByRole("heading", { name: "Email sequences" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add sequence" }),
    ).toBeVisible();

    const header = page.locator(`#sequence-header-${sequenceId}`);
    await expect(header).toBeVisible();
    await header.click();
    await expect(
      page.getByRole("heading", { name: "Steps" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Add step" })).toBeVisible();
  });
});
