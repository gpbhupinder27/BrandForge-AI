import React, { useState, useRef, useEffect } from 'react';
import ImageIcon from './icons/ImageIcon';
import VideoIcon from './icons/VideoIcon';
import PlayIcon from './icons/PlayIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

const InteractiveVideoShowcase = () => {
    // This state now reflects the video's actual playback status for UI purposes.
    const [isPlaying, setIsPlaying] = useState(false); 
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleMouseEnter = () => {
        const video = videoRef.current;
        if (video) {
            // Directly play the video and ignore AbortError if the user leaves quickly.
            video.play().catch(e => {
                if (e.name !== 'AbortError') {
                    console.error("Video play failed:", e);
                }
            });
        }
    };

    const handleMouseLeave = () => {
        const video = videoRef.current;
        if (video) {
            video.pause();
            video.currentTime = 0; // Reset video on mouse leave
        }
    };

    // Effect to sync the `isPlaying` state with the video's DOM events.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handlePause); // Also consider the video ending as a pause

        // Cleanup listeners on component unmount
        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handlePause);
        };
    }, []); // Empty dependency array ensures this runs only once.

    return (
        <div 
            className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center bg-slate-200/50 dark:bg-slate-800/50 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Left Side: Static Image */}
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                <img 
                    src="https://uelxlhdoa7kiamuy.public.blob.vercel-storage.com/cupaimg.webp" 
                    alt="AI Generated Static Image" 
                    className="w-full h-full object-cover video-showcase-ken-burns"
                />
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <ImageIcon className="w-4 h-4" />
                    <span>AI-Generated Image</span>
                </div>
            </div>

            {/* Right Side: Video */}
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                <video 
                    ref={videoRef}
                    className="w-full h-full object-cover" 
                    playsInline 
                    loop 
                    muted 
                >
                  <source src="https://uelxlhdoa7kiamuy.public.blob.vercel-storage.com/cupavideo.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
                    <VideoIcon className="w-4 h-4" />
                    <span>Generated Video Ad</span>
                </div>
                <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="p-4 rounded-full bg-white/30 backdrop-blur-sm">
                        <PlayIcon className="w-12 h-12 text-white" />
                    </div>
                </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full shadow-lg border-2 border-slate-200 dark:border-slate-700">
                <ArrowRightIcon className="w-8 h-8 text-slate-500 dark:text-slate-400" />
            </div>
        </div>
    );
};

export default InteractiveVideoShowcase;