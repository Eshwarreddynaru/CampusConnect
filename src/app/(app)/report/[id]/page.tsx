'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime, formatDate, REPORT_CATEGORIES, cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    ArrowLeft,
    MapPin,
    Calendar,
    Tag,
    User,
    Share2,
    QrCode,
    Package,
    ChevronLeft,
    ChevronRight,
    Clock,
    Shield,
    FileText,
} from 'lucide-react';

interface Report {
    id: string;
    type: 'lost' | 'found';
    title: string;
    description: string | null;
    category: string;
    report_code: string;
    register_number: string;
    images: string[];
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    status: 'active' | 'claimed' | 'returned_qr' | 'returned_direct';
    created_at: string;
    user_id: string;
}

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const reportId = params.id as string;

    const [report, setReport] = useState<Report | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [imageIndex, setImageIndex] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUserId(user.id);

            // Fetch report details
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('id', reportId)
                .single();

            if (error || !data) {
                console.error('Error fetching report:', error);
                toast.error('Report not found');
                router.push('/feed');
                return;
            }

            setReport(data);
            setIsLoading(false);
        };

        fetchReport();
    }, [reportId, router]);

    const handleShare = async () => {
        if (!report) return;
        if (navigator.share) {
            await navigator.share({
                title: `${report.type === 'lost' ? 'Lost' : 'Found'}: ${report.title}`,
                text: report.description || undefined,
                url: window.location.href,
            });
        } else {
            await navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard!');
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'active':
                return { label: 'Active', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
            case 'claimed':
                return { label: 'Claimed', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
            case 'returned_qr':
                return { label: 'Returned (QR)', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
            case 'returned_direct':
                return { label: 'Returned', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
            default:
                return { label: status, className: '' };
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <div className="space-y-3">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!report) return null;

    const categoryInfo = REPORT_CATEGORIES.find(c => c.id === report.category);
    const statusInfo = getStatusInfo(report.status);
    const isOwnReport = currentUserId === report.user_id;

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleShare}>
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Image Gallery */}
            {report.images && report.images.length > 0 && (
                <div className="relative mb-6 rounded-2xl overflow-hidden bg-muted">
                    <div className="aspect-[4/3] relative">
                        <Image
                            src={report.images[imageIndex]}
                            alt={report.title}
                            fill
                            className="object-cover"
                        />
                    </div>

                    {/* Image Navigation */}
                    {report.images.length > 1 && (
                        <>
                            <button
                                onClick={() => setImageIndex(i => i === 0 ? report.images.length - 1 : i - 1)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setImageIndex(i => i === report.images.length - 1 ? 0 : i + 1)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* Dots */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {report.images.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setImageIndex(idx)}
                                        className={cn(
                                            'w-2 h-2 rounded-full transition-all',
                                            idx === imageIndex ? 'bg-white w-4' : 'bg-white/50'
                                        )}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Type badge */}
                    <div className="absolute top-3 left-3">
                        <Badge className={cn(
                            'font-semibold text-sm px-3 py-1',
                            report.type === 'lost' ? 'badge-lost' : 'badge-found'
                        )}>
                            {report.type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                        </Badge>
                    </div>

                    {/* Image counter */}
                    {report.images.length > 1 && (
                        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                            {imageIndex + 1} / {report.images.length}
                        </div>
                    )}
                </div>
            )}

            {/* Title & Status */}
            <div className="mb-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <h1 className="text-2xl font-bold leading-tight">{report.title}</h1>
                    <Badge variant="outline" className={cn('shrink-0', statusInfo.className)}>
                        {statusInfo.label}
                    </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{formatRelativeTime(report.created_at)}</span>
                    <span>•</span>
                    <span>{formatDate(report.created_at)}</span>
                </div>
            </div>

            {/* Description */}
            {report.description && (
                <Card className="mb-4">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">Description</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {report.description}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Category */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Tag className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Category</span>
                        </div>
                        <p className="text-sm font-medium">{categoryInfo?.label || report.category}</p>
                    </CardContent>
                </Card>

                {/* Report Code */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <QrCode className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Report Code</span>
                        </div>
                        <p className="text-sm font-medium font-mono">{report.report_code}</p>
                    </CardContent>
                </Card>

                {/* Reporter */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Reported by</span>
                        </div>
                        <p className="text-sm font-medium">{report.register_number}</p>
                    </CardContent>
                </Card>

                {/* Date */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Date</span>
                        </div>
                        <p className="text-sm font-medium">{formatDate(report.created_at)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Location */}
            {report.location && (
                <Card className="mb-4">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-semibold">Location</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{report.location}</p>
                        {report.latitude && report.longitude && (
                            <Link
                                href={`/map?lat=${report.latitude}&lng=${report.longitude}`}
                                className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                            >
                                <MapPin className="w-3 h-3" />
                                View on Campus Map
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Security Notice */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border/50">
                <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">
                    Personal information is protected. Only register numbers are shared for verification purposes.
                </p>
            </div>
        </div>
    );
}
