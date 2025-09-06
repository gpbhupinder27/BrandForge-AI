import React, { useState } from 'react';
import { Brand, BrandAsset, ColorPalette, TypographyPairing } from '../types';
import { generateWithNanoBanana, fileToBase64, generateStructuredContent } from '../services/geminiService';
import { storeImage, getImage } from '../services/imageDb';
import { Type } from "@google/genai";
import Loader from './Loader';
import SparklesIcon from './icons/SparklesIcon';
import PaletteIcon from './icons/PaletteIcon';
import TypographyIcon from './icons/TypographyIcon';
import EditIcon from './icons/EditIcon';
import DownloadIcon from './icons/DownloadIcon';
import RegenerateIcon from './icons/RegenerateIcon';
import AsyncImage from './AsyncImage';
import AssetPreviewModal from './AssetPreviewModal';

interface IdentityStudioProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
}

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

  const paletteAsset = brand.assets.find(asset => asset.type === 'palette');
  const typographyAsset = brand.assets.find(asset => asset.type === 'typography');
  const logoAssets = brand.assets.filter(asset => asset.type === 'logo').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
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
      }
      
      const paletteInfo = paletteAsset?.palette ? ` Use a color palette inspired by these hex codes: ${paletteAsset.palette.colors.map(c => c.hex).join(', ')}.` : '';
      const typoInfo = typographyAsset?.typography ? ` The brand's typography feels like: "${typographyAsset.typography.headlineFont.description}".` : '';
      const finalPrompt = `Create a logo for a brand named "${brand.name}". The user's request is: "${currentPrompt}".${paletteInfo}${typoInfo}`;

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

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingSection(null);
    }
  };
  
  const Section = ({ title, icon, subtitle, children, step, disabled = false }: { title: string, icon: React.ReactNode, subtitle: string, children: React.ReactNode, step: number, disabled?: boolean }) => (
    <section className={`bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-700/50 transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 text-sm font-bold text-indigo-300 bg-indigo-900/50 border border-indigo-500 rounded-full">{step}</span>
            {icon}
            {title}
        </h3>
        <p className="text-slate-400 mb-6 ml-11">{subtitle}</p>
        <div className="ml-11">
            {children}
            {disabled && <p className="text-xs text-yellow-400 mt-2">Complete the previous step first.</p>}
        </div>
    </section>
  );

  return (
    <div className="space-y-8">
      {/* Step 1: Color Palette */}
      <Section title="Color Palette" icon={<PaletteIcon className="w-6 h-6"/>} subtitle="Define your brand's look and feel with a unique color scheme." step={1}>
        {loadingSection === 'palette' ? <Loader message="Creating palette..."/> : paletteAsset?.palette ? (
            <div>
                <h5 className="font-bold text-lg text-slate-100">{paletteAsset.palette.paletteName}</h5>
                <p className="text-sm text-slate-400 mb-4">{paletteAsset.palette.description}</p>
                <div className="flex flex-wrap gap-4">
                    {paletteAsset.palette.colors.map(color => (
                        <div key={color.hex} className="text-center">
                            <div className="w-20 h-20 rounded-full border-2 border-slate-600 shadow-md" style={{ backgroundColor: color.hex }}></div>
                            <p className="text-sm mt-2 font-mono tracking-tighter">{color.hex}</p>
                            <p className="text-xs text-slate-400">{color.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        ) : <p className="text-slate-500 italic">No color palette generated yet.</p>}
        <div className="mt-6 flex flex-wrap gap-4 items-center">
          <input type="text" value={palettePrompt} onChange={e => setPalettePrompt(e.target.value)} placeholder="Describe a color palette (e.g., earthy tones)" className="flex-grow bg-slate-700 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow" disabled={isLoading} />
          <div className="flex gap-2">
            <button onClick={() => handleGeneratePalette(true)} disabled={isLoading || !palettePrompt.trim()} className="flex items-center justify-center gap-2 px-4 py-2 font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-900/50 disabled:cursor-not-allowed">
                <SparklesIcon className="w-5 h-5"/> Generate
            </button>
            <button onClick={() => handleGeneratePalette(false)} disabled={isLoading} title="Regenerate Palette" className="p-2.5 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed">
                <RegenerateIcon className="w-5 h-5"/>
            </button>
          </div>
        </div>
      </Section>

      {/* Step 2: Typography */}
      <Section title="Typography Pairing" icon={<TypographyIcon className="w-6 h-6"/>} subtitle="Choose the fonts that will give your brand a voice." step={2} disabled={!paletteAsset}>
          {loadingSection === 'typography' ? <Loader message="Designing fonts..."/> : typographyAsset?.typography ? (
              <div className="space-y-6 bg-slate-700/30 p-4 rounded-md">
                  <div>
                      <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Headline</p>
                      <p className="text-4xl font-bold text-slate-50" style={{fontFamily: typographyAsset.typography.headlineFont.name}}>{typographyAsset.typography.headlineFont.name}</p>
                      <p className="text-xs text-slate-500 italic mt-1">{typographyAsset.typography.headlineFont.description}</p>
                  </div>
                   <div>
                      <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Body</p>
                      <p className="text-lg text-slate-200" style={{fontFamily: typographyAsset.typography.bodyFont.name}}>The quick brown fox jumps over the lazy dog. {typographyAsset.typography.bodyFont.name}</p>
                      <p className="text-xs text-slate-500 italic mt-1">{typographyAsset.typography.bodyFont.description}</p>
                  </div>
              </div>
          ) : <p className="text-slate-500 italic">No typography pairing generated yet.</p>}
          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <input type="text" value={typographyPrompt} onChange={e => setTypographyPrompt(e.target.value)} placeholder="Describe a font style (e.g., elegant and classic)" className="flex-grow bg-slate-700 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow" disabled={isLoading} />
            <div className="flex gap-2">
              <button onClick={() => handleGenerateTypography(true)} disabled={isLoading || !typographyPrompt.trim()} className="flex items-center justify-center gap-2 px-4 py-2 font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-900/50 disabled:cursor-not-allowed">
                  <SparklesIcon className="w-5 h-5"/> Generate
              </button>
              <button onClick={() => handleGenerateTypography(false)} disabled={isLoading} title="Regenerate Typography" className="p-2.5 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors disabled:bg-slate-700 disabled:cursor-not-allowed">
                  <RegenerateIcon className="w-5 h-5"/>
              </button>
            </div>
        </div>
      </Section>

      {/* Step 3: Logo Generation */}
      <Section title="Logo Generation" icon={<SparklesIcon className="w-6 h-6"/>} subtitle="Bring your brand to life with a unique logo." step={3} disabled={!typographyAsset}>
          <textarea
            value={logoPrompt}
            onChange={(e) => setLogoPrompt(e.target.value)}
            placeholder="e.g., A minimalist logo of a roaring lion's head, using geometric shapes."
            className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
            rows={3}
            disabled={isLoading}
          />
          <button
            onClick={() => handleGenerateLogo()}
            disabled={isLoading || !logoPrompt.trim()}
            className="mt-4 flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-900/50 disabled:cursor-not-allowed shadow-md"
          >
            <SparklesIcon className="w-5 h-5" />
            {loadingSection === 'logo' ? 'Generating...' : 'Generate Logo'}
          </button>
          
          {loadingSection === 'logo' && <div className="my-8 flex justify-center"><Loader message="Generating logo..."/></div>}
          
          <div className="mt-8">
            <h4 className="text-xl font-semibold mb-4 text-slate-200">Generated Logos</h4>
            {logoAssets.length === 0 && !isLoading && <p className="text-slate-500 italic">Your generated logos will appear here.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {logoAssets.map((asset) => (
                <div key={asset.id} className="group relative cursor-pointer aspect-square rounded-lg overflow-hidden bg-slate-700/50" onClick={() => setPreviewingAsset(asset)}>
                  <AsyncImage assetId={asset.id} alt="Generated logo" className="w-full h-full object-contain p-2"/>
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                    <p className="text-xs text-slate-300 max-h-16 overflow-hidden">{asset.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </Section>

      {error && <p className="mt-4 text-center text-red-400">Error: {error}</p>}
      
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
        />
      )}

       {editingAsset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full shadow-2xl border border-slate-700">
                <h3 className="text-xl font-semibold mb-4 text-slate-100">Edit Logo</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-32 h-32 bg-slate-700 rounded-md p-1 flex-shrink-0"><AsyncImage assetId={editingAsset.id} alt="logo to edit" className="w-full h-full object-contain"/></div>
                    <div className="flex-1">
                        <p className="text-sm text-slate-400 mb-2">Describe the changes you'd like to make:</p>
                        <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="e.g., Make this blue, change the font to serif"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
                            rows={3}
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <div className="flex gap-4 mt-6 justify-end">
                    <button onClick={() => setEditingAsset(null)} disabled={isLoading} className="px-4 py-2 bg-slate-600 font-semibold rounded-lg hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={() => handleGenerateLogo(editingAsset)} disabled={isLoading || !editPrompt.trim()} className="px-4 py-2 bg-indigo-600 font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-900/50 disabled:cursor-not-allowed">{loadingSection === 'logo' ? "Saving..." : "Generate Edit"}</button>
                </div>
            </div>
        </div>
       )}
    </div>
  );
};

export default IdentityStudio;