"use client";

import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="px-3 py-3 sm:px-4 sm:py-4 animate-fade-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex gap-2 sm:gap-3">
        {/* Avatar */}
        <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full" />

        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Author line */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-18 rounded-full" />
          </div>

          {/* Content lines — varied widths for realism */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-[92%] rounded" />
            <Skeleton className="h-4 w-[68%] rounded" />
          </div>

          {/* Tags */}
          <div className="flex gap-2">
            <Skeleton className="h-3.5 w-16 rounded" />
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-3.5 w-14 rounded" />
          </div>

          {/* Source */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-36 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} index={i} />
      ))}
    </div>
  );
}
