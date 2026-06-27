import { ManageMeeting } from "@/components/booking/manage-meeting";
import { PageHeader } from "@/components/ui";
import { createAppDeps } from "@/lib/deps";
import { validateManageToken } from "@/lib/booking/reschedule-meeting";
import { toPublicMeeting } from "@/lib/booking/to-public-meeting";
import { pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return pageTitle("Manage meeting");
}

export default async function ManageMeetingPage({ params }: PageProps) {
  const { token } = await params;
  const deps = createAppDeps();
  const result = await validateManageToken(deps, token);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Link unavailable" />
        <div className="rounded-xl border border-neutral-100 bg-white p-8 shadow-s3">
          <p className="text-sm text-neutral-600">
            This manage link is invalid or has expired. Use the link from your
            confirmation email, or contact the organizer for help.
          </p>
        </div>
      </>
    );
  }

  const { meeting, bundle } = result.ctx;
  const member = bundle.members.find((m) => m.id === meeting.assignedMemberId);

  return (
    <>
      <PageHeader
        title="Manage your meeting"
        subtitle="Reschedule or cancel your booking."
      />
      <ManageMeeting
        token={token}
        initial={{
          meeting: {
            ...toPublicMeeting(meeting),
            memberName: member?.displayName ?? member?.email ?? "Member",
            cancelled: meeting.cancelledAt != null,
          },
          calendar: {
            name: bundle.name,
            durations: bundle.durations,
            bookingWindowDays: bundle.bookingWindowDays,
            minNoticeHours: bundle.minNoticeHours,
          },
        }}
      />
    </>
  );
}
