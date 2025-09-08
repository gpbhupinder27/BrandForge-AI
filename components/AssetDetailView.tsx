import React, { useState, useMemo } from 'react';
import { Brand, BrandAsset, AssetType } from '../types';
import AsyncImage from './AsyncImage';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import EditIcon from './icons/EditIcon';
import DownloadIcon from './icons/DownloadIcon';
import BeakerIcon from './icons/BeakerIcon';
import XMarkIcon from './icons/XMarkIcon';
import { generateWithNanoBanana, fileToBase64, getImageDimensions } from '../services/geminiService';
import { storeImage, getImage, deleteImages } from '../services/imageDb';
import Loader from './Loader';
import ClipboardIcon from './icons/ClipboardIcon';
import WandIcon from './icons/WandIcon';
import AsyncVideo from './AsyncVideo';
import TrashIcon from './icons/TrashIcon';
import VideoIcon from './icons/VideoIcon';

interface AssetDetailViewProps {
  asset: BrandAsset;
  brand: Brand;
  onBack: () => void;
  onUpdateBrand: (updatedBrand: Brand) => void;
  onRequestVideoConversion?: (assetId: string) => void;
}

// FIX: Add 'video_source_image' to ASSET_TYPE_LABELS to satisfy the Record<AssetType, string> type.
const ASSET_TYPE_LABELS: Record<AssetType, string> = {
    logo: 'Logo',
    palette: 'Color Palette',
    typography: 'Typography Pairing',
    poster: 'Poster',
    banner: 'Web Banner',
    social_ad: 'Social Ad',
    instagram_story: 'Instagram Story',
    twitter_post: 'Twitter Post',
    youtube_thumbnail: 'YouTube Thumbnail',
    video_ad: 'Video Ad',
    video_source_image: 'Video Source Image',
};

const QUICK_EDITS = [
    { label: 'Brighter', text: ', make the overall image brighter and more vibrant' },
    { label: 'More Contrast', text: ', increase the contrast for a more dramatic look' },
    { label: 'B & W', text: ', convert the image to a high-contrast black and white' },
    { label: 'Vintage', text: ', apply a warm, vintage film-style filter' },
    { label: 'Add Border', text: ', add a thin, clean border around the entire image' },
];


const AssetDetailView: React.FC<AssetDetailViewProps> = ({ asset, brand, onBack, onUpdateBrand, onRequestVideoConversion }) => {
    const [tagInput, setTagInput] = useState('');
    const [isPromptEditing, setIsPromptEditing] = useState(false);
    const [promptInputValue, setPromptInputValue] = useState(asset.prompt);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const allTags = useMemo(() => [...new Set(brand.assets.flatMap(a => a.tags || []))].sort(), [brand.assets]);

    const handleRemoveTag = (tagToRemove: string) => {
        const newTags = asset.tags?.filter(t => t !== tagToRemove) || [];
        handleUpdateAssetTags(asset.id, newTags);
    };

    const handleAddTag = (tagToAdd: string) => {
        const newTag = tagToAdd.trim();
        if (!newTag) return;
        const currentTags = asset.tags || [];
        if (!currentTags.includes(newTag)) {
            handleUpdateAssetTags(asset.id, [...currentTags, newTag]);
        }
        setTagInput('');
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            handleAddTag(tagInput);
        }
    };
    
    const handleUpdateAssetTags = (assetId: string, tags: string[]) => {
        const updatedAssets = brand.assets.map(a => 
            a.id === assetId ? { ...a, tags } : a
        );
        onUpdateBrand({ ...brand, assets: updatedAssets });
    };
    
    const handleDownload = async () => {
        const dataUrl = await getImage(asset.id);
        if (!dataUrl) {
            setError("Could not find asset to download.");
            return;
        }
        
        const isVideo = asset.type === 'video_ad';
        const fileExtension = isVideo ? 'mp4' : 'png';
        const filename = `${brand.name}-${asset.type}-${asset.id.slice(0, 6)}.${fileExtension}`;
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to permanently delete this ${ASSET_TYPE_LABELS[asset.type]}? This will also delete any associated variants or generated videos and cannot be undone.`)) {
            try {
                const allAssets = brand.assets;
                const idsToDelete = new Set<string>();
                const queue = [asset.id]; // Start with the asset to delete
                idsToDelete.add(asset.id);

                // Traverse the dependency tree to find all descendants (BFS)
                while (queue.length > 0) {
                    const currentId = queue.shift()!;
                    const children = allAssets.filter(a => a.parentId === currentId);
                    for (const child of children) {
                        if (!idsToDelete.has(child.id)) {
                            idsToDelete.add(child.id);
                            queue.push(child.id);
                        }
                    }
                }

                const idsToDeleteArray = Array.from(idsToDelete);
                const updatedAssets = allAssets.filter(a => !idsToDelete.has(a.id));
                
                onUpdateBrand({ ...brand, assets: updatedAssets });

                // Asynchronously delete from IndexedDB
                await deleteImages(idsToDeleteArray);

                onBack(); // Go back to the library view
            } catch (err) {
                console.error("Failed to delete asset:", err);
                setError(err instanceof Error ? err.message : "Could not delete asset from the database.");
            }
        }
    };

    const handleCopy = async () => {
        setError(null);
        if (asset.type === 'video_ad') {
            setError("Copying videos is not supported.");
            return;
        }
        const imageUrl = await getImage(asset.id);
        if (!imageUrl) {
            setError("Could not find image to copy.");
            return;
        }
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            // @ts-ignore
            await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2500);
        } catch (err) {
            console.error("Failed to copy image:", err);
            setError("Failed to copy image. Your browser might not support this feature.");
        }
    };

    const runGenerationForAsset = async (baseAsset: BrandAsset, generationPrompt: string, isVariant: boolean) => {
        setError(null);

        const getDimensions = (url: string): Promise<{ width: number, height: number }> => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ width: img.width, height: img.height });
                img.onerror = () => resolve({ width: 1024, height: 1024 }); // Fallback
                img.src = url;
            });
        };

        const logoAsset = brand.assets.find(a => a.type === 'logo');
        if (!logoAsset) throw new Error("A brand logo is required for this action.");

        const baseImageUrl = await getImage(baseAsset.id);
        if (!baseImageUrl) throw new Error("Base asset image not found.");

        const logoImageUrl = await getImage(logoAsset.id);
        if (!logoImageUrl) throw new Error("Logo image not found.");

        const [baseImageFile, logoFile] = await Promise.all([
            fetch(baseImageUrl).then(r => r.blob()).then(b => new File([b], "base.png", {type: b.type})),
            fetch(logoImageUrl).then(r => r.blob()).then(b => new File([b], "logo.png", {type: b.type}))
        ]);

        const [baseImageBase64, logoBase64] = await Promise.all([
            fileToBase64(baseImageFile),
            fileToBase64(logoFile)
        ]);

        const imageInputs = [
            { data: logoBase64, mimeType: logoFile.type },
            { data: baseImageBase64, mimeType: baseImageFile.type }
        ];

        let fullPrompt = '';
        if (isVariant) {
            const assetCategory = baseAsset.type === 'logo' ? 'logo' : 'marketing creative';
            if (assetCategory === 'logo') {
                fullPrompt = `Create exactly 2 A/B test variations for the provided logo. The original prompt was: "${baseAsset.prompt}". Generate two distinct versions that target different potential audiences. For example, one could be more playful and modern for a younger audience, while the other could be more elegant and professional for a corporate audience. The variations should explore different styles (e.g., color, typography, shape) but keep the brand name '${brand.name}' clear.`;
            } else { // marketing creative
                fullPrompt = `Create exactly 2 A/B test variations for the provided marketing creative. The original goal was: "${baseAsset.prompt}". Generate two distinct versions that target different marketing angles. For example, one variant could have a stronger call-to-action focused on a limited-time sale (e.g., "50% Off Today!"), while the other could focus on a product feature or building brand engagement (e.g., "Experience the new..."). The variations should explore different headlines, secondary text, or color schemes to achieve these different goals. Do not change the brand logo's placement or design.`;
            }
        } else {
            const paletteAsset = brand.assets.find(a => a.type === 'palette');
            const paletteInfo = paletteAsset?.palette ? ` The brand's color palette is: ${paletteAsset.palette.colors.map(c => c.hex).join(', ')}.` : '';
            fullPrompt = `Update the input image based on this request: "${generationPrompt}". Do not change the input aspect ratio. The original prompt was "${baseAsset.prompt}". The image is for a brand named "${brand.name}". ${paletteInfo} Ensure the brand logo remains clearly visible.`;
        }
        
        const { width, height } = await getDimensions(baseImageUrl);
        const generatedParts = await generateWithNanoBanana(fullPrompt, imageInputs, width, height);
        const newAssets: BrandAsset[] = [];
        
        for (const [index, part] of generatedParts.filter(p => 'inlineData' in p).entries()) {
            if ('inlineData' in part) {
                const newId = crypto.randomUUID();
                const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                await storeImage(newId, imageUrl);
                const { width: genWidth, height: genHeight } = await getImageDimensions(imageUrl);
                newAssets.push({
                    id: newId,
                    type: baseAsset.type,
                    prompt: isVariant
                        ? (baseAsset.type === 'logo'
                            ? `A/B Test Variant (Audience Exploration) of: "${baseAsset.prompt}"`
                            : `A/B Test Variant (Marketing Angle) of: "${baseAsset.prompt}"`)
                        : generationPrompt,
                    createdAt: new Date().toISOString(),
                    tags: baseAsset.tags || [],
                    parentId: isVariant ? baseAsset.id : undefined,
                    variantLabel: isVariant ? `Variant ${index + 1}` : undefined,
                    width: genWidth,
                    height: genHeight,
                });
            }
        }
        
        if (newAssets.length === 0) {
            throw new Error("The AI did not return any images. Please try again.");
        }
        
        onUpdateBrand({ ...brand, assets: [...brand.assets, ...newAssets] });
    };

    const handleGenerateAction = async (action: 'edit' | 'variants', newPrompt?: string) => {
        setIsLoading(true);
        setLoadingMessage(action === 'edit' ? `Regenerating asset...` : `Generating A/B variants...`);
        try {
            if (action === 'edit' && newPrompt) {
                await runGenerationForAsset(asset, newPrompt, false);
                setIsPromptEditing(false);
                onBack(); // Go back to library to see the new asset
            } else if (action === 'variants') {
                await runGenerationForAsset(asset, '', true);
                onBack(); 
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : `An unknown error occurred.`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleConvertToVideo = () => {
        if (onRequestVideoConversion) {
            onRequestVideoConversion(asset.id);
        }
    };


    const renderPreviewContent = () => {
        if (asset.type === 'palette' && asset.palette) {
            return (
                <div className="p-8 bg-white dark:bg-slate-800 rounded-lg">
                    <h4 className="font-bold text-2xl text-slate-900 dark:text-slate-100">{asset.palette.paletteName}</h4>
                    <p className="text-base text-slate-600 dark:text-slate-400 mb-6">{asset.palette.description}</p>
                    <div className="flex flex-wrap gap-6">
                        {asset.palette.colors.map(color => (
                            <div key={color.hex} className="text-center">
                                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-700 shadow-lg" style={{ backgroundColor: color.hex }}></div>
                                <p className="text-lg mt-3 font-mono tracking-tighter text-slate-700 dark:text-slate-300">{color.hex}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{color.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )
        }
        if (asset.type === 'typography' && asset.typography) {
            return (
                <div className="space-y-8 p-8 bg-white dark:bg-slate-800 rounded-lg w-full max-w-2xl">
                    <div>
                        <p className="text-base text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Headline</p>
                        <p className="text-6xl font-bold text-slate-900 dark:text-slate-50 mt-1 break-words" style={{fontFamily: asset.typography.headlineFont?.name ? `'${asset.typography.headlineFont.name}', 'Manrope', sans-serif` : "'Manrope', sans-serif"}}>{asset.typography.headlineFont?.name || 'Not set'}</p>
                        <p className="text-sm text-slate-500 italic mt-2">{asset.typography.headlineFont?.description}</p>
                    </div>
                     <div>
                        <p className="text-base text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Body</p>
                        <p className="text-xl text-slate-800 dark:text-slate-200 mt-1" style={{fontFamily: asset.typography.bodyFont?.name ? `'${asset.typography.bodyFont.name}', 'Manrope', sans-serif` : "'Manrope', sans-serif"}}>The quick brown fox jumps over the lazy dog. A sentence to demonstrate the body font style.</p>
                        <p className="text-sm text-slate-500 italic mt-2">{asset.typography.bodyFont?.description}</p>
                    </div>
                </div>
            )
        }
        if (asset.type === 'video_ad') {
            return <AsyncVideo assetId={asset.id} className="max-w-full max-h-[75vh] object-contain" />;
        }
        return <AsyncImage assetId={asset.id} alt={`Preview of ${asset.type}`} className="max-w-full max-h-[75vh] object-contain"/>;
    };

    const isActionableAsset = ['logo', 'poster', 'banner', 'social_ad', 'instagram_story', 'twitter_post', 'youtube_thumbnail'].includes(asset.type);
    const isVariantGeneratable = isActionableAsset && !asset.parentId;
    const isVideoConvertible = ['logo', 'poster', 'banner', 'social_ad', 'instagram_story', 'twitter_post', 'youtube_thumbnail'].includes(asset.type) && !asset.parentId;

    return (
        <div className="animate-fade-in">
             <button onClick={onBack} className="flex items-center gap-2 mb-6 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors font-semibold">
                <ArrowLeftIcon className="w-5 h-5" />
                Back to Asset Library
            </button>
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center p-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700/50 min-h-[60vh]">
                    {renderPreviewContent()}
                </div>

                <div className="w-full lg:w-96 flex-shrink-0">
                    <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700/50">
                        <h3 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">{ASSET_TYPE_LABELS[asset.type]}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Created: {new Date(asset.createdAt).toLocaleString()}</p>
                        
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prompt:</h4>
                            {!isPromptEditing && isActionableAsset && (
                                <button
                                    onClick={() => { setIsPromptEditing(true); setPromptInputValue(asset.prompt); }}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50"
                                >
                                    <EditIcon className="w-3.5 h-3.5" /> Edit
                                </button>
                            )}
                        </div>

                        {isPromptEditing ? (
                            <div className="animate-fade-in">
                                <textarea
                                    value={promptInputValue}
                                    onChange={(e) => setPromptInputValue(e.target.value)}
                                    rows={4}
                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                                <div className="mt-3">
                                    <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5"><WandIcon className="w-4 h-4" /> Quick Edits</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {QUICK_EDITS.map(edit => (
                                            <button 
                                                key={edit.label}
                                                onClick={() => setPromptInputValue(prev => prev + edit.text)}
                                                className="px-2.5 py-1 text-xs font-semibold bg-slate-200 dark:bg-slate-600/80 text-slate-700 dark:text-slate-200 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600"
                                            >
                                                {edit.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4 justify-end">
                                    <button onClick={() => setIsPromptEditing(false)} disabled={isLoading} className="px-3 py-1 text-sm bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">
                                        Cancel
                                    </button>
                                    <button onClick={() => handleGenerateAction('edit', promptInputValue)} disabled={isLoading || !promptInputValue.trim() || promptInputValue === asset.prompt} className="px-3 py-1 text-sm bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed">
                                        Save & Regenerate
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 p-3 rounded-md max-h-40 overflow-y-auto">{asset.prompt}</p>
                        )}


                        <div className="mt-6">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tags:</h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {asset.tags?.map(tag => (
                                    <div key={tag} className="flex items-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-sm font-medium px-2.5 py-1 rounded-full">
                                        <span>{tag}</span>
                                        <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 -mr-1 p-0.5 rounded-full hover:bg-indigo-200/60 dark:hover:bg-indigo-700/60" aria-label={`Remove ${tag} tag`}>
                                            <XMarkIcon className="w-3 h-3"/>
                                        </button>
                                    </div>
                                ))}
                                {!asset.tags?.length && <p className="text-xs text-slate-500 dark:text-slate-400 italic">No tags yet.</p>}
                            </div>
                            <input
                                type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagInputKeyDown}
                                placeholder="Add a tag and press Enter" list="available-tags"
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <datalist id="available-tags">
                                {allTags.filter(t => !asset.tags?.includes(t)).map(tag => <option key={tag} value={tag} />)}
                            </datalist>
                        </div>
                        
                        {isLoading && <div className="mt-6"><Loader message={loadingMessage} /></div>}
                        {error && <p className="mt-4 text-center text-red-500 dark:text-red-400">Error: {error}</p>}

                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                            {isVariantGeneratable && (
                                <button onClick={() => handleGenerateAction('variants')} disabled={isLoading} className="w-full text-sm flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-500 transition-colors disabled:opacity-50">
                                    <BeakerIcon className="w-4 h-4" /> Generate A/B Variants
                                </button>
                            )}
                            {isVideoConvertible && onRequestVideoConversion && (
                                <button onClick={handleConvertToVideo} className="w-full text-sm flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 transition-colors">
                                    <VideoIcon className="w-4 h-4" /> Convert to Video Ad
                                </button>
                            )}
                             <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={handleCopy} 
                                    disabled={isCopied || asset.type === 'video_ad'} 
                                    className="w-full text-sm flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 px-4 py-2 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors disabled:bg-green-200 dark:disabled:bg-green-800 disabled:text-green-800 dark:disabled:text-green-100 disabled:cursor-not-allowed"
                                >
                                    <ClipboardIcon className="w-4 h-4" /> {isCopied ? 'Copied!' : 'Copy'}
                                </button>
                                <button onClick={handleDownload} className="w-full text-sm flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 px-4 py-2 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                                    <DownloadIcon className="w-4 h-4" /> Download
                                </button>
                            </div>
                             <button 
                                onClick={handleDelete} 
                                disabled={isLoading}
                                className="w-full mt-2 text-sm flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-4 py-2 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" /> Delete Asset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetDetailView;