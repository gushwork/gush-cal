import { ManageMeetingPage } from "@/components/booking/manage-meeting-page";
import { pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return pageTitle("Reschedule meeting");
}

/** Target of the "Reschedule" link in invites and emails. */
export default async function RescheduleMeetingRoute({ params }: PageProps) {
  const { token } = await params;
  return <ManageMeetingPage token={token} mode="reschedule" />;
}
