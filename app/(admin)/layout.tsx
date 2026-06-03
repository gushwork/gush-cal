import { AppShell } from "@/components/brand/app-shell";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell variant="admin" userEmail={session.user?.email ?? undefined}>
      {children}
    </AppShell>
  );
}
