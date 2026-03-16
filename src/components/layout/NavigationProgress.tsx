'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * A slim, animated loading bar that appears at the top of the page 
 * during client-side navigations. Gives instant visual feedback.
 */
export function NavigationProgress() {
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // On pathname change, animate in and then finish
        setIsLoading(true);
        setProgress(30);

        const t1 = setTimeout(() => setProgress(70), 100);
        const t2 = setTimeout(() => setProgress(100), 300);
        const t3 = setTimeout(() => {
            setIsLoading(false);
            setProgress(0);
        }, 500);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [pathname]);

    if (!isLoading && progress === 0) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px]">
            <div
                className="h-full transition-all duration-300 ease-out"
                style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #1a5c6b, #2dd4bf)',
                    opacity: progress >= 100 ? 0 : 1,
                }}
            />
        </div>
    );
}
