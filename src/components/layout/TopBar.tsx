'use client';

import { usePathname } from 'next/navigation';
import { Bell, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function TopBar() {
    const pathname = usePathname();
    const [showNotification, setShowNotification] = useState(true);

    const getPageTitle = () => {
        if (pathname.startsWith('/feed')) return 'Dashboard';
        if (pathname.startsWith('/map')) return 'Campus Map';
        if (pathname.startsWith('/create')) return 'Create Report';
        if (pathname.startsWith('/community')) return 'Community';
        if (pathname.startsWith('/my-claims')) return 'My Claims';
        if (pathname.startsWith('/profile')) return 'Profile';
        if (pathname.startsWith('/chat')) return 'Chat';
        if (pathname.startsWith('/report')) return 'Report Details';
        return 'Dashboard';
    };

    const getBreadcrumbs = () => {
        const segments = pathname.split('/').filter(Boolean);
        return segments.map((segment, index) => ({
            label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
            href: '/' + segments.slice(0, index + 1).join('/'),
            isLast: index === segments.length - 1,
        }));
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <div className="hidden md:block fixed top-0 right-0 left-[220px] z-30 transition-all duration-300">
            {/* Notification Banner */}
            {showNotification && (
                <div
                    className="relative"
                    style={{ background: 'linear-gradient(90deg, #1a5c6b, #1e6e80)' }}
                >
                    <div className="flex items-center justify-between px-5 py-2.5">
                        <div className="flex items-center gap-2.5">
                            <Bell className="w-4 h-4 text-white/80" />
                            <span className="text-sm text-white font-medium">Notifications</span>
                        </div>
                        <button
                            onClick={() => setShowNotification(false)}
                            className="text-white/60 hover:text-white text-xs transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                    {/* Green progress bar like SIS-KARE */}
                    <div className="h-1 bg-emerald-400" />
                </div>
            )}

            {/* Breadcrumb / Page Title Bar */}
            <div className="bg-white border-b border-gray-200 px-5 py-3">
                <div className="flex items-center gap-2 text-sm">
                    <Link href="/feed" className="text-gray-400 hover:text-[#1a5c6b] transition-colors">
                        <Home className="w-4 h-4" />
                    </Link>
                    {breadcrumbs.map((crumb) => (
                        <div key={crumb.href} className="flex items-center gap-2">
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                            {crumb.isLast ? (
                                <span className="font-semibold text-gray-800">{getPageTitle()}</span>
                            ) : (
                                <Link href={crumb.href} className="text-gray-500 hover:text-[#1a5c6b] transition-colors">
                                    {crumb.label}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
