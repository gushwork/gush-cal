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

  const dbObj = { select, insert, update, delete: del };
  const transaction = vi.fn((fn: (tx: typeof dbObj) => unknown) =>
    Promise.resolve(fn(dbObj)),
  );
  mockGetDb.mockReturnValue({ ...dbObj, transaction });

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
      // existingSlugs, member lookup (BUG-015 scope check), calendar slug
      selectResults: [
        [],
        [{ email: "jane@acme.com", displayName: "Jane Doe" }],
        [{ slug: calendarSlug }],
      ],
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

  it("forces a team link slug to the team slug (BUG-014)", async () => {
    createDbMock({
      // existingSlugs, team lookup (slug source + BUG-015 scope check), cal slug
      selectResults: [[], [{ slug: "enterprise" }], [{ slug: calendarSlug }]],
      insertReturning: [teamLinkRow],
    });

    const link = await createBookingLink(calendarId, {
      kind: "team",
      teamId: "team-1",
      slug: "mismatched-slug",
    });

    expect(link.slug).toBe("enterprise");
    expect(link.publicUrl).toBe("/book/acme/t/enterprise");
  });

  it("rejects a member from another calendar (BUG-015)", async () => {
    createDbMock({
      selectResults: [[], []],
    });

    await expect(
      createBookingLink(calendarId, {
        kind: "member",
        slug: "stranger",
        memberId: "mem-other",
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("rejects duplicate slug on create", async () => {
    createDbMock({
      selectResults: [
        [{ slug: "jane-doe" }],
        [{ email: "jane@acme.com", displayName: "Jane Doe" }],
      ],
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
      selectResults: [
        [{ slug: "jane-doe", kind: "member", teamId: null }],
        [{ slug: calendarSlug }],
      ],
      updateReturning: [{ ...memberLinkRow, enabled: false }],
    });

    const link = await updateBookingLink(calendarId, "link-1", {
      enabled: false,
    });
    expect(link?.enabled).toBe(false);
  });

  it("rejects a slug change colliding with a team (BUG-016b)", async () => {
    createDbMock({
      // current link, booking-link conflict (none), team conflict (other team)
      selectResults: [
        [{ slug: "enterprise", kind: "team", teamId: "team-1" }],
        [],
        [{ id: "team-2" }],
      ],
    });

    await expect(
      updateBookingLink(calendarId, "link-2", { slug: "taken-by-team" }),
    ).rejects.toThrow(/taken/i);
  });

  it("syncs the team slug when a team link slug changes (BUG-002)", async () => {
    createDbMock({
      // current link, booking-link conflict (none), team conflict (none), cal slug
      selectResults: [
        [{ slug: "enterprise", kind: "team", teamId: "team-1" }],
        [],
        [],
        [{ slug: calendarSlug }],
      ],
      updateReturning: [{ ...teamLinkRow, slug: "new-enterprise" }],
    });

    const link = await updateBookingLink(calendarId, "link-2", {
      slug: "new-enterprise",
    });
    expect(link?.slug).toBe("new-enterprise");
    expect(link?.publicUrl).toBe("/book/acme/t/new-enterprise");
  });

  it("deletes a link", async () => {
    createDbMock({
      deleteReturning: [{ id: "link-1" }],
    });

    expect(await deleteBookingLink(calendarId, "link-1")).toBe(true);
  });
});
