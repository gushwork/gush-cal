import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingLinkRow } from "@/lib/db/schema";
import {
  buildPublicUrl,
  createBookingLink,
  deleteBookingLink,
  listBookingLinks,
  resolveBookingLink,
  updateBookingLink,
} from "./links";
import { deriveMemberSlugBase, ensureUniqueSlug } from "./slug";

const mockGetDb = vi.fn();

vi.mock("@/lib/db/client", () => ({
  getDb: () => mockGetDb(),
}));

const calendarId = "cal-1";
const calendarSlug = "acme";

const memberLinkRow: BookingLinkRow = {
  id: "link-1",
  calendarId,
  kind: "member",
  slug: "jane-doe",
  teamId: null,
  memberId: "mem-1",
  redirectOverride: null,
  enabled: true,
};

const teamLinkRow: BookingLinkRow = {
  id: "link-2",
  calendarId,
  kind: "team",
  slug: "enterprise",
  teamId: "team-1",
  memberId: null,
  redirectOverride: null,
  enabled: true,
};

function createDbMock(handlers: {
  selectResults?: unknown[][];
  insertReturning?: unknown[];
  updateReturning?: unknown[];
  deleteReturning?: unknown[];
}) {
  const selectQueue = [...(handlers.selectResults ?? [])];

  const insertReturning = vi.fn(() =>
    Promise.resolve(handlers.insertReturning ?? []),
  );
  const insert = vi.fn(() => ({
    values: vi.fn(() => ({ returning: insertReturning })),
  }));

  const updateReturning = vi.fn(() =>
    Promise.resolve(handlers.updateReturning ?? []),
  );
  const update = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({ returning: updateReturning })),
    })),
  }));

  const deleteReturning = vi.fn(() =>
    Promise.resolve(handlers.deleteReturning ?? []),
  );
  const del = vi.fn(() => ({
    where: vi.fn(() => ({ returning: deleteReturning })),
  }));

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

  mockGetDb.mockReturnValue({ select, insert, update, delete: del });

  return { insertReturning, updateReturning, deleteReturning };
}

describe("slug", () => {
  it("derives slug from displayName", () => {
    expect(deriveMemberSlugBase("Jane Doe", "jane@acme.com")).toBe("jane-doe");
  });

  it("derives slug from email local-part when no displayName", () => {
    expect(deriveMemberSlugBase(null, "jane@acme.com")).toBe("jane");
  });

  it("resolves slug collisions with numeric suffix", () => {
    const taken = new Set(["jane", "jane-2"]);
    expect(ensureUniqueSlug("jane", taken)).toBe("jane-3");
    expect(ensureUniqueSlug("bob", taken)).toBe("bob");
  });
});

describe("buildPublicUrl", () => {
  it("uses path aliases from routing helpers", () => {
    expect(
      buildPublicUrl(calendarSlug, { kind: "member", slug: "jane-doe" }),
    ).toBe("/book/acme/m/jane-doe");
    expect(
      buildPublicUrl(calendarSlug, { kind: "team", slug: "enterprise" }),
    ).toBe("/book/acme/t/enterprise");
    expect(
      buildPublicUrl(calendarSlug, { kind: "calendar", slug: "default" }),
    ).toBe("/book/acme");
  });
});

describe("resolveBookingLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns memberId for enabled member link", async () => {
    createDbMock({
      selectResults: [
        [memberLinkRow],
        [{ slug: calendarSlug }],
      ],
    });

    const result = await resolveBookingLink(calendarId, "jane-doe");
    expect(result).toEqual({
      link: expect.objectContaining({
        id: "link-1",
        kind: "member",
        memberId: "mem-1",
        publicUrl: "/book/acme/m/jane-doe",
      }),
      memberId: "mem-1",
    });
  });

  it("returns teamId for team link", async () => {
    createDbMock({
      selectResults: [
        [teamLinkRow],
        [{ slug: calendarSlug }],
      ],
    });

    const result = await resolveBookingLink(calendarId, "enterprise");
    expect(result).toEqual({
      link: expect.objectContaining({
        kind: "team",
        teamId: "team-1",
        publicUrl: "/book/acme/t/enterprise",
      }),
      teamId: "team-1",
    });
  });

  it("returns null for disabled link", async () => {
    createDbMock({
      selectResults: [[{ ...memberLinkRow, enabled: false }]],
    });

    expect(await resolveBookingLink(calendarId, "jane-doe")).toBeNull();
  });

  it("returns null when slug not found", async () => {
    createDbMock({ selectResults: [[]] });
    expect(await resolveBookingLink(calendarId, "missing")).toBeNull();
  });
});

describe("booking link CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists links with publicUrl", async () => {
    createDbMock({
      selectResults: [
        [memberLinkRow, teamLinkRow],
        [{ slug: calendarSlug }],
      ],
    });

    const links = await listBookingLinks(calendarId);
    expect(links).toHaveLength(2);
    expect(links[0]?.publicUrl).toBe("/book/acme/m/jane-doe");
    expect(links[1]?.publicUrl).toBe("/book/acme/t/enterprise");
  });

  it("creates a link", async () => {
    createDbMock({
      selectResults: [[], [{ slug: calendarSlug }]],
      insertReturning: [memberLinkRow],
    });

    const link = await createBookingLink(calendarId, {
      kind: "member",
      slug: "jane-doe",
      memberId: "mem-1",
    });

    expect(link).toMatchObject({
      id: "link-1",
      kind: "member",
      slug: "jane-doe",
      publicUrl: "/book/acme/m/jane-doe",
    });
  });

  it("rejects duplicate slug on create", async () => {
    createDbMock({
      selectResults: [[{ slug: "jane-doe" }]],
    });

    await expect(
      createBookingLink(calendarId, {
        kind: "member",
        slug: "jane-doe",
        memberId: "mem-1",
      }),
    ).rejects.toThrow(/slug.*taken/i);
  });

  it("updates a link", async () => {
    createDbMock({
      selectResults: [[{ slug: calendarSlug }]],
      updateReturning: [{ ...memberLinkRow, enabled: false }],
    });

    const link = await updateBookingLink(calendarId, "link-1", {
      enabled: false,
    });
    expect(link?.enabled).toBe(false);
  });

  it("deletes a link", async () => {
    createDbMock({
      deleteReturning: [{ id: "link-1" }],
    });

    expect(await deleteBookingLink(calendarId, "link-1")).toBe(true);
  });
});
