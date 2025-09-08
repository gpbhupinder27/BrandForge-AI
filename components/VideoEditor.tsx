import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Brand, BrandAsset } from '../types';
import { renderVideo } from '../services/videoEditorService';
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

type Clip = {
    id: string; // unique ID for the timeline instance
    assetId: string;
    sourceUrl: string;
    thumbnailUrl: string;
    duration: number; // original duration
    trimStart: number;
    trimEnd: number;
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
    const [activeClip, setActiveClip] = useState<Clip | null>(null);

    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderMessage, setRenderMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const totalDuration = useMemo(() => timelineClips.reduce((acc, clip) => acc + (clip.trimEnd - clip.trimStart), 0), [timelineClips]);

    const addClipToTimeline = useCallback(async (asset: BrandAsset) => {
        try {
            const dataUrl = await getImage(asset.id);
            if (!dataUrl) {
                throw new Error(`Could not load video data for asset ${asset.id}`);
            }
            const thumbnailUrl = await generateVideoThumbnail(dataUrl);
            const duration = await getVideoDuration(asset.id);

            const newClip: Clip = {
                id: crypto.randomUUID(),
                assetId: asset.id,
                sourceUrl: dataUrl,
                thumbnailUrl,
                duration: duration,
                trimStart: 0,
                trimEnd: duration,
            };
            setTimelineClips(prev => [...prev, newClip]);
            if (!activeClip) {
                 setActiveClip(newClip);
            }
        } catch(err) {
            setError(err instanceof Error ? err.message : 'Could not add clip');
        }
    }, [activeClip]);

    const removeClipFromTimeline = (clipId: string) => {
        setTimelineClips(prev => {
            const newClips = prev.filter(c => c.id !== clipId);
            if (activeClip?.id === clipId) {
                setActiveClip(newClips.length > 0 ? newClips[0] : null);
            }
            return newClips;
        });
    };

    const handleTrimChange = (clipId: string, type: 'start' | 'end', value: number) => {
        const updatedClips = timelineClips.map(clip => {
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
        });
        setTimelineClips(updatedClips);
        
        // Also update the activeClip state if it's the one being edited
        const active = updatedClips.find(c => c.id === activeClip?.id);
        if (active) {
            setActiveClip(active);
        }
    };

    const handleExport = async () => {
        if (timelineClips.length === 0) {
            setError("Add at least one clip to the timeline to export.");
            return;
        }
        setIsRendering(true);
        setError(null);
        setRenderProgress(0);
        setRenderMessage("Initializing renderer...");

        try {
            const onProgress = ({ ratio, time, message }: { ratio: number; time?: number; message?: string; }) => {
                const progress = Math.floor((ratio || 0) * 100);
                setRenderProgress(progress);
                if (message) setRenderMessage(message);
                else if (time) setRenderMessage(`Processing... Current time: ${Math.round(time / 1000)}s`);
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
            setActiveClip(null);
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

            {/* Media Library */}
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

            {/* Editor */}
            <div className="xl:col-span-3 flex flex-col gap-4">
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                    <div className="lg:col-span-2 bg-black rounded-lg relative flex flex-col">
                        <VideoPlayer key={activeClip?.id} src={activeClip?.sourceUrl || null} startTime={activeClip?.trimStart} endTime={activeClip?.trimEnd} />
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
                
                {/* Timeline */}
                <div className="h-44 bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700/50 flex flex-col">
                     <div className="flex justify-between items-center mb-2 flex-shrink-0">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Timeline</h3>
                        <p className="text-sm font-mono text-slate-600 dark:text-slate-300">Total Duration: {formatTime(totalDuration)}</p>
                     </div>
                     <div className="flex-1 flex items-center gap-2 overflow-x-auto bg-slate-100 dark:bg-slate-900/50 p-2 rounded-md">
                        {timelineClips.map((clip) => {
                            const clipDuration = clip.trimEnd - clip.trimStart;
                            const width = Math.max(50, (clipDuration / Math.max(totalDuration, 1)) * 1000); // Proportional width with a minimum
                            return (
                                <div key={clip.id} onClick={() => setActiveClip(clip)} style={{ minWidth: `${width}px` }} className={`h-full group relative rounded-md cursor-pointer flex-shrink-0 border-2 transition-colors ${activeClip?.id === clip.id ? 'border-indigo-500' : 'border-transparent'}`}>
                                    <img src={clip.thumbnailUrl} alt="clip thumbnail" className="w-full h-full object-cover rounded" />
                                     <div className="absolute inset-0 bg-black/40"></div>
                                    <span className="absolute bottom-1 left-1.5 text-white text-[10px] font-mono drop-shadow-md bg-black/40 px-1 rounded">{formatTime(clipDuration)}</span>
                                    <button onClick={(e) => { e.stopPropagation(); removeClipFromTimeline(clip.id); }} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                                        <XMarkIcon className="w-3 h-3"/>
                                    </button>
                                </div>
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