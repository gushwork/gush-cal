import { AppShell } from "@/components/brand/app-shell";

export default function PublicBookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell variant="public">{children}</AppShell>;
}
