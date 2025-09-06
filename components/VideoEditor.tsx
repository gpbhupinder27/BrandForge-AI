import React, { useState, useMemo, useCallback } from 'react';
import { Brand, BrandAsset } from '../types';
import { renderVideo } from '../services/videoEditorService';
import { getImage, storeImage } from '../services/imageDb';
import Loader from './Loader';
import FilmIcon from './icons/FilmIcon';
import ExportIcon from './icons/ExportIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import VideoPlayer from './VideoPlayer';

type Clip = {
    id: string; // unique ID for the timeline instance
    assetId: string;
    sourceUrl: string;
    duration: number; // original duration
    trimStart: number;
    trimEnd: number;
};

const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

    const activeClipUrl = useMemo(() => {
        if (!activeClipId) return null;
        const clip = timelineClips.find(c => c.id === activeClipId);
        return clip ? clip.sourceUrl : null;
    }, [activeClipId, timelineClips]);

    const addClipToTimeline = useCallback(async (asset: BrandAsset) => {
        const dataUrl = await getImage(asset.id);
        if (!dataUrl) {
            setError(`Could not load video data for asset ${asset.id}`);
            return;
        }

        const tempVideo = document.createElement('video');
        tempVideo.src = dataUrl;
        tempVideo.onloadedmetadata = () => {
            const newClip: Clip = {
                id: crypto.randomUUID(),
                assetId: asset.id,
                sourceUrl: dataUrl,
                duration: tempVideo.duration,
                trimStart: 0,
                trimEnd: tempVideo.duration,
            };
            setTimelineClips(prev => [...prev, newClip]);
            // If it's the first clip, make it active
            if (timelineClips.length === 0) {
                 setActiveClipId(newClip.id);
            }
        };
    }, [timelineClips.length]);

    const removeClipFromTimeline = (clipId: string) => {
        setTimelineClips(prev => {
            const newClips = prev.filter(c => c.id !== clipId);
            // If the removed clip was the one being previewed, update the preview
            if (activeClipId === clipId) {
                setActiveClipId(newClips.length > 0 ? newClips[0].id : null);
            }
            return newClips;
        });
    };

    const handleTrimChange = (clipId: string, type: 'start' | 'end', value: number) => {
        setTimelineClips(prev => prev.map(clip => {
            if (clip.id === clipId) {
                if (type === 'start') {
                    return { ...clip, trimStart: Math.max(0, Math.min(value, clip.trimEnd - 0.1)) };
                } else {
                    return { ...clip, trimEnd: Math.min(clip.duration, Math.max(value, clip.trimStart + 0.1)) };
                }
            }
            return clip;
        }));
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
            setActiveClipId(null);
        } catch (err) {
            console.error("Rendering failed:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred during rendering.");
        } finally {
            setIsRendering(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-320px)]">
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
            {/* Left: Media Library */}
            <div className="lg:w-1/4 bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700/50 overflow-y-auto">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <FilmIcon className="w-5 h-5" /> Video Library
                </h3>
                <div className="space-y-3">
                    {videoAssets.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No videos found. Use the Generator tab to create some.</p>}
                    {videoAssets.map(asset => (
                        <div key={asset.id} className="group relative">
                            <video src={asset.id} className="w-full rounded-md bg-slate-200 dark:bg-slate-700" muted preload="metadata" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => addClipToTimeline(asset)} className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-white text-xs font-semibold rounded-full hover:scale-105 transition-transform">
                                    <PlusIcon className="w-4 h-4" /> Add to Timeline
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Editor */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="flex-1 bg-black rounded-lg flex items-center justify-center p-2 relative">
                    <VideoPlayer src={activeClipUrl} className="max-w-full max-h-full" />
                     <button onClick={handleExport} disabled={isRendering || timelineClips.length === 0} className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-wait shadow">
                        <ExportIcon className="w-5 h-5" />
                        {isRendering ? 'Rendering...' : 'Export Video'}
                    </button>
                </div>
                {error && <p className="text-center text-red-500 dark:text-red-400">{error}</p>}
                
                {/* Timeline */}
                <div className="h-48 bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700/50 overflow-y-auto">
                     <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-sm">Timeline</h3>
                     <div className="space-y-2">
                        {timelineClips.map((clip) => (
                             <div key={clip.id} onClick={() => setActiveClipId(clip.id)} className={`p-2 rounded-md cursor-pointer transition-colors ${activeClipId === clip.id ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs font-semibold truncate">Clip: {clip.assetId.slice(0, 8)}</p>
                                    <button onClick={(e) => { e.stopPropagation(); removeClipFromTimeline(clip.id); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                                        <TrashIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
                                    </button>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                                    <div>
                                        <label className="block font-medium mb-1">Trim Start: {formatTime(clip.trimStart)}</label>
                                        <input type="range" min="0" max={clip.duration} step="0.1" value={clip.trimStart} onClick={e => e.stopPropagation()} onChange={e => handleTrimChange(clip.id, 'start', parseFloat(e.target.value))} className="w-full accent-indigo-600"/>
                                    </div>
                                    <div>
                                        <label className="block font-medium mb-1">Trim End: {formatTime(clip.trimEnd)}</label>
                                        <input type="range" min="0" max={clip.duration} step="0.1" value={clip.trimEnd} onClick={e => e.stopPropagation()} onChange={e => handleTrimChange(clip.id, 'end', parseFloat(e.target.value))} className="w-full accent-indigo-600"/>
                                    </div>
                                    <p className="font-semibold">Duration: {formatTime(clip.trimEnd - clip.trimStart)}</p>
                                </div>
                            </div>
                        ))}
                         {timelineClips.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">Add videos from the library to start editing.</p>}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default VideoEditor;