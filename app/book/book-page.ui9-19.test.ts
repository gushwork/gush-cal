import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const adminBookPagePath = join(
  process.cwd(),
  "app/(admin)/calendars/[id]/book/page.tsx",
);
const publicBookPagePath = join(
  process.cwd(),
  "app/book/[slug]/page.tsx",
);
const bookingFlowPath = join(
  process.cwd(),
  "components/booking/booking-flow.tsx",
);

describe("SP-19 book pages and flow integration", () => {
  it("admin book page uses PageHeader.actions with secondary View meetings button", () => {
    const source = readFileSync(adminBookPagePath, "utf8");
    expect(source).toContain("PageHeader");
    expect(source).toContain("actions={");
    expect(source).toContain("Button asChild");
    expect(source).toContain('variant="secondary"');
    expect(source).toContain("View meetings");
    expect(source).toContain("/meetings");
    expect(source).not.toContain("View all meetings");
  });

  it("public book page exposes openGraph metadata for slug routes", () => {
    const source = readFileSync(publicBookPagePath, "utf8");
    expect(source).toContain("openGraph");
    expect(source).toContain("publicBookingUrl");
    expect(source).toContain("getSiteName");
    expect(source).toContain("generateMetadata");
  });

  it("public book page subtitle includes calendar booking context", () => {
    const source = readFileSync(publicBookPagePath, "utf8");
    expect(source).toContain("publicBookPageSubtitle");
    expect(source).toContain("bookingWindowDays");
    expect(source).toContain("durations");
    expect(source).not.toContain('subtitle="Pick a time that works for you."');
  });

  it("booking-flow clears slotsCacheRef on timezone change", () => {
    const source = readFileSync(bookingFlowPath, "utf8");
    expect(source).toContain("function handleTimezoneChange");
    expect(source).toMatch(
      /handleTimezoneChange[\s\S]*slotsCacheRef\.current = new Map\(\)/,
    );
    expect(source).toContain("BookingDatePanel");
    expect(source).toContain("BookingDurationPanel");
    expect(source).toContain("BookingDetailsPanel");
  });
});
