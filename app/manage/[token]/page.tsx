import { ManageMeetingPage } from "@/components/booking/manage-meeting-page";
import { pageTitle } from "@/lib/brand/metadata";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ rescheduled?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return pageTitle("Manage meeting");
}

export default async function ManageMeetingRoute({ params, searchParams }: PageProps) {
  const [{ token }, { rescheduled }] = await Promise.all([params, searchParams]);
  return (
    <ManageMeetingPage
      token={token}
      mode="view"
      notice={rescheduled === "1" ? "rescheduled" : undefined}
    />
  );
}
