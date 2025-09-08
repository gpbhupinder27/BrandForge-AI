import { getImage } from './imageDb';

export const generateVideoThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.crossOrigin = "anonymous";
        
        video.onloadeddata = () => {
            video.currentTime = 0.1; // Seek to a very early frame
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg'));
            } else {
                reject(new Error('Could not get canvas context'));
            }
            video.src = ''; // Clean up
        };

        video.onerror = (e) => {
            reject(new Error(`Failed to load video for thumbnail generation. Error: ${e}`));
            video.src = ''; // Clean up
        };

        video.src = videoUrl;
    });
};

export const getVideoDuration = async (assetId: string): Promise<number> => {
    const dataUrl = await getImage(assetId);
    if (!dataUrl) return 0;

    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            resolve(video.duration);
        };
        video.src = dataUrl;
    });
};