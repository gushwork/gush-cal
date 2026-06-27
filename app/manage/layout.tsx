import { PageContainer } from "@/components/layout/page-container";

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageContainer variant="booking" className="min-h-screen">
      {children}
    </PageContainer>
  );
}
