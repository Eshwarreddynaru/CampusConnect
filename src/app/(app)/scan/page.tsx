'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    ArrowLeft, Scan, CheckCircle2, XCircle, AlertCircle,
    Camera, Loader2, Keyboard, QrCode
} from 'lucide-react';
import { toast } from 'sonner';

// Check if running inside Median.co WebView
function isMedianApp(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).median || !!(window as any).gonative;
}

export default function ScanQRPage() {
    const router = useRouter();
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const scannerRef = useRef<any>(null);

    const startScanner = async () => {
        setScanResult(null);
        setScanError(null);

        // If running inside Median.co app, use native scanner
        if (isMedianApp()) {
            startMedianScanner();
            return;
        }

        // Otherwise use html5-qrcode (browser)
        startBrowserScanner();
    };

    // ==========================================
    // Median.co Native Scanner
    // ==========================================
    const startMedianScanner = async () => {
        try {
            const median = (window as any).median;
            if (!median?.barcode?.scan) {
                setScanError('Native scanner not available. Please use manual code entry.');
                setShowManualInput(true);
                return;
            }

            const data = await median.barcode.scan();
            
            if (data.success && data.code) {
                handleVerifyCode(data.code);
            } else {
                // User cancelled or error
                if (data.error) {
                    setScanError(data.error);
                }
                // Don't show error for user-cancelled scans
            }
        } catch (err: any) {
            console.error('Median scanner error:', err);
            setScanError('Scanner failed. Try entering the code manually.');
            setShowManualInput(true);
        }
    };

    // ==========================================
    // Browser-based Scanner (html5-qrcode)
    // ==========================================
    const startBrowserScanner = async () => {
        setIsScanning(true);

        try {
            const { Html5Qrcode } = await import('html5-qrcode');

            await new Promise(resolve => setTimeout(resolve, 100));

            if (!document.getElementById('qr-reader')) {
                setScanError('Scanner container not found');
                setIsScanning(false);
                return;
            }

            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1,
                },
                async (decodedText) => {
                    try {
                        await scanner.stop();
                    } catch (e) { /* ignore */ }
                    scannerRef.current = null;
                    setIsScanning(false);
                    handleVerifyCode(decodedText);
                },
                () => { /* QR not in frame - normal */ }
            );
        } catch (err: any) {
            console.error('Scanner error:', err);
            setIsScanning(false);
            
            if (err.toString().includes('NotAllowedError') || err.toString().includes('Permission')) {
                setScanError('Camera access denied. Please allow camera access or enter the code manually.');
            } else if (err.toString().includes('NotFoundError')) {
                setScanError('No camera found. Please enter the code manually.');
            } else {
                setScanError(`Could not start camera. Try entering the code manually.`);
            }
            setShowManualInput(true);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch (e) { /* ignore */ }
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const handleVerifyCode = async (code: string) => {
        const trimmedCode = code.trim().toUpperCase();
        if (!trimmedCode) {
            toast.error('Please enter or scan a valid QR code');
            return;
        }

        setIsVerifying(true);
        setScanError(null);
        setScanResult(null);

        try {
            const response = await fetch('/api/reports/verify-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrCode: trimmedCode }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setScanResult({
                    success: true,
                    message: data.message,
                    report: data.report,
                    scannedBy: data.scannedBy,
                });
                toast.success(data.message);
            } else {
                setScanResult({
                    success: false,
                    message: data.error,
                    report: data.report || null,
                });
            }
        } catch (err) {
            console.error('Verify error:', err);
            setScanError('Failed to verify QR code. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    // Cleanup scanner on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 pb-24">
            {/* Header */}
            <div className="mb-6">
                <button 
                    onClick={() => { stopScanner(); router.back(); }} 
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Scan className="w-5 h-5 text-[#1a5c6b]" />
                    Scan QR Code
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                    Scan a report's QR code to mark the item as returned
                </p>
            </div>

            {/* Scanner Section */}
            {!scanResult && (
                <Card className="mb-6 overflow-hidden">
                    <CardContent className="p-0">
                        {/* Browser camera scanner (non-Median) */}
                        {isScanning ? (
                            <div className="relative">
                                <div 
                                    id="qr-reader" 
                                    className="w-full"
                                    style={{ minHeight: '350px' }}
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                                    <Button 
                                        onClick={stopScanner}
                                        variant="outline"
                                        className="w-full bg-white/90 hover:bg-white"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Stop Scanning
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#1a5c6b]/10 to-[#1a5c6b]/5 flex items-center justify-center">
                                    <Camera className="w-10 h-10 text-[#1a5c6b]/40" />
                                </div>
                                
                                <h3 className="font-semibold text-lg mb-1">Ready to Scan</h3>
                                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                                    Point your camera at a report's QR code to verify and mark the item as returned.
                                </p>

                                {scanError && (
                                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>{scanError}</span>
                                    </div>
                                )}

                                <Button 
                                    onClick={startScanner}
                                    className="w-full text-white mb-3"
                                    style={{ background: '#1a5c6b' }}
                                    size="lg"
                                >
                                    <Camera className="w-5 h-5 mr-2" />
                                    {isMedianApp() ? 'Open Scanner' : 'Open Camera & Scan'}
                                </Button>

                                <Button
                                    onClick={() => setShowManualInput(!showManualInput)}
                                    variant="outline"
                                    className="w-full"
                                    size="sm"
                                >
                                    <Keyboard className="w-4 h-4 mr-2" />
                                    {showManualInput ? 'Hide' : 'Enter Code Manually'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Manual code entry */}
            {showManualInput && !scanResult && !isScanning && (
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                            <QrCode className="w-4 h-4" />
                            Enter Report Code
                        </h3>
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g., KARE26L-A3X9B2"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                className="font-mono text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleVerifyCode(manualCode);
                                }}
                            />
                            <Button 
                                onClick={() => handleVerifyCode(manualCode)}
                                disabled={isVerifying || !manualCode.trim()}
                                className="text-white shrink-0"
                                style={{ background: '#1a5c6b' }}
                            >
                                {isVerifying ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Verify'
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            The report code is shown below each report's QR code (e.g., KARE26L-XXXXXX)
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Verification Loading */}
            {isVerifying && (
                <Card className="mb-6">
                    <CardContent className="p-8 text-center">
                        <Loader2 className="w-10 h-10 text-[#1a5c6b] animate-spin mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">Verifying QR code...</p>
                    </CardContent>
                </Card>
            )}

            {/* Scan Result */}
            {scanResult && (
                <Card className={`mb-6 border-2 ${
                    scanResult.success 
                        ? 'border-emerald-300 bg-emerald-50/50' 
                        : 'border-red-300 bg-red-50/50'
                }`}>
                    <CardContent className="p-6 text-center">
                        {scanResult.success ? (
                            <>
                                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-lg text-emerald-800 mb-2">
                                    Item Returned Successfully! 🎉
                                </h3>
                                <p className="text-sm text-emerald-700 mb-4">
                                    {scanResult.message}
                                </p>
                                
                                {scanResult.report && (
                                    <div className="bg-white rounded-lg p-4 mb-4 text-left border border-emerald-200">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Item</span>
                                                <span className="text-sm font-medium">{scanResult.report.title}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Type</span>
                                                <Badge className={scanResult.report.type === 'lost' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                                                    {scanResult.report.type === 'lost' ? 'Lost Item' : 'Found Item'}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Report Code</span>
                                                <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{scanResult.report.report_code}</code>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Owner</span>
                                                <span className="text-sm">{scanResult.report.owner_register_number}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Status</span>
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                    ✅ Returned via QR
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                    <XCircle className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="font-bold text-lg text-red-800 mb-2">
                                    Verification Failed
                                </h3>
                                <p className="text-sm text-red-700 mb-4">
                                    {scanResult.message}
                                </p>
                                
                                {scanResult.report && (
                                    <div className="bg-white rounded-lg p-4 mb-4 text-left border border-red-200">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Item</span>
                                                <span className="text-sm font-medium">{scanResult.report.title}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-muted-foreground">Status</span>
                                                <Badge variant="outline">{scanResult.report.status}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="flex gap-3 mt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setScanResult(null);
                                    setScanError(null);
                                    setManualCode('');
                                }}
                            >
                                <Scan className="w-4 h-4 mr-2" />
                                Scan Another
                            </Button>
                            <Button
                                className="flex-1 text-white"
                                style={{ background: '#1a5c6b' }}
                                onClick={() => router.push('/feed')}
                            >
                                Go to Feed
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* How it works */}
            {!scanResult && !isScanning && (
                <Card>
                    <CardContent className="p-4">
                        <h3 className="font-medium mb-3">How QR Return Verification Works</h3>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#1a5c6b]/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-[#1a5c6b]">1</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    The person who reported the item shows their report's QR code
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#1a5c6b]/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-[#1a5c6b]">2</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    You scan the QR code or enter the code manually
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-[#1a5c6b]/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-[#1a5c6b]">3</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    The item is automatically marked as "Returned via QR"
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
