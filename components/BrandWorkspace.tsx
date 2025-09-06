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
import ExportIcon from './icons/ExportIcon';

// This will be populated by the script tag in index.html
declare const JSZip: any;

interface BrandWorkspaceProps {
  brand: Brand;
  onBack: () => void;
  onUpdateBrand: (updatedBrand: Brand) => void;
}

type WorkspaceTab = 'identity' | 'creatives';

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

  useEffect(() => {
    // If the brand has no assets, it's new. Kick off the initial generation.
    if (brand.assets.length === 0) {
      generateInitialIdentity();
    }
  }, [brand.id]); // Rerun only when the brand itself changes

  const generateInitialIdentity = async () => {
    setIsInitializing(true);
    try {
        // Step 1: Generate Palette
        const palettePrompt = `Generate a color palette for a brand named "${brand.name}" which is described as "${brand.description}".`;
        const paletteSchema = { type: Type.OBJECT, properties: { paletteName: { type: Type.STRING }, description: { type: Type.STRING }, colors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, name: { type: Type.STRING } } } } } };
        const paletteResult = await generateStructuredContent<ColorPalette>(palettePrompt, paletteSchema);
        const paletteAsset: BrandAsset = { id: crypto.randomUUID(), type: 'palette', prompt: palettePrompt, palette: paletteResult, createdAt: new Date().toISOString() };

        // Step 2: Generate Typography using Palette info
        const typographyPrompt = `Generate a professional typography pairing (headline and body) for a brand named "${brand.name}". The brand's color palette is described as "${paletteResult.description}". Provide well-known Google Fonts or standard web fonts that match this style.`;
        const fontSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } };
        const typographySchema = { type: Type.OBJECT, properties: { headlineFont: fontSchema, bodyFont: fontSchema } };
        const typographyResult = await generateStructuredContent<TypographyPairing>(typographyPrompt, typographySchema);
        const typographyAsset: BrandAsset = { id: crypto.randomUUID(), type: 'typography', prompt: typographyPrompt, typography: typographyResult, createdAt: new Date().toISOString() };
        
        // Step 3: Generate Logo using Palette and Typography info
        const logoPrompt = `A modern, minimalist logo for a brand called '${brand.name}' which is described as "${brand.description}". Use a color palette inspired by these hex codes: ${paletteResult.colors.map(c => c.hex).join(', ')}. The brand's typography feels like: "${typographyResult.headlineFont.description}".`;
        const logoParts = await generateWithNanoBanana(logoPrompt, [], 1024, 1024); // Generate a square logo
        
        const logoAssets: BrandAsset[] = [];

        for (const part of logoParts) {
            if ('inlineData' in part) {
                const asset = {
                    id: crypto.randomUUID(),
                    type: 'logo' as AssetType,
                    prompt: logoPrompt,
                    createdAt: new Date().toISOString(),
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


  const handleAddAsset = (newAssets: BrandAsset[]) => {
    if (newAssets.length === 0) return;

    const updatedBrand = {
      ...brand,
      assets: [...brand.assets, ...newAssets],
    };
    onUpdateBrand(updatedBrand);
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
        
        const imageAssets = brand.assets.filter(a => ['logo', 'social_ad', 'banner', 'instagram_story', 'twitter_post', 'poster'].includes(a.type));
        
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

  const logoAsset = brand.assets.find(asset => asset.type === 'logo');

  return (
    <div className="p-4 sm:p-8">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
        <ArrowLeftIcon className="w-5 h-5" />
        Back to Dashboard
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6 p-6 bg-slate-800/50 border border-slate-700/50 rounded-lg">
        <div className="flex-1">
            <h2 className="text-4xl font-bold text-slate-50">{brand.name}</h2>
            <p className="text-slate-400 mt-2 max-w-2xl">{brand.description}</p>
        </div>
        <div className="flex items-center gap-4">
             <button onClick={handleExportBrand} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500 transition-colors disabled:opacity-50 disabled:cursor-wait">
                <ExportIcon className="w-5 h-5" />
                {isExporting ? 'Exporting...' : 'Export All'}
            </button>
            {logoAsset && <div className="w-24 h-24 bg-slate-700 rounded-lg p-1 shadow-lg"><AsyncImage assetId={logoAsset.id} alt="Brand Logo" className="w-full h-full object-contain" /></div>}
        </div>
      </div>

      <div className="border-b border-slate-700 mb-8">
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('identity')}
            className={`py-2 px-4 font-semibold rounded-t-md transition-colors ${activeTab === 'identity' ? 'text-indigo-400 bg-slate-800/50 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/30'}`}
          >
            Identity Studio
          </button>
          <button
            onClick={() => setActiveTab('creatives')}
            className={`py-2 px-4 font-semibold rounded-t-md transition-colors ${activeTab === 'creatives' ? 'text-indigo-400 bg-slate-800/50 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/30'}`}
          >
            Creative Lab
          </button>
        </nav>
      </div>

      <div>
        {isInitializing ? (
           <div className="flex flex-col items-center justify-center p-16">
                <Loader message="Forging your initial brand identity..." />
                <p className="mt-4 text-slate-400 text-center max-w-md">This may take a moment. We're generating a color palette, typography, and a logo to get you started.</p>
            </div>
        ) : activeTab === 'identity' ? (
          <IdentityStudio brand={brand} onUpdateBrand={onUpdateBrand} />
        ) : (
          <CreativeLab brand={brand} onAddAsset={handleAddAsset} />
        )}
      </div>
    </div>
  );
};

export default BrandWorkspace;