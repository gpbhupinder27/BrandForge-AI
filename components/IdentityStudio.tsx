import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Brand, BrandAsset, ColorPalette, TypographyPairing } from '../types';
import { generateWithNanoBanana, fileToBase64, generateStructuredContent, describeImage, generatePromptSuggestions, getImageDimensions } from '../services/geminiService';
import { storeImage, getImage } from '../services/imageDb';
import { Type } from "@google/genai";
import Loader from './Loader';
import SparklesIcon from './icons/SparklesIcon';
import PaletteIcon from './icons/PaletteIcon';
import TypographyIcon from './icons/TypographyIcon';
import DownloadIcon from './icons/DownloadIcon';
import RegenerateIcon from './icons/RegenerateIcon';
import AsyncImage from './AsyncImage';
import AssetPreviewModal from './AssetPreviewModal';
import TagIcon from './icons/TagIcon';
import ImageIcon from './icons/ImageIcon';
import BeakerIcon from './icons/BeakerIcon';
import TemplateIcon from './icons/TemplateIcon';
import RectangleStackIcon from './icons/RectangleStackIcon';
import XMarkIcon from './icons/XMarkIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import IdentificationIcon from './icons/IdentificationIcon';
import EditIcon from './icons/EditIcon';
import ScissorsIcon from './icons/ScissorsIcon';
import WandIcon from './icons/WandIcon';

interface IdentityStudioProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
}

const logoTemplateCategories = [
    {
        name: 'Minimalist & Clean',
        templates: [
            {
                name: 'Geometric Mark',
                description: 'Clean, modern, and abstract.',
                prompt: "A minimalist, modern logo using simple geometric shapes like circles, squares, or triangles. The design should be clean, abstract, and memorable.",
                icon: <RectangleStackIcon className="w-6 h-6" />
            },
            {
                name: 'Clean Wordmark',
                description: 'Modern sans-serif typography.',
                prompt: "A minimalist and clean wordmark logo using a modern, sans-serif font like Inter, Poppins, or Montserrat. The focus is on perfect kerning and simplicity.",
                icon: <TypographyIcon className="w-6 h-6" />
            },
            {
                name: 'Initials Monogram',
                description: 'Cleverly combined initials.',
                prompt: "A clever and simple monogram logo using the brand's initials. The initials should be intertwined or combined in a unique, memorable way.",
                icon: <IdentificationIcon className="w-6 h-6" />
            },
            {
                name: 'Line Art Icon',
                description: 'Elegant, single-line illustration.',
                prompt: "A single-line, continuous line art icon that represents the brand's core concept. The style is delicate, modern, and abstract.",
                icon: <EditIcon className="w-6 h-6" />
            }
        ]
    },
    {
        name: 'Elegant & Classic',
        templates: [
            {
                name: 'Elegant Serif',
                description: 'Classic, sophisticated, and timeless.',
                prompt: "An elegant and luxurious logo featuring the brand name in a classic serif font. The style should be sophisticated and timeless, possibly with a simple monogram or icon.",
                icon: <TypographyIcon className="w-6 h-6" />
            },
            {
                name: 'Luxury Emblem',
                description: 'Established, premium, and detailed.',
                prompt: "A classic and detailed emblem or crest. Incorporate elements like laurels, banners, and a central monogram. The style should feel established and premium.",
                icon: <RectangleStackIcon className="w-6 h-6" />
            },
            {
                name: 'Signature Script',
                description: 'Personal, handcrafted, and flowing.',
                prompt: "A beautiful, flowing signature script logo. The style should feel personal, handcrafted, and elegant.",
                icon: <EditIcon className="w-6 h-6" />
            },
            {
                name: 'Art Deco',
                description: 'Glamorous, geometric, and symmetrical.',
                prompt: "An Art Deco-inspired logo. Use strong geometric patterns, symmetry, and luxurious metallic colors. The style should be glamorous and sophisticated.",
                icon: <TemplateIcon className="w-6 h-6" />
            }
        ]
    },
    {
        name: 'Bold & Modern',
        templates: [
            {
                name: 'Abstract Mark',
                description: 'Dynamic, unique, and conceptual.',
                prompt: "An abstract, dynamic logo mark. The design should represent the brand's core ideas using flowing lines, unique shapes, or an interesting visual concept. It should be modern and versatile.",
                icon: <BeakerIcon className="w-6 h-6" />
            },
            {
                name: 'Gradient Shape',
                description: 'Vibrant, tech-forward, and energetic.',
                prompt: "A vibrant logo featuring a modern abstract shape with a smooth, colorful gradient. The style is tech-forward and energetic.",
                icon: <PaletteIcon className="w-6 h-6" />
            },
            {
                name: 'Negative Space',
                description: 'Smart, clever, with a hidden meaning.',
                prompt: "A clever logo that uses negative space to reveal a hidden symbol or initial related to the brand. The design is smart and minimalist.",
                icon: <ScissorsIcon className="w-6 h-6" />
            },
            {
                name: '3D / Isometric',
                description: 'Dimensional, technical, and innovative.',
                prompt: "A 3D isometric logo. The design should have depth and perspective, giving a sense of dimensionality. The style is modern, technical, and innovative.",
                icon: <RectangleStackIcon className="w-6 h-6" />
            }
        ]
    },
    {
        name: 'Playful & Creative',
        templates: [
            {
                name: 'Playful Mascot',
                description: 'Friendly, fun, and approachable character.',
                prompt: "A fun and friendly mascot logo. Create a simple, cute character that represents the brand's friendly and approachable personality. The mascot should be memorable.",
                icon: <SparklesIcon className="w-6 h-6" />
            },
            {
                name: 'Hand-Drawn Charm',
                description: 'Organic, rustic, and authentic.',
                prompt: "A charming, hand-drawn logo. The style should feel organic, rustic, and authentic, with imperfect lines and a warm personality.",
                icon: <WandIcon className="w-6 h-6" />
            },
            {
                name: 'Colorful Abstract',
                description: 'Artistic, dynamic, and vibrant.',
                prompt: "A creative logo made of overlapping, colorful, semi-transparent abstract shapes. The style is vibrant, artistic, and dynamic.",
                icon: <BeakerIcon className="w-6 h-6" />
            },
            {
                name: 'Pattern-Based',
                description: 'Decorative, bold, and eye-catching.',
                prompt: "A logo where the name is encased within a unique, repeating pattern. The style is bold, decorative, and eye-catching.",
                icon: <TemplateIcon className="w-6 h-6" />
            }
        ]
    }
];

const popularGoogleFonts = [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Playfair Display',
    'Merriweather', 'Lora', 'Source Sans Pro', 'Poppins', 'Nunito', 'Raleway',
    'Inter', 'Work Sans', 'Ubuntu', 'PT Serif', 'Noto Sans', 'Arvo', 'Fira Sans',
    'Inconsolata', 'Lobster', 'Pacifico', 'Bebas Neue', 'Exo 2', 'Comfortaa',
    'Josefin Sans', 'Abel', 'Barlow', 'Cabin', 'Dosis', 'Quicksand'
];

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const Section: React.FC<SectionProps> = ({ title, icon, subtitle, children, disabled = false, className = '' }) => (
    <section className={`bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700/50 transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'} ${className}`}>
        <h3 className="text-2xl font-bold mb-2 flex items-center gap-3 text-slate-900 dark:text-slate-100">
            {icon}
            {title}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6">{subtitle}</p>
        <div>
            {children}
            {disabled && <p className="text-xs text-yellow-500 dark:text-yellow-400 mt-2">Complete the previous steps first.</p>}
        </div>
    </section>
);

const IdentityStudio: React.FC<IdentityStudioProps> = ({ brand, onUpdateBrand }) => {
  const [palettePrompt, setPalettePrompt] = useState('');
  const [typographyPrompt, setTypographyPrompt] = useState('');
  const [logoPrompt, setLogoPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSection, setLoadingSection] = useState<'logo' | 'palette' | 'typography' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<BrandAsset | null>(null);
  const [previewingAsset, setPreviewingAsset] = useState<BrandAsset | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [refImageDims, setRefImageDims] = useState<{width: number, height: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<{ goal: string; prompt: string; overlayText?: string; }[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionLoadingMessage, setSuggestionLoadingMessage] = useState('Thinking...');
  const [isLogoTemplateModalOpen, setIsLogoTemplateModalOpen] = useState(false);
  const [activeTemplateCategory, setActiveTemplateCategory] = useState<string>(logoTemplateCategories[0].name);

  
  const paletteAsset = brand.assets.find(asset => asset.type === 'palette');
  const typographyAsset = brand.assets.find(asset => asset.type === 'typography');
  const logoAssets = brand.assets.filter(asset => asset.type === 'logo').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const [manualHeadlineFont, setManualHeadlineFont] = useState(typographyAsset?.typography?.headlineFont.name || '');
  const [manualBodyFont, setManualBodyFont] = useState(typographyAsset?.typography?.bodyFont.name || '');

  const allLogoTags = [...new Set(logoAssets.filter(a => !a.parentId).flatMap(a => a.tags || []))].sort();

  useEffect(() => {
    setSuggestions([]);
  }, [referenceImage]);

  useEffect(() => {
    if (typographyAsset?.typography) {
        setManualHeadlineFont(typographyAsset.typography.headlineFont.name);
        setManualBodyFont(typographyAsset.typography.bodyFont.name);
    }
  }, [typographyAsset]);

  useEffect(() => {
    if (referenceImage) {
        const img = new Image();
        const url = URL.createObjectURL(referenceImage);
        img.onload = () => {
            setRefImageDims({ width: img.width, height: img.height });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    } else {
        setRefImageDims(null);
    }
  }, [referenceImage]);
  
  const assetGroups = useMemo(() => {
    const originals = logoAssets.filter(a => !a.parentId);
    const variantsMap = logoAssets.reduce((map, asset) => {
        if (asset.parentId) {
            if (!map.has(asset.parentId)) map.set(asset.parentId, []);
            map.get(asset.parentId)!.push(asset);
        }
        return map;
    }, new Map<string, BrandAsset[]>());

    return originals.map(original => ({
        original,
        variants: (variantsMap.get(original.id) || []).sort((a, b) => (a.variantLabel || '').localeCompare(b.variantLabel || '')),
    }));
  }, [logoAssets]);

  const filteredAssetGroups = useMemo(() => {
      if (activeFilters.length === 0) return assetGroups;
      return assetGroups.filter(({ original }) => 
          activeFilters.every(filter => original.tags?.includes(filter))
      );
  }, [assetGroups, activeFilters]);

  const handleFilterToggle = (tag: string) => {
    setActiveFilters(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };
  
  const handleTemplateClick = (templatePrompt: string) => {
    const finalPrompt = `A logo for a brand named "${brand.name}", which is described as "${brand.description}". The creative direction is: ${templatePrompt}`;
    setLogoPrompt(finalPrompt);
    setIsLogoTemplateModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReferenceImage(e.target.files[0]);
    }
  };

  const handleUpdateAssetTags = (assetId: string, tags: string[]) => {
    const updatedAssets = brand.assets.map(asset => 
        asset.id === assetId ? { ...asset, tags } : asset
    );
    onUpdateBrand({ ...brand, assets: updatedAssets });
  };
  
   const handleSetPrimaryLogo = (logoId: string) => {
        const updatedAssets = brand.assets.map(asset => {
            if (asset.type === 'logo') {
                return { ...asset, isPrimary: asset.id === logoId };
            }
            return asset;
        });
        onUpdateBrand({ ...brand, assets: updatedAssets });
    };

  const handleDownload = async (assetId: string, assetType: string) => {
    const imageUrl = await getImage(assetId);
    if (!imageUrl) {
        console.error("Image not found in DB for download");
        setError("Could not find image to download.");
        return;
    }
    const filename = `${brand.name}-${assetType}-${crypto.randomUUID().slice(0, 6)}.png`;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePalette = async (useCustomPrompt: boolean) => {
    setIsLoading(true);
    setLoadingSection('palette');
    setError(null);
    const finalPrompt = `Generate a color palette for a brand named "${brand.name}" (${brand.description}). ${useCustomPrompt && palettePrompt ? `The user wants something like: "${palettePrompt}".` : "Generate a suitable, professional palette."}`;

    try {
        const schema = { type: Type.OBJECT, properties: { paletteName: { type: Type.STRING }, description: { type: Type.STRING }, colors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, name: { type: Type.STRING } }, required: ["hex", "name"] } } }, required: ["paletteName", "description", "colors"] };
        const result = await generateStructuredContent<ColorPalette>(finalPrompt, schema);
        
        const newAsset: BrandAsset = { id: crypto.randomUUID(), type: 'palette', prompt: finalPrompt, palette: result, createdAt: new Date().toISOString() };
        const updatedAssets = brand.assets.filter(a => a.type !== 'palette').concat(newAsset);
        onUpdateBrand({ ...brand, assets: updatedAssets });
        setPalettePrompt('');

    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the palette.');
    } finally {
        setIsLoading(false);
        setLoadingSection(null);
    }
  };

  const handleColorChange = (index: number, newHex: string) => {
    if (!paletteAsset) return;

    // Allow typing '#' and partial hex codes without validating mid-type
    const cleanHex = newHex.startsWith('#') ? newHex : `#${newHex}`;
    if (cleanHex.length > 7) return;

    const updatedColors = [...paletteAsset.palette.colors];
    updatedColors[index] = { ...updatedColors[index], hex: cleanHex };

    const updatedPalette: ColorPalette = { ...paletteAsset.palette, colors: updatedColors };
    const updatedAsset: BrandAsset = { ...paletteAsset, palette: updatedPalette };
    const updatedAssets = brand.assets.map(a => a.id === paletteAsset.id ? updatedAsset : a);
    onUpdateBrand({ ...brand, assets: updatedAssets });
  };
  
  const handleHexBlur = (index: number, currentHex: string) => {
      // On blur, validate and format the hex code
      if (!/^#[0-9a-f]{6}$/i.test(currentHex)) {
          let validHex = currentHex.replace(/[^0-9a-f]/gi, '').substring(0, 6);
          validHex = `#${validHex.padEnd(6, '0')}`;
          handleColorChange(index, validHex);
      }
  }


  const handleGenerateTypography = async (useCustomPrompt: boolean) => {
    setIsLoading(true);
    setLoadingSection('typography');
    setError(null);
    const paletteInfo = paletteAsset?.palette ? ` The brand's color palette is described as "${paletteAsset.palette.description}".` : '';
    const finalPrompt = `Generate a professional typography pairing (headline and body) for "${brand.name}".${paletteInfo} ${useCustomPrompt && typographyPrompt ? `The user wants something like: "${typographyPrompt}".` : "Generate a suitable pairing."} Provide well-known Google Fonts or standard web fonts.`;

    try {
        const fontSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["name", "description"] };
        const schema = { type: Type.OBJECT, properties: { headlineFont: fontSchema, bodyFont: fontSchema }, required: ["headlineFont", "bodyFont"] };
        const result = await generateStructuredContent<TypographyPairing>(finalPrompt, schema);

        const newAsset: BrandAsset = { id: crypto.randomUUID(), type: 'typography', prompt: finalPrompt, typography: result, createdAt: new Date().toISOString() };
        const updatedAssets = brand.assets.filter(a => a.type !== 'typography').concat(newAsset);
        onUpdateBrand({ ...brand, assets: updatedAssets });
        setTypographyPrompt('');

    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while generating typography.');
    } finally {
        setIsLoading(false);
        setLoadingSection(null);
    }
  };

  const handleSetManualFonts = () => {
    if (!manualHeadlineFont.trim() || !manualBodyFont.trim()) return;
    
    const newTypography: TypographyPairing = {
        headlineFont: { name: manualHeadlineFont, description: 'Manually selected font.' },
        bodyFont: { name: manualBodyFont, description: 'Manually selected font.' }
    };
    
    const newAsset: BrandAsset = {
        id: crypto.randomUUID(),
        type: 'typography',
        prompt: 'Manually selected fonts.',
        typography: newTypography,
        createdAt: new Date().toISOString()
    };
    
    const updatedAssets = brand.assets.filter(a => a.type !== 'typography').concat(newAsset);
    onUpdateBrand({ ...brand, assets: updatedAssets });
  };

  const handleGenerateLogo = async (baseAsset?: BrandAsset) => {
    const currentPrompt = baseAsset ? editPrompt : logoPrompt;
    if (!currentPrompt.trim()) return;

    setIsLoading(true);
    setLoadingSection('logo');
    setError(null);

    try {
      let generatedParts;
      const { width: targetWidth, height: targetHeight } = refImageDims ? refImageDims : { width: 1024, height: 1024 };

      const paletteInfo = paletteAsset?.palette ? ` Use a color palette inspired by these hex codes: ${paletteAsset.palette.colors.map(c => c.hex).join(', ')}.` : '';
      const typoInfo = typographyAsset?.typography ? ` The brand's typography feels like: "${typographyAsset.typography.headlineFont.description}".` : '';
      
      if (baseAsset) {
          // EDITING: Use nano-banana
          const baseImageUrl = await getImage(baseAsset.id);
          if (!baseImageUrl) throw new Error("Base image for editing not found.");
          const response = await fetch(baseImageUrl);
          const blob = await response.blob();
          const file = new File([blob], "edit_image.png", { type: blob.type });
          const base64 = await fileToBase64(file);
          const imageInputs = [{ data: base64, mimeType: file.type }];
          const finalPrompt = `Update the provided logo for a brand named "${brand.name}". User request: "${currentPrompt}". Keep the brand name clear. The logo MUST be on a plain, solid white background.`;
          generatedParts = await generateWithNanoBanana(finalPrompt, imageInputs, targetWidth, targetHeight);
      } else if (referenceImage) {
          // GENERATION with reference: Use nano-banana
          const base64 = await fileToBase64(referenceImage);
          const imageInputs = [{ data: base64, mimeType: referenceImage.type }];
          const referenceInfo = ` The user has provided a reference image; use it as strong visual inspiration for the logo's style, shape, and overall concept.`;
          const finalPrompt = `Create a logo for a brand named "${brand.name}". User request: "${currentPrompt}".${paletteInfo}${typoInfo}${referenceInfo} The logo MUST be on a plain, solid white background. Do not add any shadows or other background elements.`;
          generatedParts = await generateWithNanoBanana(finalPrompt, imageInputs, targetWidth, targetHeight);
      } else {
          // PURE TEXT-TO-IMAGE GENERATION: Use Nano Banana
          const finalPrompt = `Create a logo for a brand named "${brand.name}". User request: "${currentPrompt}".${paletteInfo}${typoInfo} The logo MUST be on a plain, solid white background. Do not add any shadows or other background elements.`;
          generatedParts = await generateWithNanoBanana(finalPrompt, [], targetWidth, targetHeight);
      }
      
      const newAssets: BrandAsset[] = [];
      const existingLogos = brand.assets.filter(a => a.type === 'logo');

      for (const [index, part] of generatedParts.filter(p => 'inlineData' in p).entries()) {
        if ('inlineData' in part) {
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          const { width, height } = await getImageDimensions(imageUrl);
          const asset: BrandAsset = {
            id: crypto.randomUUID(),
            type: 'logo',
            prompt: currentPrompt,
            createdAt: new Date().toISOString(),
            isPrimary: !baseAsset && existingLogos.length === 0 && index === 0, // Make first logo primary if none exist
            width,
            height,
          };
          await storeImage(asset.id, imageUrl);
          newAssets.push(asset);
        }
      }
      
      onUpdateBrand({ ...brand, assets: [...brand.assets, ...newAssets] });

      setEditingAsset(null);
      setPreviewingAsset(null);
      setEditPrompt('');
      setLogoPrompt('');
      setReferenceImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingSection(null);
    }
  };

  const handleGenerateLogoVariants = async (baseAsset: BrandAsset) => {
    setIsLoading(true);
    setLoadingSection('logo');
    setError(null);
    setPreviewingAsset(null); // Close the modal

    try {
        const baseImageUrl = await getImage(baseAsset.id);
        if (!baseImageUrl) throw new Error("Base logo image not found.");
        const response = await fetch(baseImageUrl);
        const blob = await response.blob();
        const file = new File([blob], "base_logo.png", { type: blob.type });
        const base64 = await fileToBase64(file);
        const imageInputs = [{ data: base64, mimeType: file.type }];

        const variantPrompt = `Create exactly 2 A/B test variations for the provided logo. The original prompt was: "${baseAsset.prompt}". Generate two distinct versions that target different potential audiences. For example, one could be more playful and modern for a younger audience, while the other could be more elegant and professional for a corporate audience. The variations should explore different styles (e.g., color, typography, shape) but keep the brand name '${brand.name}' clear. Each variation MUST have a transparent background.`;
        
        const generatedParts = await generateWithNanoBanana(variantPrompt, imageInputs, 1024, 1024);
        
        const newVariantAssets: BrandAsset[] = [];
        for (const [index, part] of generatedParts.filter(p => 'inlineData' in p).entries()) {
            if ('inlineData' in part) {
                const newId = crypto.randomUUID();
                const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                await storeImage(newId, imageUrl);
                newVariantAssets.push({
                    id: newId,
                    type: 'logo',
                    prompt: `A/B Test Variant (Audience Exploration) of: "${baseAsset.prompt}"`,
                    createdAt: new Date().toISOString(),
                    tags: baseAsset.tags || [],
                    parentId: baseAsset.id,
                    variantLabel: `Variant ${index + 1}`
                });
            }
        }
        
        if (newVariantAssets.length === 0) {
            throw new Error("The AI did not return any logo variations. Please try again.");
        }

        onUpdateBrand({ ...brand, assets: [...brand.assets, ...newVariantAssets] });

    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while generating logo variants.');
    } finally {
        setIsLoading(false);
        setLoadingSection(null);
    }
  };

  const handleSuggestPrompts = async () => {
    setIsSuggesting(true);
    setSuggestions([]);
    setError(null);

    try {
        let imageDescription = '';
        if (referenceImage) {
            setSuggestionLoadingMessage('Analyzing image...');
            const base64 = await fileToBase64(referenceImage);
            imageDescription = await describeImage(base64, referenceImage.type);
        }
        
        setSuggestionLoadingMessage('Generating ideas...');
        const creativeTypeLabel = "Brand Logo";
        const generatedSuggestions = await generatePromptSuggestions(creativeTypeLabel, brand.description, imageDescription);
        setSuggestions(generatedSuggestions);

    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while generating suggestions.');
    } finally {
        setIsSuggesting(false);
        setSuggestionLoadingMessage('Thinking...');
    }
  };
  

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* === LEFT COLUMN: IDENTITY PANEL === */}
        <div className="lg:col-span-2 space-y-8">
             {/* Color Palette */}
            <Section title="Color Palette" icon={<PaletteIcon className="w-6 h-6"/>} subtitle="Define your brand's look and feel.">
                {loadingSection === 'palette' ? <Loader message="Creating palette..."/> : paletteAsset?.palette ? (
                    <div>
                        <h5 className="font-bold text-lg text-slate-900 dark:text-slate-100">{paletteAsset.palette.paletteName}</h5>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{paletteAsset.palette.description}</p>
                        <div className="flex flex-wrap gap-4">
                            {paletteAsset.palette.colors.map((color, index) => (
                                <div key={index} className="text-center">
                                    <label className="cursor-pointer">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-slate-200 dark:border-slate-600 shadow-md" style={{ backgroundColor: color.hex }}></div>
                                        <input 
                                            type="color" 
                                            value={color.hex} 
                                            onChange={(e) => handleColorChange(index, e.target.value)}
                                            className="absolute opacity-0 w-0 h-0"
                                        />
                                    </label>
                                    <input
                                        type="text"
                                        value={color.hex}
                                        onChange={(e) => handleColorChange(index, e.target.value)}
                                        onBlur={(e) => handleHexBlur(index, e.target.value)}
                                        className="w-20 mt-2 p-1 text-center font-mono tracking-tighter text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                        maxLength={7}
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{color.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : <p className="text-slate-500 italic">No color palette generated yet.</p>}
                <div className="mt-6 flex flex-wrap gap-4 items-center">
                    <input type="text" value={palettePrompt} onChange={e => setPalettePrompt(e.target.value)} placeholder="e.g., earthy tones" className="flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-slate-900 dark:text-slate-100" disabled={isLoading} />
                    <div className="flex gap-2">
                    <button onClick={() => handleGeneratePalette(true)} disabled={isLoading || !palettePrompt.trim()} className="flex items-center justify-center gap-2 px-4 py-2 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed">
                        <SparklesIcon className="w-5 h-5"/> Generate
                    </button>
                    <button onClick={() => handleGeneratePalette(false)} disabled={isLoading} title="Regenerate Palette" className="p-2.5 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed">
                        <RegenerateIcon className="w-5 h-5"/>
                    </button>
                    </div>
                </div>
            </Section>

            {/* Typography */}
            <Section title="Typography Pairing" icon={<TypographyIcon className="w-6 h-6"/>} subtitle="Choose the fonts for your brand." disabled={!paletteAsset}>
                {loadingSection === 'typography' ? <Loader message="Designing fonts..."/> : typographyAsset?.typography ? (
                    <div className="space-y-6 bg-slate-100 dark:bg-slate-700/30 p-4 rounded-md">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Headline</p>
                            <p className="text-4xl font-bold text-slate-900 dark:text-slate-50" style={{fontFamily: typographyAsset.typography.headlineFont?.name ? `'${typographyAsset.typography.headlineFont.name}'` : 'sans-serif'}}>{typographyAsset.typography.headlineFont?.name || 'Not set'}</p>
                            <p className="text-xs text-slate-500 italic mt-1">{typographyAsset.typography.headlineFont?.description}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Body</p>
                            <p className="text-lg text-slate-800 dark:text-slate-200" style={{fontFamily: typographyAsset.typography.bodyFont?.name ? `'${typographyAsset.typography.bodyFont.name}'` : 'sans-serif'}}>The quick brown fox jumps over the lazy dog. {typographyAsset.typography.bodyFont?.name || 'Not set'}</p>
                            <p className="text-xs text-slate-500 italic mt-1">{typographyAsset.typography.bodyFont?.description}</p>
                        </div>
                    </div>
                ) : <p className="text-slate-500 italic">No typography pairing generated yet.</p>}
                <div className="mt-6 space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700/50">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">AI Generation</h4>
                    <div className="flex flex-wrap gap-4 items-center">
                        <input type="text" value={typographyPrompt} onChange={e => setTypographyPrompt(e.target.value)} placeholder="e.g., elegant and classic" className="flex-grow bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-slate-900 dark:text-slate-100" disabled={isLoading} />
                        <div className="flex gap-2">
                        <button onClick={() => handleGenerateTypography(true)} disabled={isLoading || !typographyPrompt.trim()} className="flex items-center justify-center gap-2 px-4 py-2 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed">
                            <SparklesIcon className="w-5 h-5"/> Generate
                        </button>
                        <button onClick={() => handleGenerateTypography(false)} disabled={isLoading} title="Regenerate Typography" className="p-2.5 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed">
                            <RegenerateIcon className="w-5 h-5"/>
                        </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700/50">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Manual Selection</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Headline Font</label>
                            <select value={manualHeadlineFont} onChange={e => setManualHeadlineFont(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100" disabled={isLoading}>
                                <option value="">Select a font</option>
                                {popularGoogleFonts.map(font => <option key={font} value={font}>{font}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Body Font</label>
                            <select value={manualBodyFont} onChange={e => setManualBodyFont(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100" disabled={isLoading}>
                                <option value="">Select a font</option>
                                {popularGoogleFonts.map(font => <option key={font} value={font}>{font}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={handleSetManualFonts} disabled={isLoading || !manualHeadlineFont.trim() || !manualBodyFont.trim()} className="px-4 py-2 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed">
                            Set Manual Fonts
                        </button>
                    </div>
                </div>
                </div>
            </Section>
        </div>

        {/* === RIGHT COLUMN: LOGO STUDIO === */}
        <div className="lg:col-span-3">
             <Section title="Logo Studio" icon={<SparklesIcon className="w-6 h-6"/>} subtitle="Bring your brand to life with a unique logo." disabled={!typographyAsset} className="h-full">
                <div className="space-y-8">
                    {/* === CREATION ZONE === */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-lg border border-slate-200 dark:border-slate-700/50">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Logo Creation Zone</h3>
                        <div className="flex flex-col gap-6">
                             {/* 1. Browse Templates */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Start with a template</label>
                                <button
                                    onClick={() => setIsLogoTemplateModalOpen(true)}
                                    disabled={isLoading}
                                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 font-semibold bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-600 shadow-sm"
                                >
                                    <TemplateIcon className="w-5 h-5" /> Browse templates
                                </button>
                            </div>

                            {/* 2. Logo Textarea */}
                            <div className="space-y-2">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Describe your logo</label>
                                        <button
                                            onClick={handleSuggestPrompts}
                                            disabled={isSuggesting || isLoading}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            <LightbulbIcon className="w-4 h-4" />
                                            {isSuggesting ? suggestionLoadingMessage : 'Get Ideas'}
                                        </button>
                                    </div>
                                    <textarea
                                        value={logoPrompt}
                                        onChange={(e) => setLogoPrompt(e.target.value)}
                                        placeholder="e.g., A minimalist logo of a roaring lion's head, using geometric shapes."
                                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-slate-900 dark:text-slate-100"
                                        rows={4}
                                        disabled={isLoading}
                                    />
                                </div>
                                {suggestions.length > 0 && !isSuggesting && (
                                    <div className="space-y-2 animate-fade-in">
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setLogoPrompt(s.prompt)}
                                                className="w-full text-left p-2.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-md transition-colors"
                                            >
                                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{s.goal}</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400">{s.prompt}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                             {/* 3. Upload Image */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Reference Image (optional)</label>
                                {!referenceImage ? (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                        Upload Image
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-3 p-2 bg-slate-200 dark:bg-slate-700 rounded-md">
                                        <img src={URL.createObjectURL(referenceImage)} alt="Reference Preview" className="w-12 h-12 object-contain rounded-md bg-white dark:bg-slate-600" />
                                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">{referenceImage.name}</span>
                                        <button
                                            onClick={() => {
                                                setReferenceImage(null);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                            className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600"
                                            aria-label="Remove image"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" disabled={isLoading} />
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/50 flex justify-center">
                            <button
                            onClick={() => handleGenerateLogo()}
                            disabled={isLoading || !logoPrompt.trim()}
                            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed shadow-md"
                            >
                            <SparklesIcon className="w-5 h-5" />
                            {loadingSection === 'logo' ? 'Generating...' : 'Generate Logo'}
                            </button>
                        </div>
                    </div>

                    {/* === RESULTS AREA === */}
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Generated Logos</h3>
                        
                        {allLogoTags.length > 0 && (
                            <div className="mb-4 p-4 bg-slate-100 dark:bg-slate-700/40 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                <TagIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                <h5 className="font-semibold text-slate-700 dark:text-slate-200">Filter by Tag</h5>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {allLogoTags.map(tag => (
                                        <button 
                                            key={tag} 
                                            onClick={() => handleFilterToggle(tag)}
                                            className={`px-3 py-1 text-sm rounded-full transition-colors font-semibold ${activeFilters.includes(tag) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100'}`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                    {activeFilters.length > 0 && (
                                    <button onClick={() => setActiveFilters([])} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Clear</button>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex-1">
                            {loadingSection === 'logo' ? <div className="flex justify-center items-center h-full"><Loader message="Generating logo..."/></div> : 
                            logoAssets.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg mt-4 h-full flex flex-col justify-center">
                                <ImageIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
                                <h5 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">Ready to Create?</h5>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use the tools above to generate your first logo.</p>
                            </div>
                            ) : filteredAssetGroups.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-500 dark:text-slate-400">No logos match your selected filters.</p>
                            </div>
                            ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredAssetGroups.map(({ original, variants }) => {
                                    const isPrimary = original.isPrimary;
                                    return (
                                        <div key={original.id} className={`p-4 border rounded-lg bg-white dark:bg-slate-800/20 transition-all ${isPrimary ? 'border-indigo-500 shadow-lg' : 'border-slate-200 dark:border-slate-700/50'}`}>
                                            {isPrimary && (
                                                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded-full z-10">Primary</div>
                                            )}
                                            <div
                                                className="group relative cursor-pointer rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700/50"
                                                style={{ aspectRatio: original.width && original.height ? `${original.width} / ${original.height}` : '1 / 1' }}
                                                onClick={() => setPreviewingAsset(original)}
                                            >
                                                <AsyncImage assetId={original.id} alt="Generated logo" className="w-full h-full object-contain p-2"/>
                                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-left">
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {original.tags?.map(tag => (
                                                    <span key={tag} className="text-xs bg-indigo-500/80 text-white px-1.5 py-0.5 rounded-full">{tag}</span>
                                                    ))}
                                                </div>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                {!isPrimary && (
                                                    <button onClick={() => handleSetPrimaryLogo(original.id)} className="w-full text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 py-1.5 rounded-md transition-colors">
                                                        Set as Primary
                                                    </button>
                                                )}
                                            </div>
                                            {variants.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                    <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-2"><BeakerIcon className="w-4 h-4"/> A/B Test Variants</h5>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {variants.map(variant => (
                                                            <div key={variant.id} className="group relative rounded-lg bg-slate-100 dark:bg-slate-800/60 overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer aspect-square flex justify-center items-center" onClick={() => setPreviewingAsset(variant)}>
                                                                <span className="absolute top-1.5 left-1.5 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full z-10 font-semibold">{variant.variantLabel}</span>
                                                                <AsyncImage assetId={variant.id} alt={`Variant logo: ${variant.prompt}`} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"/>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            </Section>
        </div>
      
      {error && <p className="mt-4 text-center text-red-500 dark:text-red-400">Error: {error}</p>}
      
      {isLogoTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsLogoTemplateModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Browse Logo Templates</h2>
                <button onClick={() => setIsLogoTemplateModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                    <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 max-h-[60vh]">
              <div className="sm:w-1/4 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-700/50 pr-4">
                <nav className="flex sm:flex-col -mb-px sm:mb-0 space-x-2 sm:space-x-0 sm:space-y-1">
                  {logoTemplateCategories.map(category => (
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
                    {logoTemplateCategories
                      .find(c => c.name === activeTemplateCategory)
                      ?.templates.map(template => (
                        <button 
                            key={template.name} 
                            onClick={() => handleTemplateClick(template.prompt)} 
                            disabled={isLoading} 
                            className="text-left p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">{template.icon} <span className="font-semibold text-slate-900 dark:text-slate-100">{template.name}</span></div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{template.description}</p>
                        </button>
                    ))}
                  </div>
              </div>
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
                setEditingAsset(asset);
                setEditPrompt(asset.prompt);
            }}
            onUpdateTags={handleUpdateAssetTags}
            availableTags={allLogoTags}
            onGenerateVariants={handleGenerateLogoVariants}
            onSetPrimary={handleSetPrimaryLogo}
        />
      )}

       {editingAsset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Edit Logo</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-32 h-32 bg-slate-100 dark:bg-slate-700 rounded-md p-1 flex-shrink-0"><AsyncImage assetId={editingAsset.id} alt="logo to edit" className="w-full h-full object-contain"/></div>
                    <div className="flex-1">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Describe the changes you'd like to make:</p>
                        <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="e.g., Make this blue, change the font to serif"
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-slate-900 dark:text-slate-100"
                            rows={3}
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <div className="flex gap-4 mt-6 justify-end">
                    <button onClick={() => setEditingAsset(null)} disabled={isLoading} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={() => handleGenerateLogo(editingAsset)} disabled={isLoading || !editPrompt.trim()} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed">{loadingSection === 'logo' ? "Saving..." : "Generate Edit"}</button>
                </div>
            </div>
        </div>
       )}
    </div>
  );
};

export default IdentityStudio;