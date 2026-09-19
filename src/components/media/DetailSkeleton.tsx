import { Skeleton } from '@/components/ui'

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-56 w-full rounded-md sm:h-72 lg:h-80" />
      <div className="-mt-16 flex gap-6 px-2 sm:-mt-20">
        <Skeleton className="aspect-2/3 w-32 shrink-0 rounded-md sm:w-44" />
        <div className="flex flex-1 flex-col gap-3 pt-16">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-full max-w-sm" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  )
}
