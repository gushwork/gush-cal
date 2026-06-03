import { cn } from "@/lib/ui/cn";

export type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-skeleton rounded-md bg-border/60",
        className,
      )}
    />
  );
}
