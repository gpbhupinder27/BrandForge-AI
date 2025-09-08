import React, { useEffect, useRef } from 'react';
import FilmIcon from './icons/FilmIcon';

interface VideoPlayerProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src'> {
  src: string | null;
  startTime?: number;
  endTime?: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, className, startTime = 0, endTime, ...props }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Set initial time when metadata is loaded or src changes
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleMetadata = () => {
            if (video.currentTime < startTime || (endTime && video.currentTime > endTime)) {
                video.currentTime = startTime;
            }
        };
        video.addEventListener('loadedmetadata', handleMetadata);
        return () => video.removeEventListener('loadedmetadata', handleMetadata);
    }, [src, startTime, endTime]);
    
    // Enforce end time during playback
    useEffect(() => {
        const video = videoRef.current;
        if (!video || endTime === undefined) return;

        const handleTimeUpdate = () => {
            if (video.currentTime > endTime) {
                video.pause();
                video.currentTime = endTime;
            }
        };
        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [src, endTime]);

    if (!src) {
        return (
             <div className={`w-full h-full flex flex-col items-center justify-center bg-black text-white ${className}`}>
                <FilmIcon className="w-16 h-16 text-slate-700"/>
                <p className="mt-4 font-semibold text-slate-400">Video Preview</p>
                <p className="text-sm text-slate-500">Select a clip from the timeline to view it here.</p>
            </div>
        )
    }

    return (
        <video
            ref={videoRef}
            src={src}
            className={`${className} max-w-full max-h-full`}
            controls // Use native browser controls
            {...props}
        />
    );
};

export default VideoPlayer;