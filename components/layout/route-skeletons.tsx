import { AdminPanelSkeleton } from "@/components/calendar-admin/admin-panel-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";

/**
 * Route-level loading UI used by `loading.tsx` files. These render instantly on
 * navigation (and are prefetched), so the shell responds before server data
 * arrives.
 */

function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      className={className}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({ withSubtitle = true }: { withSubtitle?: boolean }) {
  return (
    <div className="mb-8 space-y-3">
      <Skeleton className="h-8 w-56 max-w-full" />
      {withSubtitle ? <Skeleton className="h-4 w-80 max-w-full" /> : null}
    </div>
  );
}

/** Content-pane skeleton inside the Calendar detail layout (header + sidebar stay mounted). */
export function CalendarSectionSkeleton() {
  return (
    <LoadingRegion label="Loading section" className="min-w-0 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <AdminPanelSkeleton section="section" />
    </LoadingRegion>
  );
}

/** Full admin page skeleton: Calendar list, new Calendar, or first entry into a Calendar. */
export function AdminPageSkeleton() {
  return (
    <PageContainer>
      <LoadingRegion label="Loading page">
        <Skeleton className="mb-6 h-4 w-40" />
        <PageHeaderSkeleton />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="space-y-4 rounded-xl border border-neutral-100 bg-white p-4 shadow-s3"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </LoadingRegion>
    </PageContainer>
  );
}

/** Booking wizard body: duration chips + slot grid card. */
export function BookingFlowSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion label="Loading booking" className={cn("space-y-6", className)}>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
      <div className="space-y-3 rounded-xl border border-neutral-100 bg-white p-4 shadow-s3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-10" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

/** Public booking / manage pages: header + booking wizard body. */
export function BookingPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <PageHeaderSkeleton />
      <BookingFlowSkeleton />
    </div>
  );
}
