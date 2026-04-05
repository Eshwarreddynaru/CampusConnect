import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const BUCKET_NAME = 'report-images';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Verify user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error('Upload auth error:', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let formData: FormData;
        try {
            formData = await request.formData();
        } catch (e) {
            console.error('FormData parse error:', e);
            return NextResponse.json({ error: 'Could not parse form data' }, { status: 400 });
        }

        const file = formData.get('file');

        if (!file) {
            console.error('No file in formData. Keys:', [...formData.keys()]);
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Handle both File objects and Blob objects (WebViews may send Blobs)
        let fileBuffer: Uint8Array;
        let contentType: string;
        let fileExt: string;

        if (file instanceof File) {
            const arrayBuffer = await file.arrayBuffer();
            fileBuffer = new Uint8Array(arrayBuffer);
            contentType = file.type || 'image/jpeg';
            fileExt = file.name?.split('.').pop() || 'jpg';
        } else if (typeof file === 'object' && 'arrayBuffer' in file) {
            // Blob-like object (some WebViews send these)
            const blob = file as Blob;
            const arrayBuffer = await blob.arrayBuffer();
            fileBuffer = new Uint8Array(arrayBuffer);
            contentType = blob.type || 'image/jpeg';
            fileExt = contentType.split('/')[1] || 'jpg';
        } else {
            console.error('File is not a File or Blob, type:', typeof file);
            return NextResponse.json({ error: 'Invalid file format' }, { status: 400 });
        }

        // Validate it looks like an image (be permissive - accept any image/* type)
        if (contentType && !contentType.startsWith('image/')) {
            console.error('Invalid content type:', contentType);
            return NextResponse.json({ error: `Invalid file type: ${contentType}` }, { status: 400 });
        }

        // Default to jpeg if no content type
        if (!contentType) {
            contentType = 'image/jpeg';
            fileExt = 'jpg';
        }

        // Validate file size (5MB max)
        if (fileBuffer.length > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
        }

        if (fileBuffer.length === 0) {
            return NextResponse.json({ error: 'Empty file' }, { status: 400 });
        }

        // Create unique file path
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, fileBuffer, {
                contentType,
                cacheControl: '31536000',
                upsert: false,
            });

        if (error) {
            console.error('Supabase storage upload error:', error);
            return NextResponse.json({ error: `Storage error: ${error.message}` }, { status: 500 });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(data.path);

        return NextResponse.json({ url: urlData.publicUrl });
    } catch (error) {
        console.error('Upload API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
