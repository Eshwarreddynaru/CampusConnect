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
import { formatRelativeTime, formatDate, REPORT_CATEGORIES } from '@/lib/utils';
import {
    Search,
    FileText,
    MapPin,
    Calendar,
    Tag,
    User,
    QrCode,
    Package,
    Eye,
    X,
    Download,
    Filter,
} from 'lucide-react';
import Image from 'next/image';

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
    status: string;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export default function AdminReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [filteredReports, setFilteredReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    useEffect(() => {
        fetchReports();
    }, []);

    useEffect(() => {
        filterReports();
    }, [reports, searchQuery, typeFilter, statusFilter, categoryFilter]);

    const fetchReports = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setReports(data);
        }
        setIsLoading(false);
    };

    const filterReports = () => {
        let filtered = reports;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.title.toLowerCase().includes(q) ||
                r.description?.toLowerCase().includes(q) ||
                r.report_code.toLowerCase().includes(q) ||
                r.register_number.toLowerCase().includes(q)
            );
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(r => r.type === typeFilter);
        }

        if (statusFilter !== 'all') {
            if (statusFilter === 'returned') {
                filtered = filtered.filter(r => r.status === 'returned_direct' || r.status === 'returned_qr');
            } else {
                filtered = filtered.filter(r => r.status === statusFilter);
            }
        }

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(r => r.category === categoryFilter);
        }

        setFilteredReports(filtered);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 text-[10px]">Active</Badge>;
            case 'claimed':
                return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Claimed</Badge>;
            case 'returned_direct':
            case 'returned_qr':
                return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">Returned</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
        }
    };

    const exportToCSV = () => {
        const headers = ['Report Code', 'Type', 'Title', 'Category', 'Register Number', 'Location', 'Status', 'Created At'];
        const rows = filteredReports.map(r => [
            r.report_code,
            r.type,
            r.title,
            r.category,
            r.register_number,
            r.location || '',
            r.status,
            new Date(r.created_at).toLocaleString(),
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kare_reports_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-blue-600 text-white p-4">
                    <h1 className="text-xl font-semibold">All Reports</h1>
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
                        <h1 className="text-xl font-semibold">All Reports</h1>
                        <p className="text-blue-100 text-sm mt-1">
                            {filteredReports.length} of {reports.length} reports shown
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
                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="col-span-2 md:col-span-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 border-gray-300 text-gray-900 placeholder:text-gray-400"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="border-gray-300 text-gray-900">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="lost">🔴 Lost</SelectItem>
                                <SelectItem value="found">🟢 Found</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="border-gray-300 text-gray-900">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="claimed">Claimed</SelectItem>
                                <SelectItem value="returned">Returned</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="border-gray-300 text-gray-900">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {REPORT_CATEGORIES.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || categoryFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setTypeFilter('all');
                                    setStatusFilter('all');
                                    setCategoryFilter('all');
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-4 h-4 mr-1" /> Clear
                            </Button>
                        )}
                    </div>
                </div>

                {/* Reports Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-blue-600 text-white px-4 py-3">
                        <h2 className="font-semibold">Reports</h2>
                    </div>
                    <div className="p-0">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider bg-gray-50 border-b border-gray-200">
                            <div className="col-span-1">Type</div>
                            <div className="col-span-3">Item</div>
                            <div className="col-span-2">Reporter</div>
                            <div className="col-span-2">Category</div>
                            <div className="col-span-1">Status</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-1">Action</div>
                        </div>

                        {filteredReports.length === 0 ? (
                            <div className="text-center py-12">
                                <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No reports match your filters</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {filteredReports.map((report) => {
                                    const catInfo = REPORT_CATEGORIES.find(c => c.id === report.category);
                                    return (
                                        <div key={report.id} className="hover:bg-gray-50 transition-colors">
                                            <div className="px-4 py-3 md:grid md:grid-cols-12 md:gap-4 md:items-center space-y-2 md:space-y-0">
                                                {/* Type */}
                                                <div className="col-span-1">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${report.type === 'lost'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {report.type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                                                    </span>
                                                </div>

                                                {/* Item */}
                                                <div className="col-span-3">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{report.title}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{report.report_code}</p>
                                                </div>

                                                {/* Reporter */}
                                                <div className="col-span-2">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3 h-3 text-gray-400" />
                                                        <span className="text-sm text-gray-700">{report.register_number}</span>
                                                    </div>
                                                </div>

                                                {/* Category */}
                                                <div className="col-span-2">
                                                    <span className="text-sm text-gray-600">{catInfo?.label || report.category}</span>
                                                </div>

                                                {/* Status */}
                                                <div className="col-span-1">
                                                    {getStatusBadge(report.status)}
                                                </div>

                                                {/* Date */}
                                                <div className="col-span-2">
                                                    <p className="text-xs text-gray-600">{formatDate(report.created_at)}</p>
                                                    <p className="text-[10px] text-gray-400">{formatRelativeTime(report.created_at)}</p>
                                                </div>

                                                {/* Action */}
                                                <div className="col-span-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedReport(report)}
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Report Detail Modal */}
            <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
                <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-lg max-h-[80vh] overflow-y-auto">
                    {selectedReport && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    {selectedReport.title}
                                </DialogTitle>
                                <DialogDescription className="text-gray-500">
                                    Report details and information
                                </DialogDescription>
                            </DialogHeader>

                            {/* Images */}
                            {selectedReport.images && selectedReport.images.length > 0 && (
                                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                    <Image
                                        src={selectedReport.images[0]}
                                        alt={selectedReport.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${selectedReport.type === 'lost'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                        }`}>
                                        {selectedReport.type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                                    </span>
                                    {getStatusBadge(selectedReport.status)}
                                </div>

                                {selectedReport.description && (
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">Description</p>
                                        <p className="text-sm text-gray-700">{selectedReport.description}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <div className="flex items-center gap-1 mb-1">
                                            <QrCode className="w-3 h-3 text-gray-400" />
                                            <p className="text-xs text-gray-500">Report Code</p>
                                        </div>
                                        <p className="text-sm text-gray-900 font-mono">{selectedReport.report_code}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <div className="flex items-center gap-1 mb-1">
                                            <User className="w-3 h-3 text-gray-400" />
                                            <p className="text-xs text-gray-500">Reporter</p>
                                        </div>
                                        <p className="text-sm text-gray-900">{selectedReport.register_number}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Tag className="w-3 h-3 text-gray-400" />
                                            <p className="text-xs text-gray-500">Category</p>
                                        </div>
                                        <p className="text-sm text-gray-900">
                                            {REPORT_CATEGORIES.find(c => c.id === selectedReport.category)?.label || selectedReport.category}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Calendar className="w-3 h-3 text-gray-400" />
                                            <p className="text-xs text-gray-500">Date</p>
                                        </div>
                                        <p className="text-sm text-gray-900">{formatDate(selectedReport.created_at)}</p>
                                    </div>
                                </div>

                                {selectedReport.location && (
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                                        <div className="flex items-center gap-1 mb-1">
                                            <MapPin className="w-3 h-3 text-gray-400" />
                                            <p className="text-xs text-gray-500">Location</p>
                                        </div>
                                        <p className="text-sm text-gray-900">{selectedReport.location}</p>
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
