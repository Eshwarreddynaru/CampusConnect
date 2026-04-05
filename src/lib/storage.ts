/**
 * Upload an image file via the server-side API route.
 * This works in all environments including Median.co WebViews
 * because the actual Supabase Storage upload happens on the server.
 */
export async function uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(data.error || 'Failed to upload image');
    }

    const data = await response.json();
    return data.url;
}

/**
 * Upload multiple image files and return their public URLs.
 */
export async function uploadImages(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(file => uploadImage(file));
    return Promise.all(uploadPromises);
}
