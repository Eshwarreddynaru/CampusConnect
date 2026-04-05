'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FeedCard } from '@/components/feed/FeedCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { REPORT_CATEGORIES } from '@/lib/utils';
import {
    Search, SlidersHorizontal, X, Plus, AlertCircle, RefreshCw,
    ArrowUpDown, Calendar, MapPin, Sparkles, Filter, Tag
} from 'lucide-react';
import Link from 'next/link';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

interface Report {
    id: string;
    type: 'lost' | 'found';
    title: string;
    description: string | null;
    category: string;
    report_code: string;
    register_number: string;
    images: string[];
    location: string | null;
    status: 'active' | 'claimed' | 'returned_qr' | 'returned_direct';
    created_at: string;
    user_id: string;
}

type SortOption = 'newest' | 'oldest' | 'relevant';
type DateRange = 'all' | 'today' | 'week' | 'month';
type StatusFilter = 'all' | 'active' | 'claimed' | 'returned';

/** Score how well a report matches the search query (higher = better match) */
function getRelevanceScore(report: Report, query: string): number {
    if (!query.trim()) return 0;

    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
    let totalScore = 0;

    const categoryInfo = REPORT_CATEGORIES.find(c => c.id === report.category);
    const categoryLabel = categoryInfo?.label?.toLowerCase() || '';

    for (const keyword of keywords) {
        let wordScore = 0;

        // Title match (highest weight)
        if (report.title.toLowerCase().includes(keyword)) {
            wordScore += 10;
            // Bonus for exact start match
            if (report.title.toLowerCase().startsWith(keyword)) wordScore += 5;
        }

        // Category label match (high weight — helps "phone", "wallet", etc.)
        if (categoryLabel.includes(keyword)) wordScore += 8;

        // Category ID match
        if (report.category.toLowerCase().includes(keyword)) wordScore += 6;

        // Description match
        if (report.description?.toLowerCase().includes(keyword)) wordScore += 4;

        // Location match
        if (report.location?.toLowerCase().includes(keyword)) wordScore += 5;

        // Report code match (exact-ish)
        if (report.report_code.toLowerCase().includes(keyword)) wordScore += 7;

        // Register number match
        if (report.register_number.toLowerCase().includes(keyword)) wordScore += 3;

        totalScore += wordScore;
    }

    return totalScore;
}

/** Get matched field names for display */
function getMatchedFields(report: Report, query: string): string[] {
    if (!query.trim()) return [];

    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matched = new Set<string>();

    const categoryInfo = REPORT_CATEGORIES.find(c => c.id === report.category);
    const categoryLabel = categoryInfo?.label?.toLowerCase() || '';

    for (const keyword of keywords) {
        if (report.title.toLowerCase().includes(keyword)) matched.add('title');
        if (categoryLabel.includes(keyword) || report.category.toLowerCase().includes(keyword)) matched.add('category');
        if (report.description?.toLowerCase().includes(keyword)) matched.add('description');
        if (report.location?.toLowerCase().includes(keyword)) matched.add('location');
        if (report.report_code.toLowerCase().includes(keyword)) matched.add('code');
        if (report.register_number.toLowerCase().includes(keyword)) matched.add('register');
    }

    return Array.from(matched);
}

/** Check if a date falls within the specified range */
function isWithinDateRange(dateStr: string, range: DateRange): boolean {
    if (range === 'all') return true;

    const date = new Date(dateStr);
    const now = new Date();

    switch (range) {
        case 'today': {
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return date >= todayStart;
        }
        case 'week': {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return date >= weekAgo;
        }
        case 'month': {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return date >= monthAgo;
        }
        default:
            return true;
    }
}

export default function FeedPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedType, setSelectedType] = useState<'all' | 'lost' | 'found'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
    const [dateRange, setDateRange] = useState<DateRange>('all');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Debounce the search query for performance
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Auto-switch to relevance sort when user types a query
    useEffect(() => {
        if (debouncedQuery.trim()) {
            setSortBy('relevant');
        } else if (sortBy === 'relevant') {
            setSortBy('newest');
        }
    }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const supabase = createClient();

            // Get user first
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }

            // Fetch reports directly from Supabase (fallback to original method)
            const { data: reportsData, error: reportsError } = await supabase
                .from('reports')
                .select('id, type, title, description, category, report_code, register_number, images, location, status, created_at, user_id')
                .order('created_at', { ascending: false });

            if (reportsError) {
                console.error('Error fetching reports:', reportsError);
                setFetchError(reportsError.message || 'Could not connect to the database.');
                return;
            }

            setReports(reportsData || []);
            setFetchError(null);
        } catch (error) {
            console.error('Error:', error);
            setFetchError('Could not connect to the server. Please check your internet connection.');
        } finally {
            setIsLoading(false);
        }
    };

    /** Core filtering + sorting logic using memoization */
    const { filteredReports, matchInfo } = useMemo(() => {
        const matchInfoMap = new Map<string, { score: number; fields: string[] }>();

        const filtered = reports.filter(report => {
            // --- Keyword search ---
            const score = debouncedQuery.trim()
                ? getRelevanceScore(report, debouncedQuery)
                : 1; // every item "matches" with score 1 when there's no query

            if (debouncedQuery.trim() && score === 0) return false;

            // Store match info for display
            if (debouncedQuery.trim()) {
                matchInfoMap.set(report.id, {
                    score,
                    fields: getMatchedFields(report, debouncedQuery),
                });
            }

            // --- Type filter ---
            if (selectedType !== 'all' && report.type !== selectedType) return false;

            // --- Category filter ---
            if (selectedCategory && report.category !== selectedCategory) return false;

            // --- Status filter ---
            if (selectedStatus !== 'all') {
                if (selectedStatus === 'returned') {
                    if (report.status !== 'returned_qr' && report.status !== 'returned_direct') return false;
                } else if (report.status !== selectedStatus) {
                    return false;
                }
            }

            // --- Date range filter ---
            if (!isWithinDateRange(report.created_at, dateRange)) return false;

            return true;
        });

        // --- Sorting ---
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'relevant': {
                    const scoreA = matchInfoMap.get(a.id)?.score || 0;
                    const scoreB = matchInfoMap.get(b.id)?.score || 0;
                    if (scoreB !== scoreA) return scoreB - scoreA;
                    // Fall through to newest for equal scores
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
                case 'oldest':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'newest':
                default:
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });

        return { filteredReports: filtered, matchInfo: matchInfoMap };
    }, [reports, debouncedQuery, selectedType, selectedCategory, selectedStatus, dateRange, sortBy]);

    const clearFilters = useCallback(() => {
        setSelectedType('all');
        setSelectedCategory(null);
        setSelectedStatus('all');
        setDateRange('all');
        setSearchQuery('');
        setSortBy('newest');
    }, []);

    const hasFilters = selectedType !== 'all' || selectedCategory || searchQuery || selectedStatus !== 'all' || dateRange !== 'all';
    const activeFilterCount = [
        selectedType !== 'all',
        selectedCategory !== null,
        selectedStatus !== 'all',
        dateRange !== 'all',
    ].filter(Boolean).length;

    const lostCount = reports.filter(r => r.type === 'lost' && r.status === 'active').length;
    const foundCount = reports.filter(r => r.type === 'found' && r.status === 'active').length;

    const dateRangeLabels: Record<DateRange, string> = {
        all: 'All Time',
        today: 'Today',
        week: 'This Week',
        month: 'This Month',
    };

    const statusLabels: Record<StatusFilter, string> = {
        all: 'All',
        active: 'Active',
        claimed: 'Claimed',
        returned: 'Returned',
    };

    const sortLabels: Record<SortOption, string> = {
        newest: 'Newest First',
        oldest: 'Oldest First',
        relevant: 'Most Relevant',
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-lg font-bold text-gray-800">Lost & Found Feed</h1>
                    <p className="text-xs text-gray-500">Kalasalingam University</p>
                </div>
                <div className="flex gap-2">
                    <div className="text-center px-3 py-1.5 rounded-md bg-red-50 border border-red-200">
                        <p className="text-base font-bold text-red-600">{lostCount}</p>
                        <p className="text-[10px] text-red-500">Lost</p>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200">
                        <p className="text-base font-bold text-emerald-600">{foundCount}</p>
                        <p className="text-[10px] text-emerald-500">Found</p>
                    </div>
                </div>
            </div>

            {/* ========== Search Bar + Filter Button ========== */}
            <div className="sticky top-14 md:top-0 z-30 bg-background/80 backdrop-blur-lg pb-4 -mx-4 px-4">
                <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            id="search-input"
                            placeholder="Search by name, category, location, code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-10 transition-shadow focus:shadow-md"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <SheetTrigger asChild>
                            <Button
                                id="filter-button"
                                variant="outline"
                                size="icon"
                                className="shrink-0 relative"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: '#1a5c6b' }}>
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="overflow-y-auto">
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    Filters & Sort
                                </SheetTitle>
                            </SheetHeader>
                            <div className="mt-6 space-y-6">
                                {/* Sort By */}
                                <div>
                                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <ArrowUpDown className="w-3.5 h-3.5" />
                                        Sort By
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {(['newest', 'oldest', 'relevant'] as SortOption[]).map((opt) => (
                                            <Badge
                                                key={opt}
                                                variant={sortBy === opt ? 'default' : 'outline'}
                                                className={`cursor-pointer transition-all ${sortBy === opt ? 'shadow-sm' : 'hover:bg-muted'}`}
                                                onClick={() => setSortBy(opt)}
                                            >
                                                {sortLabels[opt]}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Type Filter */}
                                <div>
                                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Tag className="w-3.5 h-3.5" />
                                        Type
                                    </p>
                                    <div className="flex gap-2">
                                        {(['all', 'lost', 'found'] as const).map((type) => (
                                            <Badge
                                                key={type}
                                                variant={selectedType === type ? 'default' : 'outline'}
                                                className={`cursor-pointer capitalize transition-all ${selectedType === type ? 'shadow-sm' : 'hover:bg-muted'}`}
                                                onClick={() => setSelectedType(type)}
                                            >
                                                {type === 'all' ? 'All' : type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Category Filter */}
                                <div>
                                    <p className="text-sm font-medium mb-3">Category</p>
                                    <div className="flex flex-wrap gap-2">
                                        {REPORT_CATEGORIES.map((cat) => (
                                            <Badge
                                                key={cat.id}
                                                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                                                className={`cursor-pointer transition-all ${selectedCategory === cat.id ? 'shadow-sm' : 'hover:bg-muted'}`}
                                                onClick={() => setSelectedCategory(
                                                    selectedCategory === cat.id ? null : cat.id
                                                )}
                                            >
                                                {cat.label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Status
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {(['all', 'active', 'claimed', 'returned'] as StatusFilter[]).map((s) => (
                                            <Badge
                                                key={s}
                                                variant={selectedStatus === s ? 'default' : 'outline'}
                                                className={`cursor-pointer capitalize transition-all ${selectedStatus === s ? 'shadow-sm' : 'hover:bg-muted'}`}
                                                onClick={() => setSelectedStatus(s)}
                                            >
                                                {statusLabels[s]}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div>
                                    <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Posted Within
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {(['all', 'today', 'week', 'month'] as DateRange[]).map((d) => (
                                            <Badge
                                                key={d}
                                                variant={dateRange === d ? 'default' : 'outline'}
                                                className={`cursor-pointer transition-all ${dateRange === d ? 'shadow-sm' : 'hover:bg-muted'}`}
                                                onClick={() => setDateRange(d)}
                                            >
                                                {dateRangeLabels[d]}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="pt-2 space-y-2">
                                    {hasFilters && (
                                        <Button variant="outline" onClick={clearFilters} className="w-full">
                                            <X className="w-3.5 h-3.5 mr-2" />
                                            Clear All Filters
                                        </Button>
                                    )}
                                    <Button
                                        className="w-full text-white"
                                        style={{ background: '#1a5c6b' }}
                                        onClick={() => setIsFilterOpen(false)}
                                    >
                                        Show {filteredReports.length} {filteredReports.length === 1 ? 'Result' : 'Results'}
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                {/* Quick type filter chips */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {(['all', 'lost', 'found'] as const).map((type) => (
                        <Badge
                            key={type}
                            variant={selectedType === type ? 'default' : 'outline'}
                            className={`cursor-pointer capitalize shrink-0 transition-all ${selectedType === type ? 'text-white border-0 shadow-sm' : ''
                                }`}
                            onClick={() => setSelectedType(type)}
                        >
                            {type === 'all' ? 'All Items' : type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                        </Badge>
                    ))}
                    {/* Quick category chips (scrollable) */}
                    <div className="w-px h-5 bg-border my-auto shrink-0 mx-1" />
                    {REPORT_CATEGORIES.slice(0, 4).map((cat) => (
                        <Badge
                            key={cat.id}
                            variant={selectedCategory === cat.id ? 'default' : 'outline'}
                            className={`cursor-pointer shrink-0 transition-all text-xs ${selectedCategory === cat.id ? 'text-white border-0 shadow-sm' : ''
                                }`}
                            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                        >
                            {cat.label}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* ========== Active Filter Chips ========== */}
            {hasFilters && (
                <div className="mb-4 flex flex-wrap items-center gap-2 animate-fade-in">
                    <span className="text-xs text-muted-foreground font-medium">Active:</span>
                    {searchQuery && (
                        <Badge variant="secondary" className="gap-1 text-xs pl-2 pr-1 py-0.5">
                            <Search className="w-3 h-3" />
                            &quot;{searchQuery}&quot;
                            <button onClick={() => setSearchQuery('')} className="ml-1 hover:bg-muted rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    )}
                    {selectedType !== 'all' && (
                        <Badge variant="secondary" className="gap-1 text-xs pl-2 pr-1 py-0.5 capitalize">
                            {selectedType === 'lost' ? '🔴' : '🟢'} {selectedType}
                            <button onClick={() => setSelectedType('all')} className="ml-1 hover:bg-muted rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    )}
                    {selectedCategory && (
                        <Badge variant="secondary" className="gap-1 text-xs pl-2 pr-1 py-0.5">
                            {REPORT_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                            <button onClick={() => setSelectedCategory(null)} className="ml-1 hover:bg-muted rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    )}
                    {selectedStatus !== 'all' && (
                        <Badge variant="secondary" className="gap-1 text-xs pl-2 pr-1 py-0.5 capitalize">
                            <Sparkles className="w-3 h-3" /> {selectedStatus}
                            <button onClick={() => setSelectedStatus('all')} className="ml-1 hover:bg-muted rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    )}
                    {dateRange !== 'all' && (
                        <Badge variant="secondary" className="gap-1 text-xs pl-2 pr-1 py-0.5">
                            <Calendar className="w-3 h-3" /> {dateRangeLabels[dateRange]}
                            <button onClick={() => setDateRange('all')} className="ml-1 hover:bg-muted rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    )}
                    <button
                        onClick={clearFilters}
                        className="text-xs text-primary hover:underline ml-auto"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* ========== Results count + sort info ========== */}
            <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                    {filteredReports.length} {filteredReports.length === 1 ? 'item' : 'items'} found
                    {debouncedQuery && (
                        <span className="ml-1">
                            for &quot;<span className="font-medium text-foreground">{debouncedQuery}</span>&quot;
                        </span>
                    )}
                </span>
                {filteredReports.length > 1 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowUpDown className="w-3 h-3" />
                        {sortLabels[sortBy]}
                    </span>
                )}
            </div>

            {/* Connection Error Banner */}
            {fetchError && (
                <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">Unable to load reports</p>
                        <p className="text-xs text-muted-foreground mt-1">{fetchError}</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchReports}
                        className="shrink-0"
                    >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry
                    </Button>
                </div>
            )}

            {/* ========== Feed ========== */}
            <div className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-xl border bg-card overflow-hidden">
                            <Skeleton className="aspect-[4/3]" />
                            <div className="p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-9 flex-1" />
                                    <Skeleton className="h-9 w-9" />
                                    <Skeleton className="h-9 w-9" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : filteredReports.length > 0 ? (
                    filteredReports.map((report) => {
                        const info = matchInfo.get(report.id);
                        return (
                            <div key={report.id} className="animate-fade-in">
                                {/* Match indicator — shown when search has results */}
                                {debouncedQuery && info && info.fields.length > 0 && (
                                    <div className="flex items-center gap-1.5 mb-1.5 ml-1">
                                        <Sparkles className="w-3 h-3 text-amber-500" />
                                        <span className="text-[11px] text-muted-foreground">
                                            Matched in{' '}
                                            {info.fields.map((f, i) => (
                                                <span key={f}>
                                                    {i > 0 && (i === info.fields.length - 1 ? ' & ' : ', ')}
                                                    <span className="font-medium text-foreground">{f}</span>
                                                </span>
                                            ))}
                                        </span>
                                    </div>
                                )}
                                <FeedCard
                                    id={report.id}
                                    type={report.type}
                                    title={report.title}
                                    description={report.description || ''}
                                    category={report.category}
                                    reportCode={report.report_code}
                                    registerNumber={report.register_number}
                                    images={report.images || []}
                                    location={report.location || ''}
                                    status={report.status}
                                    createdAt={report.created_at}
                                    userId={report.user_id}
                                    currentUserId={currentUserId || undefined}
                                    onClaim={() => fetchReports()}
                                    onViewMap={() => console.log('View on map', report.id)}
                                    onReport={() => console.log('Report', report.id)}
                                />
                            </div>
                        );
                    })
                ) : (
                    // Empty state
                    <div className="text-center py-12 animate-fade-in">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-1">
                            {searchQuery || hasFilters ? 'No matching items' : 'No reports yet'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                            {searchQuery
                                ? `No results for "${searchQuery}". Try different keywords or check your spelling.`
                                : hasFilters
                                    ? 'No reports match your current filters. Try adjusting or clearing them.'
                                    : 'Be the first to report a lost or found item!'}
                        </p>
                        {hasFilters ? (
                            <Button variant="outline" onClick={clearFilters}>
                                <X className="w-4 h-4 mr-2" />
                                Clear Filters
                            </Button>
                        ) : (
                            <Link href="/create">
                                <Button className="text-white" style={{ background: '#1a5c6b' }}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Report
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

