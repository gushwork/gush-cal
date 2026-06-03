import { pageTitle } from "@/lib/brand/metadata";
import { PageContainer } from "@/components/layout/page-container";
import { Button, EmptyState } from "@/components/ui";
import Link from "next/link";

export const metadata = pageTitle("Booking link not found");

export default function BookNotFound() {
  return (
    <PageContainer variant="booking">
      <EmptyState
        title="Booking link not found"
        description="This booking link is invalid or expired."
        action={
          <Link href="/">
            <Button variant="secondary">Go home</Button>
          </Link>
        }
      />
    </PageContainer>
  );
}
