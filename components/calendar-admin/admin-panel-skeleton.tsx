import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";

export type AdminPanelSkeletonProps = {
  section: string;
  className?: string;
};

export function AdminPanelSkeleton({
  section,
  className,
}: AdminPanelSkeletonProps) {
  return (
    <div
      aria-busy="true"
      aria-label={`Loading ${section}`}
      className={cn(
        "overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-s3",
        className,
      )}
    >
      <div className="border-b border-neutral-100 px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
