'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    CheckCircle2, XCircle, Clock, Sparkles, 
    MapPin, Calendar, User, AlertCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { REPORT_CATEGORIES } from '@/lib/utils';

interface Match {
    id: string;
    lost_report_id: string;
    found_report_id: string;
    match_score: number;
    status: 'pending' | 'confirmed' | 'rejected';
    created_at: string;
    lost_report: Report;
    found_report: Report;
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

interface MatchesListProps {
    reportId: string;
    reportType: 'lost' | 'found';
}

export function MatchesList({ reportId, reportType }: MatchesListProps) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMatches();
    }, [reportId]);

    const fetchMatches = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/reports/matches?reportId=${reportId}`);
            
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

    const getMatchedReport = (match: Match) => {
        return reportType === 'lost' ? match.found_report : match.lost_report;
    };

    const getCategoryLabel = (categoryId: string) => {
        return REPORT_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-50';
        if (score >= 60) return 'text-blue-600 bg-blue-50';
        if (score >= 50) return 'text-amber-600 bg-amber-50';
        return 'text-gray-600 bg-gray-50';
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-32 w-full" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (matches.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="font-semibold mb-1">No matches yet</h3>
                    <p className="text-sm text-muted-foreground">
                        We'll notify you when we find potential matches for your item
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Potential Matches ({matches.length})
                </h3>
            </div>

            <div className="space-y-3">
                {matches.map((match) => {
                    const matchedReport = getMatchedReport(match);
                    const statusConfig = {
                        pending: { icon: Clock, label: 'Pending', color: 'bg-amber-100 text-amber-700' },
                        confirmed: { icon: CheckCircle2, label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700' },
                        rejected: { icon: XCircle, label: 'Rejected', color: 'bg-gray-100 text-gray-700' },
                    };
                    const StatusIcon = statusConfig[match.status].icon;

                    return (
                        <Card key={match.id} className="overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex gap-4">
                                    {/* Image */}
                                    <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                                        {matchedReport.images && matchedReport.images.length > 0 ? (
                                            <img 
                                                src={matchedReport.images[0]} 
                                                alt={matchedReport.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                <Sparkles className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm truncate">
                                                    {matchedReport.title}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {getCategoryLabel(matchedReport.category)}
                                                </p>
                                            </div>
                                            <Badge className={`${getScoreColor(match.match_score)} shrink-0 text-xs font-bold`}>
                                                {match.match_score}% match
                                            </Badge>
                                        </div>

                                        {matchedReport.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                                {matchedReport.description}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                                            {matchedReport.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {matchedReport.location}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(matchedReport.created_at), { addSuffix: true })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {matchedReport.register_number}
                                            </span>
                                        </div>

                                        {/* Status and Actions */}
                                        <div className="flex items-center gap-2">
                                            <Badge className={`${statusConfig[match.status].color} text-xs`}>
                                                <StatusIcon className="w-3 h-3 mr-1" />
                                                {statusConfig[match.status].label}
                                            </Badge>

                                            {match.status === 'pending' && (
                                                <div className="flex gap-2 ml-auto">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleMatchAction(match.id, 'rejected')}
                                                        className="h-7 text-xs"
                                                    >
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Not a match
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleMatchAction(match.id, 'confirmed')}
                                                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    >
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        Confirm
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
