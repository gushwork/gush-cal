import { AppShell } from "@/components/brand/app-shell";
import { auth } from "@/lib/auth";
import { isAppAdmin } from "@/lib/auth/admin";
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
    <AppShell
      variant="admin"
      userEmail={session.user?.email ?? undefined}
      userName={session.user?.name ?? undefined}
      isAdmin={isAppAdmin(session.user?.email)}
    >
      {children}
    </AppShell>
  );
}
