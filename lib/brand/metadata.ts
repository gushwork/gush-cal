import type { Metadata } from "next";
import { getBrandConfig } from "@/lib/brand/config";

const FALLBACK_SITE_NAME = "Scheduling";

export function getSiteName(): string {
  const name = getBrandConfig().appName.trim();
  return name || FALLBACK_SITE_NAME;
}

/** Root layout: default tab title and `%s · Site` template for pages. */
export function buildRootMetadata(
  partial?: Pick<Metadata, "description" | "icons">,
): Metadata {
  const siteName = getSiteName();
  return {
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    ...partial,
  };
}

/** Per-route document title (combined with root template). */
export function pageTitle(segment: string): Metadata {
  return { title: segment };
}

export function calendarPageTitle(
  calendarName: string,
  page: string,
): string {
  return `${page} · ${calendarName}`;
}
