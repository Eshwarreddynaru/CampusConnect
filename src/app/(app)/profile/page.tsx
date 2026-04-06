'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    QrCode,
    Package,
    CheckCircle2,
    Settings,
    LogOut,
    Moon,
    Sun,
    ChevronRight,
    Scan,
    History,
    Shield,
    HelpCircle,
    AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';

interface UserReport {
    id: string;
    title: string;
    type: 'lost' | 'found';
    status: string;
    created_at: string;
    report_code: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const [isDark, setIsDark] = useState(false);
    const [showQrDialog, setShowQrDialog] = useState(false);
    const [selectedReportQR, setSelectedReportQR] = useState<UserReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userInfo, setUserInfo] = useState({
        registerNumber: '',
        email: '',
        role: 'student',
    });
    const [reports, setReports] = useState<UserReport[]>([]);
    const [stats, setStats] = useState({
        totalReports: 0,
        activeReports: 0,
        resolvedReports: 0,
        claimed: 0,
    });

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                router.push('/auth/login');
                return;
            }

            // Set user info
            const regNumber = user.user_metadata?.register_number || 
                user.email?.split('@')[0] || 'Unknown';
            
            // Check admin
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            setUserInfo({
                registerNumber: regNumber,
                email: user.email || '',
                role: profile?.role || 'student',
            });

            // Fetch user's reports
            const { data: userReports, error } = await supabase
                .from('reports')
                .select('id, title, type, status, created_at, report_code')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && userReports) {
                setReports(userReports);

                // Calculate stats
                const active = userReports.filter(r => r.status === 'active').length;
                const resolved = userReports.filter(r => 
                    r.status === 'returned_qr' || r.status === 'returned_direct'
                ).length;
                const claimed = userReports.filter(r => r.status === 'claimed').length;

                setStats({
                    totalReports: userReports.length,
                    activeReports: active,
                    resolvedReports: resolved,
                    claimed: claimed,
                });
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark');
        setIsDark(!isDark);
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    const handleViewReportQR = (report: UserReport) => {
        setSelectedReportQR(report);
        setShowQrDialog(true);
    };

    const activeAndClaimedReports = reports.filter(r => r.status === 'active' || r.status === 'claimed');
    const historyReports = reports.filter(r => r.status === 'returned_qr' || r.status === 'returned_direct');

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 pb-24 space-y-6">
                <Skeleton className="h-24 w-full rounded-xl" />
                <div className="grid grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 pb-24">
            {/* Profile Header */}
            <div className="mb-6">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-14 h-14 border-2 border-gray-200">
                                <AvatarFallback className="text-lg font-bold bg-gray-100 text-gray-600">
                                    {userInfo.registerNumber.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h1 className="text-lg font-bold text-gray-800">{userInfo.registerNumber}</h1>
                                <p className="text-xs text-gray-500">{userInfo.email}</p>
                            </div>
                            <Badge variant="outline" className="capitalize text-xs border-gray-300 text-gray-600">
                                {userInfo.role}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <Card>
                    <CardContent className="p-4 text-center">
                        <Package className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                        <p className="text-2xl font-bold">{stats.totalReports}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-yellow-500" />
                        <p className="text-2xl font-bold">{stats.activeReports}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                        <p className="text-2xl font-bold">{stats.resolvedReports}</p>
                        <p className="text-xs text-muted-foreground">Resolved</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Shield className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                        <p className="text-2xl font-bold">{stats.claimed}</p>
                        <p className="text-xs text-muted-foreground">Claimed</p>
                    </CardContent>
                </Card>
            </div>

            {/* QR Code Section */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                                <QrCode className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                                <h3 className="font-medium">QR Verification</h3>
                                <p className="text-sm text-muted-foreground">Scan or show QR to return items</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href="/scan">
                                <Button size="sm" className="text-white" style={{ background: '#1a5c6b' }}>
                                    <Scan className="w-4 h-4 mr-2" />
                                    Scan
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* QR Code Dialog - Shows individual report QR */}
            <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">Report QR Code</DialogTitle>
                    </DialogHeader>
                    {selectedReportQR && (
                        <div className="flex flex-col items-center gap-4 py-6">
                            <div className="p-4 bg-white rounded-xl border">
                                <QRCodeSVG
                                    value={selectedReportQR.report_code}
                                    size={200}
                                    level="H"
                                    includeMargin
                                />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold">{selectedReportQR.title}</p>
                                <Badge className={`mt-1 ${selectedReportQR.type === 'lost' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {selectedReportQR.type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                                </Badge>
                            </div>
                            <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded-lg">
                                {selectedReportQR.report_code}
                            </code>
                            <p className="text-xs text-muted-foreground text-center max-w-xs">
                                Show this QR code to the other person. They can scan it to confirm the item return.
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Tabs */}
            <Tabs defaultValue="reports" className="mb-6">
                <TabsList className="w-full">
                    <TabsTrigger value="reports" className="flex-1">My Reports</TabsTrigger>
                    <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                </TabsList>

                <TabsContent value="reports" className="mt-4">
                    <div className="space-y-3">
                        {activeAndClaimedReports.length === 0 ? (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                    <p className="text-sm text-muted-foreground">No active reports</p>
                                    <Link href="/create">
                                        <Button variant="outline" size="sm" className="mt-3">
                                            Create a Report
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ) : (
                            activeAndClaimedReports.map((report) => (
                                <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${
                                                report.type === 'lost' ? 'bg-destructive' : 'bg-emerald-500'
                                            }`} />
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{report.title}</p>
                                                <p className="text-xs text-muted-foreground">{formatRelativeTime(report.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-7 px-2"
                                                onClick={(e) => { e.stopPropagation(); handleViewReportQR(report); }}
                                            >
                                                <QrCode className="w-3.5 h-3.5" />
                                            </Button>
                                            <Badge variant={report.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                                {report.status}
                                            </Badge>
                                            <Link href={`/report/${report.id}`}>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                    <div className="space-y-3">
                        {historyReports.length === 0 ? (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <History className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                    <p className="text-sm text-muted-foreground">No returned items yet</p>
                                </CardContent>
                            </Card>
                        ) : (
                            historyReports.map((report) => (
                                <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <History className="w-4 h-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{report.title}</p>
                                                <p className="text-xs text-muted-foreground">{formatRelativeTime(report.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="badge-returned capitalize">
                                                {report.status === 'returned_qr' ? 'Returned (QR)' : 'Returned'}
                                            </Badge>
                                            <Link href={`/report/${report.id}`}>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Settings */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            <span>Theme</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {isDark ? 'Dark' : 'Light'}
                        </span>
                    </button>

                    <Separator />

                    <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <HelpCircle className="w-5 h-5" />
                            <span>Help & Support</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>

                    <Separator />

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-4 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}
