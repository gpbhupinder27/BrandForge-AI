import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Brand, BrandAsset, TextOverlay } from '../types';
import { renderVideo, ClipTransition } from '../services/videoEditorService';
import { getImage, storeImage } from '../services/imageDb';
import { generateVideoThumbnail, getVideoDuration } from '../services/videoUtils';
import Loader from './Loader';
import FilmIcon from './icons/FilmIcon';
import ExportIcon from './icons/ExportIcon';
import PlusIcon from './icons/PlusIcon';
import XMarkIcon from './icons/XMarkIcon';
import SparklesIcon from './icons/SparklesIcon';
import PlayControlIcon from './icons/PlayControlIcon';
import PauseControlIcon from './icons/PauseControlIcon';

// --- START IN-COMPONENT ICONS ---
const TextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H4.5M7.5 3.75V1.5M7.5 3.75v3.75m0-3.75h3.75m-3.75 0h-3.75m3.75 0v3.75m0-3.75h3.75M12 1.5V12m0 0v10.5m0-10.5h9.75M12 12H2.25" />
    </svg>
);
// --- END IN-COMPONENT ICONS ---

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
                try {
                    const thumbUrl = await generateVideoThumbnail(dataUrl);
                    setThumbnail(thumbUrl);
                    const videoDuration = await getVideoDuration(asset.id);
                    setDuration(videoDuration);
                } catch (e) {
                    console.error("Could not generate thumbnail for asset", asset.id, e);
                    // Set a fallback or error state for the thumbnail if needed
                }
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
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
    const [activeElementId, setActiveElementId] = useState<string | null>(null);

    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderMessage, setRenderMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoElementsRef = useRef<Record<string, HTMLVideoElement>>({});
    const animationFrameRef = useRef<number | null>(null);

    const activeElement = useMemo(() => {
        return timelineClips.find(c => c.id === activeElementId) || textOverlays.find(t => t.id === activeElementId);
    }, [activeElementId, timelineClips, textOverlays]);
    const activeElementType = useMemo(() => {
        if (!activeElement) return null;
        return 'assetId' in activeElement ? 'clip' : 'text';
    }, [activeElement]);


    const totalDuration = useMemo(() => {
        return timelineClips.reduce((acc, clip) => acc + (clip.trimEnd - clip.trimStart), 0);
    }, [timelineClips]);

    // Main drawing loop for canvas preview
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Find current clip to draw
        let cumulativeTime = 0;
        let drawn = false;
        for (const clip of timelineClips) {
            const clipDuration = clip.trimEnd - clip.trimStart;
            if (playbackTime >= cumulativeTime && playbackTime < cumulativeTime + clipDuration) {
                const videoEl = videoElementsRef.current[clip.id];
                const timeIntoClip = playbackTime - cumulativeTime;
                videoEl.currentTime = clip.trimStart + timeIntoClip;
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                drawn = true;
                break;
            }
            cumulativeTime += clipDuration;
        }

        // If not drawn (e.g., at the very end), draw the last frame
        if (!drawn && timelineClips.length > 0) {
            const lastClip = timelineClips[timelineClips.length - 1];
            const videoEl = videoElementsRef.current[lastClip.id];
            if (videoEl) {
                videoEl.currentTime = lastClip.trimEnd;
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            }
        }

        // Draw text overlays
        for (const overlay of textOverlays) {
            if (playbackTime >= overlay.startTime && playbackTime <= overlay.endTime) {
                const fontSize = (overlay.fontSize / 100) * canvas.height;
                ctx.font = `${fontSize}px '${overlay.fontFamily}'`;
                ctx.fillStyle = overlay.color;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                const x = (overlay.position.x / 100) * canvas.width;
                const y = (overlay.position.y / 100) * canvas.height;
                ctx.fillText(overlay.text, x, y);
            }
        }

    }, [playbackTime, timelineClips, textOverlays]);
    
    // Animation loop controller
    useEffect(() => {
        let lastTime = performance.now();
        const animate = (time: number) => {
            const deltaTime = (time - lastTime) / 1000;
            lastTime = time;
            setPlaybackTime(prev => {
                const newTime = prev + deltaTime;
                if (newTime >= totalDuration) {
                    setIsPlaying(false);
                    return 0; // Loop
                }
                return newTime;
            });
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(animate);
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isPlaying, totalDuration]);

    useEffect(() => {
        draw();
    }, [playbackTime, draw]);

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
            if (!activeElementId) {
                 setActiveElementId(newClip.id);
            }
        } catch(err) {
            setError(err instanceof Error ? err.message : 'Could not add clip');
        }
    }, [activeElementId]);

    const addTextOverlay = () => {
        const typography = brand.assets.find(a => a.type === 'typography')?.typography;
        const newText: TextOverlay = {
            id: crypto.randomUUID(),
            text: "Your Text Here",
            fontFamily: typography?.headlineFont.name || 'Manrope',
            fontSize: 8, // 8% of video height
            color: '#FFFFFF',
            startTime: playbackTime,
            endTime: Math.min(playbackTime + 3, totalDuration),
            position: { x: 10, y: 80 }
        };
        setTextOverlays(prev => [...prev, newText]);
        setActiveElementId(newText.id);
    };
    
    const updateElement = (id: string, updates: Partial<Clip | TextOverlay>) => {
        setTimelineClips(clips => clips.map(c => c.id === id ? { ...c, ...updates } : c));
        setTextOverlays(texts => texts.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const removeElement = (id: string) => {
        setTimelineClips(prev => prev.filter(c => c.id !== id));
        setTextOverlays(prev => prev.filter(c => c.id !== id));
        if (activeElementId === id) {
            setActiveElementId(null);
        }
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

            const outputDataUrl = await renderVideo({ clips: timelineClips, textOverlays, brand, onProgress });

            const newAssetId = crypto.randomUUID();
            await storeImage(newAssetId, outputDataUrl);

            const newAsset: BrandAsset = {
                id: newAssetId,
                type: 'video_ad',
                prompt: 'Edited Video',
                createdAt: new Date().toISOString(),
                sourceVideoIds: timelineClips.map(c => c.assetId),
                editedDetails: `Combined ${timelineClips.length} clips with ${textOverlays.length} text overlays.`,
            };
            
            onUpdateBrand({ ...brand, assets: [...brand.assets, newAsset] });
            setTimelineClips([]);
            setTextOverlays([]);
            setActiveElementId(null);
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
            
            {/* Hidden video elements for canvas drawing */}
            <div style={{ display: 'none' }}>
                {timelineClips.map(clip => (
                    <video
                        key={clip.id}
                        ref={el => { if(el) videoElementsRef.current[clip.id] = el; }}
                        src={clip.sourceUrl}
                        crossOrigin="anonymous"
                        preload="auto"
                        muted
                    />
                ))}
            </div>

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
                        <canvas ref={canvasRef} width="1280" height="720" className="w-full h-auto object-contain max-h-full" />
                         <button onClick={handleExport} disabled={isRendering || timelineClips.length === 0} className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-wait shadow">
                            <ExportIcon className="w-5 h-5" />
                            {isRendering ? 'Rendering...' : 'Export Video'}
                        </button>
                    </div>
                    <div className="lg:col-span-1 bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700/50 overflow-y-auto">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-sm">Inspector</h3>
                        {!activeElement && <p className="text-xs text-slate-500 dark:text-slate-400">Select an element in the timeline to edit its properties.</p>}
                        {activeElement && activeElementType === 'clip' && (
                           <div className="space-y-4">
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Clip ID: {(activeElement as Clip).assetId.slice(0, 12)}...</p>
                                <div>
                                    <label className="block font-medium text-xs mb-1">Trim Start: {formatTime((activeElement as Clip).trimStart)}</label>
                                    <input type="range" min="0" max={(activeElement as Clip).duration} step="0.1" value={(activeElement as Clip).trimStart} onChange={e => updateElement(activeElement.id, { trimStart: parseFloat(e.target.value)})} className="w-full accent-indigo-600"/>
                                </div>
                                <div>
                                    <label className="block font-medium text-xs mb-1">Trim End: {formatTime((activeElement as Clip).trimEnd)}</label>
                                    <input type="range" min="0" max={(activeElement as Clip).duration} step="0.1" value={(activeElement as Clip).trimEnd} onChange={e => updateElement(activeElement.id, { trimEnd: parseFloat(e.target.value)})} className="w-full accent-indigo-600"/>
                                </div>
                                <p className="font-semibold text-xs">Selected Duration: {formatTime((activeElement as Clip).trimEnd - (activeElement as Clip).trimStart)}</p>
                            </div>
                        )}
                         {activeElement && activeElementType === 'text' && (
                           <div className="space-y-3">
                                <div>
                                    <label className="block font-medium text-xs mb-1">Text Content</label>
                                    <textarea value={(activeElement as TextOverlay).text} onChange={e => updateElement(activeElement.id, { text: e.target.value })} rows={2} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm"/>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-medium text-xs mb-1">Font Size</label>
                                        <input type="number" value={(activeElement as TextOverlay).fontSize} onChange={e => updateElement(activeElement.id, { fontSize: parseInt(e.target.value) })} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 text-sm"/>
                                    </div>
                                    <div>
                                        <label className="block font-medium text-xs mb-1">Color</label>
                                        <input type="color" value={(activeElement as TextOverlay).color} onChange={e => updateElement(activeElement.id, { color: e.target.value })} className="w-full h-8 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md p-0"/>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="h-48 bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700/50 flex flex-col">
                     <div className="flex justify-between items-center mb-2 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsPlaying(p => !p)} disabled={timelineClips.length === 0} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full disabled:opacity-50">
                                {isPlaying ? <PauseControlIcon className="w-5 h-5" /> : <PlayControlIcon className="w-5 h-5" />}
                            </button>
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Timeline</h3>
                             <button onClick={addTextOverlay} disabled={timelineClips.length === 0} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50">
                                <TextIcon className="w-4 h-4" /> Add Text
                            </button>
                        </div>
                        <p className="text-sm font-mono text-slate-600 dark:text-slate-300">{formatTime(playbackTime)} / {formatTime(totalDuration)}</p>
                     </div>
                     <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900/50 p-2 rounded-md space-y-1">
                        {/* Video Track */}
                        <div className="h-16 flex items-center gap-0.5">
                            {timelineClips.map((clip) => {
                                const clipDuration = clip.trimEnd - clip.trimStart;
                                return (
                                    <div key={clip.id} onClick={() => setActiveElementId(clip.id)} style={{ width: `${clipDuration / totalDuration * 100}%` }} className={`h-full group relative rounded-md cursor-pointer flex-shrink-0 border-2 transition-colors ${activeElementId === clip.id ? 'border-indigo-500' : 'border-transparent'}`}>
                                        <img src={clip.thumbnailUrl} alt="clip thumbnail" className="w-full h-full object-cover rounded" />
                                        <div className="absolute inset-0 bg-black/40"></div>
                                        <span className="absolute bottom-1 left-1.5 text-white text-[10px] font-mono drop-shadow-md bg-black/40 px-1 rounded">{formatTime(clipDuration)}</span>
                                        <button onClick={(e) => { e.stopPropagation(); removeElement(clip.id); }} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                                            <XMarkIcon className="w-3 h-3"/>
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                        {/* Text Track */}
                        <div className="h-10 relative">
                            {textOverlays.map(overlay => {
                                const left = (overlay.startTime / totalDuration) * 100;
                                const width = ((overlay.endTime - overlay.startTime) / totalDuration) * 100;
                                return (
                                    <div 
                                        key={overlay.id}
                                        onClick={() => setActiveElementId(overlay.id)}
                                        style={{ left: `${left}%`, width: `${width}%` }}
                                        className={`absolute h-full group rounded cursor-pointer border-2 transition-colors ${activeElementId === overlay.id ? 'border-purple-500 bg-purple-200/50 dark:bg-purple-900/50' : 'border-transparent bg-purple-200/30 dark:bg-purple-900/30'}`}
                                    >
                                        <p className="text-xs text-purple-800 dark:text-purple-200 p-1 truncate">{overlay.text}</p>
                                    </div>
                                )
                            })}
                        </div>
                     </div>
                </div>
            </div>
             {error && <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in"><p>Error: {error}</p></div>}
        </div>
    );
};

export default VideoEditor;
