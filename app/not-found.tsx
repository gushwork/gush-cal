import { pageTitle } from "@/lib/brand/metadata";
import { PageContainer } from "@/components/layout/page-container";
import { Button, EmptyState } from "@/components/ui";
import Link from "next/link";

export const metadata = pageTitle("Page not found");

export default function NotFound() {
  return (
    <PageContainer>
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist or may have been moved."
        action={
          <Link href="/">
            <Button>Go home</Button>
          </Link>
        }
      />
    </PageContainer>
  );
}
