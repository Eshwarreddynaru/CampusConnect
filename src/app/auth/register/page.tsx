'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isValidCollegeEmail } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
    Search,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowLeft,
    Loader2,
    User,
    CheckCircle2,
    XCircle
} from 'lucide-react';

// Google Icon Component
function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

export default function RegisterPage() {
    const router = useRouter();
    const [registerNumber, setRegisterNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);

    // Password strength calculation
    const passwordStrength = useMemo(() => {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    }, [password]);

    const passwordStrengthLabel = useMemo(() => {
        if (password.length === 0) return '';
        if (passwordStrength <= 2) return 'Weak';
        if (passwordStrength <= 4) return 'Medium';
        return 'Strong';
    }, [password, passwordStrength]);

    const passwordStrengthColor = useMemo(() => {
        if (passwordStrength <= 2) return 'bg-destructive';
        if (passwordStrength <= 4) return 'bg-yellow-500';
        return 'bg-emerald-500';
    }, [passwordStrength]);

    const handleGoogleSignup = async () => {
        setIsGoogleLoading(true);

        try {
            const supabase = createClient();

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?redirect=/feed`,
                    queryParams: {
                        hd: 'klu.ac.in',
                    },
                },
            });

            if (error) {
                toast.error(error.message);
            }
        } catch {
            toast.error('An unexpected error occurred');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!isValidCollegeEmail(email)) {
            toast.error('Please use your college email (@klu.ac.in)');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        if (!acceptTerms) {
            toast.error('Please accept the terms and conditions');
            return;
        }

        setIsLoading(true);

        try {
            const supabase = createClient();

            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        register_number: registerNumber.toUpperCase(),
                    },
                },
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    toast.error('This email is already registered');
                } else {
                    toast.error(error.message);
                }
                return;
            }

            toast.success('Account created! Please check your email to verify.');
            router.push('/auth/login?message=verify');
        } catch {
            toast.error('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-12">

            <div className="w-full max-w-md relative z-10">
                {/* Back button */}
                <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to home</span>
                </Link>

                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardHeader className="text-center pb-2">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#1a5c6b' }}>
                            <Search className="w-7 h-7 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
                        <CardDescription>
                            Join KARE Lost & Found with your college credentials
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {/* Google Sign Up Button */}
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full mb-4"
                            onClick={handleGoogleSignup}
                            disabled={isGoogleLoading || isLoading}
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <GoogleIcon className="w-5 h-5 mr-2" />
                            )}
                            Sign up with Google
                        </Button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">Or register with email</span>
                            </div>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="registerNumber">Register Number</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="registerNumber"
                                        type="text"
                                        placeholder="e.g., 99220041XXX"
                                        value={registerNumber}
                                        onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                                        className="pl-10 uppercase"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">College Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="yourname@klu.ac.in"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                {email && !isValidCollegeEmail(email) && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <XCircle className="w-3 h-3" />
                                        Use your college email (@klu.ac.in)
                                    </p>
                                )}
                                {email && isValidCollegeEmail(email) && (
                                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Valid college email
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10"
                                        required
                                        disabled={isLoading}
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {password && (
                                    <div className="space-y-1">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength ? passwordStrengthColor : 'bg-muted'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className={`text-xs ${passwordStrength <= 2 ? 'text-destructive' :
                                            passwordStrength <= 4 ? 'text-yellow-600' :
                                                'text-emerald-600'
                                            }`}>
                                            {passwordStrengthLabel}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <XCircle className="w-3 h-3" />
                                        Passwords do not match
                                    </p>
                                )}
                                {confirmPassword && password === confirmPassword && (
                                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Passwords match
                                    </p>
                                )}
                            </div>

                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={acceptTerms}
                                    onChange={(e) => setAcceptTerms(e.target.checked)}
                                    className="mt-1 rounded border-border"
                                    required
                                />
                                <Label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                                    I agree to the{' '}
                                    <Link href="/terms" className="text-primary hover:underline">
                                        Terms of Service
                                    </Link>{' '}
                                    and{' '}
                                    <Link href="/privacy" className="text-primary hover:underline">
                                        Privacy Policy
                                    </Link>
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full text-white hover:opacity-90" style={{ background: '#1a5c6b' }}
                                disabled={isLoading || !acceptTerms}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    'Create Account'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link href="/auth/login" className="text-primary font-medium hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
