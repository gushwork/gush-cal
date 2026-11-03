import { PlatformAnalyticsDashboard } from "@/components/analytics/platform-analytics-dashboard";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui";
import { isAppAdmin } from "@/lib/auth/admin";
import { auth } from "@/lib/auth";
import { loadPlatformAnalyticsData } from "@/lib/analytics/load-platform-analytics";
import { computePlatformAnalytics } from "@/lib/analytics/platform-analytics";
import { parseAnalyticsRange } from "@/lib/analytics/time";
import { pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = pageTitle("Admin · Platform usage");

type PageProps = {
  searchParams: Promise<{ range?: string | string[] }>;
};

export default async function AppAdminPage({ searchParams }: PageProps) {
  // Re-check here too: layouts and pages render in parallel, and the page must
  // never load platform data for someone who isn't an App Admin.
  const [session, { range: rangeParam }] = await Promise.all([auth(), searchParams]);
  if (!isAppAdmin(session?.user?.email)) {
    notFound();
  }

  const range = parseAnalyticsRange(rangeParam);
  const now = new Date();
  const data = await loadPlatformAnalyticsData(range, now);
  const analytics = computePlatformAnalytics({ ...data, now, rangeDays: range });

  return (
    <PageContainer variant="booking">
      <PageHeader
        title="Platform usage"
        subtitle="Every Scheduler, Calendar, and Meeting across the app. Visible to App Admins only."
        actions={
          <span className="inline-flex items-center rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white">
            App Admin
          </span>
        }
      />
      <PlatformAnalyticsDashboard range={range} analytics={analytics} now={now} />
    </PageContainer>
  );
}
