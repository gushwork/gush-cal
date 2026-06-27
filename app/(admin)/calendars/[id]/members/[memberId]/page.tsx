import { notFound, redirect } from "next/navigation";
import { DeleteMemberButton } from "@/components/calendar-admin/delete-member-button";
import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { MemberForm } from "@/components/calendar-admin/member-form";
import { Card, PageHeader } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ id: string; memberId: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Edit member");
  }

  const { id, memberId } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Edit member");
  }

  const member = bundle.members.find((m) => m.id === memberId);
  if (!member) {
    return pageTitle("Edit member");
  }

  const label = member.displayName ?? member.email;
  return pageTitle(`Edit member · ${label}`);
}

export default async function EditMemberPage({ params }: PageProps) {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    redirect("/login");
  }

  const { id, memberId } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    notFound();
  }

  const member = bundle.members.find((m) => m.id === memberId);
  if (!member) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[var(--content-form-wide)]">
      <PageHeader
        title="Edit Member"
        subtitle={member.email}
        actions={
          <DeleteMemberButton
            calendarId={id}
            memberId={memberId}
            memberName={member.displayName ?? member.email}
            header
          />
        }
      />
      <Card>
        <MemberForm
          mode="edit"
          calendarId={id}
          member={member}
          calendarTimezone={bundle.timezone}
          calendarDefaultWorkingHours={bundle.defaultWorkingHours}
          calendarDefaultDay={bundle.defaultMaxPerDay}
          calendarDefaultWeek={bundle.defaultMaxPerWeek}
        />
      </Card>
    </div>
  );
}
