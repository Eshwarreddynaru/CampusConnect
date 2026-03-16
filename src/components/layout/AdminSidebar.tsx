'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    FileText,
    HandHelping,
    MessageSquare,
    Users,
    Shield,
    LogOut,
    ChevronRight,
    Activity,
    Menu,
    X,
    Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

const adminNavItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/reports', label: 'All Reports', icon: FileText },
    { href: '/admin/claims', label: 'All Claims', icon: HandHelping },
    { href: '/admin/chats', label: 'All Chats', icon: MessageSquare },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/agent', label: '🤖 Agent', icon: Bot, special: true },
] as const;

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setAdminEmail(user.email || '');
        });
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/admin/login');
        router.refresh();
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            {/* Logo */}
            <div className="p-4 border-b border-gray-200">
                <Link href="/admin" className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-lg text-gray-800">KARE Admin</h1>
                        <p className="text-xs text-gray-500">Control Panel</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <div className="space-y-1">
                    {adminNavItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/admin' && pathname.startsWith(item.href));
                        const Icon = item.icon;
                        const isSpecial = 'special' in item && item.special;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                    isActive
                                        ? isSpecial
                                            ? 'bg-violet-50 text-violet-700 border-r-2 border-violet-600'
                                            : 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                                        : isSpecial
                                            ? 'text-violet-600 hover:text-violet-800 hover:bg-violet-50'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{item.label}</span>
                                {isSpecial && !isActive && (
                                    <span className="ml-auto text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-bold">AI</span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Admin info & logout */}
            <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3 px-3 py-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                        {adminEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{adminEmail || 'Admin'}</p>
                        <p className="text-xs text-gray-500">Administrator</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    onClick={handleLogout}
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900">Admin Panel</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-500"
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                >
                    {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
            </div>

            {/* Mobile sidebar overlay */}
            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/20 z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <aside className={cn(
                'md:hidden fixed top-14 left-0 bottom-0 w-64 z-50 transition-transform duration-300',
                isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <SidebarContent />
            </aside>

            {/* Desktop sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 z-40">
                <SidebarContent />
            </aside>
        </>
    );
}
