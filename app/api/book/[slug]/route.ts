import { NextResponse } from "next/server";
import { loadCalendarBundleBySlug } from "@/lib/booking/load-calendar-by-slug";
import { toPublicCalendar } from "@/lib/booking/to-public-meeting";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const bundle = await loadCalendarBundleBySlug(slug);

  if (!bundle) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  return NextResponse.json({ calendar: toPublicCalendar(bundle) });
}
