import { cache } from "react";
import { getDb } from "@/lib/db/client";
import { loadCalendarBundleBySlugRow } from "@/lib/db/assemble-calendar-bundle";
import type { CalendarBundle } from "@/lib/types";

export const loadCalendarBundleBySlug = cache(
  async function loadCalendarBundleBySlug(
    slug: string,
  ): Promise<CalendarBundle | null> {
    return loadCalendarBundleBySlugRow(getDb(), slug);
  },
);
