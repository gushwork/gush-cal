import { NextResponse } from "next/server";
import { getAvailableSlotsForCalendar } from "@/lib/booking/get-slots";
import { loadCalendarBundleBySlug } from "@/lib/booking/load-calendar-by-slug";
import { parseSlotsQuery } from "@/lib/booking/parse-slots-query";
import { createAppDeps } from "@/lib/deps";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const bundle = await loadCalendarBundleBySlug(slug);

  if (!bundle) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const parsed = parseSlotsQuery(
    new URL(request.url).searchParams,
    bundle.durations,
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const deps = createAppDeps();
  const slots = await getAvailableSlotsForCalendar(
    deps,
    bundle,
    parsed.params,
    "public",
  );

  return NextResponse.json({ slots });
}
