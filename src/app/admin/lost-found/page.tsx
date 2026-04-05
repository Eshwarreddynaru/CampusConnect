'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Search, Eye, Sparkles, Lock, Unlock, 
    TrendingUp, Package, AlertCircle, RefreshCw 
} from 'lucide-react';
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

interface Match {
    id: string;
    lost_report_id: string;
    found_report_id: string;
    match_score: number;
    status: string;
    created_at: string;
}

export default function AdminLostFoundPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'lost' | 'found'>('all');
    const [stats, setStats] = useState({
        totalReports: 0,
        totalMatches: 0,
        privateReports: 0,
        matchedReports: 0,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/reports');
            
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const data = await response.json();
            setReports(data.reports || []);
            setMatches(data.matches || []);
            setStats({
                totalReports: data.totalReports || 0,
                totalMatches: data.totalMatches || 0,
                privateReports: data.privateReports || 0,
                matchedReports: data.matchedReports || 0,
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredReports = reports.filter(report => {
        const matchesSearch = 
            report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.report_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.register_number.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesType = filterType === 'all' || report.type === filterType;
        
        return matchesSearch && matchesType;
    });

    const getCategoryLabel = (categoryId: string) => {
        return REPORT_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Lost & Found Management</h1>
                    <p className="text-sm text-gray-500">View all reports and matches</p>
                </div>
                <Button onClick={fetchData} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Reports</p>
                                <p className="text-2xl font-bold">{stats.totalReports}</p>
                            </div>
                            <Package className="w-8 h-8 text-blue-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Private Reports</p>
                                <p className="text-2xl font-bold">{stats.privateReports}</p>
                            </div>
                            <Lock className="w-8 h-8 text-amber-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Matched Reports</p>
                                <p className="text-2xl font-bold">{stats.matchedReports}</p>
                            </div>
                            <Sparkles className="w-8 h-8 text-emerald-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Matches</p>
                                <p className="text-2xl font-bold">{stats.totalMatches}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search reports..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'lost', 'found'] as const).map((type) => (
                                <Button
                                    key={type}
                                    variant={filterType === type ? 'default' : 'outline'}
                                    onClick={() => setFilterType(type)}
                                    className="capitalize"
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reports Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        All Reports ({filteredReports.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredReports.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No reports found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3 text-sm font-medium text-gray-500">Type</th>
                                        <th className="text-left p-3 text-sm font-medium text-gray-500">Title</th>
                                        <th className="text-left p-3 text-sm font-medium text-gray-500">Category</th>
                                        <th className="text-left p-3 text-sm font-medium text-gray-500">Code</th>
                                        <th className="text-left p-3 text-sm font-medium text-gray-500">User</th>
                                        <th className="text-left p-3 text-sm font-medium text-gray-500">Status</th>
                                        <th className="text-left p-3 text-sm font-medium text-gray-500">Privacy</th>
                                        <th className="text-left p-3 text-sm font-medium text-gray-500">Match</th>
                                        <th className="text-left p-3 text-sm font-medium text-gray-500">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReports.map((report) => (
                                        <tr key={report.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3">
                                                <Badge 
                                                    variant={report.type === 'lost' ? 'destructive' : 'default'}
                                                    className={report.type === 'found' ? 'bg-emerald-500' : ''}
                                                >
                                                    {report.type}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {report.images && report.images.length > 0 && (
                                                        <img 
                                                            src={report.images[0]} 
                                                            alt=""
                                                            className="w-8 h-8 rounded object-cover"
                                                        />
                                                    )}
                                                    <span className="font-medium text-sm">{report.title}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-gray-600">
                                                {getCategoryLabel(report.category)}
                                            </td>
                                            <td className="p-3">
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                    {report.report_code}
                                                </code>
                                            </td>
                                            <td className="p-3 text-sm text-gray-600">
                                                {report.register_number}
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="outline" className="text-xs">
                                                    {report.status}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                {report.is_private ? (
                                                    <Lock className="w-4 h-4 text-amber-500" />
                                                ) : (
                                                    <Unlock className="w-4 h-4 text-gray-400" />
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {report.matched_with ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                                        {report.match_score}%
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-xs text-gray-500">
                                                {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
