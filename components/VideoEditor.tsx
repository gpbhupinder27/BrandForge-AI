import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Brand, BrandAsset } from '../types';
import { renderVideo, ClipTransition } from '../services/videoEditorService';
import { getImage, storeImage } from '../services/imageDb';
import { generateVideoThumbnail, getVideoDuration } from '../services/videoUtils';
import Loader from './Loader';
import FilmIcon from './icons/FilmIcon';
import ExportIcon from './icons/ExportIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import VideoPlayer from './VideoPlayer';
import XMarkIcon from './icons/XMarkIcon';
import PlayIcon from './icons/PlayIcon';
import SparklesIcon from './icons/SparklesIcon';
import PlayControlIcon from './icons/PlayControlIcon';
import PauseControlIcon from './icons/PauseControlIcon';

type Clip = {
    id: string; // unique ID for the timeline instance
    assetId: string;
    sourceUrl: string;
    thumbnailUrl: string;
    duration: number; // original duration
    trimStart: number;
    trimEnd: number;
    transition?: ClipTransition;
};

const formatTime = (time: number | undefined) => {
    if (typeof time !== 'number' || isNaN(time)) return '00:00.0';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time * 10) % 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${milliseconds}`;
};

const VideoLibraryItem: React.FC<{ asset: BrandAsset, onAdd: (asset: BrandAsset) => void }> = ({ asset, onAdd }) => {
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [duration, setDuration] = useState<number>(0);

    useEffect(() => {
        const generateThumb = async () => {
            const dataUrl = await getImage(asset.id);
            if (dataUrl) {
                const thumbUrl = await generateVideoThumbnail(dataUrl);
                setThumbnail(thumbUrl);
                const videoDuration = await getVideoDuration(asset.id);
                setDuration(videoDuration);
            }
        };
        generateThumb();
    }, [asset.id]);

    return (
        <div className="group relative rounded-md overflow-hidden bg-slate-200 dark:bg-slate-700 aspect-video">
            {thumbnail ? <img src={thumbnail} className="w-full h-full object-cover" alt={`Thumbnail for ${asset.id}`} /> : <div className="w-full h-full flex items-center justify-center"><Loader message="" subMessage=""/></div>}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <span className="bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full self-end">{formatTime(duration)}</span>
                <button onClick={() => onAdd(asset)} className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white text-xs font-semibold rounded-md hover:scale-105 transition-transform">
                    <PlusIcon className="w-4 h-4" /> Add
                </button>
            </div>
        </div>
    );
};


interface VideoEditorProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
  videoAssets: BrandAsset[];
}

const VideoEditor: React.FC<VideoEditorProps> = ({ brand, onUpdateBrand, videoAssets }) => {
    const [timelineClips, setTimelineClips] = useState<Clip[]>([]);
    const [activeClipId, setActiveClipId] = useState<string | null>(null);

    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderMessage, setRenderMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    // FIX: Initialize useRef with null to provide an initial value, resolving the "Expected 1 arguments, but got 0" error.
    const animationFrameRef = useRef<number | null>(null);
    // FIX: Initialize useRef with null to provide an initial value, resolving the "Expected 1 arguments, but got 0" error.
    const lastTimeRef = useRef<number | null>(null);
    const activeClip = useMemo(() => timelineClips.find(c => c.id === activeClipId), [activeClipId, timelineClips]);

    const totalDuration = useMemo(() => {
        let duration = 0;
        for (let i = 0; i < timelineClips.length; i++) {
            const clip = timelineClips[i];
            duration += (clip.trimEnd - clip.trimStart);
            if (i > 0 && clip.transition) {
                duration -= clip.transition.duration;
            }
        }
        return Math.max(0, duration);
    }, [timelineClips]);
    
    const animate = useCallback((time: number) => {
        if (lastTimeRef.current != null) {
            const deltaTime = (time - lastTimeRef.current) / 1000;
            setPlaybackTime(prev => {
                const newTime = prev + deltaTime;
                if (newTime >= totalDuration) {
                    setIsPlaying(false);
                    return 0; // Loop back to start
                }
                return newTime;
            });
        }
        lastTimeRef.current = time;
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [totalDuration]);

    useEffect(() => {
        if (isPlaying) {
            lastTimeRef.current = performance.now();
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, animate]);

    const currentPlaybackClipInfo = useMemo(() => {
        let cumulativeTime = 0;
        for (let i = 0; i < timelineClips.length; i++) {
            const clip = timelineClips[i];
            const clipDuration = clip.trimEnd - clip.trimStart;
            const transitionDuration = i > 0 && clip.transition ? clip.transition.duration : 0;
            const effectiveDuration = clipDuration - transitionDuration;

            if (playbackTime < cumulativeTime + effectiveDuration) {
                const timeIntoClip = playbackTime - cumulativeTime;
                return {
                    clip,
                    localTime: clip.trimStart + timeIntoClip,
                };
            }
            cumulativeTime += effectiveDuration;
        }
        if (playbackTime >= totalDuration && timelineClips.length > 0) {
            const lastClip = timelineClips[timelineClips.length - 1];
            return { clip: lastClip, localTime: lastClip.trimEnd };
        }
        return null;
    }, [playbackTime, timelineClips, totalDuration]);

    const addClipToTimeline = useCallback(async (asset: BrandAsset) => {
        try {
            const dataUrl = await getImage(asset.id);
            if (!dataUrl) throw new Error(`Could not load video data for asset ${asset.id}`);
            
            const [thumbnailUrl, duration] = await Promise.all([
                generateVideoThumbnail(dataUrl),
                getVideoDuration(asset.id)
            ]);

            const newClip: Clip = {
                id: crypto.randomUUID(),
                assetId: asset.id,
                sourceUrl: dataUrl,
                thumbnailUrl,
                duration,
                trimStart: 0,
                trimEnd: duration,
            };
            setTimelineClips(prev => [...prev, newClip]);
            if (!activeClipId) {
                 setActiveClipId(newClip.id);
            }
        } catch(err) {
            setError(err instanceof Error ? err.message : 'Could not add clip');
        }
    }, [activeClipId]);

    const removeClipFromTimeline = (clipId: string) => {
        setTimelineClips(prev => {
            const newClips = prev.filter(c => c.id !== clipId);
            if (activeClipId === clipId) {
                setActiveClipId(newClips.length > 0 ? newClips[0].id : null);
            }
            return newClips;
        });
    };

    const handleTrimChange = (clipId: string, type: 'start' | 'end', value: number) => {
        setTimelineClips(prevClips => prevClips.map(clip => {
            if (clip.id === clipId) {
                let newStart = clip.trimStart;
                let newEnd = clip.trimEnd;
                if (type === 'start') {
                    newStart = Math.max(0, Math.min(value, clip.trimEnd - 0.1));
                } else {
                    newEnd = Math.min(clip.duration, Math.max(value, clip.trimStart + 0.1));
                }
                return { ...clip, trimStart: newStart, trimEnd: newEnd };
            }
            return clip;
        }));
    };
    
    const handleSetTransition = (clipId: string) => {
        setTimelineClips(prev => prev.map(c => {
            if (c.id === clipId) {
                if (c.transition) {
                    const { transition, ...rest } = c;
                    return rest;
                } else {
                    return { ...c, transition: { type: 'fade', duration: 1 } };
                }
            }
            return c;
        }));
    };


    const handleExport = async () => {
        if (timelineClips.length === 0) {
            setError("Add at least one clip to the timeline to export.");
            return;
        }
        setIsPlaying(false);
        setIsRendering(true);
        setError(null);
        setRenderProgress(0);
        setRenderMessage("Initializing renderer...");

        try {
            const onProgress = ({ ratio, time, message }: { ratio: number; time?: number; message?: string; }) => {
                setRenderProgress(Math.floor((ratio || 0) * 100));
                if (message) setRenderMessage(message);
            };

            const outputDataUrl = await renderVideo({ clips: timelineClips, onProgress });

            const newAssetId = crypto.randomUUID();
            await storeImage(newAssetId, outputDataUrl);

            const newAsset: BrandAsset = {
                id: newAssetId,
                type: 'video_ad',
                prompt: 'Edited Video',
                createdAt: new Date().toISOString(),
                sourceVideoIds: timelineClips.map(c => c.assetId),
                editedDetails: `Combined ${timelineClips.length} clips.`,
            };
            
            onUpdateBrand({ ...brand, assets: [...brand.assets, newAsset] });
            setTimelineClips([]);
            setActiveClipId(null);
            setPlaybackTime(0);
        } catch (err) {
            console.error("Rendering failed:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred during rendering.");
        } finally {
            setIsRendering(false);
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 h-[calc(100vh-320px)]">
            {isRendering && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg max-w-md w-full">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Rendering Video</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{renderMessage}</p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                            <div className="bg-indigo-600 h-4 rounded-full" style={{ width: `${renderProgress}%` }}></div>
                        </div>
                        <p className="text-center font-semibold text-lg mt-2">{renderProgress}%</p>
                    </div>
                </div>
            )}

            <div className="xl:col-span-1 bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700/50 flex flex-col">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 flex-shrink-0">
                    <FilmIcon className="w-5 h-5" /> Video Library
                </h3>
                <div className="grid grid-cols-2 gap-3 overflow-y-auto">
                    {videoAssets.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 col-span-2">No videos found. Use the Generator tab to create some.</p>}
                    {videoAssets.map(asset => (
                        <VideoLibraryItem key={asset.id} asset={asset} onAdd={addClipToTimeline} />
                    ))}
                </div>
            </div>

            <div className="xl:col-span-3 flex flex-col gap-4">
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                    <div className="lg:col-span-2 bg-black rounded-lg relative flex flex-col items-center justify-center">
                        <VideoPlayer
                            ref={videoRef}
                            src={currentPlaybackClipInfo?.clip.sourceUrl ?? null}
                            isPlaying={isPlaying}
                            time={currentPlaybackClipInfo?.localTime ?? 0}
                            onTimeChange={() => {}}
                        />
                         <button onClick={handleExport} disabled={isRendering || timelineClips.length === 0} className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-wait shadow">
                            <ExportIcon className="w-5 h-5" />
                            {isRendering ? 'Rendering...' : 'Export Video'}
                        </button>
                    </div>
                    <div className="lg:col-span-1 bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700/50 overflow-y-auto">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-sm">Clip Inspector</h3>
                        {activeClip ? (
                            <div className="space-y-4">
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Clip ID: {activeClip.assetId.slice(0, 12)}...</p>
                                <div>
                                    <label className="block font-medium text-xs mb-1">Trim Start: {formatTime(activeClip.trimStart)}</label>
                                    <input type="range" min="0" max={activeClip.duration} step="0.1" value={activeClip.trimStart} onChange={e => handleTrimChange(activeClip.id, 'start', parseFloat(e.target.value))} className="w-full accent-indigo-600"/>
                                </div>
                                <div>
                                    <label className="block font-medium text-xs mb-1">Trim End: {formatTime(activeClip.trimEnd)}</label>
                                    <input type="range" min="0" max={activeClip.duration} step="0.1" value={activeClip.trimEnd} onChange={e => handleTrimChange(activeClip.id, 'end', parseFloat(e.target.value))} className="w-full accent-indigo-600"/>
                                </div>
                                <p className="font-semibold text-xs">Selected Duration: {formatTime(activeClip.trimEnd - activeClip.trimStart)}</p>
                            </div>
                        ) : <p className="text-xs text-slate-500 dark:text-slate-400">Select a clip in the timeline to edit it.</p>}
                    </div>
                </div>
                
                <div className="h-44 bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700/50 flex flex-col">
                     <div className="flex justify-between items-center mb-2 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsPlaying(p => !p)} disabled={timelineClips.length === 0} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full disabled:opacity-50">
                                {isPlaying ? <PauseControlIcon className="w-5 h-5" /> : <PlayControlIcon className="w-5 h-5" />}
                            </button>
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Timeline</h3>
                        </div>
                        <p className="text-sm font-mono text-slate-600 dark:text-slate-300">Total Duration: {formatTime(totalDuration)}</p>
                     </div>
                     <div className="flex-1 flex items-center gap-0 overflow-x-auto bg-slate-100 dark:bg-slate-900/50 p-2 rounded-md">
                        {timelineClips.map((clip, index) => {
                            const clipDuration = clip.trimEnd - clip.trimStart;
                            return (
                                <React.Fragment key={clip.id}>
                                    {index > 0 && (
                                        <div className="h-full flex items-center justify-center w-8 flex-shrink-0 -mx-1 z-10">
                                            <button 
                                                onClick={() => handleSetTransition(clip.id)}
                                                title="Toggle Fade Transition"
                                                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 ${clip.transition ? 'bg-indigo-500 text-white' : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 text-slate-600'}`}
                                            >
                                                <SparklesIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                    <div onClick={() => setActiveClipId(clip.id)} style={{ width: `${Math.max(5, clipDuration) * 20}px` }} className={`h-full group relative rounded-md cursor-pointer flex-shrink-0 border-2 transition-colors ${activeClipId === clip.id ? 'border-indigo-500' : 'border-transparent'}`}>
                                        <img src={clip.thumbnailUrl} alt="clip thumbnail" className="w-full h-full object-cover rounded" />
                                        <div className="absolute inset-0 bg-black/40"></div>
                                        <span className="absolute bottom-1 left-1.5 text-white text-[10px] font-mono drop-shadow-md bg-black/40 px-1 rounded">{formatTime(clipDuration)}</span>
                                        <button onClick={(e) => { e.stopPropagation(); removeClipFromTimeline(clip.id); }} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                                            <XMarkIcon className="w-3 h-3"/>
                                        </button>
                                    </div>
                                </React.Fragment>
                            )
                        })}
                         {timelineClips.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 text-center w-full">Add videos from the library to start editing.</p>}
                     </div>
                </div>
            </div>
             {error && <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in"><p>Error: {error}</p></div>}
        </div>
    );
};

export default VideoEditor;