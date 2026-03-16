'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import {
    LayoutGrid,
    MapPin,
    PlusCircle,
    MessageSquare,
    HandHelping,
    User,
    LogOut,
    Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const navItems = [
    { href: '/feed', label: 'Dashboard', icon: LayoutGrid },
    { href: '/map', label: 'Campus Map', icon: MapPin },
    { href: '/create', label: 'Create Report', icon: PlusCircle },
    { href: '/community', label: 'Community', icon: MessageSquare },
    { href: '/my-claims', label: 'My Claims', icon: HandHelping },
    { href: '/profile', label: 'Profile', icon: User },
];

export function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const getTitle = () => {
        if (pathname.startsWith('/feed')) return 'Dashboard';
        if (pathname.startsWith('/map')) return 'Campus Map';
        if (pathname.startsWith('/create')) return 'Create Report';
        if (pathname.startsWith('/community')) return 'Community';
        if (pathname.startsWith('/my-claims')) return 'My Claims';
        if (pathname.startsWith('/profile')) return 'Profile';
        return 'KARE Lost & Found';
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };

    return (
        <>
            {/* Top Bar */}
            <header className="sticky top-0 z-50 md:hidden">
                {/* Teal top bar */}
                <div
                    className="flex items-center justify-between h-14 px-4"
                    style={{ background: 'linear-gradient(90deg, #1a5c6b, #1e6e80)' }}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="w-8 h-8 flex items-center justify-center text-white rounded-md hover:bg-white/10 transition-colors"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center">
                                <Search className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-white text-sm tracking-wide">
                                KARE <span className="font-normal text-white/70">Lost & Found</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="w-8 h-8 flex items-center justify-center text-white rounded-md hover:bg-white/10 transition-colors relative">
                            <Bell className="w-4.5 h-4.5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full" />
                        </button>
                    </div>
                </div>

                {/* Page title bar */}
                <div className="bg-white border-b border-gray-200 px-4 py-2.5">
                    <h2 className="text-sm font-semibold text-gray-700">{getTitle()}</h2>
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-[60] md:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div
                        className="fixed left-0 top-0 bottom-0 w-[260px] z-[70] md:hidden animate-slide-in"
                        style={{ background: 'linear-gradient(180deg, #1a5c6b 0%, #14454f 100%)' }}
                    >
                        <div className="flex flex-col h-full">
                            {/* Brand */}
                            <div className="p-4 flex items-center gap-3 border-b border-white/10">
                                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                                    <Search className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-base text-white leading-tight tracking-wide">KARE</h1>
                                    <p className="text-[10px] text-white/60 uppercase tracking-widest">Lost & Found</p>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
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
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={cn(
                                                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150',
                                                isActive
                                                    ? 'bg-white/20 text-white'
                                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                            )}
                                        >
                                            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                                            <span className="text-sm font-medium">{item.label}</span>
                                            {isActive && (
                                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>

                            {/* Bottom */}
                            <div className="px-2 py-3 border-t border-white/10 space-y-0.5">
                                <Link
                                    href="/settings"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <Settings className="w-[18px] h-[18px]" />
                                    <span className="text-sm font-medium">Settings</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-red-300/80 hover:bg-red-500/15 hover:text-red-300 transition-all"
                                >
                                    <LogOut className="w-[18px] h-[18px]" />
                                    <span className="text-sm font-medium">Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
