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
import BeakerIcon from './icons/BeakerIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import DownloadIcon from './icons/DownloadIcon';

interface VideoGeneratorProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
  falApiKey: string;
  videoAssets: BrandAsset[];
  initialImageId?: string | null;
  onConversionHandled?: () => void;
}

const videoAdTemplateCategories = [
    {
        name: 'Brand Awareness',
        templates: [
            { name: 'Cinematic Teaser', icon: <MovieIcon className="w-8 h-8" />, prompt: 'A dramatic, cinematic shot with high contrast and a shallow depth of field, suggesting a larger story. Perfect for a brand reveal or a teaser campaign.' },
            { name: 'Behind the Scenes', icon: <WandIcon className="w-8 h-8" />, prompt: 'A warm, authentic image that looks like a behind-the-scenes shot of the product being made or the service being provided. The style should be candid and trustworthy.' },
            { name: 'Brand Story Intro', icon: <VlogIcon className="w-8 h-8" />, prompt: "A powerful, evocative image that represents the brand's core mission or origin story. The style should be high-quality and emotional." },
            { name: 'Values Statement', icon: <TypographyIcon className="w-8 h-8" />, prompt: "A beautifully designed image featuring a core brand value or mission statement in elegant typography, set against a subtle, on-brand background." },
        ],
    },
    {
        name: 'Product Showcase',
        templates: [
            { name: 'Minimal Product Focus', icon: <TechIcon className="w-8 h-8" />, prompt: 'A clean, minimalist scene with a single pedestal or surface. The background is a soft, out-of-focus gradient of brand colors. Ideal for showcasing a product.' },
            { name: 'Product in Context', icon: <ImageIcon className="w-8 h-8" />, prompt: "An image showing the product being used in its ideal environment, highlighting its benefits and the lifestyle it enables." },
            { name: 'Exploded View / Feature Callout', icon: <BeakerIcon className="w-8 h-8" />, prompt: "A technical-style shot of a product, possibly with lines pointing to key features, on a clean, grid-like background. Perfect for showing off features." },
            { name: 'Lifestyle Group Shot', icon: <VlogIcon className="w-8 h-8" />, prompt: "A vibrant image of a diverse group of people enjoying the product together, conveying a sense of community and shared experience." },
        ],
    },
    {
        name: 'Promotional',
        templates: [
            { name: 'Bold Typography', icon: <TypographyIcon className="w-8 h-8" />, prompt: 'A bold, text-focused design. Use a single, powerful word or a short phrase from the brand description as the main visual element. The background should be a simple, textured brand color.' },
            { name: 'Limited Time Offer', icon: <SparklesIcon className="w-8 h-8" />, prompt: "An urgent, eye-catching scene with elements suggesting time is running out, like a subtle clock face or dynamic motion lines. Text overlay would announce the offer." },
            { name: 'Testimonial Spotlight', icon: <ChatBubbleIcon className="w-8 h-8" />, prompt: "A clean, professional scene with a placeholder area for a customer photo and a powerful quote. The background should be simple and on-brand." },
        ],
    },
];

const inputClasses = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100 transition-shadow";

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ brand, onUpdateBrand, falApiKey, videoAssets, initialImageId, onConversionHandled }) => {
    const [imagePrompt, setImagePrompt] = useState('');
    const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
    const [addLogo, setAddLogo] = useState(true);

    const [activeImage, setActiveImage] = useState<{ id: string, url: string } | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<{ id: string, url: string } | null>(null);
    const [editPrompt, setEditPrompt] = useState('');

    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [isLoadingVideo, setIsLoadingVideo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [suggestions, setSuggestions] = useState<{ goal: string; prompt: string; }[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [previewingVideoAssetId, setPreviewingVideoAssetId] = useState<string | null>(null);
    const [activeTemplateCategory, setActiveTemplateCategory] = useState<string>(videoAdTemplateCategories[0].name);
    
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
        
        setGeneratedVideo(null); // Clear any previous video preview
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
            const videoPrompt = `A high-quality, cinematic video of the scene from the image. The camera should move slowly, creating a sense of realism and bringing the static image to life with subtle motion. The overall mood should match the user's prompt: "${imagePrompt}"`;

            const videoResponse = await generateVideoFromImage({
                apiKey: falApiKey,
                imageUrl: activeImage.url,
                prompt: videoPrompt,
                aspectRatio: 'auto',
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

                const assetsToUpdate = [...brand.assets];
                const sourceAssetExists = brand.assets.some(asset => asset.id === activeImage.id);
                if (!sourceAssetExists) {
                    const imageAsset: BrandAsset = {
                        id: activeImage.id,
                        type: 'poster',
                        prompt: imagePrompt,
                        createdAt: new Date().toISOString(),
                    };
                    assetsToUpdate.push(imageAsset);
                }

                const videoAsset: BrandAsset = {
                    id: videoId,
                    type: 'video_ad',
                    prompt: videoPrompt,
                    createdAt: new Date().toISOString(),
                    parentId: activeImage.id,
                };
                assetsToUpdate.push(videoAsset);

                onUpdateBrand({
                    ...brand,
                    assets: assetsToUpdate
                });
                
                setGeneratedVideo({ id: videoId, url: base64data });
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

    const handleDownloadVideo = async (assetId: string) => {
        const dataUrl = await getImage(assetId);
        if (!dataUrl) {
            setError("Could not find video to download.");
            return;
        }
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${brand.name}-video-ad-${assetId.slice(0, 6)}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
        const paletteAsset = brand.assets.find(a => a.type === 'palette');
        const paletteInfo = paletteAsset?.palette 
            ? `The brand's color palette is described as "${paletteAsset.palette.description}". This should influence the colors of the scene.`
            : '';
        const finalPrompt = `A base image for a video ad for "${brand.name}" (${brand.description}). ${paletteInfo} Creative direction: ${templatePrompt}`;
        setImagePrompt(finalPrompt);
        setIsTemplateModalOpen(false);
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700/50 space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{activeImage ? 'Step 2: Generate Video' : 'Step 1: Create Base Image'}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">First, generate a static image. The final video will match this image's aspect ratio.</p>
                    </div>

                    <div className={activeImage || generatedVideo ? 'opacity-50 pointer-events-none' : ''}>
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
                           <p className="text-sm text-center font-semibold text-slate-700 dark:text-slate-300">Happy with the image? Generate the video or try again.</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => {
                                        setActiveImage(null);
                                        setEditPrompt('');
                                    }}
                                    disabled={isLoadingVideo}
                                    className="px-6 py-3 font-semibold bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                                >
                                    Cancel & Try Again
                                </button>
                                <button
                                    onClick={handleGenerateVideo}
                                    disabled={isLoadingVideo || !falApiKey.trim()}
                                    className="flex items-center justify-center gap-2 px-6 py-3 font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
                                >
                                    <VideoIcon className="w-5 h-5" />
                                    {isLoadingVideo ? 'Generating Video...' : 'Generate Video'}
                                </button>
                            </div>
                            {!falApiKey.trim() && (
                                <p className="text-center text-red-500 dark:text-red-400 text-sm mt-2">
                                    Please set your Fal.ai API key above to enable video generation.
                                </p>
                            )}
                        </div>
                   )}
                </div>
                <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center min-h-[50vh]">
                   {isLoadingImage && !activeImage ? <Loader message="Generating image..."/> : activeImage ? (
                        <div className="w-full space-y-4">
                            <div className="relative">
                                <AsyncImage 
                                    assetId={activeImage.id} 
                                    alt="Generated image" 
                                    className={`w-full rounded-md object-contain transition-opacity ${isLoadingVideo ? 'opacity-30' : ''}`}
                                />
                                {isLoadingVideo && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                                        <Loader message="Generating Video..." subMessage="This can take a few minutes."/>
                                    </div>
                                )}
                            </div>
                            {!isLoadingVideo && (
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Quick Edit & Regenerate:</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="e.g., make it red" className={inputClasses} />
                                        <button onClick={() => handleGenerateImage(true)} disabled={!editPrompt.trim() || isLoadingImage} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50">
                                            {isLoadingImage ? 'Editing...' : 'Edit'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                   ) : generatedVideo ? (
                        <div className="w-full space-y-4 text-center">
                            <h4 className="text-lg font-semibold text-green-600 dark:text-green-400">Video Generated Successfully!</h4>
                            <AsyncVideo assetId={generatedVideo.id} className="w-full rounded-md object-contain" controls autoPlay />
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => setGeneratedVideo(null)}
                                    className="px-6 py-3 font-semibold bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                                >
                                    Create Another
                                </button>
                                <button
                                    onClick={() => handleDownloadVideo(generatedVideo.id)}
                                    className="flex items-center justify-center gap-2 px-6 py-3 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                                >
                                    <DownloadIcon className="w-5 h-5" /> Download Video
                                </button>
                            </div>
                        </div>
                   ) : (
                    <div className="text-center text-slate-500 dark:text-slate-400">
                        <ImageIcon className="w-16 h-16 mx-auto" />
                        <p className="mt-2 font-semibold">Your generated image will appear here</p>
                    </div>
                   )}
                </div>
            </div>

            {error && <p className="text-center text-red-500 dark:text-red-400">Error: {error}</p>}

            {isTemplateModalOpen && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsTemplateModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Browse Image Templates</h2>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                            </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-6 max-h-[60vh]">
                            <div className="sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-700/50 pr-4">
                                <nav className="flex sm:flex-col -mb-px sm:mb-0 space-x-2 sm:space-x-0 sm:space-y-1">
                                    {videoAdTemplateCategories.map(category => (
                                        <button
                                            key={category.name}
                                            onClick={() => setActiveTemplateCategory(category.name)}
                                            className={`w-full text-left p-2 rounded-md font-semibold text-sm transition-colors ${
                                                activeTemplateCategory === category.name
                                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                            <div className="flex-1 overflow-y-auto sm:pl-4 pr-2 -mr-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {videoAdTemplateCategories.find(c => c.name === activeTemplateCategory)?.templates.map(template => (
                                    <button key={template.name} onClick={() => handleTemplateClick(template.prompt)} disabled={isLoadingImage} className="text-left p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50">
                                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">{template.icon} <span className="font-semibold text-slate-900 dark:text-slate-100">{template.name}</span></div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{template.prompt}</p>
                                    </button>
                                ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {previewingVideoAssetId && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPreviewingVideoAssetId(null)}>
                    <div className="bg-black rounded-lg max-w-5xl w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setPreviewingVideoAssetId(null)} className="absolute -top-3 -right-3 bg-white dark:bg-slate-700 p-1.5 rounded-full z-10 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                        <button onClick={() => handleDownloadVideo(previewingVideoAssetId)} className="absolute top-2 right-12 bg-white/80 dark:bg-slate-900/80 p-2 rounded-full z-10 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-900 transition-colors" title="Download Video">
                            <DownloadIcon className="w-6 h-6" />
                        </button>
                        <AsyncVideo assetId={previewingVideoAssetId} className="w-full h-auto max-h-[85vh] object-contain rounded-lg" controls autoPlay />
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
                            <div key={asset.id} onClick={() => setPreviewingVideoAssetId(asset.id)} className="group relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700/50 cursor-pointer">
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
