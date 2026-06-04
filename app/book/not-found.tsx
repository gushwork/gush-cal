import { pageTitle } from "@/lib/brand/metadata";
import { PageContainer } from "@/components/layout/page-container";
import { Button, EmptyState } from "@/components/ui";
import { Link2Off } from "lucide-react";
import Link from "next/link";

export const metadata = pageTitle("Booking link not found");

export default function BookNotFound() {
  return (
    <PageContainer variant="booking">
      <EmptyState
        icon={Link2Off}
        title="Booking link not found"
        description="This booking link is invalid or may have expired. Check the URL or contact the organizer."
        action={
          <Link href="/login">
            <Button variant="secondary">Go to sign in</Button>
          </Link>
        }
      />
    </PageContainer>
  );
}
