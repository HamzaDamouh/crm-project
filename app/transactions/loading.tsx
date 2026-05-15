import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function TransactionsLoading() {
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Page title */}
      <Skeleton className="h-9 w-48" />

      {/* Filter/search bar area */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-72 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Transaction list skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-3">
          {/* List header */}
          <div className="flex gap-4 pb-2 border-b">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* List rows */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
