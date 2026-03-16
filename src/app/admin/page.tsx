'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/utils';
import {
    FileText,
    HandHelping,
    MessageSquare,
    Users,
    TrendingUp,
    PackageCheck,
    AlertTriangle,
    Clock,
    ArrowUpRight,
    Search,
    Shield,
    Bot,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
    totalReports: number;
    lostReports: number;
    foundReports: number;
    activeReports: number;
    claimedReports: number;
    returnedReports: number;
    totalClaims: number;
    pendingClaims: number;
    acceptedClaims: number;
    rejectedClaims: number;
    totalMessages: number;
    totalUsers: number;
    recentReports: Array<{
        id: string;
        type: string;
        title: string;
        status: string;
        register_number: string;
        report_code: string;
        created_at: string;
    }>;
    recentClaims: Array<{
        id: string;
        status: string;
        claimer_register_number: string;
        created_at: string;
        report: {
            title: string;
            register_number: string;
            type: string;
            report_code: string;
        };
    }>;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const supabase = createClient();

        // Use COUNT queries where possible + limit full data fetches (saves ~500ms)
        const [
            reportsCountRes,
            lostCountRes,
            foundCountRes,
            activeCountRes,
            claimedCountRes,
            returnedDirectRes,
            returnedQrRes,
            claimsCountRes,
            pendingClaimsRes,
            acceptedClaimsRes,
            rejectedClaimsRes,
            messagesRes,
            profilesRes,
            recentReportsRes,
            recentClaimsRes,
        ] = await Promise.all([
            supabase.from('reports').select('id', { count: 'exact', head: true }),
            supabase.from('reports').select('id', { count: 'exact', head: true }).eq('type', 'lost'),
            supabase.from('reports').select('id', { count: 'exact', head: true }).eq('type', 'found'),
            supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'claimed'),
            supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'returned_direct'),
            supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'returned_qr'),
            supabase.from('claims').select('id', { count: 'exact', head: true }),
            supabase.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
            supabase.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
            supabase.from('messages').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            // Only fetch the 5 most recent for display
            supabase.from('reports').select('id, type, title, status, register_number, report_code, created_at').order('created_at', { ascending: false }).limit(5),
            supabase.from('claims').select('id, status, claimer_register_number, created_at, report:reports(title, register_number, type, report_code)').order('created_at', { ascending: false }).limit(5),
        ]);

        setStats({
            totalReports: reportsCountRes.count || 0,
            lostReports: lostCountRes.count || 0,
            foundReports: foundCountRes.count || 0,
            activeReports: activeCountRes.count || 0,
            claimedReports: claimedCountRes.count || 0,
            returnedReports: (returnedDirectRes.count || 0) + (returnedQrRes.count || 0),
            totalClaims: claimsCountRes.count || 0,
            pendingClaims: pendingClaimsRes.count || 0,
            acceptedClaims: acceptedClaimsRes.count || 0,
            rejectedClaims: rejectedClaimsRes.count || 0,
            totalMessages: messagesRes.count || 0,
            totalUsers: profilesRes.count || 0,
            recentReports: recentReportsRes.data || [],
            recentClaims: (recentClaimsRes.data || []).map((c: Record<string, unknown>) => ({
                ...c,
                report: Array.isArray(c.report) ? c.report[0] : c.report,
            })) as DashboardStats['recentClaims'],
        });

        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-blue-600 text-white p-4">
                    <h1 className="text-xl font-semibold">Admin Dashboard</h1>
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

    if (!stats) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 shadow-sm">
                <h1 className="text-xl font-semibold">Admin Dashboard</h1>
                <p className="text-blue-100 text-sm mt-1">Monitor and manage all lost & found activities</p>
            </div>

            {/* Main Content */}
            <div className="p-6 space-y-6">
                {/* System Overview */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-blue-600 text-white px-4 py-3">
                        <h2 className="font-semibold">System Overview</h2>
                    </div>
                    <div className="p-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-200">
                            <div className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.totalReports}</div>
                                <div className="text-sm text-gray-600">Total Reports</div>
                            </div>
                            <div className="p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">{stats.activeReports}</div>
                                <div className="text-sm text-gray-600">Active Reports</div>
                            </div>
                            <div className="p-4 text-center">
                                <div className="text-2xl font-bold text-orange-600">{stats.pendingClaims}</div>
                                <div className="text-sm text-gray-600">Pending Claims</div>
                            </div>
                            <div className="p-4 text-center">
                                <div className="text-2xl font-bold text-purple-600">{stats.totalUsers}</div>
                                <div className="text-sm text-gray-600">Total Users</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reports Summary */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-blue-600 text-white px-4 py-3">
                        <h2 className="font-semibold">Reports Summary</h2>
                    </div>
                    <div className="p-0">
                        <table className="w-full">
                            <tbody className="divide-y divide-gray-200">
                                <tr>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-700">Lost Items</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{stats.lostReports}</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-700">Found Items</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{stats.foundReports}</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-700">Claimed Items</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{stats.claimedReports}</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-700">Returned Items</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{stats.returnedReports}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Claims Summary */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-blue-600 text-white px-4 py-3">
                        <h2 className="font-semibold">Claims Summary</h2>
                    </div>
                    <div className="p-0">
                        <table className="w-full">
                            <tbody className="divide-y divide-gray-200">
                                <tr>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-700">Total Claims</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{stats.totalClaims}</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-700">Pending Claims</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{stats.pendingClaims}</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-700">Accepted Claims</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{stats.acceptedClaims}</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-700">Rejected Claims</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{stats.rejectedClaims}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-blue-600 text-white px-4 py-3">
                        <h2 className="font-semibold">Quick Actions</h2>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <Link href="/admin/agent" className="text-center p-4 border-2 border-violet-200 rounded-lg hover:bg-violet-50 transition-colors bg-gradient-to-b from-violet-50 to-white">
                                <Bot className="w-8 h-8 text-violet-600 mx-auto mb-2" />
                                <div className="text-sm font-medium text-violet-700">🤖 AI Agent</div>
                                <div className="text-[10px] text-violet-400 mt-0.5">Auto-manage</div>
                            </Link>
                            <Link href="/admin/reports" className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                <div className="text-sm font-medium text-gray-700">All Reports</div>
                            </Link>
                            <Link href="/admin/claims" className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                <HandHelping className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                <div className="text-sm font-medium text-gray-700">All Claims</div>
                            </Link>
                            <Link href="/admin/users" className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                                <div className="text-sm font-medium text-gray-700">Users</div>
                            </Link>
                            <Link href="/admin/chats" className="text-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                <MessageSquare className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                                <div className="text-sm font-medium text-gray-700">Chats</div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
