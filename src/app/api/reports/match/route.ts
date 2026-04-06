import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// POST: Run matching for a specific report
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { reportId } = body;

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID required' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // Verify user owns this report
        const { data: report, error: reportError } = await adminClient
            .from('reports')
            .select('*')
            .eq('id', reportId)
            .single();

        if (reportError || !report) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        if (report.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Determine the opposite type to search for
        const oppositeType = report.type === 'lost' ? 'found' : 'lost';

        // Fetch all active reports of the opposite type
        const { data: candidates, error: candError } = await adminClient
            .from('reports')
            .select('*')
            .eq('type', oppositeType)
            .eq('status', 'active')
            .neq('id', reportId);

        if (candError) {
            console.error('Error fetching candidates:', candError);
            return NextResponse.json({ error: candError.message }, { status: 500 });
        }

        if (!candidates || candidates.length === 0) {
            return NextResponse.json({ matches: [], message: 'No candidate reports found' });
        }

        // Calculate match scores in JavaScript (more reliable than DB trigger)
        const matchResults: Array<{ candidateId: string; score: number }> = [];

        for (const candidate of candidates) {
            const score = calculateMatchScore(
                report.type === 'lost' ? report : candidate,  // lost report
                report.type === 'found' ? report : candidate   // found report
            );

            if (score >= 45) {
                matchResults.push({ candidateId: candidate.id, score });
            }
        }

        // Sort by score descending
        matchResults.sort((a, b) => b.score - a.score);

        // Insert matches into the database
        let insertedCount = 0;
        let bestMatchId: string | null = null;
        let bestScore = 0;

        for (const match of matchResults) {
            const lostId = report.type === 'lost' ? reportId : match.candidateId;
            const foundId = report.type === 'found' ? reportId : match.candidateId;

            const { error: insertError } = await adminClient
                .from('matches')
                .upsert({
                    lost_report_id: lostId,
                    found_report_id: foundId,
                    match_score: match.score,
                    status: 'pending',
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'lost_report_id,found_report_id',
                });

            if (!insertError) {
                insertedCount++;
                if (match.score > bestScore) {
                    bestScore = match.score;
                    bestMatchId = match.candidateId;
                }
            } else {
                console.error('Error inserting match:', insertError);
            }
        }

        // Update the report with the best match
        if (bestMatchId) {
            await adminClient
                .from('reports')
                .update({ matched_with: bestMatchId, match_score: bestScore })
                .eq('id', reportId);

            // Also update the matched report if it doesn't have a better match
            const { data: matchedReport } = await adminClient
                .from('reports')
                .select('match_score')
                .eq('id', bestMatchId)
                .single();

            if (!matchedReport?.match_score || matchedReport.match_score < bestScore) {
                await adminClient
                    .from('reports')
                    .update({ matched_with: reportId, match_score: bestScore })
                    .eq('id', bestMatchId);
            }
        }

        return NextResponse.json({
            success: true,
            matchesFound: matchResults.length,
            matchesInserted: insertedCount,
            bestMatch: bestMatchId ? { id: bestMatchId, score: bestScore } : null,
        });
    } catch (error) {
        console.error('Match API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ==========================================
// JavaScript-based match scoring
// More reliable than database trigger
// ==========================================

interface ReportData {
    title: string;
    description: string | null;
    category: string;
    location: string | null;
    created_at: string;
}

const STOPWORDS = new Set([
    'a', 'an', 'the', 'my', 'i', 'in', 'on', 'at', 'to', 'of', 'and', 'or',
    'is', 'it', 'for', 'was', 'with', 'this', 'that', 'from', 'near',
    'lost', 'found', 'someone', 'please', 'help', 'return', 'have', 'has',
    'been', 'were', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
]);

function getSignificantWords(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // remove punctuation
        .split(/\s+/)
        .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

function calculateMatchScore(lostReport: ReportData, foundReport: ReportData): number {
    let score = 0;
    let hasKeywordOverlap = false;

    // 1. CATEGORY MATCH (20 points) — required
    if (lostReport.category.toLowerCase().trim() !== foundReport.category.toLowerCase().trim()) {
        return 0; // Different categories = no match
    }
    score += 20;

    // 2. TITLE KEYWORD MATCHING (40 points)
    const lostWords = getSignificantWords(lostReport.title);
    const foundWords = getSignificantWords(foundReport.title);
    const foundWordsSet = new Set(foundWords);

    let commonWordCount = 0;
    for (const word of lostWords) {
        if (foundWordsSet.has(word)) {
            commonWordCount++;
            hasKeywordOverlap = true;
        }
    }

    // Also check if one title contains the other
    const lostLower = lostReport.title.toLowerCase().trim();
    const foundLower = foundReport.title.toLowerCase().trim();

    if (commonWordCount >= 2) {
        score += 40;
    } else if (commonWordCount === 1) {
        score += 30;
    } else if (lostLower.includes(foundLower) || foundLower.includes(lostLower)) {
        score += 35;
        hasKeywordOverlap = true;
    } else {
        // Check fuzzy similarity using Dice coefficient
        const similarity = diceCoefficient(lostLower, foundLower);
        if (similarity > 0.5) {
            score += Math.round(similarity * 30);
            hasKeywordOverlap = true;
        } else if (similarity > 0.3) {
            score += Math.round(similarity * 20);
        }
    }

    // 3. DESCRIPTION SIMILARITY (20 points)
    if (lostReport.description && foundReport.description) {
        const lostDescWords = getSignificantWords(lostReport.description);
        const foundDescWords = getSignificantWords(foundReport.description);
        const foundDescSet = new Set(foundDescWords);

        let descCommon = 0;
        for (const word of lostDescWords) {
            if (foundDescSet.has(word)) {
                descCommon++;
            }
        }

        if (descCommon >= 2) {
            score += 20;
            hasKeywordOverlap = true;
        } else if (descCommon === 1) {
            score += 10;
            hasKeywordOverlap = true;
        }
    }

    // 4. LOCATION MATCH (10 points)
    if (lostReport.location && foundReport.location) {
        const locLost = lostReport.location.toLowerCase().trim();
        const locFound = foundReport.location.toLowerCase().trim();
        if (locLost.includes(locFound) || locFound.includes(locLost)) {
            score += 10;
        } else {
            const locSim = diceCoefficient(locLost, locFound);
            if (locSim > 0.3) {
                score += Math.round(locSim * 10);
            }
        }
    }

    // 5. DATE PROXIMITY (10 points - within 14 days)
    if (lostReport.created_at && foundReport.created_at) {
        const diffMs = Math.abs(
            new Date(lostReport.created_at).getTime() - new Date(foundReport.created_at).getTime()
        );
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays <= 14) {
            score += Math.round(10 * (1 - diffDays / 14));
        }
    }

    // CRITICAL: If no keyword overlap, cap the score
    if (!hasKeywordOverlap) {
        score = Math.min(score, 30);
    }

    return Math.min(score, 100);
}

// Dice coefficient for fuzzy string similarity
function diceCoefficient(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const bigrams = new Map<string, number>();
    for (let i = 0; i < a.length - 1; i++) {
        const bigram = a.substring(i, i + 2);
        bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }

    let intersection = 0;
    for (let i = 0; i < b.length - 1; i++) {
        const bigram = b.substring(i, i + 2);
        const count = bigrams.get(bigram) || 0;
        if (count > 0) {
            bigrams.set(bigram, count - 1);
            intersection++;
        }
    }

    return (2 * intersection) / (a.length + b.length - 2);
}
