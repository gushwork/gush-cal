import { AppShell } from "@/components/brand/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Button, EmptyState } from "@/components/ui";
import { auth } from "@/lib/auth";
import { pageTitle } from "@/lib/brand/metadata";
import { Link2Off } from "lucide-react";
import Link from "next/link";

export const metadata = pageTitle("Page not found");

export default async function NotFound() {
  const session = await auth();
  const content = (
    <PageContainer>
      <EmptyState
        icon={Link2Off}
        title="Page not found"
        description="The page you're looking for doesn't exist or may have been moved."
        action={
          <Link href={session ? "/calendars" : "/login"}>
            <Button>{session ? "Back to calendars" : "Go to sign in"}</Button>
          </Link>
        }
      />
    </PageContainer>
  );

  if (session) {
    return (
      <AppShell variant="admin" userEmail={session.user?.email ?? undefined}>
        {content}
      </AppShell>
    );
  }

  return content;
}
