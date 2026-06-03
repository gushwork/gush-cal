import { notFound, redirect } from "next/navigation";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { MemberForm } from "@/components/calendar-admin/member-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import { Card, PageHeader } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Add member");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Add member");
  }

  return pageTitle(calendarPageTitle(bundle.name, "Add member"));
}

export default async function NewMemberPage({ params }: PageProps) {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    notFound();
  }

  return (
    <PageContainer variant="default" className="max-w-2xl">
      <Breadcrumbs
        items={[
          { label: "Calendars", href: "/calendars" },
          { label: bundle.name, href: `/calendars/${id}` },
          { label: "Add member" },
        ]}
      />
      <PageHeader
        title="Add Member"
        subtitle="Invite someone to share availability on this calendar."
      />
      <Card>
        <MemberForm
          mode="create"
          calendarId={id}
          calendarTimezone={bundle.timezone}
          calendarDefaultWorkingHours={bundle.defaultWorkingHours}
          calendarDefaultDay={bundle.defaultMaxPerDay}
          calendarDefaultWeek={bundle.defaultMaxPerWeek}
        />
      </Card>
    </PageContainer>
  );
}
