import React, { useState, useRef, useEffect } from 'react';
import { Brand, BrandAsset } from '../types';
import { generateWithNanoBanana, fileToBase64, generatePromptSuggestions, describeImage } from '../services/geminiService';
import { generateVideoFromImage } from '../services/falService';
import { storeImage, getImage } from '../services/imageDb';
import Loader from './Loader';
import SparklesIcon from './icons/SparklesIcon';
import AsyncImage from './AsyncImage';
import ImageIcon from './icons/ImageIcon';
import XMarkIcon from './icons/XMarkIcon';
import VideoIcon from './icons/VideoIcon';
import AsyncVideo from './AsyncVideo';
import LightbulbIcon from './icons/LightbulbIcon';
import TemplateIcon from './icons/TemplateIcon';
import MovieIcon from './icons/MovieIcon';
import TechIcon from './icons/TechIcon';
import VlogIcon from './icons/VlogIcon';
import TypographyIcon from './icons/TypographyIcon';
import WandIcon from './icons/WandIcon';

interface VideoGeneratorProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
  falApiKey: string;
  videoAssets: BrandAsset[];
  initialImageId?: string | null;
  onConversionHandled?: () => void;
}

const videoAdTemplates = [
    {
        name: 'Cinematic Teaser',
        icon: <MovieIcon className="w-8 h-8" />,
        prompt: 'A dramatic, cinematic shot with high contrast and a shallow depth of field, suggesting a larger story. Perfect for a brand reveal or a teaser campaign.',
    },
    {
        name: 'Minimal Product Focus',
        icon: <TechIcon className="w-8 h-8" />,
        prompt: 'A clean, minimalist scene with a single pedestal or surface. The background is a soft, out-of-focus gradient of brand colors. Ideal for showcasing a product.',
    },
    {
        name: 'Vibrant Lifestyle',
        icon: <VlogIcon className="w-8 h-8" />,
        prompt: 'A bright, energetic lifestyle photo showing people happily using a product in a natural, sunny environment. The mood is joyful and authentic.',
    },
    {
        name: 'Abstract Background',
        icon: <SparklesIcon className="w-8 h-8" />,
        prompt: 'A beautiful abstract background using the brand\'s color palette, featuring flowing shapes, gentle gradients, or subtle textures. Perfect for overlaying text or product images.',
    },
    {
        name: 'Bold Typography',
        icon: <TypographyIcon className="w-8 h-8" />,
        prompt: 'A bold, text-focused design. Use a single, powerful word or a short phrase from the brand description as the main visual element. The background should be a simple, textured brand color.',
    },
    {
        name: 'Behind the Scenes',
        icon: <WandIcon className="w-8 h-8" />,
        prompt: 'A warm, authentic image that looks like a behind-the-scenes shot of the product being made or the service being provided. The style should be candid and trustworthy.',
    },
];


const inputClasses = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100 transition-shadow";

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ brand, onUpdateBrand, falApiKey, videoAssets, initialImageId, onConversionHandled }) => {
    const [imagePrompt, setImagePrompt] = useState('');
    const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
    const [addLogo, setAddLogo] = useState(true);

    const [activeImage, setActiveImage] = useState<{ id: string, url: string } | null>(null);
    const [editPrompt, setEditPrompt] = useState('');

    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [suggestions, setSuggestions] = useState<{ goal: string; prompt: string; }[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialImageId && onConversionHandled) {
            const loadImage = async () => {
                const imageUrl = await getImage(initialImageId);
                if (imageUrl) {
                    setActiveImage({ id: initialImageId, url: imageUrl });
                    
                    const sourceAsset = brand.assets.find(a => a.id === initialImageId);
                    if (sourceAsset) {
                        setImagePrompt(sourceAsset.prompt);
                    }
                }
                onConversionHandled();
            };
            loadImage();
        }
    }, [initialImageId, onConversionHandled, brand.assets]);

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
            const logoAsset = brand.assets.find(a => a.type === 'logo' && a.isPrimary) || brand.assets.find(a => a.type === 'logo');
            let logoInstruction = 'The brand logo should not be included in the image.';

            if (addLogo && logoAsset) {
                const logoImageUrl = await getImage(logoAsset.id);
                if (!logoImageUrl) throw new Error("Logo image not found.");
                const logoResponse = await fetch(logoImageUrl);
                const logoBlob = await logoResponse.blob();
                const logoFile = new File([logoBlob], "logo.png", { type: logoBlob.type });
                const logoBase64 = await fileToBase64(logoFile);
                imageInputs.push({ data: logoBase64, mimeType: logoFile.type });
                logoInstruction = `CRITICAL: The first image provided is the brand's logo, which is on a plain solid white background. You MUST remove this white background completely, treating it as transparent. Integrate ONLY the logo's graphic/text seamlessly into your design in a professional and unobtrusive way, like the bottom-right corner. The logo should be small, occupying no more than 10% of the image width. DO NOT show the square white background of the logo file.`;
            }


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

            const finalPrompt = `Create a visually stunning 16:9 widescreen image for a video ad. User request: "${promptToUse}". ${logoInstruction} ${paletteInfo}`;
            
            const width = 1280;
            const height = 720; // Default 16:9

            const generatedParts = await generateWithNanoBanana(finalPrompt, imageInputs, width, height);
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
                aspectRatio: '16:9'
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

    const handleSuggestPrompts = async () => {
        setIsSuggesting(true);
        setSuggestions([]);
        setError(null);
        try {
            let imageDescription = '';
            if (referenceImageFile) {
                const base64 = await fileToBase64(referenceImageFile);
                imageDescription = await describeImage(base64, referenceImageFile.type);
            }
            const paletteAsset = brand.assets.find(a => a.type === 'palette');
            const generatedSuggestions = await generatePromptSuggestions(
                "Base Image for a Video Ad", 
                brand.description, 
                imageDescription,
                paletteAsset?.palette
            );
            setSuggestions(generatedSuggestions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while generating suggestions.');
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleTemplateClick = (templatePrompt: string) => {
        const finalPrompt = `A base image for a video ad for "${brand.name}" (${brand.description}). Creative direction: ${templatePrompt}`;
        setImagePrompt(finalPrompt);
        setIsTemplateModalOpen(false);
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700/50 space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{activeImage ? 'Step 2: Generate Video' : 'Step 1: Create Base Image'}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">First, generate a static image for your video ad. The video will always be 16:9 widescreen.</p>
                    </div>

                    <div className={activeImage ? 'opacity-50 pointer-events-none' : ''}>
                        <button 
                            onClick={() => setIsTemplateModalOpen(true)} 
                            disabled={isLoadingImage}
                            className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 font-semibold bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                        >
                            <TemplateIcon className="w-5 h-5" />
                            Browse Templates
                        </button>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Image Prompt</label>
                                <button onClick={handleSuggestPrompts} disabled={isSuggesting || isLoadingImage} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50">
                                    <LightbulbIcon className="w-4 h-4" />
                                    {isSuggesting ? 'Thinking...' : 'Get Ideas'}
                                </button>
                            </div>
                            <textarea value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} rows={3} placeholder="e.g., A cinematic shot of a new sneaker on a mountain top" className={inputClasses} disabled={isLoadingImage} />
                             {suggestions.length > 0 && !isSuggesting && (
                                <div className="mt-2 space-y-2">
                                    {suggestions.map((s, i) => (
                                        <button key={i} onClick={() => setImagePrompt(s.prompt)} className="w-full text-left p-2.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-md transition-colors">
                                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{s.goal}</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">{s.prompt}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Options</label>
                            <div className="flex items-center justify-between gap-4">
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                    <ImageIcon className="w-5 h-5" />
                                    Upload Image
                                </button>
                                <input type="file" accept="image/*" onChange={e => e.target.files && setReferenceImageFile(e.target.files[0])} ref={fileInputRef} className="hidden" disabled={isLoadingImage} />
                                
                                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-900/30 rounded-md">
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Add Brand Logo</span>
                                    <button
                                        onClick={() => setAddLogo(!addLogo)}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${addLogo ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        role="switch"
                                        aria-checked={addLogo}
                                    >
                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${addLogo ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                         {referenceImageFile && (
                            <div className="mt-2 flex items-center gap-3 p-2 bg-slate-200 dark:bg-slate-700 rounded-md">
                                <img src={URL.createObjectURL(referenceImageFile)} alt="Reference Preview" className="w-12 h-12 object-contain rounded-md bg-white dark:bg-slate-600" />
                                <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">Using reference: {referenceImageFile.name}</span>
                                <button onClick={() => { setReferenceImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600" aria-label="Remove image">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        <div className="mt-6 flex justify-center">
                            <button onClick={() => handleGenerateImage(false)} disabled={isLoadingImage || !imagePrompt.trim()} className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50">
                               <SparklesIcon className="w-5 h-5" />
                               {isLoadingImage ? 'Generating...' : 'Generate Image'}
                           </button>
                        </div>
                   </div>

                   {activeImage && (
                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                           <button onClick={handleGenerateVideo} disabled={isLoadingVideo || !falApiKey.trim()} className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50">
                               <VideoIcon className="w-5 h-5" />
                               {isLoadingVideo ? 'Generating Video...' : 'Generate Video from Image'}
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

            {isTemplateModalOpen && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsTemplateModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Browse Image Templates</h2>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                            {videoAdTemplates.map(template => (
                                <button key={template.name} onClick={() => handleTemplateClick(template.prompt)} disabled={isLoadingImage} className="text-left p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50">
                                    <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">{template.icon} <span className="font-semibold text-slate-900 dark:text-slate-100">{template.name}</span></div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{template.prompt}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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