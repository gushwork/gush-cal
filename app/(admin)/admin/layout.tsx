import { isAppAdmin } from "@/lib/auth/admin";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";

/**
 * App Admin gate. Runs before `loading.tsx`, so Schedulers who aren't App
 * Admins get a 404 without ever seeing the dashboard shell.
 */
export default async function AppAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!isAppAdmin(session?.user?.email)) {
    notFound();
  }
  return children;
}
