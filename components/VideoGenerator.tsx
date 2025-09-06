import React, { useState, useRef } from 'react';
import { Brand, BrandAsset } from '../types';
import { generateWithNanoBanana, fileToBase64 } from '../services/geminiService';
import { generateVideoFromImage } from '../services/falService';
import { storeImage } from '../services/imageDb';
import Loader from './Loader';
import SparklesIcon from './icons/SparklesIcon';
import AsyncImage from './AsyncImage';
import ImageIcon from './icons/ImageIcon';
import XMarkIcon from './icons/XMarkIcon';
import VideoIcon from './icons/VideoIcon';
import AsyncVideo from './AsyncVideo';

interface VideoGeneratorProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
  falApiKey: string;
  videoAssets: BrandAsset[];
}

type AspectRatio = '16:9' | '1:1' | '9:16' | '4:3' | '3:4';

const inputClasses = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100 transition-shadow";

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ brand, onUpdateBrand, falApiKey, videoAssets }) => {
    const [imagePrompt, setImagePrompt] = useState('');
    const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');

    const [activeImage, setActiveImage] = useState<{ id: string, url: string } | null>(null);
    const [editPrompt, setEditPrompt] = useState('');

    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerateImage = async (isEdit = false) => {
        const promptToUse = isEdit ? editPrompt : imagePrompt;
        if (!promptToUse.trim()) {
            setError("Please enter a prompt.");
            return;
        }

        setIsLoadingImage(true);
        setError(null);

        try {
            let imageInputs = [];
            if (isEdit && activeImage) {
                const response = await fetch(activeImage.url);
                const blob = await response.blob();
                const file = new File([blob], "edit_image.png", { type: blob.type });
                const base64 = await fileToBase64(file);
                imageInputs.push({ data: base64, mimeType: file.type });
            } else if (referenceImageFile) {
                const base64 = await fileToBase64(referenceImageFile);
                imageInputs.push({ data: base64, mimeType: referenceImageFile.type });
            }

            const paletteAsset = brand.assets.find(a => a.type === 'palette');
            const paletteInfo = paletteAsset?.palette ? ` Use the brand's color palette: ${paletteAsset.palette.colors.map(c => c.hex).join(', ')}.` : '';

            const finalPrompt = `Create a visually stunning image for a video ad. User request: "${promptToUse}".${paletteInfo}`;
            
            const generatedParts = await generateWithNanoBanana(finalPrompt, imageInputs);
            const imagePart = generatedParts.find(p => 'inlineData' in p);

            if (imagePart && 'inlineData' in imagePart) {
                const newId = crypto.randomUUID();
                const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                await storeImage(newId, imageUrl);
                setActiveImage({ id: newId, url: imageUrl });
                setEditPrompt('');
            } else {
                throw new Error("AI did not return an image.");
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred while generating the image.");
        } finally {
            setIsLoadingImage(false);
        }
    };
    
    const handleGenerateVideo = async () => {
        if (!activeImage) {
            setError("Please generate or select an image first.");
            return;
        }
        if (!falApiKey.trim()) {
            setError("Please enter your Fal.ai API key to generate videos.");
            return;
        }
        setIsLoadingVideo(true);
        setError(null);

        try {
            const videoResponse = await generateVideoFromImage({
                apiKey: falApiKey,
                imageUrl: activeImage.url,
                aspectRatio: aspectRatio
            });
            
            const videoUrl = videoResponse.video.url;
            const res = await fetch(videoUrl);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                const videoId = crypto.randomUUID();
                await storeImage(videoId, base64data);

                // Save the source image as a 'poster' asset (or another appropriate type)
                const imageAsset: BrandAsset = {
                    id: activeImage.id,
                    type: 'poster', // Using poster as a generic image type for the source
                    prompt: imagePrompt,
                    createdAt: new Date().toISOString(),
                };

                // Save the video as a 'video_ad' asset
                const videoAsset: BrandAsset = {
                    id: videoId,
                    type: 'video_ad',
                    prompt: `Video generated from image based on prompt: "${imagePrompt}"`,
                    createdAt: new Date().toISOString(),
                    parentId: activeImage.id,
                };

                onUpdateBrand({
                    ...brand,
                    assets: [...brand.assets, imageAsset, videoAsset]
                });
                
                setActiveImage(null);
                setImagePrompt('');
                setReferenceImageFile(null);
                setIsLoadingVideo(false);
            };

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred while generating the video.");
            setIsLoadingVideo(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700/50 space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{activeImage ? 'Step 2: Generate Video' : 'Step 1: Create Base Image'}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">First, generate a static image. You can then edit it or proceed to generate the video.</p>
                    </div>

                    <div className={activeImage ? 'opacity-50 pointer-events-none' : ''}>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Image Prompt</label>
                            <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={3} placeholder="e.g., A cinematic shot of a new sneaker on a mountain top" className={inputClasses} disabled={isLoadingImage} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Reference Image (Optional)</label>
                            {referenceImageFile ? (
                                <div className="relative group">
                                    <img src={URL.createObjectURL(referenceImageFile)} alt="Preview" className="w-full h-auto max-h-40 object-contain rounded-md border border-slate-300 dark:border-slate-600 p-1" />
                                    <button onClick={() => { setReferenceImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"><XMarkIcon className="w-4 h-4" /></button>
                                </div>
                            ) : (
                               <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                                    <ImageIcon className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500" />
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400"><span className="font-semibold text-indigo-600 dark:text-indigo-400">Upload Image</span></p>
                               </button>
                            )}
                            <input type="file" accept="image/*" onChange={e => e.target.files && setReferenceImageFile(e.target.files[0])} ref={fileInputRef} className="hidden" disabled={isLoadingImage} />
                        </div>
                        <button onClick={() => handleGenerateImage(false)} disabled={isLoadingImage || !imagePrompt.trim()} className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50">
                           <SparklesIcon className="w-5 h-5" />
                           {isLoadingImage ? 'Generating Image...' : 'Generate Image'}
                       </button>
                   </div>

                   {activeImage && (
                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                            <div>
                               <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Video Aspect Ratio</label>
                               <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value as AspectRatio)} className={inputClasses} disabled={isLoadingVideo}>
                                   <option value="16:9">16:9 (Widescreen)</option>
                                   <option value="1:1">1:1 (Square)</option>
                                   <option value="9:16">9:16 (Vertical)</option>
                                   <option value="4:3">4:3 (Standard)</option>
                                   <option value="3:4">3:4 (Portrait)</option>
                               </select>
                            </div>
                           <button onClick={handleGenerateVideo} disabled={isLoadingVideo || !falApiKey.trim()} className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50">
                               <VideoIcon className="w-5 h-5" />
                               {isLoadingVideo ? 'Generating Video...' : 'Generate Video'}
                           </button>
                        </div>
                   )}
                </div>
                <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center min-h-[50vh]">
                   {isLoadingImage ? <Loader message="Generating image..."/> : activeImage ? (
                        <div className="w-full space-y-4">
                            <AsyncImage assetId={activeImage.id} alt="Generated image" className="w-full rounded-md object-contain" />
                            <div>
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Edit Image:</label>
                                <div className="flex gap-2">
                                    <input type="text" value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="e.g., make it red" className={inputClasses} />
                                    <button onClick={() => handleGenerateImage(true)} disabled={!editPrompt.trim()} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50">Edit</button>
                                </div>
                            </div>
                        </div>
                   ) : (
                    <div className="text-center text-slate-500 dark:text-slate-400">
                        <ImageIcon className="w-16 h-16 mx-auto" />
                        <p className="mt-2 font-semibold">Your generated image will appear here</p>
                    </div>
                   )}
                   {isLoadingVideo && <Loader message="Generating video, this may take a minute..."/>}
                </div>
            </div>

            {error && <p className="text-center text-red-500 dark:text-red-400">Error: {error}</p>}

            <div className="mt-12">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Generated Video Ads</h3>
                {videoAssets.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        <VideoIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500" />
                        <h5 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">Your Video Ads Will Appear Here</h5>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a base image and generate a video to see it in your library.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videoAssets.map(asset => (
                            <div key={asset.id} className="group relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700/50">
                               <AsyncVideo assetId={asset.id} className="w-full h-full object-cover" />
                               <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex flex-col justify-end">
                                    <p className="text-xs font-semibold text-white drop-shadow-lg truncate">{asset.prompt}</p>
                               </div>
                           </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoGenerator;
