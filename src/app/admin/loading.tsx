import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-blue-600 text-white p-4">
                <Skeleton className="h-6 w-40 bg-blue-500" />
                <Skeleton className="h-4 w-60 mt-1 bg-blue-500" />
            </div>
            <div className="p-6 space-y-6">
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <Skeleton className="h-10 w-full bg-blue-100" />
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 p-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="text-center px-4">
                                <Skeleton className="h-8 w-12 mx-auto mb-2" />
                                <Skeleton className="h-3 w-20 mx-auto" />
                            </div>
                        ))}
                    </div>
                </div>
                <Skeleton className="h-48 w-full rounded-lg" />
            </div>
        </div>
    );
}
