import { BottomNav } from '@/components/layout/BottomNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { TopBar } from '@/components/layout/TopBar';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-100">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Header */}
            <Header />

            {/* Desktop Top Bar */}
            <TopBar />

            {/* Main Content */}
            <main className="md:pl-[220px] pb-20 md:pb-0 transition-all duration-300">
                <div className="md:pt-[96px] min-h-screen">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    );
}
