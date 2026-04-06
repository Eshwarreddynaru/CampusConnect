'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { REPORT_CATEGORIES } from '@/lib/utils';
import { 
    CheckCircle2, XCircle, Clock, Sparkles, 
    MapPin, Calendar, User, AlertCircle, ArrowLeft,
    Eye, MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Match {
    id: string;
    lost_report_id: string;
    found_report_id: string;
    match_score: number;
    status: 'pending' | 'confirmed' | 'rejected';
    created_at: string;
    lost_report: Report | null;
    found_report: Report | null;
}

interface Report {
    id: string;
    type: 'lost' | 'found';
    title: string;
    description: string | null;
    category: string;
    images: string[];
    location: string | null;
    created_at: string;
    user_id: string;
    register_number: string;
}

export default function MyMatchesPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                setError('Please log in to view your matches');
                return;
            }
            
            setCurrentUserId(user.id);

            const response = await fetch(`/api/reports/matches?userId=${user.id}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch matches');
            }

            const data = await response.json();
            setMatches(data.matches || []);
        } catch (err) {
            console.error('Error fetching matches:', err);
            setError('Failed to load matches');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMatchAction = async (matchId: string, status: 'confirmed' | 'rejected') => {
        try {
            const response = await fetch('/api/reports/matches', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId, status }),
            });

            if (!response.ok) {
                throw new Error('Failed to update match');
            }

            // Refresh matches
            fetchMatches();
        } catch (err) {
            console.error('Error updating match:', err);
        }
    };

    const getCategoryLabel = (categoryId: string) => {
        return REPORT_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return 'Strong Match';
        if (score >= 60) return 'Good Match';
        if (score >= 40) return 'Possible Match';
        return 'Weak Match';
    };

    const filteredMatches = filter === 'all' 
        ? matches 
        : matches.filter(m => m.status === filter);

    const pendingCount = matches.filter(m => m.status === 'pending').length;
    const confirmedCount = matches.filter(m => m.status === 'confirmed').length;

    // Determine which report belongs to the other user
    const getOtherReport = (match: Match): Report | null => {
        if (!currentUserId) return null;
        if (match.lost_report?.user_id === currentUserId) return match.found_report;
        if (match.found_report?.user_id === currentUserId) return match.lost_report;
        return match.found_report; // fallback
    };

    const getMyReport = (match: Match): Report | null => {
        if (!currentUserId) return null;
        if (match.lost_report?.user_id === currentUserId) return match.lost_report;
        if (match.found_report?.user_id === currentUserId) return match.found_report;
        return match.lost_report; // fallback
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
            {/* Header */}
            <div className="mb-6">
                <Link href="/feed" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Feed</span>
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#1a5c6b]" />
                            My Matches
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Items matched between lost & found reports
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {pendingCount > 0 && (
                            <div className="text-center px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200">
                                <p className="text-base font-bold text-amber-600">{pendingCount}</p>
                                <p className="text-[10px] text-amber-500">Pending</p>
                            </div>
                        )}
                        {confirmedCount > 0 && (
                            <div className="text-center px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200">
                                <p className="text-base font-bold text-emerald-600">{confirmedCount}</p>
                                <p className="text-[10px] text-emerald-500">Confirmed</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
                {(['all', 'pending', 'confirmed', 'rejected'] as const).map((f) => (
                    <Badge
                        key={f}
                        variant={filter === f ? 'default' : 'outline'}
                        className={`cursor-pointer capitalize shrink-0 transition-all ${
                            filter === f ? 'text-white border-0 shadow-sm' : 'hover:bg-muted'
                        }`}
                        style={filter === f ? { background: '#1a5c6b' } : {}}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? `All (${matches.length})` : 
                         f === 'pending' ? `⏳ Pending (${matches.filter(m => m.status === 'pending').length})` :
                         f === 'confirmed' ? `✅ Confirmed (${confirmedCount})` :
                         `❌ Rejected (${matches.filter(m => m.status === 'rejected').length})`}
                    </Badge>
                ))}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-48 w-full rounded-xl" />
                    ))}
                </div>
            ) : error ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <Button variant="outline" onClick={fetchMatches} className="mt-4">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            ) : filteredMatches.length === 0 ? (
                <Card>
                    <CardContent className="p-10 text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1a5c6b]/10 to-[#1a5c6b]/5 flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-[#1a5c6b]/40" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">
                            {filter === 'all' ? 'No matches yet' : `No ${filter} matches`}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {filter === 'all' 
                                ? 'When you report a lost or found item and it matches with another report, it will appear here. Both users will be able to see the matched post.'
                                : `You don't have any ${filter} matches right now.`}
                        </p>
                        <Link href="/create">
                            <Button className="mt-4 text-white" style={{ background: '#1a5c6b' }}>
                                Create a Report
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredMatches.map((match) => {
                        const otherReport = getOtherReport(match);
                        const myReport = getMyReport(match);
                        
                        if (!otherReport || !myReport) return null;
                        
                        const statusConfig = {
                            pending: { icon: Clock, label: 'Pending Review', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                            confirmed: { icon: CheckCircle2, label: 'Confirmed Match', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                            rejected: { icon: XCircle, label: 'Not a Match', color: 'bg-gray-100 text-gray-500 border-gray-200' },
                        };
                        const StatusIcon = statusConfig[match.status].icon;

                        return (
                            <Card key={match.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-0">
                                    {/* Match header */}
                                    <div className="px-4 py-3 bg-gradient-to-r from-[#1a5c6b]/5 to-transparent border-b flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge className={`${getScoreColor(match.match_score)} text-xs font-bold border`}>
                                                {match.match_score}% — {getScoreLabel(match.match_score)}
                                            </Badge>
                                            <Badge className={`${statusConfig[match.status].color} text-xs border`}>
                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                {statusConfig[match.status].label}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(match.created_at), { addSuffix: true })}
                                        </span>
                                    </div>

                                    {/* Two reports side by side */}
                                    <div className="grid grid-cols-2 divide-x">
                                        {/* My Report */}
                                        <div className="p-4">
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                                                Your {myReport.type === 'lost' ? '🔴 Lost' : '🟢 Found'} Report
                                            </p>
                                            {myReport.images && myReport.images.length > 0 && (
                                                <div className="w-full h-20 rounded-lg bg-muted overflow-hidden mb-2">
                                                    <img 
                                                        src={myReport.images[0]} 
                                                        alt={myReport.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <h4 className="font-semibold text-sm truncate">{myReport.title}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {getCategoryLabel(myReport.category)}
                                            </p>
                                            {myReport.location && (
                                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {myReport.location}
                                                </p>
                                            )}
                                        </div>

                                        {/* Matched Report (other user) */}
                                        <div className="p-4">
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                                                Matched {otherReport.type === 'lost' ? '🔴 Lost' : '🟢 Found'} Report
                                            </p>
                                            {otherReport.images && otherReport.images.length > 0 && (
                                                <div className="w-full h-20 rounded-lg bg-muted overflow-hidden mb-2">
                                                    <img 
                                                        src={otherReport.images[0]} 
                                                        alt={otherReport.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <h4 className="font-semibold text-sm truncate">{otherReport.title}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {getCategoryLabel(otherReport.category)}
                                            </p>
                                            {otherReport.location && (
                                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {otherReport.location}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {otherReport.register_number}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {match.status === 'pending' && (
                                        <div className="px-4 py-3 border-t bg-gray-50/50 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleMatchAction(match.id, 'rejected')}
                                                className="flex-1 h-8 text-xs"
                                            >
                                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                                Not a Match
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleMatchAction(match.id, 'confirmed')}
                                                className="flex-1 h-8 text-xs text-white"
                                                style={{ background: '#1a5c6b' }}
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                                Confirm Match
                                            </Button>
                                        </div>
                                    )}

                                    {match.status === 'confirmed' && (
                                        <div className="px-4 py-3 border-t bg-emerald-50/50">
                                            <p className="text-xs text-emerald-700 text-center font-medium">
                                                ✅ Match confirmed! You can now coordinate with {otherReport.register_number} to return this item.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
