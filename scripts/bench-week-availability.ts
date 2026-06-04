/**
 * Benchmark week-range bookable slot generation (stub or live deps).
 *
 * Usage: npx tsx scripts/bench-week-availability.ts
 *
 * Target: P95 < 3s for a 7-day range with ~4 members (fix #137).
 */
import { createAppDeps } from "@/lib/deps";
import { computeAvailableSlots } from "@/lib/slots/generate-slots";
import type { CalendarBundle, WorkingHours } from "@/lib/types";

const weekdayHours = [
  { day: 1, start: 540, end: 1020 },
  { day: 2, start: 540, end: 1020 },
  { day: 3, start: 540, end: 1020 },
  { day: 4, start: 540, end: 1020 },
  { day: 5, start: 540, end: 1020 },
] satisfies WorkingHours;

const bundle: CalendarBundle = {
  id: process.env.BENCH_CALENDAR_ID ?? "bench-cal",
  schedulerId: "bench",
  name: "Benchmark calendar",
  slug: "bench",
  bookingWindowDays: 14,
  minNoticeHours: 0,
  defaultMaxPerDay: 4,
  defaultMaxPerWeek: 20,
  defaultWorkingHours: weekdayHours,
  timezone: "America/New_York",
  durations: [30, 60],
  createdAt: new Date().toISOString(),
  scheduler: { id: "bench", email: "bench@example.com", name: "Bench" },
  members: Array.from(
    { length: Number(process.env.BENCH_MEMBER_COUNT ?? "4") },
    (_, index) => ({
      id: `m-${index}`,
      calendarId: "bench-cal",
      email: `member${index}@example.com`,
      displayName: `Member ${index}`,
      maxPerDayOverride: null,
      maxPerWeekOverride: null,
      workingHoursOverride: null,
      timezone: null,
      sortOrder: index,
    }),
  ),
};

async function main() {
  const deps = createAppDeps();
  const rangeStart = process.env.BENCH_RANGE_START ?? "2026-06-08T04:00:00.000Z";
  const rangeEnd = process.env.BENCH_RANGE_END ?? "2026-06-15T03:59:59.999Z";
  const iterations = Number(process.env.BENCH_ITERATIONS ?? "5");
  const samples: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const slots = await computeAvailableSlots(deps, {
      bundle,
      durationMinutes: Number(process.env.BENCH_DURATION ?? "30"),
      rangeStart,
      rangeEnd,
      viewerTimezone: process.env.BENCH_TZ ?? "America/New_York",
      bookingPolicy: "admin",
    });
    const elapsed = performance.now() - start;
    samples.push(elapsed);
    console.log(
      `run ${i + 1}: ${elapsed.toFixed(0)}ms (${slots.length} slots)`,
    );
  }

  samples.sort((a, b) => a - b);
  const p95Index = Math.min(
    samples.length - 1,
    Math.ceil(samples.length * 0.95) - 1,
  );
  const p95 = samples[p95Index] ?? 0;
  console.log(`P95: ${p95.toFixed(0)}ms (target < 3000ms)`);
  process.exit(p95 < 3000 ? 0 : 1);
}

void main();
