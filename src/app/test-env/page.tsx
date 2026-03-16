'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function TestEnvPage() {
    const [envStatus, setEnvStatus] = useState<any>({});
    const [connStatus, setConnStatus] = useState<string>('Testing...');
    const [authStatus, setAuthStatus] = useState<string>('Testing...');
    const [errorDetails, setErrorDetails] = useState<string>('');

    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        setEnvStatus({
            url_exists: !!url,
            url_value: url,
            key_exists: !!key,
            key_length: key?.length
        });

        const testSupabase = async () => {
            try {
                const supabase = createClient();

                // Test DB connection (even if table doesn't exist, we check for network reachability)
                const { error: dbError } = await supabase.from('test').select('*').limit(1);

                if (dbError && dbError.message && !dbError.message.includes('relation "public.test" does not exist')) {
                    // If it's a network error or fetch error
                    setConnStatus('FAILED: ' + dbError.message);
                    setErrorDetails(JSON.stringify(dbError, null, 2));
                } else if (dbError && dbError.code === '42P01') {
                    // Table doesn't exist, but we reached Supabase!
                    setConnStatus('SUCCESS (Connected, but table missing - this is fine)');
                } else if (!dbError) {
                    setConnStatus('SUCCESS');
                } else {
                    setConnStatus('FAILED: ' + dbError.message);
                    setErrorDetails(JSON.stringify(dbError, null, 2));
                }

                // Test Auth
                const { error: authError } = await supabase.auth.getSession();
                if (authError) {
                    setAuthStatus('FAILED: ' + authError.message);
                    if (!errorDetails) setErrorDetails(JSON.stringify(authError, null, 2));
                } else {
                    setAuthStatus('SUCCESS');
                }

            } catch (err: any) {
                setConnStatus('CRITICAL ERROR');
                setErrorDetails(err.message || String(err));
            }
        };

        testSupabase();
    }, []);

    return (
        <div className="p-10 font-mono space-y-6">
            <h1 className="text-2xl font-bold">Supabase Diagnostic</h1>

            <div className="border p-4 rounded bg-gray-100 dark:bg-gray-800">
                <h2 className="font-bold mb-2">Environment Variables</h2>
                <div className="grid grid-cols-2 gap-2">
                    <div>NEXT_PUBLIC_SUPABASE_URL:</div>
                    <div className={envStatus.url_exists ? "text-green-600" : "text-red-600"}>
                        {envStatus.url_value || 'MISSING'}
                    </div>

                    <div>NEXT_PUBLIC_SUPABASE_ANON_KEY:</div>
                    <div className={envStatus.key_exists ? "text-green-600" : "text-red-600"}>
                        {envStatus.key_exists ? `Present (Length: ${envStatus.key_length})` : 'MISSING'}
                    </div>
                </div>
            </div>

            <div className="border p-4 rounded bg-gray-100 dark:bg-gray-800">
                <h2 className="font-bold mb-2">Connectivity Test</h2>
                <div>DB Connection:
                    <span className={connStatus.includes('SUCCESS') ? "text-green-600 font-bold ml-2" : "text-red-600 font-bold ml-2"}>
                        {connStatus}
                    </span>
                </div>
                <div>Auth Connection:
                    <span className={authStatus.includes('SUCCESS') ? "text-green-600 font-bold ml-2" : "text-red-600 font-bold ml-2"}>
                        {authStatus}
                    </span>
                </div>
            </div>

            {errorDetails && (
                <div className="border p-4 rounded bg-red-50 border-red-200">
                    <h2 className="font-bold mb-2 text-red-700">Error Details</h2>
                    <pre className="whitespace-pre-wrap text-xs text-red-800">
                        {errorDetails}
                    </pre>
                </div>
            )}
        </div>
    );
}
