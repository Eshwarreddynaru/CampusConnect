'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MatchesList } from '@/components/matches/MatchesList';
import { 
    ArrowLeft, MapPin, Calendar, User, Package, 
    AlertCircle, Eye, Lock, QrCode, Scan
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { formatDistanceToNow } from 'date-fns';
import { REPORT_CATEGORIES } from '@/lib/utils';

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
    status: string;
    created_at: string;
    user_id: string;
    is_private: boolean;
    matched_with: string | null;
    match_score: number | null;
}

export default function ReportDetailPage() {
    const params = useParams();
    const router = useRouter();
    const reportId = params.id as string;

    const [report, setReport] = useState<Report | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchReport();
    }, [reportId]);

    const fetchReport = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }

            // Fetch report
            const { data, error: fetchError } = await supabase
                .from('reports')
                .select('*')
                .eq('id', reportId)
                .single();

            if (fetchError) {
                throw fetchError;
            }

            if (!data) {
                setError('Report not found');
                return;
            }

            setReport(data);
        } catch (err: any) {
            console.error('Error fetching report:', err);
            setError(err.message || 'Failed to load report');
        } finally {
            setIsLoading(false);
        }
    };

    const getCategoryLabel = (categoryId: string) => {
        return REPORT_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;
    };

    const isOwner = currentUserId && report && report.user_id === currentUserId;

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-6">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <Card>
                    <CardContent className="p-12 text-center">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
                        <p className="text-muted-foreground mb-4">
                            {error || 'This report may have been deleted or you don\'t have permission to view it.'}
                        </p>
                        <Button onClick={() => router.push('/feed')}>
                            Go to Feed
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mb-4"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
            </Button>

            {/* Report Details */}
            <Card>
                <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                    variant={report.type === 'lost' ? 'destructive' : 'default'}
                                    className={report.type === 'found' ? 'bg-emerald-500' : ''}
                                >
                                    {report.type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                                </Badge>
                                {report.is_private && (
                                    <Badge variant="outline" className="gap-1">
                                        <Lock className="w-3 h-3" />
                                        Private
                                    </Badge>
                                )}
                                <Badge variant="outline">
                                    {report.status}
                                </Badge>
                            </div>
                            <h1 className="text-2xl font-bold mb-1">{report.title}</h1>
                            <p className="text-sm text-muted-foreground">
                                {getCategoryLabel(report.category)}
                            </p>
                        </div>
                    </div>

                    {/* Images */}
                    {report.images && report.images.length > 0 && (
                        <div className="mb-6">
                            <div className="grid grid-cols-2 gap-3">
                                {report.images.map((img, idx) => (
                                    <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-muted">
                                        <img 
                                            src={img} 
                                            alt={`${report.title} - ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {report.description && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold mb-2">Description</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {report.description}
                            </p>
                        </div>
                    )}

                    {/* Details */}
                    <div className="space-y-3 border-t pt-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Report Code:</span>
                            <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                                {report.report_code}
                            </code>
                        </div>

                        {report.location && (
                            <div className="flex items-start gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <span className="text-muted-foreground">Location:</span>
                                <span>{report.location}</span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Posted:</span>
                            <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Reported by:</span>
                            <span>{report.register_number}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* QR Code for return verification - only for owner */}
            {isOwner && report.status !== 'returned_qr' && report.status !== 'returned_direct' && (
                <Card>
                    <CardContent className="p-6">
                        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                            <QrCode className="w-4 h-4" />
                            QR Code for Return Verification
                        </h3>
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-white rounded-xl border">
                                <QRCodeSVG
                                    value={report.report_code}
                                    size={180}
                                    level="H"
                                    includeMargin
                                />
                            </div>
                            <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded-lg">
                                {report.report_code}
                            </code>
                            <p className="text-xs text-muted-foreground text-center max-w-xs">
                                Show this QR code to the person returning your item. They can scan it in the app to confirm the return.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Returned badge */}
            {(report.status === 'returned_qr' || report.status === 'returned_direct') && (
                <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="font-semibold text-emerald-800 mb-1">Item Returned</h3>
                        <p className="text-sm text-emerald-700">
                            {report.status === 'returned_qr'
                                ? 'This item was returned and verified via QR code scan.'
                                : 'This item has been returned.'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Matches Section - Only visible to owner */}
            {isOwner && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Potential Matches</h2>
                    <MatchesList reportId={report.id} reportType={report.type} />
                </div>
            )}

            {/* Privacy Notice for non-owners */}
            {!isOwner && report.is_private && (
                <Card>
                    <CardContent className="p-6 text-center">
                        <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <h3 className="font-semibold mb-1">Private Report</h3>
                        <p className="text-sm text-muted-foreground">
                            This report is private and only visible to you because you have a matching item.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
