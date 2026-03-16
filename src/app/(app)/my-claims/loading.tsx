import { Skeleton } from '@/components/ui/skeleton';

export default function MyClaimsLoading() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-60 mb-6" />
            <div className="flex gap-2 mb-6">
                <Skeleton className="h-9 w-36 rounded-md" />
                <Skeleton className="h-9 w-40 rounded-md" />
            </div>
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-12 h-12 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
