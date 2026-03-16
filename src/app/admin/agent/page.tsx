'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
    findAllMatches,
    findStaleReports,
    findDuplicates,
    generateInsights,
    buildAgentActions,
    DEFAULT_AGENT_CONFIG,
    type Report,
    type MatchResult,
    type AgentAction,
    type AgentInsight,
    type AgentConfig,
    type Claim,
} from '@/lib/admin-agent';
import {
    Bot,
    Sparkles,
    Zap,
    Target,
    AlertTriangle,
    Archive,
    Copy,
    TrendingUp,
    MapPin,
    Lightbulb,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    Settings,
    Eye,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    Activity,
    Shield,
    Brain,
    Loader2,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminAgentPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [matches, setMatches] = useState<MatchResult[]>([]);
    const [actions, setActions] = useState<AgentAction[]>([]);
    const [insights, setInsights] = useState<AgentInsight[]>([]);
    const [staleReports, setStaleReports] = useState<Report[]>([]);
    const [config, setConfig] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG);
    const [isLoading, setIsLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [lastRunAt, setLastRunAt] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

    const runAgent = useCallback(async (reportData?: Report[], claimData?: Claim[]) => {
        setIsRunning(true);
        try {
            const r = reportData || reports;
            const c = claimData || claims;

            // 1. Find matches
            const foundMatches = config.autoMatchEnabled ? findAllMatches(r, config.matchThreshold) : [];
            setMatches(foundMatches);

            // 2. Find stale reports
            const stale = findStaleReports(r, config.autoArchiveDays);
            setStaleReports(stale);

            // 3. Find duplicates
            const dups = config.duplicateDetection ? findDuplicates(r) : [];

            // 4. Build actions
            const agentActions = buildAgentActions(foundMatches, stale, dups);
            setActions(agentActions);

            // 5. Generate insights
            const agentInsights = generateInsights(r, c);
            setInsights(agentInsights);

            setLastRunAt(new Date().toISOString());
        } finally {
            setIsRunning(false);
        }
    }, [reports, claims, config]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            const [reportsRes, claimsRes] = await Promise.all([
                supabase.from('reports').select('*').order('created_at', { ascending: false }),
                supabase.from('claims').select('id, report_id, claimer_id, status, created_at').order('created_at', { ascending: false }),
            ]);

            const reportData = (reportsRes.data || []) as Report[];
            const claimData = (claimsRes.data || []) as Claim[];
            setReports(reportData);
            setClaims(claimData);

            // Auto-run agent after fetching data
            await runAgent(reportData, claimData);
        } catch (error) {
            console.error('Error fetching data for agent:', error);
        } finally {
            setIsLoading(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleActionDismiss = (actionId: string) => {
        setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: 'dismissed' as const } : a));
    };

    const handleActionApply = (actionId: string) => {
        setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: 'applied' as const } : a));
    };

    const pendingActions = actions.filter(a => a.status === 'pending');
    const resolvedActions = actions.filter(a => a.status !== 'pending');

    const getConfidenceColor = (confidence: string) => {
        switch (confidence) {
            case 'high': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'low': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'match_found': return <Target className="w-4 h-4 text-emerald-600" />;
            case 'stale_archived': return <Archive className="w-4 h-4 text-amber-600" />;
            case 'duplicate_flagged': return <Copy className="w-4 h-4 text-red-500" />;
            case 'insight_generated': return <Lightbulb className="w-4 h-4 text-blue-500" />;
            default: return <Zap className="w-4 h-4 text-gray-500" />;
        }
    };

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'trend': return <TrendingUp className="w-4 h-4" />;
            case 'hotspot': return <MapPin className="w-4 h-4" />;
            case 'warning': return <AlertTriangle className="w-4 h-4" />;
            case 'suggestion': return <Lightbulb className="w-4 h-4" />;
            default: return <Sparkles className="w-4 h-4" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'border-l-red-500';
            case 'medium': return 'border-l-amber-500';
            case 'low': return 'border-l-blue-500';
            default: return 'border-l-gray-300';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6">
                    <div className="flex items-center gap-3">
                        <Bot className="w-7 h-7" />
                        <div>
                            <h1 className="text-xl font-bold">Admin Agent</h1>
                            <p className="text-violet-200 text-sm">Loading intelligence...</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ========== Header ========== */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Admin Agent</h1>
                            <p className="text-violet-200 text-sm">Automated intelligence for Lost &amp; Found</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white/20 hover:bg-white/30 text-white border-0"
                            onClick={() => setShowConfig(!showConfig)}
                        >
                            <Settings className="w-4 h-4 mr-1" />
                            Config
                        </Button>
                        <Button
                            size="sm"
                            className="bg-white text-violet-700 hover:bg-violet-50"
                            onClick={() => runAgent()}
                            disabled={isRunning}
                        >
                            {isRunning ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-1" />
                            )}
                            {isRunning ? 'Running...' : 'Run Agent'}
                        </Button>
                    </div>
                </div>

                {/* Status bar */}
                <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                        <span className="text-violet-100">{isRunning ? 'Analyzing...' : 'Ready'}</span>
                    </div>
                    {lastRunAt && (
                        <span className="text-violet-200">
                            Last run: {new Date(lastRunAt).toLocaleTimeString()}
                        </span>
                    )}
                    <span className="text-violet-200">
                        {reports.length} reports scanned
                    </span>
                </div>
            </div>

            {/* ========== Config Panel ========== */}
            {showConfig && (
                <div className="bg-white border-b border-gray-200 p-6 animate-slide-up">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Agent Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <div>
                                <p className="text-sm font-medium">Auto-Match Engine</p>
                                <p className="text-xs text-gray-500">Automatically find matching lost &amp; found items</p>
                            </div>
                            <Switch
                                checked={config.autoMatchEnabled}
                                onCheckedChange={(v: boolean) => setConfig(prev => ({ ...prev, autoMatchEnabled: v }))}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <div>
                                <p className="text-sm font-medium">Duplicate Detection</p>
                                <p className="text-xs text-gray-500">Flag similar-looking reports</p>
                            </div>
                            <Switch
                                checked={config.duplicateDetection}
                                onCheckedChange={(v: boolean) => setConfig(prev => ({ ...prev, duplicateDetection: v }))}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <div>
                                <p className="text-sm font-medium">Stale Report Threshold</p>
                                <p className="text-xs text-gray-500">Archive reports older than X days</p>
                            </div>
                            <select
                                className="text-sm border rounded-md px-2 py-1"
                                value={config.autoArchiveDays}
                                onChange={(e) => setConfig(prev => ({ ...prev, autoArchiveDays: Number(e.target.value) }))}
                            >
                                <option value={7}>7 days</option>
                                <option value={14}>14 days</option>
                                <option value={30}>30 days</option>
                                <option value={60}>60 days</option>
                                <option value={90}>90 days</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <div>
                                <p className="text-sm font-medium">Match Threshold</p>
                                <p className="text-xs text-gray-500">Minimum score to show matches (0-100)</p>
                            </div>
                            <select
                                className="text-sm border rounded-md px-2 py-1"
                                value={config.matchThreshold}
                                onChange={(e) => setConfig(prev => ({ ...prev, matchThreshold: Number(e.target.value) }))}
                            >
                                <option value={20}>20% (Show more)</option>
                                <option value={40}>40% (Balanced)</option>
                                <option value={60}>60% (Only strong)</option>
                                <option value={80}>80% (Very strict)</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <Button
                            size="sm"
                            className="bg-violet-600 text-white hover:bg-violet-700"
                            onClick={() => { runAgent(); setShowConfig(false); }}
                        >
                            <Zap className="w-3.5 h-3.5 mr-1" />
                            Apply &amp; Re-run
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowConfig(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            )}

            <div className="p-6 space-y-6">
                {/* ========== Quick Stats ========== */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Target className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-emerald-600">{matches.length}</div>
                            <p className="text-xs text-gray-500">Matches Found</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Archive className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-amber-600">{staleReports.length}</div>
                            <p className="text-xs text-gray-500">Stale Reports</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Activity className="w-6 h-6 text-violet-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-violet-600">{pendingActions.length}</div>
                            <p className="text-xs text-gray-500">Pending Actions</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Brain className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-600">{insights.length}</div>
                            <p className="text-xs text-gray-500">Insights</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ========== Smart Insights ========== */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        <h2 className="font-semibold">Smart Insights</h2>
                        <Badge className="bg-white/20 text-white ml-auto">{insights.length}</Badge>
                    </div>
                    {insights.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {insights.map((insight) => (
                                <div key={insight.id} className={`p-4 border-l-4 ${getPriorityColor(insight.priority)} flex items-start gap-3`}>
                                    <div className="text-lg mt-0.5">{insight.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-sm font-semibold text-gray-800">{insight.title}</h4>
                                            <Badge variant="outline" className="text-[10px] capitalize">
                                                {insight.priority}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-gray-500">{insight.description}</p>
                                    </div>
                                    {getInsightIcon(insight.type)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <Brain className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No insights yet. Run the agent to generate.</p>
                        </div>
                    )}
                </div>

                {/* ========== Auto-Matches ========== */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        <h2 className="font-semibold">Auto-Matched Items</h2>
                        <Badge className="bg-white/20 text-white ml-auto">{matches.length}</Badge>
                    </div>
                    {matches.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {matches.map((match, idx) => {
                                const matchKey = `${match.lostReport.id}-${match.foundReport.id}`;
                                const isExpanded = expandedMatch === matchKey;
                                return (
                                    <div key={idx} className="p-4">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer"
                                            onClick={() => setExpandedMatch(isExpanded ? null : matchKey)}
                                        >
                                            <div className={`px-2 py-1 rounded-md text-xs font-bold border ${getConfidenceColor(match.confidence)}`}>
                                                {match.score}%
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-medium text-red-600 truncate">🔴 {match.lostReport.title}</span>
                                                    <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                                                    <span className="font-medium text-emerald-600 truncate">🟢 {match.foundReport.title}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Confidence: <span className="capitalize font-medium">{match.confidence}</span>
                                                </p>
                                            </div>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-3 ml-12 p-3 rounded-lg bg-gray-50 animate-fade-in">
                                                <p className="text-xs font-semibold text-gray-700 mb-2">Why these match:</p>
                                                <ul className="space-y-1">
                                                    {match.matchReasons.map((reason, i) => (
                                                        <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                            {reason}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                                    <div className="p-2 rounded bg-red-50 border border-red-100">
                                                        <p className="font-semibold text-red-700 mb-1">Lost Item</p>
                                                        <p className="text-gray-600">Code: {match.lostReport.report_code}</p>
                                                        <p className="text-gray-600">By: {match.lostReport.register_number}</p>
                                                        {match.lostReport.location && <p className="text-gray-600">📍 {match.lostReport.location}</p>}
                                                    </div>
                                                    <div className="p-2 rounded bg-emerald-50 border border-emerald-100">
                                                        <p className="font-semibold text-emerald-700 mb-1">Found Item</p>
                                                        <p className="text-gray-600">Code: {match.foundReport.report_code}</p>
                                                        <p className="text-gray-600">By: {match.foundReport.register_number}</p>
                                                        {match.foundReport.location && <p className="text-gray-600">📍 {match.foundReport.location}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No matches found. The agent will keep looking as new reports come in.</p>
                        </div>
                    )}
                </div>

                {/* ========== Agent Actions (Pending) ========== */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <h2 className="font-semibold">Pending Agent Actions</h2>
                        <Badge className="bg-white/20 text-white ml-auto">{pendingActions.length}</Badge>
                    </div>
                    {pendingActions.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {pendingActions.map((action) => (
                                <div key={action.id} className="p-4 flex items-start gap-3">
                                    <div className="mt-0.5">{getActionIcon(action.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-gray-800">{action.title}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                            onClick={() => handleActionApply(action.id)}
                                        >
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Apply
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2 text-xs text-gray-400 hover:text-red-500"
                                            onClick={() => handleActionDismiss(action.id)}
                                        >
                                            <XCircle className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-300" />
                            <p className="text-sm">All caught up! No pending actions.</p>
                        </div>
                    )}
                </div>

                {/* ========== Resolved Actions Log ========== */}
                {resolvedActions.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-gray-600 text-white px-4 py-3 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <h2 className="font-semibold">Action History</h2>
                            <Badge className="bg-white/20 text-white ml-auto">{resolvedActions.length}</Badge>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {resolvedActions.slice(0, 10).map((action) => (
                                <div key={action.id} className="p-3 flex items-center gap-3 opacity-60">
                                    {getActionIcon(action.type)}
                                    <span className="text-xs text-gray-600 flex-1 truncate">{action.title}</span>
                                    <Badge variant="outline" className={`text-[10px] ${action.status === 'applied' ? 'text-emerald-600 border-emerald-200' : 'text-gray-400 border-gray-200'}`}>
                                        {action.status === 'applied' ? '✓ Applied' : '✕ Dismissed'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ========== How It Works ========== */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-violet-600 text-white px-4 py-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <h2 className="font-semibold">How the Agent Works</h2>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50">
                                <Target className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-emerald-800">Auto-Matching</h4>
                                    <p className="text-xs text-emerald-600 mt-1">Compares every lost item with every found item using keyword similarity, category, location proximity (GPS), and time analysis.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50">
                                <Archive className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-amber-800">Stale Detection</h4>
                                    <p className="text-xs text-amber-600 mt-1">Identifies reports that have been active too long without resolution, suggesting they be archived.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50">
                                <Copy className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-red-800">Duplicate Detection</h4>
                                    <p className="text-xs text-red-600 mt-1">Flags reports that look very similar to existing ones, preventing duplicates from cluttering the feed.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50">
                                <Brain className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-blue-800">Smart Insights</h4>
                                    <p className="text-xs text-blue-600 mt-1">Generates analytics like top loss categories, location hotspots, resolution rates, and pending claim alerts.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
