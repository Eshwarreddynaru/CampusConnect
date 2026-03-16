import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 pb-24">
            <div className="mb-6">
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-14 h-14 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm text-center">
                        <Skeleton className="w-5 h-5 mx-auto mb-2 rounded" />
                        <Skeleton className="h-8 w-10 mx-auto mb-1" />
                        <Skeleton className="h-3 w-12 mx-auto" />
                    </div>
                ))}
            </div>
            <Skeleton className="h-40 w-full rounded-xl mb-6" />
        </div>
    );
}
