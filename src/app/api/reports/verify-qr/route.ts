import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// POST: Verify a QR code and mark the report as returned
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { qrCode } = body;

        if (!qrCode) {
            return NextResponse.json({ error: 'QR code is required' }, { status: 400 });
        }

        const adminClient = createAdminClient();

        // The QR code contains the report_code (e.g., "KARE26L-A3X9B2")
        // Find the report by report_code
        const { data: report, error: reportError } = await adminClient
            .from('reports')
            .select('id, title, type, status, user_id, report_code, register_number')
            .eq('report_code', qrCode)
            .single();

        if (reportError || !report) {
            return NextResponse.json({ 
                error: 'Invalid QR code. No report found with this code.',
                valid: false 
            }, { status: 404 });
        }

        // Check if the report is already returned
        if (report.status === 'returned_qr' || report.status === 'returned_direct') {
            return NextResponse.json({ 
                error: 'This item has already been marked as returned.',
                valid: false,
                report: {
                    id: report.id,
                    title: report.title,
                    type: report.type,
                    status: report.status,
                    report_code: report.report_code,
                }
            }, { status: 400 });
        }

        // Don't allow scanning your own report to mark as returned
        // (you can only scan someone else's QR to confirm you returned their item)
        if (report.user_id === user.id) {
            return NextResponse.json({ 
                error: 'You cannot scan your own report QR code. Ask the other person to scan it.',
                valid: false,
                report: {
                    id: report.id,
                    title: report.title,
                    type: report.type,
                    status: report.status,
                    report_code: report.report_code,
                }
            }, { status: 400 });
        }

        // Mark the report as returned via QR scan
        const { error: updateError } = await adminClient
            .from('reports')
            .update({ 
                status: 'returned_qr',
            })
            .eq('id', report.id);

        if (updateError) {
            console.error('Error updating report:', updateError);
            return NextResponse.json({ error: 'Failed to update report status' }, { status: 500 });
        }

        // Get scanner's register number
        const scannerRegNumber = user.user_metadata?.register_number || 
            user.email?.split('@')[0] || 'Unknown';

        return NextResponse.json({
            success: true,
            valid: true,
            message: `Item "${report.title}" has been marked as returned!`,
            report: {
                id: report.id,
                title: report.title,
                type: report.type,
                status: 'returned_qr',
                report_code: report.report_code,
                owner_register_number: report.register_number,
            },
            scannedBy: scannerRegNumber,
        });
    } catch (error) {
        console.error('QR verify error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
