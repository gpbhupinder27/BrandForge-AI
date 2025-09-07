import React, { useState, useEffect } from 'react';
import { Brand, BrandAsset, AssetType, ColorPalette, TypographyPairing } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import IdentityStudio from './IdentityStudio';
import CreativeLab from './CreativeLab';
import Loader from './Loader';
import { generateStructuredContent, generateWithNanoBanana } from '../services/geminiService';
import { storeImage, getImage } from '../services/imageDb';
import { Type } from "@google/genai";
import AsyncImage from './AsyncImage';
import AssetLibrary from './AssetLibrary';
import AssetDetailView from './AssetDetailView';
import ThumbnailStudio from './ThumbnailStudio';
import VideoIcon from './icons/VideoIcon';
import IdentificationIcon from './icons/IdentificationIcon';
import SparklesIcon from './icons/SparklesIcon';
import RectangleStackIcon from './icons/RectangleStackIcon';
import VideoAdStudio from './VideoAdStudio';
import ImageIcon from './icons/ImageIcon';


// This will be populated by the script tag in index.html
declare const JSZip: any;

interface BrandWorkspaceProps {
  brand: Brand;
  onBack: () => void;
  onUpdateBrand: (updatedBrand: Brand) => void;
}

type WorkspaceTab = 'identity' | 'creatives' | 'thumbnails' | 'library' | 'video_ads';

const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    // @ts-ignore
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}


const BrandWorkspace: React.FC<BrandWorkspaceProps> = ({ brand, onBack, onUpdateBrand }) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('identity');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);

  const logoAsset = brand.assets.find(asset => asset.type === 'logo' && asset.isPrimary) || brand.assets.find(asset => asset.type === 'logo');
  const paletteAsset = brand.assets.find(asset => asset.type === 'palette');
  const typographyAsset = brand.assets.find(asset => asset.type === 'typography');

  useEffect(() => {
    // If the brand has no assets, it's new. Kick off the initial generation.
    if (brand.assets.length === 0) {
      generateInitialIdentity();
    }
  }, [brand.id]); // Rerun only when the brand itself changes

   useEffect(() => {
    if (typographyAsset?.typography) {
        const headlineFontName = typographyAsset.typography.headlineFont?.name;
        const bodyFontName = typographyAsset.typography.bodyFont?.name;

        if (headlineFontName && bodyFontName) {
            const fontFamilies = [headlineFontName, bodyFontName]
                .filter((v, i, a) => a.indexOf(v) === i) // Unique fonts
                .map(font => `${font.replace(/ /g, '+')}:wght@400;700`) // Request weights
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

  const generateInitialIdentity = async () => {
    setIsInitializing(true);
    try {
        // Step 1: Generate Palette
        const palettePrompt = `Generate a color palette for a brand named "${brand.name}" which is described as "${brand.description}".`;
        const paletteSchema = { type: Type.OBJECT, properties: { paletteName: { type: Type.STRING }, description: { type: Type.STRING }, colors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, name: { type: Type.STRING } }, required: ["hex", "name"] } } }, required: ["paletteName", "description", "colors"] };
        const paletteResult = await generateStructuredContent<ColorPalette>(palettePrompt, paletteSchema);
        const paletteAsset: BrandAsset = { id: crypto.randomUUID(), type: 'palette', prompt: palettePrompt, palette: paletteResult, createdAt: new Date().toISOString() };

        // Step 2: Generate Typography using Palette info
        const typographyPrompt = `Generate a professional typography pairing (headline and body) for a brand named "${brand.name}". The brand's color palette is described as "${paletteResult.description}". Provide well-known Google Fonts or standard web fonts that match this style.`;
        const fontSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }, required: ["name", "description"] };
        const typographySchema = { type: Type.OBJECT, properties: { headlineFont: fontSchema, bodyFont: fontSchema }, required: ["headlineFont", "bodyFont"] };
        const typographyResult = await generateStructuredContent<TypographyPairing>(typographyPrompt, typographySchema);
        const typographyAsset: BrandAsset = { id: crypto.randomUUID(), type: 'typography', prompt: typographyPrompt, typography: typographyResult, createdAt: new Date().toISOString() };
        
        // Step 3: Generate Logo using Palette and Typography info
        const logoPrompt = `A modern, minimalist logo for a brand called '${brand.name}' which is described as "${brand.description}". The logo MUST be on a plain, solid white background. Do not add any shadows or other background elements. Use a color palette inspired by these hex codes: ${paletteResult.colors.map(c => c.hex).join(', ')}. The brand's typography feels like: "${typographyResult.headlineFont.description}".`;
        const logoParts = await generateWithNanoBanana(logoPrompt, [], 1024, 1024); // Generate a square logo
        
        const logoAssets: BrandAsset[] = [];

        for (const [index, part] of logoParts.filter(p => 'inlineData' in p).entries()) {
            if ('inlineData' in part) {
                const asset = {
                    id: crypto.randomUUID(),
                    type: 'logo' as AssetType,
                    prompt: logoPrompt,
                    createdAt: new Date().toISOString(),
                    isPrimary: index === 0, // Set the first generated logo as primary by default
                };
                const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                await storeImage(asset.id, imageUrl); // Store image in IndexedDB
                logoAssets.push(asset);
            }
        }

        // Update brand state with all new assets at once
        onUpdateBrand({
            ...brand,
            assets: [paletteAsset, typographyAsset, ...logoAssets],
        });

    } catch (error) {
        console.error("Failed to generate initial brand identity:", error);
        // You could set an error state here to show in the UI
    } finally {
        setIsInitializing(false);
    }
  };

  const handleExportBrand = async () => {
    setIsExporting(true);
    try {
        const zip = new JSZip();

        // Add brand guidelines
        const paletteAsset = brand.assets.find(a => a.type === 'palette');
        if (paletteAsset?.palette) {
            zip.file('brand_guidelines/color_palette.json', JSON.stringify(paletteAsset.palette, null, 2));
        }
        const typographyAsset = brand.assets.find(a => a.type === 'typography');
        if (typographyAsset?.typography) {
            zip.file('brand_guidelines/typography.json', JSON.stringify(typographyAsset.typography, null, 2));
        }
        
        const imageAssets = brand.assets.filter(a => ['logo', 'social_ad', 'banner', 'instagram_story', 'twitter_post', 'poster', 'youtube_thumbnail'].includes(a.type));
        
        for (const asset of imageAssets) {
            const imageUrl = await getImage(asset.id);
            if (imageUrl) {
                const blob = dataURLtoBlob(imageUrl);
                const fileExtension = blob.type.split('/')[1] || 'png';
                const folder = asset.type === 'logo' ? 'logos' : 'creatives';
                const filename = `${asset.type}_${asset.id.slice(0, 8)}.${fileExtension}`;
                zip.folder(folder)?.file(filename, blob);
            }
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${brand.name.toLowerCase().replace(/\s/g, '_')}_brand_assets.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (error) {
        console.error("Failed to export brand assets:", error);
    } finally {
        setIsExporting(false);
    }
  };
  
  const assetToView = viewingAssetId ? brand.assets.find(a => a.id === viewingAssetId) : null;

  const renderContent = () => {
    if (isInitializing) {
        return (
           <div className="flex flex-col items-center justify-center p-16">
                <Loader message="Forging your initial brand identity..." />
                <p className="mt-4 text-slate-500 dark:text-slate-400 text-center max-w-md">This may take a moment. We're generating a color palette, typography, and a logo to get you started.</p>
            </div>
        );
    }

    if (assetToView) {
        return <AssetDetailView 
            asset={assetToView}
            brand={brand}
            onBack={() => setViewingAssetId(null)}
            onUpdateBrand={onUpdateBrand}
        />;
    }

    switch (activeTab) {
        case 'identity':
            return <IdentityStudio brand={brand} onUpdateBrand={onUpdateBrand} />;
        case 'creatives':
            return <CreativeLab brand={brand} onUpdateBrand={onUpdateBrand} />;
        case 'thumbnails':
            return <ThumbnailStudio brand={brand} onUpdateBrand={onUpdateBrand} />;
        case 'video_ads':
            return <VideoAdStudio brand={brand} onUpdateBrand={onUpdateBrand} />;
        case 'library':
            return <AssetLibrary 
                        brand={brand} 
                        onUpdateBrand={onUpdateBrand} 
                        onSelectAsset={setViewingAssetId}
                        onExportBrand={handleExportBrand}
                        isExporting={isExporting}
                    />;
        default:
            return null;
    }
  }

  return (
    <div className="p-4 sm:p-8">
        {!assetToView && (
            <>
                <button onClick={onBack} className="flex items-center gap-2 mb-6 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors font-semibold">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to Dashboard
                </button>
                 <div className="flex flex-col sm:flex-row items-stretch mb-8 gap-6 p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-md">
                    {/* Brand Info */}
                    <div 
                        className="flex items-center gap-4 flex-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                        onClick={() => setActiveTab('identity')}
                        title="Go to Identity Studio"
                    >
                      {logoAsset ? (
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 shadow-lg flex-shrink-0">
                          <AsyncImage assetId={logoAsset.id} alt="Brand Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                         <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 shadow-lg flex-shrink-0 flex items-center justify-center">
                            <RectangleStackIcon className="w-10 h-10 text-slate-400 dark:text-slate-500"/>
                         </div>
                      )}
                      <div className="flex-1">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{brand.name}</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">{brand.description}</p>
                      </div>
                    </div>

                    {/* Color Palette */}
                    {paletteAsset?.palette && (
                      <div className="sm:border-l border-slate-200 dark:border-slate-700/50 pt-4 sm:pt-0 border-t sm:border-t-0">
                        <div 
                          className="h-full p-2 sm:pl-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                          onClick={() => setActiveTab('identity')}
                          title="Edit Color Palette"
                        >
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Color Palette</h4>
                          <div className="flex flex-wrap gap-2">
                            {paletteAsset.palette.colors.map((color, index) => (
                              <div
                                key={index}
                                className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-600 shadow-sm"
                                style={{ backgroundColor: color.hex }}
                                title={`${color.name} (${color.hex})`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Typography */}
                    {typographyAsset?.typography && (
                      <div className="sm:border-l border-slate-200 dark:border-slate-700/50 pt-4 sm:pt-0 border-t sm:border-t-0">
                        <div 
                          className="h-full p-2 sm:pl-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                          onClick={() => setActiveTab('identity')}
                          title="Edit Typography"
                        >
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Typography</h4>
                          <div className="space-y-1">
                              <p 
                                  className="text-xl font-bold text-slate-800 dark:text-slate-200 truncate" 
                                  title={typographyAsset.typography.headlineFont?.name}
                                  style={{ fontFamily: typographyAsset.typography.headlineFont?.name ? `'${typographyAsset.typography.headlineFont.name}', sans-serif` : 'sans-serif' }}
                              >
                                  {typographyAsset.typography.headlineFont?.name || 'Headline'}
                              </p>
                              <p 
                                  className="text-sm text-slate-600 dark:text-slate-400 truncate" 
                                  title={typographyAsset.typography.bodyFont?.name}
                                  style={{ fontFamily: typographyAsset.typography.bodyFont?.name ? `'${typographyAsset.typography.bodyFont.name}', sans-serif` : 'sans-serif' }}
                              >
                                  {typographyAsset.typography.bodyFont?.name || 'Body'}
                              </p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
                 <div className="border-b border-slate-200 dark:border-slate-700 mb-8">
                    <nav className="-mb-px flex">
                    <button
                        onClick={() => setActiveTab('identity')}
                        className={`mr-2 py-3 px-4 font-semibold rounded-t-md transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'identity' ? 'text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 border-indigo-500 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                        <IdentificationIcon className="w-5 h-5" />
                        Identity Studio
                    </button>
                    <button
                        onClick={() => setActiveTab('creatives')}
                        className={`mr-2 py-3 px-4 font-semibold rounded-t-md transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'creatives' ? 'text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 border-indigo-500 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                        <SparklesIcon className="w-5 h-5" />
                        Creative Lab
                    </button>
                     <button
                        onClick={() => setActiveTab('thumbnails')}
                        className={`mr-2 py-3 px-4 font-semibold rounded-t-md transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'thumbnails' ? 'text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 border-indigo-500 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                        <ImageIcon className="w-5 h-5" />
                        Thumbnail Studio
                    </button>
                     <button
                        onClick={() => setActiveTab('video_ads')}
                        className={`mr-2 py-3 px-4 font-semibold rounded-t-md transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'video_ads' ? 'text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 border-indigo-500 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                        <VideoIcon className="w-5 h-5" />
                        Video Ad Studio
                    </button>
                    <button
                        onClick={() => setActiveTab('library')}
                        className={`ml-auto py-3 px-4 font-semibold rounded-t-md transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'library' ? 'text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 border-indigo-500 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                        <RectangleStackIcon className="w-5 h-5" />
                        Asset Library
                    </button>
                    </nav>
                </div>
            </>
        )}
      <div>
        {renderContent()}
      </div>
    </div>
  );
};

export default BrandWorkspace;