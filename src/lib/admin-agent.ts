/**
 * KARE Admin Agent — Automated Admin Intelligence
 * 
 * This module powers the autonomous admin agent that handles:
 * 1. Auto-matching lost & found items
 * 2. Auto-archiving stale reports
 * 3. Duplicate detection
 * 4. Smart insights & analytics
 * 5. Activity logging
 */

import { REPORT_CATEGORIES } from '@/lib/utils';

// ========================================
// Types
// ========================================

export interface Report {
    id: string;
    type: 'lost' | 'found';
    title: string;
    description: string | null;
    category: string;
    report_code: string;
    register_number: string;
    images: string[];
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    status: string;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export interface MatchResult {
    lostReport: Report;
    foundReport: Report;
    score: number; // 0–100
    matchReasons: string[];
    confidence: 'high' | 'medium' | 'low';
}

export interface AgentAction {
    id: string;
    type: 'match_found' | 'stale_archived' | 'duplicate_flagged' | 'insight_generated' | 'auto_reminder';
    title: string;
    description: string;
    timestamp: string;
    data?: Record<string, unknown>;
    status: 'pending' | 'applied' | 'dismissed';
}

export interface AgentInsight {
    id: string;
    type: 'trend' | 'hotspot' | 'warning' | 'suggestion';
    icon: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    data?: Record<string, unknown>;
}

export interface AgentConfig {
    autoMatchEnabled: boolean;
    autoArchiveDays: number;
    duplicateDetection: boolean;
    matchThreshold: number; // minimum score (0-100) to consider a match
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
    autoMatchEnabled: true,
    autoArchiveDays: 30,
    duplicateDetection: true,
    matchThreshold: 40,
};

// ========================================
// 1. AUTO-MATCHING ENGINE
// ========================================

/** Tokenize text into meaningful keywords */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2); // ignore very short words
}

/** Calculate Jaccard similarity between two keyword sets */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

/** Calculate distance between two coordinates in km */
function haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Score how well a lost report matches a found report.
 * Returns 0–100 score with human-readable reasons.
 */
export function matchReports(lost: Report, found: Report): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // --- 1. Category match (30 points) ---
    if (lost.category === found.category) {
        score += 30;
        const catLabel = REPORT_CATEGORIES.find(c => c.id === lost.category)?.label || lost.category;
        reasons.push(`Same category: ${catLabel}`);
    }

    // --- 2. Title keyword match (25 points) ---
    const lostTitleWords = new Set(tokenize(lost.title));
    const foundTitleWords = new Set(tokenize(found.title));
    const titleSim = jaccardSimilarity(lostTitleWords, foundTitleWords);
    if (titleSim > 0) {
        const titleScore = Math.round(titleSim * 25);
        score += titleScore;
        const commonWords = [...lostTitleWords].filter(w => foundTitleWords.has(w));
        reasons.push(`Title keywords match: "${commonWords.join('", "')}"`);
    }

    // --- 3. Description keyword match (15 points) ---
    if (lost.description && found.description) {
        const lostDescWords = new Set(tokenize(lost.description));
        const foundDescWords = new Set(tokenize(found.description));
        const descSim = jaccardSimilarity(lostDescWords, foundDescWords);
        if (descSim > 0) {
            const descScore = Math.round(descSim * 15);
            score += descScore;
            reasons.push(`Description similarity: ${Math.round(descSim * 100)}%`);
        }
    }

    // --- 4. Location match (20 points) ---
    // Text-based location match
    if (lost.location && found.location) {
        const lostLocWords = new Set(tokenize(lost.location));
        const foundLocWords = new Set(tokenize(found.location));
        const locSim = jaccardSimilarity(lostLocWords, foundLocWords);
        if (locSim > 0) {
            score += Math.round(locSim * 10);
            reasons.push(`Similar location text`);
        }
    }
    // GPS proximity
    if (
        lost.latitude != null && lost.longitude != null &&
        found.latitude != null && found.longitude != null
    ) {
        const dist = haversineDistance(lost.latitude, lost.longitude, found.latitude, found.longitude);
        if (dist < 0.1) { // within 100m
            score += 10;
            reasons.push(`Found within 100m of lost location`);
        } else if (dist < 0.5) { // within 500m
            score += 5;
            reasons.push(`Found within 500m of lost location`);
        }
    }

    // --- 5. Time proximity (10 points) ---
    const lostDate = new Date(lost.created_at);
    const foundDate = new Date(found.created_at);
    const daysDiff = Math.abs(foundDate.getTime() - lostDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 1) {
        score += 10;
        reasons.push(`Posted within 1 day of each other`);
    } else if (daysDiff <= 3) {
        score += 7;
        reasons.push(`Posted within 3 days of each other`);
    } else if (daysDiff <= 7) {
        score += 4;
        reasons.push(`Posted within a week`);
    }

    return { score: Math.min(score, 100), reasons };
}

/**
 * Find all potential matches between lost and found items.
 */
export function findAllMatches(reports: Report[], threshold: number = 40): MatchResult[] {
    const lostReports = reports.filter(r => r.type === 'lost' && r.status === 'active');
    const foundReports = reports.filter(r => r.type === 'found' && r.status === 'active');

    const matches: MatchResult[] = [];

    for (const lost of lostReports) {
        for (const found of foundReports) {
            // Skip if same user posted both
            if (lost.user_id === found.user_id) continue;

            const { score, reasons } = matchReports(lost, found);

            if (score >= threshold) {
                matches.push({
                    lostReport: lost,
                    foundReport: found,
                    score,
                    matchReasons: reasons,
                    confidence: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low',
                });
            }
        }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    return matches;
}


// ========================================
// 2. STALE REPORT DETECTION
// ========================================

/**
 * Find reports older than X days that are still active.
 */
export function findStaleReports(reports: Report[], daysThreshold: number = 30): Report[] {
    const now = new Date();
    return reports.filter(r => {
        if (r.status !== 'active') return false;
        const created = new Date(r.created_at);
        const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreation >= daysThreshold;
    });
}


// ========================================
// 3. DUPLICATE DETECTION
// ========================================

/**
 * Find potential duplicate reports from the same user.
 */
export function findDuplicates(reports: Report[]): Array<{ original: Report; duplicate: Report; similarity: number }> {
    const activeReports = reports.filter(r => r.status === 'active');
    const duplicates: Array<{ original: Report; duplicate: Report; similarity: number }> = [];

    for (let i = 0; i < activeReports.length; i++) {
        for (let j = i + 1; j < activeReports.length; j++) {
            const a = activeReports[i];
            const b = activeReports[j];

            // Only flag duplicates from same user or same type
            if (a.type !== b.type) continue;

            const titleWordsA = new Set(tokenize(a.title));
            const titleWordsB = new Set(tokenize(b.title));
            const sim = jaccardSimilarity(titleWordsA, titleWordsB);

            if (sim > 0.6 && a.category === b.category) {
                duplicates.push({
                    original: a,
                    duplicate: b,
                    similarity: Math.round(sim * 100),
                });
            }
        }
    }

    return duplicates;
}


// ========================================
// 4. SMART INSIGHTS GENERATOR
// ========================================

export interface Claim {
    id: string;
    report_id: string;
    claimer_id: string;
    status: string;
    created_at: string;
}

export function generateInsights(reports: Report[], claims: Claim[]): AgentInsight[] {
    const insights: AgentInsight[] = [];
    const now = new Date();

    // --- Category breakdown ---
    const categoryCounts: Record<string, number> = {};
    reports.forEach(r => {
        categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
        const catLabel = REPORT_CATEGORIES.find(c => c.id === topCategory[0])?.label || topCategory[0];
        insights.push({
            id: 'top-category',
            type: 'trend',
            icon: '📊',
            title: `Most Lost Category: ${catLabel}`,
            description: `${catLabel} accounts for ${topCategory[1]} out of ${reports.length} reports (${Math.round(topCategory[1] / reports.length * 100)}%).`,
            priority: 'medium',
        });
    }

    // --- Reports this week ---
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = reports.filter(r => new Date(r.created_at) >= weekAgo);
    if (thisWeek.length > 0) {
        insights.push({
            id: 'weekly-activity',
            type: 'trend',
            icon: '📈',
            title: `${thisWeek.length} Reports This Week`,
            description: `${thisWeek.filter(r => r.type === 'lost').length} lost and ${thisWeek.filter(r => r.type === 'found').length} found items reported in the last 7 days.`,
            priority: 'low',
        });
    }

    // --- Unclaimed reports warning ---
    const activeReports = reports.filter(r => r.status === 'active');
    const claimedReportIds = new Set(claims.map(c => c.report_id));
    const unclaimedActive = activeReports.filter(r => !claimedReportIds.has(r.id));
    if (unclaimedActive.length > 5) {
        insights.push({
            id: 'unclaimed-warning',
            type: 'warning',
            icon: '⚠️',
            title: `${unclaimedActive.length} Items With No Claims`,
            description: `There are ${unclaimedActive.length} active reports that haven't received any claims yet. Consider promoting these items.`,
            priority: 'high',
        });
    }

    // --- Resolution rate ---
    const returnedCount = reports.filter(r => r.status === 'returned_direct' || r.status === 'returned_qr').length;
    if (reports.length > 0) {
        const rate = Math.round((returnedCount / reports.length) * 100);
        insights.push({
            id: 'resolution-rate',
            type: rate >= 50 ? 'trend' : 'warning',
            icon: rate >= 50 ? '✅' : '📉',
            title: `Resolution Rate: ${rate}%`,
            description: `${returnedCount} out of ${reports.length} items have been successfully returned to their owners.`,
            priority: rate < 30 ? 'high' : 'medium',
        });
    }

    // --- Location hotspot ---
    const locationCounts: Record<string, number> = {};
    reports.forEach(r => {
        if (r.location) {
            const loc = r.location.trim().toLowerCase();
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        }
    });
    const topLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0];
    if (topLocation && topLocation[1] >= 2) {
        insights.push({
            id: 'location-hotspot',
            type: 'hotspot',
            icon: '📍',
            title: `Hotspot: ${topLocation[0]}`,
            description: `${topLocation[1]} items reported at "${topLocation[0]}". This is a frequent loss area.`,
            priority: 'medium',
        });
    }

    // --- Pending claims suggestion ---
    const pendingClaims = claims.filter(c => c.status === 'pending');
    if (pendingClaims.length > 3) {
        insights.push({
            id: 'pending-claims',
            type: 'suggestion',
            icon: '💡',
            title: `${pendingClaims.length} Claims Awaiting Response`,
            description: `There are ${pendingClaims.length} pending claims. The system could send reminders to report owners to review them.`,
            priority: 'high',
        });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return insights;
}


// ========================================
// 5. AGENT ACTION LOG BUILDER
// ========================================

let actionCounter = 0;

export function buildAgentActions(
    matches: MatchResult[],
    staleReports: Report[],
    duplicates: Array<{ original: Report; duplicate: Report; similarity: number }>
): AgentAction[] {
    const actions: AgentAction[] = [];

    // Match actions
    for (const match of matches) {
        actions.push({
            id: `match-${++actionCounter}`,
            type: 'match_found',
            title: `Potential Match Found (${match.score}% confidence)`,
            description: `Lost "${match.lostReport.title}" may match Found "${match.foundReport.title}". Reasons: ${match.matchReasons.join(', ')}`,
            timestamp: new Date().toISOString(),
            data: {
                lostId: match.lostReport.id,
                foundId: match.foundReport.id,
                score: match.score,
                confidence: match.confidence,
            },
            status: 'pending',
        });
    }

    // Stale report actions
    for (const report of staleReports) {
        const daysOld = Math.floor(
            (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        actions.push({
            id: `stale-${++actionCounter}`,
            type: 'stale_archived',
            title: `Stale Report: ${report.title}`,
            description: `This ${report.type} report (${report.report_code}) has been active for ${daysOld} days without resolution. Consider archiving.`,
            timestamp: new Date().toISOString(),
            data: { reportId: report.id, daysOld },
            status: 'pending',
        });
    }

    // Duplicate actions
    for (const dup of duplicates) {
        actions.push({
            id: `dup-${++actionCounter}`,
            type: 'duplicate_flagged',
            title: `Possible Duplicate (${dup.similarity}% similar)`,
            description: `"${dup.original.title}" and "${dup.duplicate.title}" appear to be duplicates.`,
            timestamp: new Date().toISOString(),
            data: {
                originalId: dup.original.id,
                duplicateId: dup.duplicate.id,
                similarity: dup.similarity,
            },
            status: 'pending',
        });
    }

    return actions;
}
