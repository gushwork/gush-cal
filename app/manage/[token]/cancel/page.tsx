import { ManageMeetingPage } from "@/components/booking/manage-meeting-page";
import { pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return pageTitle("Cancel meeting");
}

/** Target of the "Cancel" link in invites and emails. */
export default async function CancelMeetingRoute({ params }: PageProps) {
  const { token } = await params;
  return <ManageMeetingPage token={token} mode="cancel" />;
}
