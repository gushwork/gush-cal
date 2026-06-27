import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { DEFAULT_WORKING_HOURS } from "@/components/calendar-admin/validation";
import type { WorkingHours } from "@/lib/types";
import { POST as createCalendar } from "./route";
import { PATCH as updateCalendar } from "./[id]/route";
import { POST as createMember } from "./[id]/members/route";
import { PATCH as updateMember } from "./[id]/members/[memberId]/route";

const mockRequireSchedulerId = vi.fn();
const mockGetDb = vi.fn();

vi.mock("@/components/calendar-admin/require-scheduler", () => ({
  requireSchedulerId: () => mockRequireSchedulerId(),
  jsonError: (message: string, status: number) =>
    NextResponse.json({ error: message }, { status }),
}));

vi.mock("@/lib/db/client", () => ({
  getDb: () => mockGetDb(),
}));

vi.mock("@/lib/db/slug", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/slug")>();
  return {
    ...actual,
    generateCalendarSlug: () => "random-new-slug",
  };
});

const validHours: WorkingHours = [{ day: 1, start: 540, end: 1020 }];

const calendarRow = {
  id: "cal-1",
  schedulerId: "sched-1",
  name: "Engineering",
  slug: "test-slug",
  bookingWindowDays: 14,
  minNoticeHours: 0,
  defaultMaxPerDay: 3,
  defaultMaxPerWeek: 15,
  defaultWorkingHours: DEFAULT_WORKING_HOURS,
  timezone: "UTC",
  durations: [30],
  createdAt: "2026-01-01T00:00:00.000Z",
};

const memberRow = {
  id: "mem-1",
  calendarId: "cal-1",
  email: "member@acme.com",
  displayName: null,
  maxPerDayOverride: null,
  maxPerWeekOverride: null,
  workingHoursOverride: null,
  timezone: null,
  sortOrder: 1,
  assignmentWeight: 100,
};

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/calendars", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDbMock(
  handlers: {
    selectResults?: unknown[][];
    insertReturning?: unknown[];
    updateReturning?: unknown[];
  } = {},
) {
  const selectQueue = [...(handlers.selectResults ?? [])];
  let capturedInsertValues: unknown;
  let capturedUpdateSet: unknown;

  const insertReturning = vi.fn(() =>
    Promise.resolve(handlers.insertReturning ?? [calendarRow]),
  );
  const returning = vi.fn(() => insertReturning());
  const values = vi.fn((v: unknown) => {
    capturedInsertValues = v;
    return { returning };
  });
  const insert = vi.fn(() => ({ values }));

  const updateReturning = vi.fn(() =>
    Promise.resolve(handlers.updateReturning ?? [calendarRow]),
  );
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const set = vi.fn((s: unknown) => {
    capturedUpdateSet = s;
    return { where: updateWhere };
  });
  const update = vi.fn(() => ({ set }));

  const nextSelect = () => Promise.resolve(selectQueue.shift() ?? []);
  const limit = vi.fn(() => nextSelect());
  const orderBy = vi.fn(() => nextSelect());
  const where = vi.fn(() => ({
    limit,
    orderBy,
    then: (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => nextSelect().then(onFulfilled, onRejected),
  }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  mockGetDb.mockReturnValue({ select, insert, update });

  return {
    get capturedInsertValues() {
      return capturedInsertValues;
    },
    get capturedUpdateSet() {
      return capturedUpdateSet;
    },
  };
}

const createCalendarBody = {
  name: "Engineering",
  bookingWindowDays: 14,
  minNoticeHours: 0,
  defaultMaxPerDay: 3,
  defaultMaxPerWeek: 15,
  defaultWorkingHours: validHours,
  timezone: "UTC",
  durations: [30],
};

describe("POST /api/calendars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_DOMAIN = "acme.com";
    mockRequireSchedulerId.mockResolvedValue({ schedulerId: "sched-1" });
  });

  it("creates calendar with timezone and validated hours", async () => {
    const db = createDbMock({ insertReturning: [calendarRow] });

    const res = await createCalendar(jsonRequest(createCalendarBody));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { calendar: { timezone: string } };
    expect(body.calendar.timezone).toBe("UTC");
    expect(db.capturedInsertValues).toMatchObject({
      timezone: "UTC",
      defaultWorkingHours: validHours,
    });
  });

  it("persists minNoticeHours on create", async () => {
    const db = createDbMock({
      insertReturning: [{ ...calendarRow, minNoticeHours: 48 }],
    });

    const res = await createCalendar(
      jsonRequest({ ...createCalendarBody, minNoticeHours: 48 }),
    );
    expect(res.status).toBe(201);
    expect(db.capturedInsertValues).toMatchObject({ minNoticeHours: 48 });
  });

  it("returns 400 when minNoticeHours is out of range", async () => {
    createDbMock();
    const res = await createCalendar(
      jsonRequest({ ...createCalendarBody, minNoticeHours: 721 }),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/between 0 and 720/);
  });

  it("returns 400 when timezone is missing", async () => {
    createDbMock({});
    const { timezone: _tz, ...body } = createCalendarBody;

    const res = await createCalendar(jsonRequest(body));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Timezone is required/);
  });

  it("returns 400 for invalid timezone", async () => {
    createDbMock();
    const res = await createCalendar(
      jsonRequest({ ...createCalendarBody, timezone: "Not/A/Zone" }),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid timezone/);
  });

  it("returns 400 for overlapping default hours", async () => {
    createDbMock();
    const res = await createCalendar(
      jsonRequest({
        ...createCalendarBody,
        defaultWorkingHours: [
          { day: 1, start: 540, end: 720 },
          { day: 1, start: 660, end: 900 },
        ],
      }),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Overlapping/);
  });
});

describe("PATCH /api/calendars/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSchedulerId.mockResolvedValue({ schedulerId: "sched-1" });
  });

  it("updates timezone when valid", async () => {
    const db = createDbMock({
      updateReturning: [{ ...calendarRow, timezone: "America/New_York" }],
    });

    const res = await updateCalendar(
      jsonRequest({ timezone: "America/New_York" }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(200);
    expect(db.capturedUpdateSet).toMatchObject({ timezone: "America/New_York" });
  });

  it("persists minNoticeHours on patch without resetting to zero", async () => {
    const db = createDbMock({
      updateReturning: [{ ...calendarRow, minNoticeHours: 12 }],
    });

    const res = await updateCalendar(
      jsonRequest({ minNoticeHours: 12 }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(200);
    expect(db.capturedUpdateSet).toMatchObject({ minNoticeHours: 12 });
    expect(db.capturedUpdateSet).not.toHaveProperty("minNoticeHours", 0);
  });

  it("returns 400 for invalid working hours on patch", async () => {
    createDbMock();
    const res = await updateCalendar(
      jsonRequest({ defaultWorkingHours: [] }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/At least one availability window/);
  });

  it("updates slug with valid custom value", async () => {
    const db = createDbMock({
      selectResults: [
        [{ id: "cal-1", slug: "test-slug" }],
        [],
      ],
      updateReturning: [{ ...calendarRow, slug: "eng-panel" }],
    });

    const res = await updateCalendar(
      jsonRequest({ slug: "eng-panel" }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(200);
    expect(db.capturedUpdateSet).toMatchObject({ slug: "eng-panel" });
  });

  it("returns 400 for invalid slug", async () => {
    createDbMock({
      selectResults: [[{ id: "cal-1", slug: "test-slug" }]],
    });

    const res = await updateCalendar(
      jsonRequest({ slug: "ab" }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when slug is already in use", async () => {
    createDbMock({
      selectResults: [
        [{ id: "cal-1", slug: "test-slug" }],
        [{ id: "cal-2" }],
      ],
    });

    const res = await updateCalendar(
      jsonRequest({ slug: "eng-panel" }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(409);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/already in use/);
  });

  it("randomizes slug when randomizeSlug is true", async () => {
    const db = createDbMock({
      selectResults: [
        [{ id: "cal-1", slug: "test-slug" }],
        [],
      ],
      updateReturning: [{ ...calendarRow, slug: "random-new-slug" }],
    });

    const res = await updateCalendar(
      jsonRequest({ randomizeSlug: true }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(200);
    expect(db.capturedUpdateSet).toMatchObject({ slug: "random-new-slug" });
  });

  it("returns 400 when slug and randomizeSlug are both sent", async () => {
    const res = await updateCalendar(
      jsonRequest({ slug: "eng-panel", randomizeSlug: true }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/calendars/:id/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_DOMAIN = "acme.com";
    mockRequireSchedulerId.mockResolvedValue({ schedulerId: "sched-1" });
  });

  it("creates member with override and timezone", async () => {
    const db = createDbMock({
      selectResults: [[calendarRow], [{ value: 0 }]],
      insertReturning: [
        {
          ...memberRow,
          workingHoursOverride: validHours,
          timezone: "America/Chicago",
        },
      ],
    });

    const res = await createMember(
      jsonRequest({
        email: "member@acme.com",
        workingHoursOverride: validHours,
        timezone: "America/Chicago",
      }),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(201);
    expect(db.capturedInsertValues).toMatchObject({
      workingHoursOverride: validHours,
      timezone: "America/Chicago",
    });
  });

  it("returns 400 when override lacks timezone", async () => {
    createDbMock({ selectResults: [[calendarRow], [{ value: 0 }]] });

    const res = await createMember(
      jsonRequest({
        email: "member@acme.com",
        workingHoursOverride: validHours,
      }),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Member timezone required/);
  });

  it("returns 400 when timezone set without override", async () => {
    createDbMock({ selectResults: [[calendarRow], [{ value: 0 }]] });

    const res = await createMember(
      jsonRequest({
        email: "member@acme.com",
        timezone: "UTC",
      }),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/must be empty/);
  });

  it("creates member with assignment weight", async () => {
    const db = createDbMock({
      selectResults: [[calendarRow], [{ value: 0 }]],
      insertReturning: [{ ...memberRow, assignmentWeight: 250 }],
    });

    const res = await createMember(
      jsonRequest({
        email: "member@acme.com",
        assignmentWeight: 250,
      }),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(201);
    expect(db.capturedInsertValues).toMatchObject({ assignmentWeight: 250 });
  });

  it("returns 400 for invalid assignment weight", async () => {
    createDbMock({ selectResults: [[calendarRow], [{ value: 0 }]] });

    const res = await createMember(
      jsonRequest({
        email: "member@acme.com",
        assignmentWeight: 0,
      }),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("clears timezone when override is empty", async () => {
    const db = createDbMock({
      selectResults: [[calendarRow], [{ value: 0 }]],
      insertReturning: [memberRow],
    });

    const res = await createMember(
      jsonRequest({
        email: "member@acme.com",
        workingHoursOverride: [],
      }),
      { params: Promise.resolve({ id: "cal-1" }) },
    );
    expect(res.status).toBe(201);
    expect(db.capturedInsertValues).toMatchObject({
      workingHoursOverride: null,
      timezone: null,
    });
  });
});

describe("PATCH /api/calendars/:id/members/:memberId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_DOMAIN = "acme.com";
    mockRequireSchedulerId.mockResolvedValue({ schedulerId: "sched-1" });
  });

  it("clears timezone when override is cleared", async () => {
    const db = createDbMock({
      selectResults: [
        [calendarRow],
        [
          {
            ...memberRow,
            workingHoursOverride: validHours,
            timezone: "America/Chicago",
          },
        ],
      ],
      updateReturning: [memberRow],
    });

    const res = await updateMember(
      jsonRequest({ workingHoursOverride: null }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1", memberId: "mem-1" }) },
    );
    expect(res.status).toBe(200);
    expect(db.capturedUpdateSet).toMatchObject({
      workingHoursOverride: null,
      timezone: null,
    });
  });

  it("returns 400 when adding timezone without override", async () => {
    createDbMock({
      selectResults: [[calendarRow], [memberRow]],
    });

    const res = await updateMember(
      jsonRequest({ timezone: "UTC" }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1", memberId: "mem-1" }) },
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/must be empty/);
  });

  it("returns 400 for invalid override hours", async () => {
    createDbMock({
      selectResults: [[calendarRow], [memberRow]],
    });

    const res = await updateMember(
      jsonRequest(
        {
          workingHoursOverride: [{ day: 1, start: 900, end: 540 }],
          timezone: "UTC",
        },
        "PATCH",
      ),
      { params: Promise.resolve({ id: "cal-1", memberId: "mem-1" }) },
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid time range/);
  });

  it("updates assignment weight", async () => {
    const db = createDbMock({
      selectResults: [[calendarRow]],
      updateReturning: [{ ...memberRow, assignmentWeight: 300 }],
    });

    const res = await updateMember(
      jsonRequest({ assignmentWeight: 300 }, "PATCH"),
      { params: Promise.resolve({ id: "cal-1", memberId: "mem-1" }) },
    );
    expect(res.status).toBe(200);
    expect(db.capturedUpdateSet).toMatchObject({ assignmentWeight: 300 });
  });
});
