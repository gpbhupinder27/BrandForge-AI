import React, { useState, useEffect, useRef } from 'react';
import VolumeOffIcon from './icons/VolumeOffIcon';
import VolumeUpIcon from './icons/VolumeUpIcon';
import PlayControlIcon from './icons/PlayControlIcon';
import PauseControlIcon from './icons/PauseControlIcon';

// Helper to format time
const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

interface VideoPlayerProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'src'> {
  src: string | null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, className, ...props }) => {
    // Player state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [volume, setVolume] = useState(0.5);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const progressRef = useRef<HTMLInputElement>(null);

    // Reset player state on src change
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            if (progressRef.current) {
                progressRef.current.value = '0';
            }
        }
    }, [src]);

    // Effect for playback rate
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);
    
    // Effect for volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = volume;
            videoRef.current.muted = isMuted;
        }
    }, [volume, isMuted]);

    const togglePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (progressRef.current) {
                progressRef.current.value = String((videoRef.current.currentTime / duration) * 100);
            }
        }
    };
    
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (videoRef.current) {
            const newTime = (Number(e.target.value) / 100) * duration;
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = Number(e.target.value);
        setVolume(newVolume);
        if (newVolume > 0) {
            setIsMuted(false);
        }
    };

    const toggleMute = () => {
        setIsMuted(prev => !prev);
    };

    if (!src) {
        return (
             <div className={`w-full h-full flex flex-col items-center justify-center bg-black ${className}`}>
                <p className="text-slate-500">Video Preview</p>
                <p className="text-slate-600 text-sm">Add a clip from the library to start</p>
            </div>
        )
    }

    return (
        <div className="w-full group">
            <div className="relative">
                <video 
                    ref={videoRef} 
                    src={src} 
                    className={`${className} cursor-pointer`}
                    onClick={togglePlayPause}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    {...props} 
                />
                 <div 
                    className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                >
                    <button 
                        onClick={togglePlayPause}
                        className="p-4 bg-black/50 rounded-full text-white hover:bg-black/75 transition-colors"
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <PauseControlIcon className="w-8 h-8"/> : <PlayControlIcon className="w-8 h-8"/>}
                    </button>
                </div>
            </div>

            <div className="mt-2 p-2 bg-slate-200 dark:bg-slate-700/50 rounded-md flex flex-col gap-2">
                {/* Progress Bar */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{formatTime(currentTime)}</span>
                    <input
                        ref={progressRef}
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="0"
                        onChange={handleProgressChange}
                        className="w-full h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        aria-label="Video progress"
                    />
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{formatTime(duration)}</span>
                </div>
                {/* Controls */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={togglePlayPause} className="p-2 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors" aria-label={isPlaying ? "Pause" : "Play"}>
                             {isPlaying ? <PauseControlIcon className="w-5 h-5" /> : <PlayControlIcon className="w-5 h-5" />}
                        </button>
                        <div className="flex items-center gap-2">
                             <button onClick={toggleMute} className="p-2 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors" title={isMuted ? 'Unmute' : 'Mute'}>
                                {isMuted || volume === 0 ? <VolumeOffIcon className="w-5 h-5" /> : <VolumeUpIcon className="w-5 h-5" />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-20 h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                aria-label="Volume"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 sr-only">Speed:</p>
                        {[0.5, 1, 1.5, 2].map(rate => (
                            <button
                                key={rate}
                                onClick={() => setPlaybackRate(rate)}
                                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${playbackRate === rate ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-600 hover:bg-slate-100 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200'}`}
                                aria-pressed={playbackRate === rate}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;