/**
 * Compress and convert an image file to JPEG using Canvas.
 * This handles:
 * - HEIC/HEIF → JPEG conversion (the OS decodes HEIC when creating Image)
 * - Large files → compressed to reasonable size
 * - Any image format → standardized to JPEG
 */
export function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
        // If it's already a small JPEG/PNG, skip compression
        if (file.size < 500 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            resolve(file);
            return;
        }

        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);

            try {
                const canvas = document.createElement('canvas');

                // Calculate new dimensions maintaining aspect ratio
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Could not compress image'));
                            return;
                        }

                        // Create a new File from the blob
                        const compressedFile = new File(
                            [blob],
                            file.name.replace(/\.[^.]+$/, '.jpg'),
                            { type: 'image/jpeg' }
                        );

                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not load image for compression'));
        };

        img.src = url;
    });
}

/**
 * Upload an image file via the server-side API route.
 * Images are compressed and converted to JPEG before upload.
 */
export async function uploadImage(file: File): Promise<string> {
    // Compress and convert to JPEG first
    let processedFile: File;
    try {
        processedFile = await compressImage(file);
    } catch (e) {
        console.error('Image compression failed, uploading original:', e);
        processedFile = file;
    }

    const formData = new FormData();
    formData.append('file', processedFile);

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
