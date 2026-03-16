'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
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
    HelpCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// Demo user data
const demoUser = {
    registerNumber: '99220043XXX',
    email: 'student@klu.ac.in',
    role: 'student',
    status: 'active',
    qrCode: 'KARE-QR-99220043XXX',
    stats: {
        totalReports: 5,
        activeReports: 2,
        resolvedReports: 3,
        claimed: 1,
    },
};

const demoReports = [
    { id: '1', title: 'Black Laptop Charger', type: 'lost', status: 'active', date: '2 hours ago' },
    { id: '2', title: 'Blue Backpack', type: 'lost', status: 'claimed', date: '1 day ago' },
    { id: '3', title: 'Calculator', type: 'found', status: 'returned', date: '3 days ago' },
];

export default function ProfilePage() {
    const router = useRouter();
    const [isDark, setIsDark] = useState(false);
    const [showQrDialog, setShowQrDialog] = useState(false);

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

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 pb-24">
            {/* Profile Header */}
            <div className="mb-6">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-14 h-14 border-2 border-gray-200">
                                <AvatarFallback className="text-lg font-bold bg-gray-100 text-gray-600">
                                    {demoUser.registerNumber.slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h1 className="text-lg font-bold text-gray-800">{demoUser.registerNumber}</h1>
                                <p className="text-xs text-gray-500">{demoUser.email}</p>
                            </div>
                            <Badge variant="outline" className="capitalize text-xs border-gray-300 text-gray-600">
                                {demoUser.role}
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
                        <p className="text-2xl font-bold">{demoUser.stats.totalReports}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <div className="w-5 h-5 mx-auto mb-1 rounded-full bg-yellow-500" />
                        <p className="text-2xl font-bold">{demoUser.stats.activeReports}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                        <p className="text-2xl font-bold">{demoUser.stats.resolvedReports}</p>
                        <p className="text-xs text-muted-foreground">Resolved</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Shield className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                        <p className="text-2xl font-bold">{demoUser.stats.claimed}</p>
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
                                <h3 className="font-medium">My QR Code</h3>
                                <p className="text-sm text-muted-foreground">For item verification</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">View QR</Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-center">Your QR Code</DialogTitle>
                                    </DialogHeader>
                                    <div className="flex flex-col items-center gap-4 py-6">
                                        <div className="p-4 bg-white rounded-xl">
                                            <QRCodeSVG
                                                value={demoUser.qrCode}
                                                size={200}
                                                level="H"
                                                includeMargin
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground text-center">
                                            Show this QR code to verify item returns
                                        </p>
                                        <p className="text-xs font-mono text-muted-foreground">
                                            {demoUser.qrCode}
                                        </p>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button size="sm" className="text-white" style={{ background: '#1a5c6b' }}>
                                <Scan className="w-4 h-4 mr-2" />
                                Scan
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="reports" className="mb-6">
                <TabsList className="w-full">
                    <TabsTrigger value="reports" className="flex-1">My Reports</TabsTrigger>
                    <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                </TabsList>

                <TabsContent value="reports" className="mt-4">
                    <div className="space-y-3">
                        {demoReports.filter(r => r.status === 'active' || r.status === 'claimed').map((report) => (
                            <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${report.type === 'lost' ? 'bg-destructive' : 'bg-emerald-500'
                                            }`} />
                                        <div>
                                            <p className="font-medium">{report.title}</p>
                                            <p className="text-xs text-muted-foreground">{report.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={report.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                            {report.status}
                                        </Badge>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                    <div className="space-y-3">
                        {demoReports.filter(r => r.status === 'returned').map((report) => (
                            <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <History className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{report.title}</p>
                                            <p className="text-xs text-muted-foreground">{report.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="badge-returned capitalize">
                                            {report.status}
                                        </Badge>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
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
