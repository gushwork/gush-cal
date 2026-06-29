import { test, expect, type APIRequestContext } from "@playwright/test";
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
// ponytail: reuse seeded member's domain instead of hardcoding ALLOWED_DOMAIN
const memberDomain = e2e.memberEmail.split("@")[1] ?? "example.com";

let counter = 0;
function freshEmail(): string {
  counter += 1;
  return `e2e-crud-${Date.now()}-${counter}@${memberDomain}`;
}

type MemberDto = {
  id: string;
  email: string;
  maxPerDayOverride: number | null;
  maxPerWeekOverride: number | null;
  workingHoursOverride: Array<{ day: number; start: number; end: number }> | null;
  timezone: string | null;
  sortOrder: number;
  assignmentWeight: number;
};

let serverAvailable = false;
test.beforeAll(async () => {
  serverAvailable = await detectServer();
});

async function createMember(request: APIRequestContext): Promise<MemberDto> {
  const res = await request.post(`/api/calendars/${calendarId}/members`, {
    data: { email: freshEmail() },
  });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { member: MemberDto }).member;
}

async function deleteMember(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`/api/calendars/${calendarId}/members/${id}`);
}

async function unauthMutation(
  request: APIRequestContext,
  method: "post" | "patch" | "delete",
  path: string,
) {
  const opts = { maxRedirects: 0 } as const;
  if (method === "post") return request.post(path, opts);
  if (method === "patch") return request.patch(path, opts);
  return request.delete(path, opts);
}

test.describe("member CRUD auth guards (unauthenticated)", () => {
  test.beforeEach(({}, testInfo) => {
    skipNoServer(serverAvailable);
    annotateServer(testInfo);
  });

  const mutations: Array<{ method: "post" | "patch" | "delete"; path: string }> = [
    { method: "post", path: `/api/calendars/${calendarId}/members` },
    {
      method: "patch",
      path: `/api/calendars/${calendarId}/members/${e2e.memberId}`,
    },
    {
      method: "delete",
      path: `/api/calendars/${calendarId}/members/${e2e.memberId}`,
    },
  ];

  for (const { method, path } of mutations) {
    test(`${method.toUpperCase()} ${path} redirects to login`, async ({
      request,
    }) => {
      const res = await unauthMutation(request, method, path);
      expect(res.status()).toBeGreaterThanOrEqual(300);
      expect(res.status()).toBeLessThan(400);
      expect(res.headers().location).toContain(
        `/login?callbackUrl=${encodeURIComponent(path)}`,
      );
    });
  }

  for (const path of [
    `/calendars/${calendarId}/members/new`,
    `/calendars/${calendarId}/members/${e2e.memberId}`,
  ]) {
    test(`page ${path} redirects to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(
        `/login?callbackUrl=${encodeURIComponent(path)}`,
      );
    });
  }
});

test.describe("member create (authenticated)", () => {
  test.beforeEach(({}, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("POST creates a member on the allowed domain → 201", async ({
    request,
  }) => {
    const email = freshEmail();
    const res = await request.post(`/api/calendars/${calendarId}/members`, {
      data: { email },
    });
    expect(res.status()).toBe(201);
    const { member } = (await res.json()) as { member: MemberDto };
    expect(member.id).toBeTruthy();
    expect(member.email).toBe(email.toLowerCase());
    expect(member.assignmentWeight).toBe(100);
    expect(typeof member.sortOrder).toBe("number");

    await deleteMember(request, member.id);
  });

  test("POST rejects a malformed email → 400", async ({ request }) => {
    const res = await request.post(`/api/calendars/${calendarId}/members`, {
      data: { email: "not-an-email" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST rejects an out-of-domain email → 400", async ({ request }) => {
    const res = await request.post(`/api/calendars/${calendarId}/members`, {
      data: { email: `outsider@${memberDomain}.invalid` },
    });
    expect(res.status()).toBe(400);
  });

  // BUG: missing email currently 500s — validateMemberEmail(undefined) ->
  // isAllowedEmail crashes on `email.lastIndexOf`. Contract is 400.
  test("POST rejects a missing email → 400", async ({ request }) => {
    const res = await request.post(`/api/calendars/${calendarId}/members`, {
      data: { displayName: "No Email" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST on an unknown calendar → 404", async ({ request }) => {
    const res = await request.post(
      `/api/calendars/${e2e.invalidId}/members`,
      { data: { email: freshEmail() } },
    );
    expect(res.status()).toBe(404);
  });
});

test.describe("member update (authenticated)", () => {
  test.beforeEach(({}, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("PATCH applies cap, working-hours, and timezone overrides → 200", async ({
    request,
  }) => {
    const member = await createMember(request);
    const res = await request.patch(
      `/api/calendars/${calendarId}/members/${member.id}`,
      {
        data: {
          maxPerDayOverride: 3,
          maxPerWeekOverride: 15,
          assignmentWeight: 250,
          workingHoursOverride: [{ day: 1, start: 540, end: 1020 }],
          timezone: "America/New_York",
        },
      },
    );
    expect(res.status()).toBe(200);
    const { member: updated } = (await res.json()) as { member: MemberDto };
    expect(updated.maxPerDayOverride).toBe(3);
    expect(updated.maxPerWeekOverride).toBe(15);
    expect(updated.assignmentWeight).toBe(250);
    expect(updated.timezone).toBe("America/New_York");
    expect(updated.workingHoursOverride).toEqual([
      { day: 1, start: 540, end: 1020 },
    ]);

    await deleteMember(request, member.id);
  });

  test("PATCH rejects invalid overrides → 400", async ({ request }) => {
    const member = await createMember(request);
    const url = `/api/calendars/${calendarId}/members/${member.id}`;

    const weightRes = await request.patch(url, {
      data: { assignmentWeight: 1500 },
    });
    expect(weightRes.status()).toBe(400);

    // CONTEXT invariant: custom hours require a member timezone.
    const tzRes = await request.patch(url, {
      data: {
        workingHoursOverride: [{ day: 1, start: 540, end: 1020 }],
        timezone: null,
      },
    });
    expect(tzRes.status()).toBe(400);

    await deleteMember(request, member.id);
  });

  test("PATCH on an unknown member → 404", async ({ request }) => {
    const res = await request.patch(
      `/api/calendars/${calendarId}/members/${e2e.invalidId}`,
      { data: { displayName: "ghost" } },
    );
    expect(res.status()).toBe(404);
  });
});

test.describe("member delete (authenticated)", () => {
  test.beforeEach(({}, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("DELETE removes a throwaway member → 204, then 404", async ({
    request,
  }) => {
    const member = await createMember(request);
    const url = `/api/calendars/${calendarId}/members/${member.id}`;

    const del = await request.delete(url);
    expect(del.status()).toBe(204);

    const again = await request.delete(url);
    expect(again.status()).toBe(404);
  });

  test("DELETE on an unknown member → 404", async ({ request }) => {
    const res = await request.delete(
      `/api/calendars/${calendarId}/members/${e2e.invalidId}`,
    );
    expect(res.status()).toBe(404);
  });
});

test.describe("member pages (authenticated)", () => {
  test.beforeEach(({}, testInfo) => {
    skipNoServer(serverAvailable);
    skipNoSeed();
    skipNoAuth();
    annotateServer(testInfo);
  });

  test.use({ storageState: authStatePath! });

  test("members/new renders the member form", async ({ page }) => {
    await page.goto(`/calendars/${calendarId}/members/new`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add Member" }),
    ).toBeVisible();
  });

  test("members/new surfaces a validation error for a bad email", async ({
    page,
  }) => {
    const path = `/calendars/${calendarId}/members/new`;
    await page.goto(path);
    await page
      .locator('input[type="email"]')
      .fill(`outsider@${memberDomain}.invalid`);
    await page.getByRole("button", { name: "Add Member" }).click();

    await expect(page.locator("p.text-destructive")).toBeVisible();
    await expect(page).toHaveURL(path);
  });

  test("members/:id edit loads the existing member", async ({ page }) => {
    await page.goto(`/calendars/${calendarId}/members/${e2e.memberId}`);
    await expect(page.locator('input[type="email"]')).toHaveValue(
      e2e.memberEmail,
    );
    await expect(
      page.getByRole("button", { name: "Save Member" }),
    ).toBeVisible();
  });
});
