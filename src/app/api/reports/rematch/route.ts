import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// POST: Re-run matching for ALL existing reports
// Only admins can use this endpoint
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminClient = createAdminClient();

        // Check admin
        const { data: profile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Clear all existing matches
        await adminClient.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Reset matched_with on all reports
        await adminClient
            .from('reports')
            .update({ matched_with: null, match_score: 0 })
            .neq('id', '00000000-0000-0000-0000-000000000000');

        // Fetch all active reports
        const { data: allReports, error: fetchError } = await adminClient
            .from('reports')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: true });

        if (fetchError || !allReports) {
            return NextResponse.json({ error: fetchError?.message || 'Failed to fetch reports' }, { status: 500 });
        }

        const lostReports = allReports.filter(r => r.type === 'lost');
        const foundReports = allReports.filter(r => r.type === 'found');

        let totalMatches = 0;

        // Compare each lost report with each found report
        for (const lost of lostReports) {
            for (const found of foundReports) {
                const score = calculateMatchScore(lost, found);

                if (score >= 45) {
                    const { error: insertError } = await adminClient
                        .from('matches')
                        .upsert({
                            lost_report_id: lost.id,
                            found_report_id: found.id,
                            match_score: score,
                            status: 'pending',
                            updated_at: new Date().toISOString(),
                        }, {
                            onConflict: 'lost_report_id,found_report_id',
                        });

                    if (!insertError) {
                        totalMatches++;

                        // Update matched_with on both reports if this is their best match
                        const { data: lostCurrent } = await adminClient
                            .from('reports')
                            .select('match_score')
                            .eq('id', lost.id)
                            .single();

                        if (!lostCurrent?.match_score || lostCurrent.match_score < score) {
                            await adminClient
                                .from('reports')
                                .update({ matched_with: found.id, match_score: score })
                                .eq('id', lost.id);
                        }

                        const { data: foundCurrent } = await adminClient
                            .from('reports')
                            .select('match_score')
                            .eq('id', found.id)
                            .single();

                        if (!foundCurrent?.match_score || foundCurrent.match_score < score) {
                            await adminClient
                                .from('reports')
                                .update({ matched_with: lost.id, match_score: score })
                                .eq('id', found.id);
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            totalReports: allReports.length,
            lostReports: lostReports.length,
            foundReports: foundReports.length,
            matchesCreated: totalMatches,
        });
    } catch (error) {
        console.error('Rematch API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// ==========================================
// Match scoring logic (same as /api/reports/match)
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
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1 && !STOPWORDS.has(w));
}

function calculateMatchScore(lostReport: ReportData, foundReport: ReportData): number {
    let score = 0;
    let hasKeywordOverlap = false;

    // 1. CATEGORY MATCH (20 points)
    if (lostReport.category.toLowerCase().trim() !== foundReport.category.toLowerCase().trim()) {
        return 0;
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

    // 5. DATE PROXIMITY (10 points)
    if (lostReport.created_at && foundReport.created_at) {
        const diffMs = Math.abs(
            new Date(lostReport.created_at).getTime() - new Date(foundReport.created_at).getTime()
        );
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays <= 14) {
            score += Math.round(10 * (1 - diffDays / 14));
        }
    }

    // No keyword overlap = cap score
    if (!hasKeywordOverlap) {
        score = Math.min(score, 30);
    }

    return Math.min(score, 100);
}

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
