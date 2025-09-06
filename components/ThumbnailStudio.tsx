import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Brand, BrandAsset } from '../types';
// Fix: Import `generatePromptSuggestions` to be used for suggesting prompts.
import { generateWithNanoBanana, fileToBase64, generateTagsForCreative, describeImage, generatePromptSuggestions, generateThumbnailElementSuggestions } from '../services/geminiService';
import { storeImage, getImage } from '../services/imageDb';
import Loader from './Loader';
import SparklesIcon from './icons/SparklesIcon';
import AsyncImage from './AsyncImage';
import ImageIcon from './icons/ImageIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import XMarkIcon from './icons/XMarkIcon';
import AssetPreviewModal from './AssetPreviewModal';
import GamingIcon from './icons/GamingIcon';
import TechIcon from './icons/TechIcon';
import CookingIcon from './icons/CookingIcon';
import FitnessIcon from './icons/FitnessIcon';
import TravelIcon from './icons/TravelIcon';
import WandIcon from './icons/WandIcon';
import UndoIcon from './icons/UndoIcon';
import RedoIcon from './icons/RedoIcon';

interface ThumbnailStudioProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
}

type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'watermark' | 'none';
type EditSession = { history: BrandAsset[]; currentIndex: number };

const thumbnailStyles = ['Default', 'Vibrant & Energetic', 'Minimal & Clean', 'Dark & Moody', 'Cinematic', 'Retro / Vintage'];
const compositionRules = ['Default', 'Rule of Thirds: Subject Left', 'Rule of Thirds: Subject Right', 'Center-Focused'];
const humanEmotions = ['None', 'Excited', 'Shocked / Surprised', 'Happy', 'Serious / Focused', 'Curious'];

const thumbnailTemplates = [
    {
        name: 'Gaming Review',
        icon: <GamingIcon className="w-8 h-8" />,
        prompt: "A dynamic and exciting thumbnail for a video game review. Feature a high-action screenshot from the game.",
        overlayText: "IS IT WORTH IT?!",
        style: 'Vibrant & Energetic',
        emotion: 'Excited',
    },
    {
        name: 'Tech Unboxing',
        icon: <TechIcon className="w-8 h-8" />,
        prompt: "A clean, modern product shot of a new tech gadget on a minimalist background.",
        overlayText: "NEW GADGET UNBOXED!",
        style: 'Minimal & Clean',
        emotion: 'Curious',
    },
    {
        name: 'Cooking Tutorial',
        icon: <CookingIcon className="w-8 h-8" />,
        prompt: "A delicious, vibrant, close-up shot of the finished dish, beautifully plated on a rustic wooden table.",
        overlayText: "EASY 10-MINUTE RECIPE",
        style: 'Vibrant & Energetic',
        emotion: 'Happy',
    },
    {
        name: 'Fitness Challenge',
        icon: <FitnessIcon className="w-8 h-8" />,
        prompt: "An energetic person in mid-workout, looking determined, with a blurred gym background.",
        overlayText: "30 DAY CHALLENGE",
        style: 'Dark & Moody',
        emotion: 'Serious / Focused',
    },
    {
        name: 'Travel Vlog',
        icon: <TravelIcon className="w-8 h-8" />,
        prompt: "A breathtaking landscape view of a famous travel destination with a person looking out over the scene.",
        overlayText: "WE WENT HERE!",
        style: 'Cinematic',
        emotion: 'Shocked / Surprised',
    },
];

const inputClasses = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100 transition-shadow";

const ThumbnailStudio: React.FC<ThumbnailStudioProps> = ({ brand, onUpdateBrand }) => {
    const [baseImagePrompt, setBaseImagePrompt] = useState('');
    const [overlayText, setOverlayText] = useState('');
    const [style, setStyle] = useState('Default');
    const [composition, setComposition] = useState('Default');
    const [emotion, setEmotion] = useState('None');
    const [logoPosition, setLogoPosition] = useState<LogoPosition>('watermark');
    const [baseImageFile, setBaseImageFile] = useState<File | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<{ goal: string; prompt: string; }[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    
    const [previewingAsset, setPreviewingAsset] = useState<BrandAsset | null>(null);
    const [editSession, setEditSession] = useState<EditSession | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    
    const [editingBrightness, setEditingBrightness] = useState(100);
    const [editingContrast, setEditingContrast] = useState(100);
    const [editingLogoOpacity, setEditingLogoOpacity] = useState(100);
    const [editingTextOpacity, setEditingTextOpacity] = useState(100);
    
    const [suggestedElements, setSuggestedElements] = useState<string[]>([]);
    const [isSuggestingElements, setIsSuggestingElements] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const logoAsset = brand.assets.find(asset => asset.type === 'logo');
    const paletteAsset = brand.assets.find(asset => asset.type === 'palette');
    const thumbnailAssets = brand.assets.filter(asset => asset.type === 'youtube_thumbnail').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const allThumbnailTags = useMemo(() => [...new Set(thumbnailAssets.flatMap(a => a.tags || []))].sort(), [thumbnailAssets]);

    useEffect(() => {
        setSuggestions([]);
        setSuggestedElements([]);
    }, [baseImageFile, overlayText, baseImagePrompt]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBaseImageFile(e.target.files[0]);
        }
    };
    
    const handleTemplateClick = (template: typeof thumbnailTemplates[0]) => {
        setBaseImagePrompt(template.prompt);
        setOverlayText(template.overlayText);
        setStyle(template.style);
        setEmotion(template.emotion);
        setComposition('Default');
    };
    
    const handleSuggestPrompts = async () => {
        setIsSuggesting(true);
        setSuggestions([]);
        setError(null);
        try {
            let imageDescription = '';
            if (baseImageFile) {
                const base64 = await fileToBase64(baseImageFile);
                imageDescription = await describeImage(base64, baseImageFile.type);
            }
            const generatedSuggestions = await generatePromptSuggestions("YouTube Thumbnail", brand.description, imageDescription);
            setSuggestions(generatedSuggestions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSuggesting(false);
        }
    };
    
     const handleSuggestElements = async () => {
        setIsSuggestingElements(true);
        setSuggestedElements([]);
        setError(null);
        try {
            let imageDescription = '';
            if (baseImageFile) {
                const base64 = await fileToBase64(baseImageFile);
                imageDescription = await describeImage(base64, baseImageFile.type);
            }
            const result = await generateThumbnailElementSuggestions(style, emotion, overlayText, baseImagePrompt, imageDescription);
            setSuggestedElements(result || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get suggestions.');
        } finally {
            setIsSuggestingElements(false);
        }
    };

    const handleDownload = async (assetId: string, assetType: string) => {
        const imageUrl = await getImage(assetId);
        if (!imageUrl) {
            setError("Could not find image to download.");
            return;
        }
        const filename = `${brand.name}-${assetType}-${assetId.slice(0, 6)}.png`;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpdateAssetTags = (assetId: string, tags: string[]) => {
        const updatedAssets = brand.assets.map(asset => 
            asset.id === assetId ? { ...asset, tags } : asset
        );
        onUpdateBrand({ ...brand, assets: updatedAssets });
    };

    const handleGenerateThumbnail = async () => {
        if (!baseImagePrompt.trim() && !baseImageFile) {
            setError("Please provide a base image prompt or upload an image.");
            return;
        }
        if (!logoAsset) {
             setError("Please generate a logo in the Identity Studio first.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let imageInputs = [];
            
            const logoImageUrl = await getImage(logoAsset.id);
            if (!logoImageUrl) throw new Error("Logo image not found in database.");
            const logoResponse = await fetch(logoImageUrl);
            const logoBlob = await logoResponse.blob();
            const logoFile = new File([logoBlob], "logo.png", { type: logoBlob.type });
            const logoBase64 = await fileToBase64(logoFile);
            imageInputs.push({ data: logoBase64, mimeType: logoFile.type });

            if (baseImageFile) {
                const base64 = await fileToBase64(baseImageFile);
                imageInputs.push({ data: base64, mimeType: baseImageFile.type });
            }

            let promptParts = [
                'Create a high-impact, professional YouTube thumbnail (16:9 aspect ratio).',
                baseImageFile 
                    ? `Use the user's uploaded image as the primary background or subject. The user's goal for the image is: "${baseImagePrompt}".`
                    : `The base image should be: "${baseImagePrompt}".`,
                overlayText.trim() 
                    ? `Overlay the following text in a large, bold, and highly readable font: "${overlayText}".`
                    : '',
                style !== 'Default' 
                    ? `The overall visual style should be: ${style}.`
                    : 'The style should be eye-catching and professional.',
                composition !== 'Default'
                    ? `Follow this composition rule: ${composition.replace('Subject', 'main subject')}.`
                    : '',
                emotion !== 'None'
                    ? `Incorporate a human face expressing a strong emotion of: ${emotion}. This is a critical element.`
                    : '',
                paletteAsset?.palette
                    ? `Use the brand's color palette (${paletteAsset.palette.colors.map(c => c.hex).join(', ')}) for text, backgrounds, and accents to ensure high contrast and brand consistency.`
                    : '',
                logoPosition !== 'none'
                    ? `Place the provided brand logo in a ${logoPosition === 'watermark' ? 'subtle watermark style' : `clear and visible manner in the ${logoPosition.replace('-', ' ')} corner`}.`
                    : 'Do not include the brand logo.'
            ];
            const finalPrompt = promptParts.filter(p => p.trim() !== '').join(' ');
            
            const generatedParts = await generateWithNanoBanana(finalPrompt, imageInputs, 1280, 720);

            const newAssets: BrandAsset[] = [];
            const tags = await generateTagsForCreative(baseImagePrompt || overlayText);

            for (const part of generatedParts) {
                if ('inlineData' in part) {
                    const newId = crypto.randomUUID();
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    await storeImage(newId, imageUrl);
                    newAssets.push({
                        id: newId,
                        type: 'youtube_thumbnail',
                        prompt: finalPrompt,
                        createdAt: new Date().toISOString(),
                        tags: tags,
                    });
                }
            }
            if (newAssets.length === 0) throw new Error("The AI did not return an image. Please try adjusting your prompt.");

            onUpdateBrand({ ...brand, assets: [...brand.assets, ...newAssets] });
            setBaseImagePrompt('');
            setOverlayText('');
            setBaseImageFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEditThumbnail = async () => {
        if (!editSession || !editPrompt.trim() || !logoAsset) {
            setError("Missing information to edit thumbnail.");
            return;
        }

        const editingAsset = editSession.history[editSession.currentIndex];
        if (!editingAsset) {
             setError("No valid asset found in edit session.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            let imageInputs = [];

            const logoImageUrl = await getImage(logoAsset.id);
            if (!logoImageUrl) throw new Error("Logo image not found in database.");
            const logoResponse = await fetch(logoImageUrl);
            const logoBlob = await logoResponse.blob();
            const logoFile = new File([logoBlob], "logo.png", { type: logoBlob.type });
            const logoBase64 = await fileToBase64(logoFile);
            imageInputs.push({ data: logoBase64, mimeType: logoFile.type });

            const baseImageUrl = await getImage(editingAsset.id);
            if (!baseImageUrl) throw new Error("Base thumbnail for editing not found.");
            const baseResponse = await fetch(baseImageUrl);
            const baseBlob = await baseResponse.blob();
            const baseFile = new File([baseBlob], "base.png", { type: baseBlob.type });
            const base64 = await fileToBase64(baseFile);
            imageInputs.push({ data: base64, mimeType: baseFile.type });

            let editInstructions = [editPrompt];
            if (editingBrightness !== 100) editInstructions.push(`adjust the overall brightness to ${editingBrightness}%`);
            if (editingContrast !== 100) editInstructions.push(`adjust the overall contrast to ${editingContrast}%`);
            if (editingLogoOpacity !== 100) editInstructions.push(`make the brand logo ${editingLogoOpacity}% opaque`);
            if (editingTextOpacity !== 100) editInstructions.push(`make the overlay text ${editingTextOpacity}% opaque`);
            const combinedEditPrompt = editInstructions.filter(Boolean).join(', ');

            const paletteInfo = paletteAsset?.palette ? `Use the brand's color palette (${paletteAsset.palette.colors.map(c => c.hex).join(', ')}) to ensure brand consistency.` : '';
            const finalPrompt = `Edit the provided YouTube thumbnail based on the user's request: "${combinedEditPrompt}". The original context was: "${editingAsset.prompt}". The image is for a brand named "${brand.name}". ${paletteInfo} Ensure the brand logo remains clearly visible if it exists.`;

            const generatedParts = await generateWithNanoBanana(finalPrompt, imageInputs, 1280, 720);

            const newAssets: BrandAsset[] = [];
            const tags = await generateTagsForCreative(editPrompt);

            for (const part of generatedParts) {
                if ('inlineData' in part) {
                    const newId = crypto.randomUUID();
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    await storeImage(newId, imageUrl);
                    const newAsset: BrandAsset = {
                        id: newId,
                        type: 'youtube_thumbnail',
                        prompt: editPrompt,
                        createdAt: new Date().toISOString(),
                        tags: tags,
                    };
                    newAssets.push(newAsset);

                    // Update edit session history
                    setEditSession(prev => {
                        if (!prev) return null;
                        const newHistory = [...prev.history.slice(0, prev.currentIndex + 1), newAsset];
                        return { history: newHistory, currentIndex: newHistory.length - 1 };
                    });
                }
            }
            if (newAssets.length === 0) throw new Error("The AI did not return an edited image.");

            onUpdateBrand({ ...brand, assets: [...brand.assets, ...newAssets] });
            // Do not close modal automatically, allow undo/redo
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during edit.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUndo = () => {
        setEditSession(prev => {
            if (!prev || prev.currentIndex <= 0) return prev;
            return { ...prev, currentIndex: prev.currentIndex - 1 };
        });
    };

    const handleRedo = () => {
        setEditSession(prev => {
            if (!prev || prev.currentIndex >= prev.history.length - 1) return prev;
            return { ...prev, currentIndex: prev.currentIndex + 1 };
        });
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Left Column: Controls */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700/50 space-y-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Thumbnail Studio</h3>
                
                <div>
                    <h4 className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Start with a Template</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {thumbnailTemplates.map(template => (
                             <button key={template.name} onClick={() => handleTemplateClick(template)} disabled={isLoading} title={template.name} className="flex flex-col items-center justify-center text-center gap-2 p-2 aspect-square bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 disabled:opacity-50">
                                 <div className="text-indigo-600 dark:text-indigo-400">{template.icon}</div>
                                 <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight">{template.name}</p>
                             </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">1. Base Image Prompt</label>
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Describe the background or main subject.</p>
                        <button onClick={handleSuggestPrompts} disabled={isSuggesting || isLoading} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50">
                            <LightbulbIcon className="w-4 h-4" />
                            {isSuggesting ? 'Thinking...' : 'Ideas'}
                        </button>
                    </div>
                    <textarea value={baseImagePrompt} onChange={(e) => setBaseImagePrompt(e.target.value)} rows={3} placeholder="e.g., A futuristic neon cityscape at night" className={inputClasses} disabled={isLoading} />
                    {suggestions.length > 0 && (
                         <div className="mt-2 space-y-2">
                            {suggestions.slice(0,2).map((s, i) => (
                                <button key={i} onClick={() => setBaseImagePrompt(s.prompt)} className="w-full text-left p-2 bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-md transition-colors">
                                    <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">{s.goal}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">{s.prompt}</p>
                                </button>
                            ))}
                        </div>
                    )}
                     <p className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 my-3">OR</p>
                     {baseImageFile ? (
                         <div className="relative group">
                             <img src={URL.createObjectURL(baseImageFile)} alt="Preview" className="w-full h-auto max-h-40 object-contain rounded-md border border-slate-300 dark:border-slate-600 p-1" />
                             <button onClick={() => { setBaseImageFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"><XMarkIcon className="w-4 h-4" /></button>
                         </div>
                     ) : (
                        <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors">
                             <ImageIcon className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500" />
                             <p className="mt-1 text-sm text-slate-600 dark:text-slate-400"><span className="font-semibold text-indigo-600 dark:text-indigo-400">Upload an Image</span></p>
                        </button>
                     )}
                     <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" disabled={isLoading} />
                </div>
                
                <div>
                    <label htmlFor="overlay-text" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">2. Overlay Text</label>
                    <input id="overlay-text" type="text" value={overlayText} onChange={e => setOverlayText(e.target.value)} placeholder="e.g., YOU WON'T BELIEVE THIS!" className={inputClasses} disabled={isLoading} />
                </div>
                
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">3. Graphical Elements (Optional)</label>
                         <button onClick={handleSuggestElements} disabled={isSuggestingElements || isLoading || (!baseImagePrompt && !overlayText && !baseImageFile)} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50">
                            <WandIcon className="w-4 h-4" />
                            {isSuggestingElements ? 'Thinking...' : 'Suggest'}
                        </button>
                    </div>
                     {isSuggestingElements ? <div className="text-center p-2 text-xs">Getting suggestions...</div> : (
                        suggestedElements.length > 0 && (
                             <div className="space-y-1.5">
                                {suggestedElements.map((s, i) => (
                                    <button key={i} onClick={() => setBaseImagePrompt(p => p ? `${p}, ${s}`: s)} className="w-full text-left p-2 bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-md transition-colors text-xs text-slate-700 dark:text-slate-300" title="Click to add to prompt">
                                        + {s}
                                    </button>
                                ))}
                            </div>
                        )
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">4. Style</label>
                        <select value={style} onChange={e => setStyle(e.target.value)} className={inputClasses} disabled={isLoading}>
                            {thumbnailStyles.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">5. Human Emotion</label>
                        <select value={emotion} onChange={e => setEmotion(e.target.value)} className={inputClasses} disabled={isLoading}>
                            {humanEmotions.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                </div>
                
                <div>
                     <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">6. Branding</label>
                     <div className="flex flex-wrap gap-2">
                        {(['watermark', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'none'] as LogoPosition[]).map(pos => (
                            <button key={pos} onClick={() => setLogoPosition(pos)} disabled={isLoading} className={`px-3 py-1 text-xs rounded-full capitalize transition-colors font-semibold ${logoPosition === pos ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200'}`}>
                                {pos.replace('-', ' ')}
                            </button>
                        ))}
                     </div>
                </div>

                <button onClick={handleGenerateThumbnail} disabled={isLoading || (!baseImagePrompt.trim() && !baseImageFile)} className="w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed shadow-md">
                    <SparklesIcon className="w-5 h-5" />
                    {isLoading ? 'Generating...' : 'Generate Thumbnail'}
                </button>
                 {error && <p className="text-center text-red-500 dark:text-red-400 text-sm">Error: {error}</p>}
            </div>

            <div className="lg:col-span-2 space-y-6">
                 {isLoading && !editSession && <div className="aspect-video bg-slate-200 dark:bg-slate-700/50 rounded-lg flex items-center justify-center"><Loader message="Crafting your thumbnail..."/></div>}
                
                 <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Generated Thumbnails</h3>
                 {thumbnailAssets.length === 0 && !isLoading ? (
                     <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        <ImageIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500" />
                        <h5 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">Ready to Go Viral?</h5>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use the studio controls to create your first thumbnail.</p>
                    </div>
                 ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {thumbnailAssets.map(asset => (
                            <div key={asset.id} onClick={() => setPreviewingAsset(asset)} className="group relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700/50 cursor-pointer">
                                <AsyncImage assetId={asset.id} alt={asset.prompt} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                    <p className="text-xs font-semibold text-shadow-lg truncate">{asset.prompt}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 )}
            </div>

            {previewingAsset && (
                <AssetPreviewModal
                    asset={previewingAsset}
                    onClose={() => setPreviewingAsset(null)}
                    onDownload={handleDownload}
                    onEdit={(asset) => {
                        setPreviewingAsset(null);
                        setEditSession({ history: [asset], currentIndex: 0 });
                        setEditPrompt('');
                        setEditingBrightness(100);
                        setEditingContrast(100);
                        setEditingLogoOpacity(100);
                        setEditingTextOpacity(100);
                    }}
                    onUpdateTags={handleUpdateAssetTags}
                    availableTags={allThumbnailTags}
                />
            )}

            {editSession && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit Thumbnail</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={handleUndo} disabled={isLoading || editSession.currentIndex <= 0} title="Undo" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <UndoIcon className="w-5 h-5" />
                                </button>
                                <button onClick={handleRedo} disabled={isLoading || editSession.currentIndex >= editSession.history.length - 1} title="Redo" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <RedoIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                            <div className="w-48 aspect-video bg-slate-100 dark:bg-slate-700 rounded-md p-1 flex-shrink-0">
                                <AsyncImage assetId={editSession.history[editSession.currentIndex].id} alt="thumbnail to edit" className="w-full h-full object-contain"/>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Describe your changes:</label>
                                    <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g., Make the text red, add a shocked face" className={inputClasses} rows={2} disabled={isLoading} />
                                </div>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
                                    <div>
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex justify-between">Brightness <span>{editingBrightness}%</span></label>
                                        <input type="range" min="50" max="150" value={editingBrightness} onChange={e => setEditingBrightness(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                     <div>
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex justify-between">Contrast <span>{editingContrast}%</span></label>
                                        <input type="range" min="50" max="150" value={editingContrast} onChange={e => setEditingContrast(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex justify-between">Logo Opacity <span>{editingLogoOpacity}%</span></label>
                                        <input type="range" min="0" max="100" value={editingLogoOpacity} onChange={e => setEditingLogoOpacity(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                     <div>
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex justify-between">Text Opacity <span>{editingTextOpacity}%</span></label>
                                        <input type="range" min="0" max="100" value={editingTextOpacity} onChange={e => setEditingTextOpacity(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6 justify-end">
                            <button onClick={() => setEditSession(null)} disabled={isLoading} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Close</button>
                            <button onClick={handleEditThumbnail} disabled={isLoading || !editPrompt.trim()} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed">{isLoading ? "Generating..." : "Generate Edit"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThumbnailStudio;