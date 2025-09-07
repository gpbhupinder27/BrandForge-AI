
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Brand, BrandAsset } from '../types';
import { generateWithNanoBanana, fileToBase64, generateTagsForCreative, describeImage, generatePromptSuggestions, generateThumbnailElementSuggestions, generateThumbnailTextSuggestions } from '../services/geminiService';
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
import DIYIcon from './icons/DIYIcon';
import ProductivityIcon from './icons/ProductivityIcon';
import MovieIcon from './icons/MovieIcon';
import VlogIcon from './icons/VlogIcon';
import TextAlignLeftIcon from './icons/TextAlignLeftIcon';
import TextAlignCenterIcon from './icons/TextAlignCenterIcon';
import TextAlignRightIcon from './icons/TextAlignRightIcon';
import TemplateIcon from './icons/TemplateIcon';


interface ThumbnailStudioProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
}

type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'watermark' | 'none';
type EditSession = { history: BrandAsset[]; currentIndex: number };
type EditingFontSize = 'medium' | 'large' | 'extra large';
type EditingTextAlign = 'left' | 'center' | 'right';


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
        composition: 'Rule of Thirds: Subject Right',
    },
    {
        name: 'Tech Unboxing',
        icon: <TechIcon className="w-8 h-8" />,
        prompt: "A clean, modern product shot of a new tech gadget on a minimalist background.",
        overlayText: "NEW GADGET UNBOXED!",
        style: 'Minimal & Clean',
        emotion: 'Curious',
        composition: 'Center-Focused',
    },
    {
        name: 'Cooking Tutorial',
        icon: <CookingIcon className="w-8 h-8" />,
        prompt: "A delicious, vibrant, close-up shot of the finished dish, beautifully plated on a rustic wooden table.",
        overlayText: "EASY 10-MINUTE RECIPE",
        style: 'Vibrant & Energetic',
        emotion: 'Happy',
        composition: 'Center-Focused',
    },
    {
        name: 'Fitness Challenge',
        icon: <FitnessIcon className="w-8 h-8" />,
        prompt: "An energetic person in mid-workout, looking determined, with a blurred gym background.",
        overlayText: "30 DAY CHALLENGE",
        style: 'Dark & Moody',
        emotion: 'Serious / Focused',
        composition: 'Rule of Thirds: Subject Left',
    },
    {
        name: 'Travel Vlog',
        icon: <TravelIcon className="w-8 h-8" />,
        prompt: "A breathtaking landscape view of a famous travel destination with a person looking out over the scene.",
        overlayText: "WE WENT HERE!",
        style: 'Cinematic',
        emotion: 'Shocked / Surprised',
        composition: 'Rule of Thirds: Subject Left',
    },
    {
        name: 'DIY Tutorial',
        icon: <DIYIcon className="w-8 h-8" />,
        prompt: "A person's hands working on a craft project on a clean, well-lit workbench, with tools neatly arranged.",
        overlayText: 'DIY PROJECT: STEP-BY-STEP',
        style: 'Minimal & Clean',
        emotion: 'Serious / Focused',
        composition: 'Center-Focused',
    },
    {
        name: 'Productivity Hack',
        icon: <ProductivityIcon className="w-8 h-8" />,
        prompt: 'A minimalist desk setup with a laptop, notebook, and a single plant. A stylized brain graphic with glowing lines.',
        overlayText: '5 HACKS TO 10X YOUR FOCUS',
        style: 'Vibrant & Energetic',
        emotion: 'Serious / Focused',
        composition: 'Center-Focused',
    },
    {
        name: 'Movie Review',
        icon: <MovieIcon className="w-8 h-8" />,
        prompt: 'A cinematic composition featuring elements from a popular movie, with a dark and moody atmosphere and dramatic lighting.',
        overlayText: 'THE ENDING EXPLAINED',
        style: 'Cinematic',
        emotion: 'Curious',
        composition: 'Rule of Thirds: Subject Right',
    },
    {
        name: 'Personal Vlog',
        icon: <VlogIcon className="w-8 h-8" />,
        prompt: 'A close-up, friendly portrait of a person talking directly to the camera, with a slightly blurred background of their room.',
        overlayText: 'MY WEEKLY UPDATE',
        style: 'Default',
        emotion: 'Happy',
        composition: 'Center-Focused',
    },
    {
        name: 'Special Offer',
        icon: <SparklesIcon className="w-8 h-8" />,
        prompt: "A bold, attention-grabbing thumbnail for a sale or special offer. Prominently feature a discount percentage like '50% OFF!' or text like 'LIMITED TIME'. Use high-contrast colors and a sense of urgency.",
        overlayText: '50% OFF TODAY!',
        style: 'Vibrant & Energetic',
        emotion: 'Excited',
        composition: 'Center-Focused',
    },
    {
        name: 'Brand Teaser',
        icon: <MovieIcon className="w-8 h-8" />,
        prompt: 'A cinematic and intriguing thumbnail teasing a brand story or documentary-style video. Use a dramatic, high-quality image related to the brand\'s origin or mission.',
        overlayText: 'OUR STORY',
        style: 'Cinematic',
        emotion: 'Curious',
        composition: 'Rule of Thirds: Subject Left',
    },
    {
        name: 'Product Demo',
        icon: <TechIcon className="w-8 h-8" />,
        prompt: 'A clean, crisp thumbnail showing a key product in action or a close-up of its main feature, against a simple, non-distracting background.',
        overlayText: 'SEE IT IN ACTION',
        style: 'Minimal & Clean',
        emotion: 'Happy',
        composition: 'Center-Focused',
    }
];

const inputClasses = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100 transition-shadow";

const ThumbnailStudio: React.FC<ThumbnailStudioProps> = ({ brand, onUpdateBrand }) => {
    const [baseImagePrompt, setBaseImagePrompt] = useState('');
    const [overlayText, setOverlayText] = useState('');
    const [style, setStyle] = useState('Default');
    const [composition, setComposition] = useState('Default');
    const [emotion, setEmotion] = useState('None');
    const [logoPosition, setLogoPosition] = useState<LogoPosition>('top-right');
    const [baseImageFile, setBaseImageFile] = useState<File | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<{ goal: string; prompt: string; overlayText?: string; }[]>([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestedTexts, setSuggestedTexts] = useState<string[]>([]);
    const [isSuggestingText, setIsSuggestingText] = useState(false);
    
    const [previewingAsset, setPreviewingAsset] = useState<BrandAsset | null>(null);
    const [editSession, setEditSession] = useState<EditSession | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    
    // Editing Controls State
    const [editingBrightness, setEditingBrightness] = useState(100);
    const [editingContrast, setEditingContrast] = useState(100);
    const [editingSaturation, setEditingSaturation] = useState(100);
    const [editingLogoOpacity, setEditingLogoOpacity] = useState(100);
    const [editingTextOpacity, setEditingTextOpacity] = useState(100);
    const [editingFontSize, setEditingFontSize] = useState<EditingFontSize>('large');
    const [editingTextAlign, setEditingTextAlign] = useState<EditingTextAlign>('center');
    const [editingTextOutline, setEditingTextOutline] = useState(false);

    
    const [suggestedElements, setSuggestedElements] = useState<string[]>([]);
    const [isSuggestingElements, setIsSuggestingElements] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [selectedTemplateName, setSelectedTemplateName] = useState('Custom');


    const fileInputRef = useRef<HTMLInputElement>(null);

    const logoAsset = brand.assets.find(asset => asset.type === 'logo' && asset.isPrimary) || brand.assets.find(asset => asset.type === 'logo');
    const paletteAsset = brand.assets.find(asset => asset.type === 'palette');
    const thumbnailAssets = brand.assets.filter(asset => asset.type === 'youtube_thumbnail').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const allThumbnailTags = useMemo(() => [...new Set(thumbnailAssets.flatMap(a => a.tags || []))].sort(), [thumbnailAssets]);

    useEffect(() => {
        setSuggestions([]);
        setSuggestedElements([]);
        setSuggestedTexts([]);
    }, [baseImageFile, overlayText, baseImagePrompt]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBaseImageFile(e.target.files[0]);
        }
    };
    
    const handleTemplateClick = (template: typeof thumbnailTemplates[0]) => {
        // The brand context is handled by the final prompt assembly.
        // We only set the core request from the template here.
        setBaseImagePrompt(template.prompt);
        setOverlayText(template.overlayText);
        setStyle(template.style);
        setEmotion(template.emotion);
        setComposition(template.composition);
        setSelectedTemplateName(template.name);
        setIsTemplateModalOpen(false);
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
            const generatedSuggestions = await generatePromptSuggestions(
                "YouTube Thumbnail", 
                brand.description, 
                imageDescription,
                paletteAsset?.palette
            );
            setSuggestions(generatedSuggestions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSuggesting(false);
        }
    };
    
    const handleSuggestText = async () => {
        setIsSuggestingText(true);
        setSuggestedTexts([]);
        setError(null);
        try {
            const result = await generateThumbnailTextSuggestions(
                brand.description,
                selectedTemplateName,
                baseImagePrompt,
                paletteAsset?.palette
            );
            setSuggestedTexts(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get text suggestions.');
        } finally {
            setIsSuggestingText(false);
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
            const result = await generateThumbnailElementSuggestions(
                style, 
                emotion, 
                overlayText, 
                baseImagePrompt, 
                imageDescription,
                brand.description,
                paletteAsset?.palette
            );
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
            
            let logoInstruction = 'Do not include the brand logo.';
            if (logoPosition !== 'none') {
                logoInstruction = `The first image provided is the brand logo. It is on a plain white background; you MUST treat this background as transparent and integrate ONLY the logo itself seamlessly onto the thumbnail. Do not include the white box from the logo's background. Place this logo in a ${logoPosition === 'watermark' ? 'subtle watermark style' : `clear and visible manner in the ${logoPosition.replace('-', ' ')} corner`}.`;
            }

            let promptParts = [
                'Create a high-impact, professional YouTube thumbnail (16:9 aspect ratio). The output image MUST be 1280px wide by 720px tall.',
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
                logoInstruction
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
        if (!editSession || !logoAsset) {
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
            
            // Image adjustments
            if (editingBrightness !== 100) editInstructions.push(`adjust the overall brightness to ${editingBrightness}%`);
            if (editingContrast !== 100) editInstructions.push(`adjust the overall contrast to ${editingContrast}%`);
            if (editingSaturation !== 100) editInstructions.push(`adjust the image saturation to ${editingSaturation}%`);
            if (editingLogoOpacity !== 100) editInstructions.push(`make the brand logo ${editingLogoOpacity}% opaque`);
            
            // Text adjustments
            let textAdjustments = [];
            if (editingTextOpacity !== 100) textAdjustments.push(`${editingTextOpacity}% opaque`);
            textAdjustments.push(`font size should be ${editingFontSize}`);
            textAdjustments.push(`aligned ${editingTextAlign}`);
            if (editingTextOutline) textAdjustments.push(`with a thin black outline`);
            
            if(textAdjustments.length > 0) {
                editInstructions.push(`make the overlay text ${textAdjustments.join(', ')}`);
            }

            const combinedEditPrompt = editInstructions.filter(Boolean).join(', ');

            if (!combinedEditPrompt) {
                setError("No edits were specified.");
                setIsLoading(false);
                return;
            }

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
                        prompt: combinedEditPrompt,
                        createdAt: new Date().toISOString(),
                        tags: editingAsset.tags || [],
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
                     <button 
                        onClick={() => setIsTemplateModalOpen(true)} 
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-semibold bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                        <TemplateIcon className="w-5 h-5" />
                        Browse Templates
                    </button>
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
                                <button
                                    key={i}
                                    onClick={() => {
                                        setBaseImagePrompt(s.prompt);
                                        if (s.overlayText) {
                                            setOverlayText(s.overlayText);
                                        }
                                    }}
                                    className="w-full text-left p-2 bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-md transition-colors"
                                >
                                    <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">{s.goal}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        <span className="font-semibold">Image:</span> {s.prompt}
                                    </p>
                                    {s.overlayText && (
                                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                            <span className="font-semibold">Text:</span> "{s.overlayText}"
                                        </p>
                                    )}
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
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="overlay-text" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">2. Overlay Text</label>
                        <button onClick={handleSuggestText} disabled={isSuggestingText || isLoading} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50">
                            <LightbulbIcon className="w-4 h-4" />
                            {isSuggestingText ? 'Thinking...' : 'Suggest Text'}
                        </button>
                    </div>
                    <input id="overlay-text" type="text" value={overlayText} onChange={e => setOverlayText(e.target.value)} placeholder="e.g., YOU WON'T BELIEVE THIS!" className={inputClasses} disabled={isLoading} />
                     {suggestedTexts.length > 0 && (
                         <div className="mt-2 space-y-2">
                            {suggestedTexts.map((text, i) => (
                                <button key={i} onClick={() => setOverlayText(text)} className="w-full text-left p-2 bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-md transition-colors text-sm font-medium">
                                    "{text}"
                                </button>
                            ))}
                        </div>
                    )}
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
                        {(['top-right', 'top-left', 'bottom-left', 'bottom-right', 'watermark', 'none'] as LogoPosition[]).map(pos => (
                            <button key={pos} onClick={() => setLogoPosition(pos)} disabled={isLoading} className={`px-3 py-1 text-xs rounded-full capitalize transition-colors font-semibold ${logoPosition === pos ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200'}`}>
                                {pos.replace('-', ' ')}
                            </button>
                        ))}
                     </div>
                </div>
                <div className="w-full flex justify-center">
                    <button onClick={handleGenerateThumbnail} disabled={isLoading || (!baseImagePrompt.trim() && !baseImageFile)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed shadow-md">
                        <SparklesIcon className="w-5 h-5" />
                        {isLoading ? 'Generating...' : 'Generate Thumbnail'}
                    </button>
                </div>
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
            
            {isTemplateModalOpen && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsTemplateModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Browse Templates</h2>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                            {thumbnailTemplates.map(template => (
                                 <button key={template.name} onClick={() => handleTemplateClick(template)} disabled={isLoading} title={template.name} className="flex flex-col items-center justify-center text-center gap-2 p-3 aspect-square bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 disabled:opacity-50 hover:-translate-y-1">
                                     <div className="text-indigo-600 dark:text-indigo-400">{template.icon}</div>
                                     <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">{template.name}</p>
                                 </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
                        setEditingSaturation(100);
                        setEditingFontSize('large');
                        setEditingTextAlign('center');
                        setEditingTextOutline(false);
                    }}
                    onUpdateTags={handleUpdateAssetTags}
                    availableTags={allThumbnailTags}
                />
            )}

            {editSession && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit Thumbnail</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={handleUndo} disabled={isLoading || editSession.currentIndex <= 0} title="Undo" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <UndoIcon className="w-5 h-5" />
                                </button>
                                <button onClick={handleRedo} disabled={isLoading || editSession.currentIndex >= editSession.history.length - 1} title="Redo" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <RedoIcon className="w-5 h-5" />
                                </button>
                                 <button onClick={() => setEditSession(null)} disabled={isLoading} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-1 flex flex-col items-center justify-center">
                                <div className="w-full aspect-video bg-slate-100 dark:bg-slate-700 rounded-md p-1">
                                    <AsyncImage assetId={editSession.history[editSession.currentIndex].id} alt="thumbnail to edit" className="w-full h-full object-contain"/>
                                </div>
                            </div>
                            <div className="md:col-span-1 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Conversational Edit:</label>
                                    <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g., Make the text red, add a shocked face" className={inputClasses} rows={2} disabled={isLoading} />
                                </div>
                                
                                <div className="space-y-4 pt-2">
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Image Adjustments</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex justify-between">Brightness <span>{editingBrightness}%</span></label>
                                            <input type="range" min="50" max="150" value={editingBrightness} onChange={e => setEditingBrightness(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                        </div>
                                         <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex justify-between">Contrast <span>{editingContrast}%</span></label>
                                            <input type="range" min="50" max="150" value={editingContrast} onChange={e => setEditingContrast(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                        </div>
                                         <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex justify-between">Saturation <span>{editingSaturation}%</span></label>
                                            <input type="range" min="0" max="200" value={editingSaturation} onChange={e => setEditingSaturation(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex justify-between">Logo Opacity <span>{editingLogoOpacity}%</span></label>
                                            <input type="range" min="0" max="100" value={editingLogoOpacity} onChange={e => setEditingLogoOpacity(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 pt-2">Text Adjustments</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 flex justify-between">Text Opacity <span>{editingTextOpacity}%</span></label>
                                            <input type="range" min="0" max="100" value={editingTextOpacity} onChange={e => setEditingTextOpacity(Number(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Font Size</label>
                                            <div className="flex bg-slate-200 dark:bg-slate-700 rounded-md p-1">
                                                {(['medium', 'large', 'extra large'] as EditingFontSize[]).map(size => (
                                                    <button key={size} onClick={() => setEditingFontSize(size)} className={`w-1/3 text-xs font-semibold capitalize rounded p-1 transition-colors ${editingFontSize === size ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>{size}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Alignment</label>
                                            <div className="flex bg-slate-200 dark:bg-slate-700 rounded-md p-1">
                                                 {(['left', 'center', 'right'] as EditingTextAlign[]).map(align => (
                                                    <button key={align} onClick={() => setEditingTextAlign(align)} className={`w-1/3 flex justify-center items-center rounded p-1 transition-colors ${editingTextAlign === align ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}>
                                                        {align === 'left' && <TextAlignLeftIcon className="w-5 h-5" />}
                                                        {align === 'center' && <TextAlignCenterIcon className="w-5 h-s" />}
                                                        {align === 'right' && <TextAlignRightIcon className="w-5 h-5" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                         <div>
                                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Text Outline</label>
                                            <button onClick={() => setEditingTextOutline(prev => !prev)} className={`w-full p-2 text-xs font-semibold capitalize rounded-md transition-colors ${editingTextOutline ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                                {editingTextOutline ? 'Outline: On' : 'Outline: Off'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                     <button onClick={handleEditThumbnail} disabled={isLoading} className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed">
                                        {isLoading ? "Generating..." : "Generate Edit"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThumbnailStudio;
