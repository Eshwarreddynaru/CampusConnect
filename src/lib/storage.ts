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

    const data = await response.json().catch(() => ({ error: `Upload failed with status ${response.status}` }));

    if (!response.ok) {
        console.error('Upload failed:', response.status, data);
        throw new Error(data.error || `Upload failed (${response.status})`);
    }

    return data.url;
}

/**
 * Upload multiple image files and return their public URLs.
 */
export async function uploadImages(files: File[]): Promise<string[]> {
    const uploadPromises = files.map(file => uploadImage(file));
    return Promise.all(uploadPromises);
}
