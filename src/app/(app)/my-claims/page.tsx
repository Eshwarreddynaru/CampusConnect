'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';
import {
    MessageSquare,
    Package,
    HandHelping,
    ArrowRight,
    Inbox,
} from 'lucide-react';
import Link from 'next/link';

interface ClaimWithReport {
    id: string;
    report_id: string;
    claimer_id: string;
    claimer_register_number: string;
    message: string | null;
    status: string;
    created_at: string;
    report: {
        id: string;
        type: string;
        title: string;
        report_code: string;
        register_number: string;
        user_id: string;
        status: string;
    };
}

export default function MyClaimsPage() {
    const [claimsMade, setClaimsMade] = useState<ClaimWithReport[]>([]);
    const [claimsReceived, setClaimsReceived] = useState<ClaimWithReport[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'made' | 'received'>('made');

    useEffect(() => {
        loadClaims();
    }, []);

    const loadClaims = async () => {
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

        // Fetch both claim types IN PARALLEL (saves ~200ms)
        const [madeRes, receivedRes] = await Promise.all([
            supabase
                .from('claims')
                .select(`
                    *,
                    report:reports (
                        id, type, title, report_code, register_number, user_id, status
                    )
                `)
                .eq('claimer_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50),
            supabase
                .from('claims')
                .select(`
                    *,
                    report:reports (
                        id, type, title, report_code, register_number, user_id, status
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(100),
        ]);

        // Filter received: only claims on my reports
        const receivedOnMyReports = (receivedRes.data || []).filter(
            claim => claim.report?.user_id === user.id
        );

        setClaimsMade(madeRes.data || []);
        setClaimsReceived(receivedOnMyReports);
        setIsLoading(false);
    };

    const claims = activeTab === 'made' ? claimsMade : claimsReceived;

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-1">My Claims</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your claims and conversations
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <Button
                    variant={activeTab === 'made' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('made')}
                    className={activeTab === 'made' ? 'text-white' : ''}
                    style={activeTab === 'made' ? { background: '#1a5c6b' } : {}}
                    size="sm"
                >
                    <HandHelping className="w-4 h-4 mr-2" />
                    Claims I Made ({claimsMade.length})
                </Button>
                <Button
                    variant={activeTab === 'received' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('received')}
                    className={activeTab === 'received' ? 'text-white' : ''}
                    style={activeTab === 'received' ? { background: '#1a5c6b' } : {}}
                    size="sm"
                >
                    <Inbox className="w-4 h-4 mr-2" />
                    Claims Received ({claimsReceived.length})
                </Button>
            </div>

            {/* Claims List */}
            <div className="space-y-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-12 h-12 rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : claims.length > 0 ? (
                    claims.map((claim) => {
                        // Check if report data is available (might be null due to RLS)
                        if (!claim.report) {
                            return null; // Skip claims with inaccessible reports
                        }
                        
                        const isClaimant = currentUserId === claim.claimer_id;
                        const otherPerson = isClaimant
                            ? claim.report.register_number
                            : claim.claimer_register_number;

                        return (
                            <Link key={claim.id} href={`/chat/${claim.id}`}>
                                <Card className="hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            {/* Icon */}
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <Package className="w-6 h-6 text-primary" />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-medium text-sm truncate">
                                                        {claim.report.title}
                                                    </h3>
                                                    <Badge
                                                        className={
                                                            claim.report.type === 'lost'
                                                                ? 'badge-lost'
                                                                : 'badge-found'
                                                        }
                                                    >
                                                        {claim.report.type === 'lost' ? 'Lost' : 'Found'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Avatar className="w-4 h-4">
                                                        <AvatarFallback className="text-[8px]">
                                                            {otherPerson.slice(0, 2)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span>{isClaimant ? 'Posted by' : 'Claimed by'} {otherPerson}</span>
                                                    <span>•</span>
                                                    <span>{formatRelativeTime(claim.created_at)}</span>
                                                </div>
                                                {claim.message && (
                                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                                        💬 {claim.message}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Status & Action */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Badge variant="outline" className={`text-xs ${(claim.report.status === 'returned_direct' || claim.report.status === 'returned_qr')
                                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                                    : claim.status === 'accepted'
                                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                                        : claim.status === 'rejected'
                                                            ? 'border-red-500/30 bg-red-500/10 text-red-600'
                                                            : ''
                                                    }`}>
                                                    {(claim.report.status === 'returned_direct' || claim.report.status === 'returned_qr')
                                                        ? '📦 Returned'
                                                        : claim.status === 'pending'
                                                            ? '⏳ Pending'
                                                            : claim.status === 'accepted'
                                                                ? '✅ Accepted'
                                                                : '❌ Rejected'
                                                    }
                                                </Badge>
                                                <div className="flex items-center gap-1 text-primary">
                                                    <MessageSquare className="w-4 h-4" />
                                                    <ArrowRight className="w-3 h-3" />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                            <HandHelping className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-1">
                            {activeTab === 'made' ? 'No claims yet' : 'No claims received'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {activeTab === 'made'
                                ? 'When you find someone\'s lost item, click "I Found This" on their report.'
                                : 'When someone finds your lost item, their claim will appear here.'}
                        </p>
                        <Link href="/feed">
                            <Button className="text-white" style={{ background: '#1a5c6b' }}>
                                Browse Feed
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
