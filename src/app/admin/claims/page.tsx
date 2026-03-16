'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import {
    Search,
    HandHelping,
    User,
    ArrowRight,
    Eye,
    X,
    Download,
    Filter,
    Shield,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Package,
    MessageSquare,
} from 'lucide-react';
import Link from 'next/link';

interface ClaimWithDetails {
    id: string;
    report_id: string;
    claimer_id: string;
    claimer_register_number: string;
    message: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    report: {
        id: string;
        type: string;
        title: string;
        report_code: string;
        register_number: string;
        user_id: string;
        status: string;
        category: string;
        location: string | null;
    };
}

export default function AdminClaimsPage() {
    const [claims, setClaims] = useState<ClaimWithDetails[]>([]);
    const [filteredClaims, setFilteredClaims] = useState<ClaimWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedClaim, setSelectedClaim] = useState<ClaimWithDetails | null>(null);

    useEffect(() => {
        fetchClaims();
    }, []);

    useEffect(() => {
        filterClaims();
    }, [claims, searchQuery, statusFilter]);

    const fetchClaims = async () => {
        setIsLoading(true);
        try {
            // Debug logging
            console.log('[Claims Debug] Fetching claims via API...');
            
            const response = await fetch('/api/admin/claims');
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`[Claims Debug] Successfully fetched ${data.length} claims from API`);
            
            setClaims(data);
        } catch (error) {
            console.error('[Claims Debug] Error fetching claims:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterClaims = () => {
        let filtered = claims;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                c.claimer_register_number?.toLowerCase().includes(q) ||
                c.report?.title?.toLowerCase().includes(q) ||
                c.report?.register_number?.toLowerCase().includes(q) ||
                c.report?.report_code?.toLowerCase().includes(q) ||
                c.message?.toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => c.status === statusFilter);
        }

        setFilteredClaims(filtered);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4 text-amber-600" />;
            case 'accepted': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
            case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
            default: return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">⏳ Pending</Badge>;
            case 'accepted':
                return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-[10px]">✅ Accepted</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px]">❌ Rejected</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
        }
    };

    const getReportStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-[10px]">Active</Badge>;
            case 'claimed':
                return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Claimed</Badge>;
            case 'returned_direct':
            case 'returned_qr':
                return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">📦 Returned</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
        }
    };

    const exportToCSV = () => {
        const headers = ['Report Code', 'Item Title', 'Report Type', 'Reporter Register No.', 'Claimer Register No.', 'Claim Status', 'Report Status', 'Claim Message', 'Claim Date'];
        const rows = filteredClaims.map(c => [
            c.report?.report_code || '',
            c.report?.title || '',
            c.report?.type || '',
            c.report?.register_number || '',
            c.claimer_register_number,
            c.status,
            c.report?.status || '',
            c.message || '',
            new Date(c.created_at).toLocaleString(),
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kare_claims_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-blue-600 text-white p-4">
                    <h1 className="text-xl font-semibold">All Claims</h1>
                </div>
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">All Claims</h1>
                        <p className="text-blue-100 text-sm mt-1">
                            {filteredClaims.length} of {claims.length} claims — verify claimer and reporter data
                        </p>
                    </div>
                    <Button
                        onClick={exportToCSV}
                        variant="outline"
                        size="sm"
                        className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6 space-y-6">
                {/* Safety Notice */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-blue-800">Safety Verification Panel</p>
                        <p className="text-xs text-blue-600 mt-1">
                            Review each claim to ensure items are returned to the right person. If a claim looks suspicious,
                            you can cross-verify the reporter and claimer register numbers. Both person&apos;s data is displayed
                            for each claim so you can identify potential fraud.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search by register number, item title, report code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 border-gray-300 text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] border-gray-300 text-gray-900">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">⏳ Pending</SelectItem>
                                <SelectItem value="accepted">✅ Accepted</SelectItem>
                                <SelectItem value="rejected">❌ Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                        {(searchQuery || statusFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-4 h-4 mr-1" /> Clear
                            </Button>
                        )}
                    </div>
                </div>

                {/* Claims List */}
                <div className="space-y-3">
                    {filteredClaims.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No claims match your filters</p>
                        </div>
                    ) : (
                        filteredClaims.map((claim) => (
                            <div key={claim.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                <div className="p-4">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        {/* Status icon */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${claim.status === 'pending' ? 'bg-amber-100' :
                                            claim.status === 'accepted' ? 'bg-green-100' :
                                                'bg-red-100'
                                            }`}>
                                            {getStatusIcon(claim.status)}
                                        </div>

                                        {/* Item info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {claim.report?.title || 'Unknown Item'}
                                                </p>
                                                <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full shrink-0 ${claim.report?.type === 'lost'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {claim.report?.type === 'lost' ? 'Lost' : 'Found'}
                                                </span>
                                            </div>

                                            {/* Reporter → Claimer info */}
                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 border border-blue-200">
                                                    <User className="w-3 h-3 text-blue-600" />
                                                    <span className="text-blue-700">Reporter: <strong>{claim.report?.register_number || 'N/A'}</strong></span>
                                                </div>
                                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 border border-purple-200">
                                                    <User className="w-3 h-3 text-purple-600" />
                                                    <span className="text-purple-700">Claimer: <strong>{claim.claimer_register_number}</strong></span>
                                                </div>
                                            </div>

                                            {claim.message && (
                                                <p className="text-xs text-gray-500 mt-1 truncate">
                                                    💬 &quot;{claim.message}&quot;
                                                </p>
                                            )}
                                        </div>

                                        {/* Status & actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {getStatusBadge(claim.status)}
                                            {getReportStatusBadge(claim.report?.status || 'active')}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedClaim(claim)}
                                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Date info */}
                                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                                        <span>Report Code: <strong className="text-gray-700">{claim.report?.report_code}</strong></span>
                                        <span>•</span>
                                        <span>Claimed {formatRelativeTime(claim.created_at)}</span>
                                        {claim.report?.location && (
                                            <>
                                                <span>•</span>
                                                <span>📍 {claim.report.location}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Claim Detail Modal */}
            <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg max-h-[80vh] overflow-y-auto">
                    {selectedClaim && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <HandHelping className="w-5 h-5 text-purple-600" />
                                    Claim Details
                                </DialogTitle>
                                <DialogDescription className="text-gray-500">
                                    Full claim and verification information
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* Item info */}
                                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                                    <p className="text-xs text-gray-500 mb-2">📦 Item</p>
                                    <p className="text-sm font-medium text-gray-900">{selectedClaim.report?.title}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${selectedClaim.report?.type === 'lost'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {selectedClaim.report?.type}
                                        </span>
                                        {getStatusBadge(selectedClaim.status)}
                                        {getReportStatusBadge(selectedClaim.report?.status || 'active')}
                                    </div>
                                </div>

                                {/* Reporter & Claimer - Side by Side */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                                        <div className="flex items-center gap-1 mb-2">
                                            <User className="w-3 h-3 text-blue-600" />
                                            <p className="text-xs text-blue-700 font-medium">Reporter (Owner)</p>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">{selectedClaim.report?.register_number}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Posted the {selectedClaim.report?.type} report</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                                        <div className="flex items-center gap-1 mb-2">
                                            <User className="w-3 h-3 text-purple-600" />
                                            <p className="text-xs text-purple-700 font-medium">Claimer</p>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">{selectedClaim.claimer_register_number}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Claims to have {selectedClaim.report?.type === 'lost' ? 'found' : 'owns'} this item</p>
                                    </div>
                                </div>

                                {/* Claim Message */}
                                {selectedClaim.message && (
                                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">💬 Claim Message</p>
                                        <p className="text-sm text-gray-700">&quot;{selectedClaim.message}&quot;</p>
                                    </div>
                                )}

                                {/* Metadata */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">Report Code</p>
                                        <p className="text-sm text-gray-900 font-mono">{selectedClaim.report?.report_code}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">Category</p>
                                        <p className="text-sm text-gray-900">{selectedClaim.report?.category}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">Claim Date</p>
                                        <p className="text-sm text-gray-900">{formatDate(selectedClaim.created_at)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">Location</p>
                                        <p className="text-sm text-gray-900">{selectedClaim.report?.location || 'Not specified'}</p>
                                    </div>
                                </div>

                                {/* View Chat Button */}
                                <Link href={`/admin/chats?claim=${selectedClaim.id}`}>
                                    <Button className="w-full bg-blue-600 text-white hover:bg-blue-700">
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        View Chat Messages
                                    </Button>
                                </Link>

                                {/* Warning for pending */}
                                {selectedClaim.status === 'pending' && (
                                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-700">
                                            This claim is still pending. The reporter hasn&apos;t accepted or rejected it yet.
                                            Monitor if any action is needed.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
