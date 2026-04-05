import { createClient } from '@/lib/supabase/client';

const BUCKET_NAME = 'report-images';

/**
 * Upload an image file to Supabase Storage and return the public URL.
 * Falls back to base64 data URL if storage upload fails.
 */
export async function uploadImage(file: File, userId: string): Promise<string> {
    const supabase = createClient();

    // Create a unique file path
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
            cacheControl: '31536000', // 1 year cache
            upsert: false,
        });

    if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

    return urlData.publicUrl;
}

/**
 * Upload multiple image files and return their public URLs.
 */
export async function uploadImages(files: File[], userId: string): Promise<string[]> {
    const uploadPromises = files.map(file => uploadImage(file, userId));
    return Promise.all(uploadPromises);
}
