import { NextResponse } from "next/server";
import { loadCalendarBundleBySlug } from "@/lib/booking/load-calendar-by-slug";
import { createAppDeps } from "@/lib/deps";
import { parseResolveQuery } from "@/lib/routing/parse-request-path";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const bundle = await loadCalendarBundleBySlug(slug);

  if (!bundle) {
    return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const { urlContext, guestEmail } = parseResolveQuery(slug, url.searchParams);
  const teamIdFromForm = url.searchParams.get("teamId") ?? undefined;

  const { routing } = createAppDeps();
  const result = await routing.resolveBookingTarget({
    calendarId: bundle.id,
    urlContext,
    guestEmail,
    teamIdFromForm,
  });

  if (!result.ok) {
    const status = result.code === "CALENDAR_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: result.code }, { status });
  }

  return NextResponse.json({ target: result.target });
}
