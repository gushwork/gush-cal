import { loadCalendarBundle } from "@/components/calendar-admin/load-calendar-bundle";
import { MemberList } from "@/components/calendar-admin/member-list";
import { Button, Card, EmptyState } from "@/components/ui";
import { getSchedulerId } from "@/lib/auth";
import { calendarPageTitle, pageTitle } from "@/lib/brand/metadata";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return pageTitle("Members");
  }

  const { id } = await params;
  const bundle = await loadCalendarBundle(id, schedulerId);
  if (!bundle) {
    return pageTitle("Members");
  }

  return pageTitle(calendarPageTitle(bundle.name, "Members"));
}

export default async function CalendarMembersPage({ params }: PageProps) {
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
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-muted">
          {bundle.members.length === 0
            ? "No members yet."
            : `${bundle.members.length} member${bundle.members.length === 1 ? "" : "s"}`}
        </p>
        <Button asChild>
          <Link href={`/calendars/${id}/members/new`}>Add Member</Link>
        </Button>
      </div>

      {bundle.members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Add team members to pool their availability on this calendar."
          action={
            <Button asChild>
              <Link href={`/calendars/${id}/members/new`}>Add Member</Link>
            </Button>
          }
        />
      ) : (
        <Card padding="sm" className="overflow-hidden p-0">
          <MemberList calendarId={id} members={bundle.members} />
        </Card>
      )}
    </section>
  );
}
