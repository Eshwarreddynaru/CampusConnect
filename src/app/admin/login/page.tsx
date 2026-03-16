'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const supabase = createClient();

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error('Invalid credentials');
                return;
            }

            // Verify admin role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, status')
                .eq('id', data.user.id)
                .single();

            if (!profile || profile.role !== 'admin') {
                await supabase.auth.signOut();
                toast.error('Access denied. Admin privileges required.');
                return;
            }

            if (profile.status === 'suspended' || profile.status === 'banned') {
                await supabase.auth.signOut();
                toast.error('Your admin account has been suspended.');
                return;
            }

            toast.success('Welcome, Admin!');
            router.push('/admin');
            router.refresh();
        } catch {
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    // Prevent hydration mismatch by not rendering until mounted
    if (!isMounted) {
        return null;
    }

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4">
            {/* Campus Background Image */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/admin-login-background.jpg')`
                }}
            />
            
            {/* Background pattern overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0%,transparent_65%)]" />

            <div className="w-full max-w-md relative z-10">
                {/* Back button */}
                <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to home</span>
                </Link>

                <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-xl">
                    <CardHeader className="text-center pb-2">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">Admin Portal</CardTitle>
                        <CardDescription className="text-slate-400">
                            Sign in with your admin credentials
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">Admin Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500"
                                        required
                                        disabled={isLoading}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-indigo-500"
                                        required
                                        disabled={isLoading}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    'Sign In to Admin'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                            <p className="text-xs text-slate-400 text-center">
                                🔒 This portal is for authorized administrators only.
                                <br />
                                Unauthorized access attempts are logged.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-white/70 mt-6">
                    Student? <Link href="/auth/login" className="text-indigo-300 hover:text-indigo-200 hover:underline">Go to student login</Link>
                </p>
            </div>
        </div>
    );
}
