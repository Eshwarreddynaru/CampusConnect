'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutGrid,
    MapPin,
    PlusCircle,
    MessageSquare,
    HandHelping,
    User,
    Search,
    LogOut,
    Settings,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const navItems = [
    { href: '/feed', label: 'Dashboard', icon: LayoutGrid },
    { href: '/map', label: 'Campus Map', icon: MapPin },
    { href: '/create', label: 'Create Report', icon: PlusCircle },
    { href: '/community', label: 'Community', icon: MessageSquare },
    { href: '/my-claims', label: 'My Claims', icon: HandHelping },
    { href: '/profile', label: 'Profile', icon: User },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    return (
        <aside
            className={cn(
                'hidden md:flex fixed left-0 top-0 bottom-0 z-40 transition-all duration-300',
                collapsed ? 'w-[70px]' : 'w-[220px]'
            )}
            style={{ background: 'linear-gradient(180deg, #1a5c6b 0%, #14454f 100%)' }}
        >
            <div className="flex flex-col w-full h-full">
                {/* Logo / Brand */}
                <div className="p-4 flex items-center gap-3 border-b border-white/10">
                    <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                        <Search className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <h1 className="font-bold text-base text-white leading-tight tracking-wide">
                                KARE
                            </h1>
                            <p className="text-[10px] text-white/60 uppercase tracking-widest">
                                Lost & Found
                            </p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={collapsed ? item.label : undefined}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 group',
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                )}
                            >
                                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                                {!collapsed && (
                                    <span className="text-sm font-medium truncate">{item.label}</span>
                                )}
                                {isActive && !collapsed && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="px-2 py-3 border-t border-white/10 space-y-0.5">
                    <Link
                        href="/settings"
                        title={collapsed ? 'Settings' : undefined}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-all duration-150"
                    >
                        <Settings className="w-[18px] h-[18px] flex-shrink-0" />
                        {!collapsed && <span className="text-sm font-medium">Settings</span>}
                    </Link>

                    <button
                        onClick={handleLogout}
                        title={collapsed ? 'Logout' : undefined}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-red-300/80 hover:bg-red-500/15 hover:text-red-300 transition-all duration-150"
                    >
                        <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                        {!collapsed && <span className="text-sm font-medium">Logout</span>}
                    </button>
                </div>

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-50"
                >
                    {collapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    ) : (
                        <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                    )}
                </button>
            </div>
        </aside>
    );
}
