

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Brand, BrandAsset, ColorPalette, TypographyPairing } from '../types';
import { generateWithNanoBanana, fileToBase64, generateStructuredContent, describeImage, generatePromptSuggestions } from '../services/geminiService';
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

interface IdentityStudioProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
}

const logoTemplates = [
    {
        name: 'Minimalist Geometric',
        description: 'Clean, modern, and abstract.',
        prompt: "A minimalist, modern logo for '[Brand Name]'. Use simple geometric shapes like circles, squares, or triangles. The design should be clean, abstract, and memorable.",
        icon: <RectangleStackIcon className="w-6 h-6" />
    },
    {
        name: 'Elegant Serif',
        description: 'Classic, sophisticated, and timeless.',
        prompt: "An elegant and luxurious logo for '[Brand Name]'. Feature the brand name in a classic serif font. The style should be sophisticated and timeless, possibly with a simple monogram or icon.",
        icon: <TypographyIcon className="w-6 h-6" />
    },
    {
        name: 'Playful Mascot',
        description: 'Friendly, fun, and approachable character.',
        prompt: "A fun and friendly mascot logo for '[Brand Name]'. Create a simple, cute character that represents the brand's friendly and approachable personality. The mascot should be memorable.",
        icon: <SparklesIcon className="w-6 h-6" />
    },
    {
        name: 'Abstract Mark',
        description: 'Dynamic, unique, and conceptual.',
        prompt: "An abstract, dynamic logo mark for '[Brand Name]'. The design should represent the brand's core ideas using flowing lines, unique shapes, or an interesting visual concept. It should be modern and versatile.",
        icon: <BeakerIcon className="w-6 h-6" />
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
  step?: number;
  disabled?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, subtitle, children, step, disabled = false }) => (
    <section className={`bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700/50 transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <h3 className="text-2xl font-bold mb-2 flex items-center gap-3 text-slate-900 dark:text-slate-100">
            {step && <span className="flex items-center justify-center w-8 h-8 text-sm font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-500 rounded-full">{step}</span>}
            {icon}
            {title}
        </h3>
        <p className={`text-slate-500 dark:text-slate-400 mb-6 ${step ? 'ml-11' : ''}`}>{subtitle}</p>
        <div className={step ? 'ml-11' : ''}>
            {children}
            {disabled && <p className="text-xs text-yellow-500 dark:text-yellow-400 mt-2">Complete the previous step first.</p>}
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<{ goal: string; prompt: string; }[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionLoadingMessage, setSuggestionLoadingMessage] = useState('Thinking...');
  
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

        const headlineFontName = typographyAsset.typography.headlineFont.name;
        const bodyFontName = typographyAsset.typography.bodyFont.name;

        if (headlineFontName && bodyFontName) {
            const fontFamilies = [headlineFontName, bodyFontName]
                .filter((v, i, a) => a.indexOf(v) === i) // Unique fonts
                .map(font => `${font.replace(/ /g, '+')}`)
                .join('&family=');
            
            const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;

            // Check if the link already exists
            const existingLink = document.head.querySelector(`link[href="${fontUrl}"]`);
            if (!existingLink) {
                 // Remove old dynamic font links to prevent clutter
                const oldLinks = document.head.querySelectorAll('link[data-dynamic-font]');
                oldLinks.forEach(link => link.remove());
                
                const link = document.createElement('link');
                link.href = fontUrl;
                link.rel = 'stylesheet';
                link.setAttribute('data-dynamic-font', 'true'); // Mark as dynamic
                document.head.appendChild(link);
            }
        }
    }
  }, [typographyAsset]);
  
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
    let finalPrompt = templatePrompt;
    // Replace placeholders with brand-specific details
    finalPrompt = finalPrompt.replace(/\[Brand Name\]/gi, brand.name);
    setLogoPrompt(finalPrompt);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReferenceImage(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-indigo-500', 'dark:border-indigo-400');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setReferenceImage(file);
        if (fileInputRef.current) {
          fileInputRef.current.files = e.dataTransfer.files;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUpdateAssetTags = (assetId: string, tags: string[]) => {
    const updatedAssets = brand.assets.map(asset => 
        asset.id === assetId ? { ...asset, tags } : asset
    );
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
      let imageInputs = [];
      if (baseAsset) {
          const baseImageUrl = await getImage(baseAsset.id);
          if (!baseImageUrl) throw new Error("Base image for editing not found.");
          const response = await fetch(baseImageUrl);
          const blob = await response.blob();
          const file = new File([blob], "edit_image.png", { type: blob.type });
          const base64 = await fileToBase64(file);
          imageInputs.push({ data: base64, mimeType: file.type });
      } else if (referenceImage) {
          const base64 = await fileToBase64(referenceImage);
          imageInputs.push({ data: base64, mimeType: referenceImage.type });
      }
      
      const paletteInfo = paletteAsset?.palette ? ` Use a color palette inspired by these hex codes: ${paletteAsset.palette.colors.map(c => c.hex).join(', ')}.` : '';
      const typoInfo = typographyAsset?.typography ? ` The brand's typography feels like: "${typographyAsset.typography.headlineFont.description}".` : '';
      const referenceInfo = !baseAsset && referenceImage ? ` The user has provided a reference image; use it as strong visual inspiration for the logo's style, shape, and overall concept.` : '';
      const finalPrompt = `Create a logo for a brand named "${brand.name}". The user's request is: "${currentPrompt}".${paletteInfo}${typoInfo}${referenceInfo}`;

      const generatedParts = await generateWithNanoBanana(finalPrompt, imageInputs, 1024, 1024);
      
      const newAssets: BrandAsset[] = [];
      for (const part of generatedParts) {
        if ('inlineData' in part) {
          const asset: BrandAsset = {
            id: crypto.randomUUID(),
            type: 'logo',
            prompt: currentPrompt,
            createdAt: new Date().toISOString()
          };
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
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

        const variantPrompt = `Create exactly 2 A/B test variations for the provided logo. The original prompt was: "${baseAsset.prompt}". Generate two distinct versions that target different potential audiences. For example, one could be more playful and modern for a younger audience, while the other could be more elegant and professional for a corporate audience. The variations should explore different styles (e.g., color, typography, shape) but keep the brand name '${brand.name}' clear.`;
        
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Color Palette */}
        <Section title="Color Palette" icon={<PaletteIcon className="w-6 h-6"/>} subtitle="Define your brand's look and feel." step={1}>
          {loadingSection === 'palette' ? <Loader message="Creating palette..."/> : paletteAsset?.palette ? (
              <div>
                  <h5 className="font-bold text-lg text-slate-900 dark:text-slate-100">{paletteAsset.palette.paletteName}</h5>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{paletteAsset.palette.description}</p>
                  <div className="flex flex-wrap gap-4">
                      {paletteAsset.palette.colors.map(color => (
                          <div key={color.hex} className="text-center">
                              <div className="w-20 h-20 rounded-full border-2 border-slate-200 dark:border-slate-600 shadow-md" style={{ backgroundColor: color.hex }}></div>
                              <p className="text-sm mt-2 font-mono tracking-tighter text-slate-700 dark:text-slate-300">{color.hex}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{color.name}</p>
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

        {/* Step 2: Typography */}
        <Section title="Typography Pairing" icon={<TypographyIcon className="w-6 h-6"/>} subtitle="Choose the fonts for your brand." step={2} disabled={!paletteAsset}>
            {loadingSection === 'typography' ? <Loader message="Designing fonts..."/> : typographyAsset?.typography ? (
                <div className="space-y-6 bg-slate-100 dark:bg-slate-700/30 p-4 rounded-md">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Headline</p>
                        <p className="text-4xl font-bold text-slate-900 dark:text-slate-50" style={{fontFamily: typographyAsset.typography.headlineFont.name}}>{typographyAsset.typography.headlineFont.name}</p>
                        <p className="text-xs text-slate-500 italic mt-1">{typographyAsset.typography.headlineFont.description}</p>
                    </div>
                     <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Body</p>
                        <p className="text-lg text-slate-800 dark:text-slate-200" style={{fontFamily: typographyAsset.typography.bodyFont.name}}>The quick brown fox jumps over the lazy dog. {typographyAsset.typography.bodyFont.name}</p>
                        <p className="text-xs text-slate-500 italic mt-1">{typographyAsset.typography.bodyFont.description}</p>
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
                  <button onClick={handleSetManualFonts} disabled={isLoading || !manualHeadlineFont.trim() || !manualBodyFont.trim()} className="mt-4 px-4 py-2 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed">
                      Set Manual Fonts
                  </button>
              </div>
            </div>
        </Section>
      </div>

      {/* Step 3: Logo Generation */}
      <Section title="Logo Generation" icon={<SparklesIcon className="w-6 h-6"/>} subtitle="Bring your brand to life with a unique logo." step={3} disabled={!typographyAsset}>
          <div className="space-y-4 p-4 mb-6 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700/50">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"><TemplateIcon className="w-5 h-5"/> Start with a Template</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {logoTemplates.map(template => (
                      <button 
                          key={template.name} 
                          onClick={() => handleTemplateClick(template.prompt)} 
                          disabled={isLoading} 
                          className="text-left p-3 bg-white dark:bg-slate-700/50 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">{template.icon} <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{template.name}</span></div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{template.description}</p>
                      </button>
                  ))}
              </div>
          </div>
          
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Or write your own prompt</label>
                <button 
                    onClick={handleSuggestPrompts} 
                    disabled={isSuggesting || isLoading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-wait"
                >
                    <LightbulbIcon className="w-4 h-4" />
                    {isSuggesting ? suggestionLoadingMessage : 'Get Suggestions'}
                </button>
            </div>
          <textarea
            value={logoPrompt}
            onChange={(e) => setLogoPrompt(e.target.value)}
            placeholder="e.g., A minimalist logo of a roaring lion's head, using geometric shapes."
            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-slate-900 dark:text-slate-100"
            rows={3}
            disabled={isLoading}
          />
        
          {suggestions.length > 0 && !isSuggesting && (
                <div className="mt-4 space-y-2 animate-fade-in">
                    <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Suggestions</h5>
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

          <div className="mt-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Reference Image (Optional)</label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Upload a sketch, an existing logo, or an inspirational image to guide the AI.</p>
              {referenceImage ? (
                  <div className="relative group">
                      <img src={URL.createObjectURL(referenceImage)} alt="Reference Preview" className="w-full h-auto max-h-48 object-contain rounded-md border border-slate-300 dark:border-slate-600 p-1 bg-slate-100 dark:bg-slate-700/50" />
                      <button
                          onClick={() => {
                              setReferenceImage(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                          aria-label="Remove image"
                      >
                          <XMarkIcon className="w-4 h-4" />
                      </button>
                  </div>
              ) : (
                  <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={(e) => e.currentTarget.classList.remove('border-indigo-500', 'dark:border-indigo-400')}
                      onDragEnter={(e) => e.currentTarget.classList.add('border-indigo-500', 'dark:border-indigo-400')}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                  >
                      <ImageIcon className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500" />
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">Click to upload</span> or drag and drop
                      </p>
                      <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          ref={fileInputRef}
                          className="hidden"
                          disabled={isLoading}
                      />
                  </div>
              )}
          </div>
          
          <button
            onClick={() => handleGenerateLogo()}
            disabled={isLoading || !logoPrompt.trim()}
            className="mt-4 flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed shadow-md"
          >
            <SparklesIcon className="w-5 h-5" />
            {loadingSection === 'logo' ? 'Generating...' : 'Generate Logo'}
          </button>
          
          {loadingSection === 'logo' && <div className="my-8 flex justify-center"><Loader message="Generating logo..."/></div>}
          
          <div className="mt-8">
            <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Generated Logos</h4>
            {allLogoTags.length > 0 && (
                <div className="my-4 p-4 bg-slate-100 dark:bg-slate-700/40 rounded-lg">
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
            
            {logoAssets.length === 0 && !isLoading ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg mt-4">
                <ImageIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
                <h5 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">Ready to Create?</h5>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use the prompt above to generate your first logo.</p>
              </div>
            ) : filteredAssetGroups.length === 0 && !isLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No logos match your selected filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                {filteredAssetGroups.map(({ original, variants }) => (
                  <div key={original.id} className="p-4 border border-slate-200 dark:border-slate-700/50 rounded-lg bg-white dark:bg-slate-800/20">
                    <div className="group relative cursor-pointer aspect-square rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700/50" onClick={() => setPreviewingAsset(original)}>
                        <AsyncImage assetId={original.id} alt="Generated logo" className="w-full h-full object-contain p-2"/>
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 text-left">
                          <p className="text-xs text-slate-300 max-h-12 overflow-hidden">{original.prompt}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {original.tags?.map(tag => (
                              <span key={tag} className="text-xs bg-indigo-500/80 text-white px-1.5 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        </div>
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
                ))}
              </div>
            )}
          </div>
      </Section>

      {error && <p className="mt-4 text-center text-red-500 dark:text-red-400">Error: {error}</p>}
      
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