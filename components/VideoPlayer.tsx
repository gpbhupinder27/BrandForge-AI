import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import FilmIcon from './icons/FilmIcon';

// Renamed onTimeUpdate to onTimeChange to avoid conflict with native event handler.
interface VideoPlayerProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'onTimeUpdate'> {
  src: string | null;
  isPlaying: boolean;
  time: number;
  onTimeChange: (time: number) => void;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({ src, className, isPlaying, time, onTimeChange, ...props }, ref) => {
    const internalRef = useRef<HTMLVideoElement>(null);
    useImperativeHandle(ref, () => internalRef.current!);

    // Sync player state with props
    useEffect(() => {
        const video = internalRef.current;
        if (!video) return;

        if (src && video.src !== src) {
            video.src = src;
        }
        
        // Seek only if time is significantly different
        if (Math.abs(video.currentTime - time) > 0.15) {
            video.currentTime = time;
        }

        if (isPlaying && video.paused) {
            video.play().catch(e => console.error("Playback error:", e));
        } else if (!isPlaying && !video.paused) {
            video.pause();
        }

    }, [src, isPlaying, time]);

    if (!src) {
        return (
             <div className={`w-full h-full flex flex-col items-center justify-center bg-black text-white ${className}`}>
                <FilmIcon className="w-16 h-16 text-slate-700"/>
                <p className="mt-4 font-semibold text-slate-400">Video Preview</p>
                <p className="text-sm text-slate-500">Add a clip to the timeline to begin.</p>
            </div>
        )
    }

    return (
        <video
            ref={internalRef}
            src={src}
            className={`${className} max-w-full max-h-full`}
            style={{ backgroundColor: 'black' }}
            playsInline
            muted // Autoplay often requires muted
            onTimeUpdate={(e) => onTimeChange(e.currentTarget.currentTime)}
            {...props}
        />
    );
});

export default VideoPlayer;