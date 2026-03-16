'use client';

import { useState, useEffect } from 'react';
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
    Search,
    Users,
    User,
    Shield,
    X,
    Filter,
    AlertTriangle,
    Ban,
    CheckCircle2,
    Eye,
    FileText,
    HandHelping,
    Download,
    Loader2,
    TrendingUp,
} from 'lucide-react';

interface UserProfile {
    id: string;
    register_number: string;
    role: string;
    status: string;
    warning_count: number;
    created_at: string;
    updated_at: string;
    reportCount?: number;
    claimCount?: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [userStats, setUserStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        warnedUsers: 0,
        suspendedUsers: 0,
        bannedUsers: 0,
        adminUsers: 0,
        studentUsers: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
        usersWithReports: 0,
        usersWithClaims: 0,
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, searchQuery, statusFilter, roleFilter]);

    const fetchUsers = async () => {
        try {
            // Use the server API route which properly bypasses RLS
            const response = await fetch('/api/admin/users');

            if (!response.ok) {
                console.error('Failed to fetch users:', response.statusText);
                setIsLoading(false);
                return;
            }

            const data = await response.json();
            const enrichedUsers = data.users || [];

            setUsers(enrichedUsers);

            // Calculate user statistics
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const stats = {
                totalUsers: enrichedUsers.length,
                activeUsers: enrichedUsers.filter((u: UserProfile) => u.status === 'active').length,
                warnedUsers: enrichedUsers.filter((u: UserProfile) => u.status === 'warned').length,
                suspendedUsers: enrichedUsers.filter((u: UserProfile) => u.status === 'suspended').length,
                bannedUsers: enrichedUsers.filter((u: UserProfile) => u.status === 'banned').length,
                adminUsers: enrichedUsers.filter((u: UserProfile) => u.role === 'admin').length,
                studentUsers: enrichedUsers.filter((u: UserProfile) => u.role === 'student').length,
                newUsersThisWeek: enrichedUsers.filter((u: UserProfile) => new Date(u.created_at) >= oneWeekAgo).length,
                newUsersThisMonth: enrichedUsers.filter((u: UserProfile) => new Date(u.created_at) >= oneMonthAgo).length,
                usersWithReports: enrichedUsers.filter((u: UserProfile) => (u.reportCount || 0) > 0).length,
                usersWithClaims: enrichedUsers.filter((u: UserProfile) => (u.claimCount || 0) > 0).length,
            };

            setUserStats(stats);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setIsLoading(false);
        }
    };

    const filterUsers = () => {
        let filtered = users;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(u =>
                u.register_number.toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(u => u.status === statusFilter);
        }

        if (roleFilter !== 'all') {
            filtered = filtered.filter(u => u.role === roleFilter);
        }

        setFilteredUsers(filtered);
    };

    const handleStatusChange = async () => {
        if (!selectedUser || !newStatus || isUpdating) return;
        setIsUpdating(true);

        try {
            const response = await fetch('/api/admin/users/status', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUser.id, status: newStatus }),
            });

            if (!response.ok) {
                toast.error('Failed to update user status');
            } else {
                toast.success(`User status updated to ${newStatus}`);
                setUsers(prev => prev.map(u =>
                    u.id === selectedUser.id ? { ...u, status: newStatus } : u
                ));
                setSelectedUser(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch {
            toast.error('Failed to update user status');
        }

        setIsUpdating(false);
        setShowStatusDialog(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">✅ Active</Badge>;
            case 'warned':
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">⚠️ Warned</Badge>;
            case 'suspended':
                return <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]">🚫 Suspended</Badge>;
            case 'banned':
                return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">🔴 Banned</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
        }
    };

    const getRoleBadge = (role: string) => {
        return role === 'admin'
            ? <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px]">🛡️ Admin</Badge>
            : <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[10px]">👤 Student</Badge>;
    };

    const exportToCSV = () => {
        const headers = ['Register Number', 'Role', 'Status', 'Reports', 'Claims', 'Warnings', 'Joined'];
        const rows = filteredUsers.map(u => [
            u.register_number,
            u.role,
            u.status,
            u.reportCount || 0,
            u.claimCount || 0,
            u.warning_count,
            new Date(u.created_at).toLocaleString(),
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kare_users_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-blue-600 text-white p-4">
                    <h1 className="text-xl font-semibold">Users Management</h1>
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
                        <h1 className="text-xl font-semibold">Users Management</h1>
                        <p className="text-blue-100 text-sm mt-1">
                            {filteredUsers.length} of {users.length} users — manage accounts and verify identities
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
                {/* User Statistics */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-blue-600 text-white px-4 py-3">
                        <h2 className="font-semibold">User Statistics</h2>
                    </div>
                    <div className="p-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-gray-200">
                            <div className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">{userStats.totalUsers}</div>
                                <div className="text-sm text-gray-600">Total Users</div>
                            </div>
                            <div className="p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">{userStats.activeUsers}</div>
                                <div className="text-sm text-gray-600">Active Users</div>
                            </div>
                            <div className="p-4 text-center">
                                <div className="text-2xl font-bold text-purple-600">{userStats.studentUsers}</div>
                                <div className="text-sm text-gray-600">Students</div>
                            </div>
                            <div className="p-4 text-center">
                                <div className="text-2xl font-bold text-indigo-600">{userStats.adminUsers}</div>
                                <div className="text-sm text-gray-600">Admins</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                            placeholder="Search by register number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 border-gray-300"
                        />
                    </div>
                </div>

                {/* Users List */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-blue-600 text-white px-4 py-3">
                        <h2 className="font-semibold">All Users</h2>
                    </div>
                    <div className="p-0">
                        {filteredUsers.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">No users found</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">User</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Activity</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Joined</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                                                        {user.register_number.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{user.register_number}</p>
                                                        {user.warning_count > 0 && (
                                                            <p className="text-xs text-amber-600">{user.warning_count} warning(s)</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${user.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {user.role === 'admin' ? '🛡️ Admin' : '👤 Student'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    user.status === 'warned' ? 'bg-yellow-100 text-yellow-800' :
                                                        user.status === 'suspended' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    {user.status === 'active' ? '✅ Active' :
                                                        user.status === 'warned' ? '⚠️ Warned' :
                                                            user.status === 'suspended' ? '🚫 Suspended' :
                                                                '🔴 Banned'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-600">
                                                    {user.reportCount || 0} reports, {user.claimCount || 0} claims
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-gray-600">{formatDate(user.created_at)}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedUser(user)}
                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* User Detail Modal */}
            <Dialog open={!!selectedUser && !showStatusDialog} onOpenChange={() => setSelectedUser(null)}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
                    {selectedUser && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-indigo-400" />
                                    User Details
                                </DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Manage user account and permissions
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* User avatar & name */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${selectedUser.role === 'admin'
                                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                        : 'bg-slate-700 text-slate-300'
                                        }`}>
                                        {selectedUser.register_number.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-white">{selectedUser.register_number}</p>
                                        <div className="flex gap-2 mt-1">
                                            {getRoleBadge(selectedUser.role)}
                                            {getStatusBadge(selectedUser.status)}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center p-3 rounded-lg bg-slate-900/50">
                                        <p className="text-xl font-bold text-white">{selectedUser.reportCount}</p>
                                        <p className="text-xs text-slate-400">Reports</p>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-slate-900/50">
                                        <p className="text-xl font-bold text-white">{selectedUser.claimCount}</p>
                                        <p className="text-xs text-slate-400">Claims</p>
                                    </div>
                                    <div className="text-center p-3 rounded-lg bg-slate-900/50">
                                        <p className="text-xl font-bold text-white">{selectedUser.warning_count}</p>
                                        <p className="text-xs text-slate-400">Warnings</p>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-slate-900/50">
                                        <p className="text-xs text-slate-500">Joined</p>
                                        <p className="text-sm text-white">{formatDate(selectedUser.created_at)}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-900/50">
                                        <p className="text-xs text-slate-500">Last Updated</p>
                                        <p className="text-sm text-white">{formatDate(selectedUser.updated_at)}</p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {selectedUser.role !== 'admin' && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-500 font-medium uppercase">Actions</p>
                                        <div className="flex gap-2">
                                            {selectedUser.status !== 'warned' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                                    onClick={() => { setNewStatus('warned'); setShowStatusDialog(true); }}
                                                >
                                                    <AlertTriangle className="w-4 h-4 mr-1" />
                                                    Warn
                                                </Button>
                                            )}
                                            {selectedUser.status !== 'suspended' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20"
                                                    onClick={() => { setNewStatus('suspended'); setShowStatusDialog(true); }}
                                                >
                                                    <Ban className="w-4 h-4 mr-1" />
                                                    Suspend
                                                </Button>
                                            )}
                                            {selectedUser.status !== 'banned' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                                                    onClick={() => { setNewStatus('banned'); setShowStatusDialog(true); }}
                                                >
                                                    <Ban className="w-4 h-4 mr-1" />
                                                    Ban
                                                </Button>
                                            )}
                                        </div>
                                        {(selectedUser.status === 'warned' || selectedUser.status === 'suspended' || selectedUser.status === 'banned') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                                onClick={() => { setNewStatus('active'); setShowStatusDialog(true); }}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                                Restore to Active
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Status Change Confirmation */}
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-400" />
                            Confirm Status Change
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Are you sure you want to change this user&apos;s status to <strong className="text-white">{newStatus}</strong>?
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
                            <p className="text-sm text-white font-medium">{selectedUser.register_number}</p>
                            <p className="text-xs text-slate-400">
                                Current status: {selectedUser.status} → New status: {newStatus}
                            </p>
                        </div>
                    )}

                    {newStatus === 'banned' && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300">
                                Banning will permanently prevent this user from accessing the platform.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowStatusDialog(false)}
                            className="border-slate-600 text-slate-300"
                            disabled={isUpdating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStatusChange}
                            disabled={isUpdating}
                            className={`${newStatus === 'active' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                newStatus === 'warned' ? 'bg-amber-600 hover:bg-amber-700' :
                                    newStatus === 'suspended' ? 'bg-orange-600 hover:bg-orange-700' :
                                        'bg-red-600 hover:bg-red-700'
                                } text-white`}
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                `Change to ${newStatus}`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
