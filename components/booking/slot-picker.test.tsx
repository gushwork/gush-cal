import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
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

describe("SlotPicker", () => {
  it("renders time chips in a responsive grid", () => {
    const html = renderToStaticMarkup(
      <SlotPicker
        slots={slots}
        selectedStartsAt={null}
        onSelect={() => {}}
        viewerTimezone="UTC"
      />,
    );

    expect(html).toContain("grid-cols-3");
    expect(html).toContain("sm:grid-cols-4");
    expect(html).toContain("rounded-[var(--radius-pill)]");
  });

  it("marks selected chip with aria-pressed and primary tokens", () => {
    const html = renderToStaticMarkup(
      <SlotPicker
        slots={slots}
        selectedStartsAt="2026-06-08T14:00:00.000Z"
        onSelect={() => {}}
        viewerTimezone="UTC"
      />,
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("bg-primary text-white");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("bg-primary text-white");
  });

  it("renders formatted time labels for each slot", () => {
    const onSelect = vi.fn();
    const html = renderToStaticMarkup(
      <SlotPicker
        slots={slots}
        selectedStartsAt={null}
        onSelect={onSelect}
        viewerTimezone="UTC"
      />,
    );

    expect(html).toContain("2:00 PM");
    expect(html).toContain("3:00 PM");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows loading and empty states", () => {
    const loading = renderToStaticMarkup(
      <SlotPicker
        slots={[]}
        selectedStartsAt={null}
        onSelect={() => {}}
        loading
        viewerTimezone="UTC"
      />,
    );
    expect(loading).toContain("Loading times");

    const empty = renderToStaticMarkup(
      <SlotPicker
        slots={[]}
        selectedStartsAt={null}
        onSelect={() => {}}
        viewerTimezone="UTC"
      />,
    );
    expect(empty).toContain("No available times");
  });
});
