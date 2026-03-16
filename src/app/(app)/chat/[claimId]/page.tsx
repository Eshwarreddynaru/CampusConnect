'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Send,
    Shield,
    Package,
    Loader2,
    CheckCheck,
    Info,
    CheckCircle2,
    XCircle,
    PackageCheck,
} from 'lucide-react';
import Link from 'next/link';

interface Message {
    id: string;
    claim_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
}

interface ClaimDetails {
    id: string;
    report_id: string;
    claimer_id: string;
    claimer_register_number: string;
    message: string | null;
    status: string;
    created_at: string;
    report: {
        id: string;
        type: string;
        title: string;
        report_code: string;
        register_number: string;
        user_id: string;
        status: string;
    };
}

export default function ChatPage() {
    const params = useParams();
    const router = useRouter();
    const claimId = params.claimId as string;

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [claim, setClaim] = useState<ClaimDetails | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [showReturnDialog, setShowReturnDialog] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Load claim details and messages
    useEffect(() => {
        const init = async () => {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('You must be logged in');
                router.push('/auth/login');
                return;
            }
            setCurrentUserId(user.id);

            // Get claim details with report info
            const { data: claimData, error: claimError } = await supabase
                .from('claims')
                .select(`
                    *,
                    report:reports (
                        id,
                        type,
                        title,
                        report_code,
                        register_number,
                        user_id,
                        status
                    )
                `)
                .eq('id', claimId)
                .single();

            if (claimError || !claimData) {
                toast.error('Claim not found or you do not have access');
                router.push('/feed');
                return;
            }

            // Check if user is authorized (must be claimer or report owner)
            const isClaimant = user.id === claimData.claimer_id;
            const isReportOwner = user.id === claimData.report?.user_id;

            if (!isClaimant && !isReportOwner) {
                toast.error('You do not have access to this conversation');
                router.push('/feed');
                return;
            }

            setClaim(claimData);

            // Load messages
            const { data: messagesData } = await supabase
                .from('messages')
                .select('*')
                .eq('claim_id', claimId)
                .order('created_at', { ascending: true });

            setMessages(messagesData || []);

            // Mark unread messages as read
            if (messagesData && messagesData.length > 0) {
                const unreadIds = messagesData
                    .filter(m => m.sender_id !== user.id && !m.is_read)
                    .map(m => m.id);

                if (unreadIds.length > 0) {
                    await supabase
                        .from('messages')
                        .update({ is_read: true })
                        .in('id', unreadIds);
                }
            }

            setIsLoading(false);
        };

        init();
    }, [claimId, router]);

    // Real-time subscription for new messages
    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(`messages:${claimId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `claim_id=eq.${claimId}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => {
                        // Avoid duplicates
                        if (prev.find(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });

                    // Mark as read if we're the recipient
                    if (newMsg.sender_id !== currentUserId) {
                        supabase
                            .from('messages')
                            .update({ is_read: true })
                            .eq('id', newMsg.id)
                            .then();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [claimId, currentUserId]);

    // Poll for new messages every 5 seconds as a fallback
    useEffect(() => {
        if (!claimId || isLoading) return;

        const interval = setInterval(async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('messages')
                .select('*')
                .eq('claim_id', claimId)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [claimId, isLoading]);

    const handleSend = async () => {
        if (!newMessage.trim() || !currentUserId || isSending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        try {
            const supabase = createClient();

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    claim_id: claimId,
                    sender_id: currentUserId,
                    content,
                })
                .select()
                .single();

            if (error) {
                console.error('Error sending message:', error);
                toast.error('Failed to send message');
                setNewMessage(content); // Restore the message
                return;
            }

            // Add to local state if not already added by subscription
            setMessages(prev => {
                if (prev.find(m => m.id === data.id)) return prev;
                return [...prev, data];
            });
        } catch (err) {
            console.error('Error:', err);
            toast.error('Failed to send message');
            setNewMessage(content);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ---- Claim Status Actions ----

    const handleAcceptClaim = async () => {
        if (!claim || isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('claims')
                .update({ status: 'accepted' })
                .eq('id', claimId);

            if (error) {
                console.error('Error accepting claim:', error);
                toast.error('Failed to accept claim');
                return;
            }

            setClaim(prev => prev ? { ...prev, status: 'accepted' } : prev);
            toast.success('Claim accepted! You can now arrange the return.');
        } catch (err) {
            console.error('Error:', err);
            toast.error('Something went wrong');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleRejectClaim = async () => {
        if (!claim || isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        try {
            const supabase = createClient();

            // Reject the claim
            const { error } = await supabase
                .from('claims')
                .update({ status: 'rejected' })
                .eq('id', claimId);

            if (error) {
                console.error('Error rejecting claim:', error);
                toast.error('Failed to reject claim');
                return;
            }

            // Set report back to active
            await supabase
                .from('reports')
                .update({ status: 'active' })
                .eq('id', claim.report_id);

            setClaim(prev => prev ? { ...prev, status: 'rejected' } : prev);
            toast.success('Claim rejected.');
        } catch (err) {
            console.error('Error:', err);
            toast.error('Something went wrong');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleMarkReturned = async () => {
        if (!claim || isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        try {
            const supabase = createClient();

            // Update report status to returned
            const { error } = await supabase
                .from('reports')
                .update({ status: 'returned_direct' })
                .eq('id', claim.report_id);

            if (error) {
                console.error('Error marking as returned:', error);
                toast.error('Failed to mark as returned');
                return;
            }

            setClaim(prev => prev ? {
                ...prev,
                report: { ...prev.report, status: 'returned_direct' }
            } : prev);
            setShowReturnDialog(false);
            toast.success('🎉 Item marked as returned! Thank you for using KARE.');
        } catch (err) {
            console.error('Error:', err);
            toast.error('Something went wrong');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const isReportOwner = currentUserId === claim?.report?.user_id;

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-24 w-full" />
                <div className="space-y-3">
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-12 w-1/2 ml-auto" />
                    <Skeleton className="h-12 w-2/3" />
                </div>
            </div>
        );
    }

    if (!claim) return null;

    const isClaimant = currentUserId === claim.claimer_id;
    const otherPersonRegNumber = isClaimant
        ? claim.report.register_number
        : claim.claimer_register_number;
    const otherPersonRole = isClaimant
        ? (claim.report.type === 'lost' ? 'Lost Reporter' : 'Finder')
        : (claim.report.type === 'lost' ? 'Finder' : 'Claimer');

    return (
        <div className="flex flex-col h-[calc(100vh-7rem)] md:h-screen max-w-2xl mx-auto">
            {/* Header */}
            <div className="border-b px-4 py-3 bg-card">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {otherPersonRegNumber.slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium truncate">{otherPersonRegNumber}</p>
                                <p className="text-xs text-muted-foreground">{otherPersonRole}</p>
                            </div>
                        </div>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${claim.status === 'accepted' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600' :
                        claim.status === 'rejected' ? 'border-red-500/30 bg-red-500/10 text-red-600' : ''
                        }`}>
                        {claim.status === 'pending' ? '⏳ Pending' : claim.status === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                    </Badge>
                </div>
            </div>

            {/* Report Info Card */}
            <Card className="m-4 mb-0 bg-primary/5 border-primary/20">
                <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{claim.report.title}</p>
                            <div className="flex items-center gap-2">
                                <Badge className={claim.report.type === 'lost' ? 'badge-lost' : 'badge-found'} >
                                    {claim.report.type === 'lost' ? 'Lost' : 'Found'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{claim.report.report_code}</span>
                            </div>
                        </div>
                        <Link href={`/report/${claim.report.id}`}>
                            <Button variant="outline" size="sm">View</Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Security Notice */}
            <div className="mx-4 mt-2 mb-0">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Shield className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="text-[10px] text-muted-foreground">
                        This is a private conversation. Only you and {otherPersonRegNumber} can see these messages.
                    </p>
                </div>
            </div>

            {/* Action Buttons for Report Owner */}
            {isReportOwner && claim.status === 'pending' && (
                <div className="mx-4 mt-2 mb-0">
                    <div className="flex gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <div className="flex-1">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                                {claim.claimer_register_number} claims to have {claim.report.type === 'lost' ? 'found' : 'lost'} this item. What would you like to do?
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleAcceptClaim}
                                    disabled={isUpdatingStatus}
                                >
                                    {isUpdatingStatus ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                            Accept
                                        </>
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-red-500/30 text-red-600 hover:bg-red-500/10"
                                    onClick={handleRejectClaim}
                                    disabled={isUpdatingStatus}
                                >
                                    {isUpdatingStatus ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Reject
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mark as Returned Button (after accepting) */}
            {isReportOwner && claim.status === 'accepted' && claim.report.status !== 'returned_direct' && claim.report.status !== 'returned_qr' && (
                <div className="mx-4 mt-2 mb-0">
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setShowReturnDialog(true)}
                    >
                        <PackageCheck className="w-4 h-4 mr-2" />
                        Mark Item as Returned
                    </Button>
                </div>
            )}

            {/* Returned Success Banner */}
            {(claim.report.status === 'returned_direct' || claim.report.status === 'returned_qr') && (
                <div className="mx-4 mt-2 mb-0">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <PackageCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                Item has been returned! 🎉
                            </p>
                            <p className="text-xs text-muted-foreground">
                                This item has been successfully returned to its owner.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejected Banner for Claimer */}
            {!isReportOwner && claim.status === 'rejected' && (
                <div className="mx-4 mt-2 mb-0">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                Claim was rejected
                            </p>
                            <p className="text-xs text-muted-foreground">
                                The report owner has rejected this claim.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Initial claim message */}
            {claim.message && (
                <div className="mx-4 mt-3">
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                Initial claim message from {claim.claimer_register_number}:
                            </p>
                            <p className="text-sm">{claim.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                            No messages yet. Start the conversation!
                        </p>
                    </div>
                )}

                {messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[75%]`}>
                                <div
                                    className={`px-4 py-2 rounded-2xl ${isOwn
                                        ? 'bg-primary text-primary-foreground rounded-br-md'
                                        : 'bg-muted rounded-bl-md'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                                    <span className="text-[10px] text-muted-foreground">
                                        {formatRelativeTime(msg.created_at)}
                                    </span>
                                    {isOwn && (
                                        <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-primary' : 'text-muted-foreground'}`} />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Message Input */}
            <div className="border-t p-4 bg-card">
                <div className="flex gap-2">
                    <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="flex-1"
                        disabled={isSending}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || isSending}
                        className="text-white hover:opacity-90" style={{ background: '#1a5c6b' }}
                    >
                        {isSending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Return Confirmation Dialog */}
            <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>🎉 Confirm Item Return</DialogTitle>
                        <DialogDescription>
                            Are you sure this item has been successfully returned? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Package className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">{claim.report.title}</p>
                                <p className="text-xs text-muted-foreground">{claim.report.report_code}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowReturnDialog(false)}
                            disabled={isUpdatingStatus}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleMarkReturned}
                            disabled={isUpdatingStatus}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isUpdatingStatus ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Confirming...
                                </>
                            ) : (
                                <>
                                    <PackageCheck className="w-4 h-4 mr-2" />
                                    Confirm Returned
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
