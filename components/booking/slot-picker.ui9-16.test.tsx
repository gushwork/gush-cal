import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingDurationPanel } from "./steps/booking-duration-panel";
import { SlotPicker } from "./slot-picker";
import type { Slot } from "@/lib/types";

const slots: Slot[] = [
  {
    startsAt: "2026-06-08T14:00:00.000Z",
    durationMinutes: 30,
    eligibleMemberCount: 2,
  },
  {
    startsAt: "2026-06-08T15:00:00.000Z",
    durationMinutes: 30,
    eligibleMemberCount: 1,
  },
];

describe("SP-16 BookingDurationPanel", () => {
  it("uses Chip with control shape", () => {
    const html = renderToStaticMarkup(
      <BookingDurationPanel
        durations={[30, 60]}
        selectedMinutes={30}
        onSelectMinutes={() => {}}
        onContinue={() => {}}
      />,
    );

    expect(html).toContain("rounded-[var(--radius-control)]");
    expect(html).toContain('aria-label="Duration"');
  });
});

describe("SP-16 SlotPicker", () => {
  it("slot-picker source imports Chip", () => {
    const source = readFileSync(
      join(process.cwd(), "components/booking/slot-picker.tsx"),
      "utf8",
    );
    expect(source).toContain('from "@/components/ui/chip"');
    expect(source).toContain('shape="pill"');
  });

  it("renders pill chips with member availability copy", () => {
    const html = renderToStaticMarkup(
      <SlotPicker
        slots={slots}
        selectedStartsAt="2026-06-08T14:00:00.000Z"
        onSelect={() => {}}
        viewerTimezone="UTC"
      />,
    );

    expect(html).toContain("rounded-[var(--radius-pill)]");
    expect(html).toContain("2 members free");
    expect(html).toContain("1 member free");
    expect(html).toContain('aria-pressed="true"');
  });

  it("empty state offers link back to date step", () => {
    const onBack = vi.fn();
    const html = renderToStaticMarkup(
      <SlotPicker
        slots={[]}
        selectedStartsAt={null}
        onSelect={() => {}}
        viewerTimezone="UTC"
        onBackToDate={onBack}
      />,
    );

    expect(html).toContain("Choose another date");
    expect(onBack).not.toHaveBeenCalled();
  });

  it("shows skeleton grid while loading", () => {
    const html = renderToStaticMarkup(
      <SlotPicker
        slots={[]}
        selectedStartsAt={null}
        onSelect={() => {}}
        loading
        viewerTimezone="UTC"
      />,
    );

    expect(html).toContain("Loading times");
    expect(html).toContain("animate-skeleton");
  });
});
