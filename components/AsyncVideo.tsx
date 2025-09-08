import React, { useState, useEffect } from 'react';
import { getImage as getVideo } from '../services/imageDb';
import Loader from './Loader';

interface AsyncVideoProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src'> {
  assetId: string;
}

const AsyncVideo: React.FC<AsyncVideoProps> = ({ assetId, className, ...props }) => {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch video from IndexedDB
    useEffect(() => {
        let isMounted = true;
        let objectUrl: string | null = null;
        const fetchVideo = async () => {
            setIsLoading(true);
            try {
                const dataUrl = await getVideo(assetId);
                if (isMounted && dataUrl) {
                    // Using blob and object URL is more performant for large files than data URLs directly in src
                    const response = await fetch(dataUrl);
                    const blob = await response.blob();
                    objectUrl = URL.createObjectURL(blob);
                    setVideoUrl(objectUrl);
                }
            } catch (error) {
                console.error(`Failed to load video for assetId: ${assetId}`, error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchVideo();
        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [assetId]);

    if (isLoading) {
        return <div className={`w-full h-full flex items-center justify-center`}><Loader message="Loading video..." /></div>;
    }

    if (!videoUrl) {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-700/50 ${className}`}>
                <p className="text-sm text-red-500 dark:text-red-400">Video not found</p>
            </div>
        );
    }
    
    return <video src={videoUrl} className={className} {...props} />;
};

export default AsyncVideo;