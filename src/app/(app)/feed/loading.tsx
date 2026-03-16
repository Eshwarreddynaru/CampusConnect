import { Skeleton } from '@/components/ui/skeleton';

export default function FeedLoading() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
            {/* Search bar skeleton */}
            <div className="sticky top-0 z-20 bg-gray-100 pb-3 space-y-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                </div>
            </div>

            {/* Card skeletons */}
            <div className="space-y-4 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-40 w-full rounded-lg" />
                        <div className="flex gap-2">
                            <Skeleton className="h-8 w-20 rounded" />
                            <Skeleton className="h-8 w-20 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
