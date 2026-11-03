import { ManageMeeting, type ManageMode } from "@/components/booking/manage-meeting";
import { publicBookingUrl } from "@/components/calendar-admin/validation";
import { BookingPageSkeleton } from "@/components/layout/route-skeletons";
import { ClientOnly, PageHeader } from "@/components/ui";
import { validateManageToken } from "@/lib/booking/reschedule-meeting";
import { toPublicMeeting } from "@/lib/booking/to-public-meeting";
import { createAppDeps } from "@/lib/deps";

export type ManageMeetingPageProps = {
  token: string;
  mode: ManageMode;
  /** Set after a successful reschedule redirect (`?rescheduled=1`). */
  notice?: "rescheduled";
};

/**
 * Server body shared by `/manage/{token}`, `/manage/{token}/reschedule` and
 * `/manage/{token}/cancel` (the links in invites and emails). Validates the
 * token, then hands the meeting to the client workflow in the requested mode.
 */
export async function ManageMeetingPage({ token, mode, notice }: ManageMeetingPageProps) {
  const deps = createAppDeps();
  const result = await validateManageToken(deps, token);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Link unavailable" />
        <div className="rounded-xl border border-neutral-100 bg-white p-8 shadow-s3">
          <p className="text-sm text-neutral-600">
            This link is invalid or has expired. If you already rescheduled, use
            the links in your most recent calendar invite, or contact the
            organizer for help.
          </p>
        </div>
      </>
    );
  }

  const { meeting, bundle } = result.ctx;
  const member = bundle.members.find((m) => m.id === meeting.assignedMemberId);

  return (
    <>
      {/* Header + meeting times render client-side: they follow the workflow
          state and the viewer's timezone. */}
      <ClientOnly fallback={<BookingPageSkeleton />}>
        <ManageMeeting
          token={token}
          initialMode={mode}
          notice={notice}
          rebookUrl={publicBookingUrl(bundle.slug)}
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
      </ClientOnly>
    </>
  );
}
