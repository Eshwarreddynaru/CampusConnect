'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Moon, Sun, Palette } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check if dark mode is currently active
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        if (newDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 pb-24">
            {/* Header */}
            <div className="mb-6">
                <Link href="/profile" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Profile</span>
                </Link>
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[#1a5c6b]" />
                    Settings
                </h1>
                <p className="text-xs text-gray-500 mt-1">Customize your app experience</p>
            </div>

            {/* Theme */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Appearance</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between py-3 cursor-pointer"
                        role="group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium">Dark Mode</p>
                                <p className="text-xs text-muted-foreground">
                                    {isDark ? 'Dark theme is on' : 'Light theme is on'}
                                </p>
                            </div>
                        </div>
                        <Switch checked={isDark} onCheckedChange={toggleTheme} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
