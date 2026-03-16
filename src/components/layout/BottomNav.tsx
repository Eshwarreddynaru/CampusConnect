'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutGrid,
    MapPin,
    PlusCircle,
    HandHelping,
    User
} from 'lucide-react';

const navItems = [
    { href: '/feed', label: 'Feed', icon: LayoutGrid },
    { href: '/map', label: 'Map', icon: MapPin },
    { href: '/create', label: 'Create', icon: PlusCircle },
    { href: '/my-claims', label: 'Claims', icon: HandHelping },
    { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            <div className="bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-around h-14 px-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-150 min-w-[56px]',
                                    isActive
                                        ? 'text-[#1a5c6b]'
                                        : 'text-gray-400 hover:text-gray-600'
                                )}
                            >
                                <Icon className={cn(
                                    'w-5 h-5',
                                    isActive && 'scale-105'
                                )} />
                                <span className={cn(
                                    'text-[10px] font-medium',
                                    isActive ? 'text-[#1a5c6b]' : 'text-gray-400'
                                )}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="absolute bottom-1.5 w-4 h-0.5 rounded-full bg-[#1a5c6b]" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
