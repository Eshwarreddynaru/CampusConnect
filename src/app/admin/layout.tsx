'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    // Login page gets a clean layout without sidebar
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminSidebar />
            <main className="md:pl-64 min-h-screen">
                <div className="min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}
