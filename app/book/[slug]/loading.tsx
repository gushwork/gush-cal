import { PageContainer } from "@/components/layout/page-container";
import { BookingPageSkeleton } from "@/components/layout/route-skeletons";

export default function PublicBookLoading() {
  return (
    <PageContainer variant="booking">
      <BookingPageSkeleton />
    </PageContainer>
  );
}
