'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn, formatRelativeTime, REPORT_CATEGORIES } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
    MapPin,
    MoreVertical,
    MessageSquare,
    Flag,
    Share2,
    QrCode,
    Hand,
    Loader2,
    CheckCircle2,
} from 'lucide-react';

interface FeedCardProps {
    id: string;
    type: 'lost' | 'found';
    title: string;
    description?: string;
    category: string;
    reportCode: string;
    registerNumber: string;
    images: string[];
    location?: string;
    status: 'active' | 'claimed' | 'returned_qr' | 'returned_direct';
    createdAt: string;
    userId?: string;
    currentUserId?: string;
    onClaim?: () => void;
    onViewMap?: () => void;
    onReport?: () => void;
}

export function FeedCard({
    id,
    type,
    title,
    description,
    category,
    reportCode,
    registerNumber,
    images,
    location,
    status,
    createdAt,
    userId,
    currentUserId,
    onClaim,
    onViewMap,
    onReport,
}: FeedCardProps) {
    const [imageIndex, setImageIndex] = useState(0);
    const [showClaimDialog, setShowClaimDialog] = useState(false);
    const [claimMessage, setClaimMessage] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);
    const [hasClaimed, setHasClaimed] = useState(false);
    const [claimId, setClaimId] = useState<string | null>(null);

    const categoryInfo = REPORT_CATEGORIES.find(c => c.id === category);
    const isResolved = status === 'returned_qr' || status === 'returned_direct';
    const isOwnReport = currentUserId && userId && currentUserId === userId;

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: `${type === 'lost' ? 'Lost' : 'Found'}: ${title}`,
                text: description,
                url: `${window.location.origin}/report/${id}`,
            });
        }
    };

    const handleClaimClick = () => {
        if (isOwnReport) {
            toast.error("You can't claim your own report!");
            return;
        }
        setShowClaimDialog(true);
    };

    const handleSubmitClaim = async () => {
        setIsClaiming(true);
        try {
            const supabase = createClient();

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('You must be logged in');
                return;
            }

            const regNumber = user.user_metadata?.register_number ||
                user.email?.split('@')[0] || 'Unknown';

            // Insert the claim
            const { data: claim, error } = await supabase
                .from('claims')
                .insert({
                    report_id: id,
                    claimer_id: user.id,
                    claimer_register_number: regNumber,
                    message: claimMessage.trim() || null,
                    status: 'pending',
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    toast.error('You have already claimed this item!');
                } else {
                    console.error('Error creating claim:', error);
                    toast.error(error.message || 'Failed to submit claim');
                }
                return;
            }

            // Update report status to 'claimed'
            await supabase
                .from('reports')
                .update({ status: 'claimed' })
                .eq('id', id);

            setHasClaimed(true);
            setClaimId(claim.id);
            setShowClaimDialog(false);
            setClaimMessage('');
            toast.success('Claim submitted! You can now chat with the reporter.');

            if (onClaim) onClaim();
        } catch (err) {
            console.error('Error:', err);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <>
            <Card className={cn(
                'overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
                isResolved && 'opacity-75'
            )}>
                {/* Image Section */}
                {images.length > 0 && (
                    <div className="relative aspect-[4/3] bg-muted">
                        <img
                            src={images[imageIndex] || '/placeholder.jpg'}
                            alt={title}
                            className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* Image pagination dots */}
                        {images.length > 1 && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                {images.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setImageIndex(idx)}
                                        className={cn(
                                            'w-1.5 h-1.5 rounded-full transition-all',
                                            idx === imageIndex ? 'bg-white w-3' : 'bg-white/50'
                                        )}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Type badge */}
                        <div className="absolute top-3 left-3">
                            <Badge className={cn(
                                'font-semibold',
                                type === 'lost' ? 'badge-lost' : 'badge-found'
                            )}>
                                {type === 'lost' ? 'Lost' : 'Found'}
                            </Badge>
                        </div>

                        {/* Status badge */}
                        {status !== 'active' && (
                            <div className="absolute top-3 right-3">
                                <Badge variant="secondary" className={cn(
                                    status === 'claimed' && 'badge-claimed',
                                    (status === 'returned_qr' || status === 'returned_direct') && 'badge-returned'
                                )}>
                                    {status === 'claimed' ? 'Claimed' : 'Returned'}
                                </Badge>
                            </div>
                        )}
                    </div>
                )}

                <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">
                                        {registerNumber.slice(0, 2)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{registerNumber}</p>
                                    <p className="text-xs text-muted-foreground">{formatRelativeTime(createdAt)}</p>
                                </div>
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleShare}>
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/report/${id}`}>
                                        <QrCode className="w-4 h-4 mr-2" />
                                        View QR Code
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={onReport} className="text-destructive">
                                    <Flag className="w-4 h-4 mr-2" />
                                    Report
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Content */}
                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">{title}</h3>
                    {description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <Badge variant="outline" className="text-xs">
                            {categoryInfo?.label || category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{reportCode}</span>
                        {location && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {location}
                            </span>
                        )}
                    </div>

                    {/* Actions */}
                    {status === 'active' && !isOwnReport && (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 text-white hover:opacity-90" style={{ background: '#1a5c6b' }}
                                onClick={handleClaimClick}
                                disabled={hasClaimed}
                            >
                                {hasClaimed ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Claimed
                                    </>
                                ) : (
                                    <>
                                        <Hand className="w-4 h-4 mr-2" />
                                        {type === 'lost' ? 'I Found This' : 'This is Mine'}
                                    </>
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onViewMap}
                            >
                                <MapPin className="w-4 h-4" />
                            </Button>
                            {hasClaimed && claimId && (
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={`/chat/${claimId}`}>
                                        <MessageSquare className="w-4 h-4" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Own report - show claim notifications */}
                    {isOwnReport && status === 'active' && (
                        <div className="p-3 rounded-lg bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground">This is your report</p>
                        </div>
                    )}

                    {/* Claimed state - show chat link */}
                    {status === 'claimed' && hasClaimed && claimId && (
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1" variant="outline" asChild>
                                <Link href={`/chat/${claimId}`}>
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Chat with Reporter
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Claim Dialog */}
            <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {type === 'lost' ? '🎉 I Found This Item!' : '🙋 This Is My Item!'}
                        </DialogTitle>
                        <DialogDescription>
                            {type === 'lost'
                                ? `You're claiming you found "${title}". The person who lost it will be notified and you can chat privately to arrange the return.`
                                : `You're claiming "${title}" belongs to you. The finder will be notified and you can chat privately to arrange pickup.`
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">
                                Add a message (optional)
                            </label>
                            <Textarea
                                placeholder={type === 'lost'
                                    ? "e.g., I found it near the library at around 3 PM..."
                                    : "e.g., I can describe the item to prove it's mine..."
                                }
                                value={claimMessage}
                                onChange={(e) => setClaimMessage(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-xs text-muted-foreground">
                                ℹ️ Your register number will be shared with the reporter so they can verify your identity.
                                A private chat will be created between you and the reporter.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowClaimDialog(false)}
                            disabled={isClaiming}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitClaim}
                            disabled={isClaiming}
                            className="text-white hover:opacity-90" style={{ background: '#1a5c6b' }}
                        >
                            {isClaiming ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Hand className="w-4 h-4 mr-2" />
                                    Submit Claim
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
