import { Skeleton } from '@/components/ui/skeleton'

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: tabs + history */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-44" />
          </div>
          <Skeleton className="h-9 w-64" />
          <div className="rounded-md border overflow-hidden">
            <div className="border-b bg-muted/50 px-4 py-3 flex gap-4">
              {[24, 120, 80, 60, 140, 80].map((w, i) => (
                <Skeleton key={i} className="h-4" style={{ width: w }} />
              ))}
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-18 rounded-full" />
                <Skeleton className="h-4 w-8 ml-auto" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: form card */}
        <div className="rounded-lg border bg-card p-6 space-y-4 lg:self-start">
          <Skeleton className="h-5 w-36" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-12 rounded-md" />
            <Skeleton className="h-12 rounded-md" />
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  )
}
