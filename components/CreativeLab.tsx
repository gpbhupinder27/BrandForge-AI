import React, { useState, useRef } from 'react';
import { Brand, BrandAsset, AssetType } from '../types';
import { generateWithNanoBanana, fileToBase64 } from '../services/geminiService';
import { storeImage, getImage } from '../services/imageDb';
import Loader from './Loader';
import SparklesIcon from './icons/SparklesIcon';
import EditIcon from './icons/EditIcon';
import DownloadIcon from './icons/DownloadIcon';
import AsyncImage from './AsyncImage';
import AssetPreviewModal from './AssetPreviewModal';

interface CreativeLabProps {
  brand: Brand;
  onAddAsset: (assets: BrandAsset[]) => void;
}

type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface CreativeOption {
    label: string;
    type: AssetType;
    width: number;
    height: number;
}

const creativeTypeOptions: CreativeOption[] = [
    { label: 'Instagram Post (1:1)', type: 'social_ad', width: 1080, height: 1080 },
    { label: 'Instagram Story (9:16)', type: 'instagram_story', width: 1080, height: 1920 },
    { label: 'Web Banner (1.91:1)', type: 'banner', width: 1200, height: 628 },
    { label: 'Twitter Post (16:9)', type: 'twitter_post', width: 1600, height: 900},
];
const campaignAssets: CreativeOption[] = creativeTypeOptions;

const CreativeLab: React.FC<CreativeLabProps> = ({ brand, onAddAsset }) => {
  const [prompt, setPrompt] = useState('');
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [selectedCampaignTypes, setSelectedCampaignTypes] = useState<AssetType[]>(['social_ad']);
  const [creativeType, setCreativeType] = useState<AssetType>('social_ad');
  const [logoPosition, setLogoPosition] = useState<LogoPosition | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Crafting your creative...");
  const [error, setError] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<BrandAsset | null>(null);
  const [previewingAsset, setPreviewingAsset] = useState<BrandAsset | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const logoAsset = brand.assets.find(asset => asset.type === 'logo');
  const paletteAsset = brand.assets.find(asset => asset.type === 'palette');
  const creativeAssets = brand.assets.filter(asset => ['social_ad', 'banner', 'instagram_story', 'twitter_post', 'poster'].includes(asset.type)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProductImage(e.target.files[0]);
    }
  };
  
  const handleCampaignTypeToggle = (type: AssetType) => {
    setSelectedCampaignTypes(prev => 
        prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

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

  const runGeneration = async (generationPrompt: string, assetType: AssetType, baseAsset?: BrandAsset) => {
    if (!logoAsset) {
        throw new Error("Please generate a logo in the Identity Studio before creating marketing assets.");
    }
    let imageInputs = [];

    // Add logo
    const logoImageUrl = await getImage(logoAsset.id);
    if (!logoImageUrl) throw new Error("Logo image not found in database.");
    const logoResponse = await fetch(logoImageUrl);
    const logoBlob = await logoResponse.blob();
    const logoFile = new File([logoBlob], "logo.png", { type: logoBlob.type });
    const logoBase64 = await fileToBase64(logoFile);
    imageInputs.push({ data: logoBase64, mimeType: logoFile.type });

    // Add product image if it exists for new generations
    if (productImage && !baseAsset) {
      const imageBase64 = await fileToBase64(productImage);
      imageInputs.push({ data: imageBase64, mimeType: productImage.type });
    }
    
    // Add base asset for editing
    if (baseAsset) {
        const baseImageUrl = await getImage(baseAsset.id);
        if (!baseImageUrl) throw new Error("Base image for editing not found.");
        const baseResponse = await fetch(baseImageUrl);
        const baseBlob = await baseResponse.blob();
        const baseFile = new File([baseBlob], "base.png", { type: baseBlob.type });
        const base64 = await fileToBase64(baseFile);
        imageInputs.push({ data: base64, mimeType: baseFile.type });
    }

    let paletteInfo = '';
    if (paletteAsset?.palette) {
        paletteInfo = ` The brand's color palette is named "${paletteAsset.palette.paletteName}" and has a mood of "${paletteAsset.palette.description}". The main colors are ${paletteAsset.palette.colors.map(c => c.hex).join(', ')}. Please use this palette.`
    }
    
    let logoPlacementInstruction = 'Place the brand logo professionally, such as in one of the corners, ensuring it is visible but not obtrusive.';
    if (logoPosition) {
        logoPlacementInstruction = `Place the brand logo in the ${logoPosition.replace('-', ' ')} corner of the image.`
    }
      
    const fullPrompt = `Using the provided brand logo (and product/base image if available), create a marketing asset. ${logoPlacementInstruction} The user's request is: "${generationPrompt}". Ensure the brand logo is clearly visible and the overall style is consistent.${paletteInfo}`;
    
    const dimensions = creativeTypeOptions.find(opt => opt.type === assetType);

    const generatedParts = await generateWithNanoBanana(fullPrompt, imageInputs, dimensions?.width, dimensions?.height);
    
    const assetsToCreate: BrandAsset[] = [];
    for (const part of generatedParts) {
        if ('inlineData' in part) {
          const newId = crypto.randomUUID();
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          await storeImage(newId, imageUrl);
          assetsToCreate.push({
            id: newId,
            type: assetType,
            prompt: generationPrompt,
            createdAt: new Date().toISOString(),
          });
        }
    }
    onAddAsset(assetsToCreate);
  };
  
  const handleGenerate = async (baseAsset?: BrandAsset) => {
    const currentPrompt = baseAsset ? editPrompt : prompt;
    const currentType = baseAsset ? baseAsset.type : creativeType;
    if (!currentPrompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setLoadingMessage("Crafting your creative...");

    try {
        await runGeneration(currentPrompt, currentType, baseAsset);
        setPrompt('');
        setProductImage(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
        setEditingAsset(null);
        setPreviewingAsset(null);
        setEditPrompt('');
    } catch(err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerateCampaign = async () => {
    if (!campaignPrompt.trim() || selectedCampaignTypes.length === 0) return;
    setIsLoading(true);
    setError(null);

    const campaignAssetsToGenerate = campaignAssets.filter(asset => selectedCampaignTypes.includes(asset.type));

    for (let i = 0; i < campaignAssetsToGenerate.length; i++) {
        const asset = campaignAssetsToGenerate[i];
        setLoadingMessage(`Generating Campaign (${i+1}/${campaignAssetsToGenerate.length}): ${asset.label}...`);
        try {
            const campaignAssetPrompt = `A ${asset.label} for the campaign: "${campaignPrompt}".`;
            await runGeneration(campaignAssetPrompt, asset.type);
        } catch(err) {
            setError(err instanceof Error ? `Failed on ${asset.label}: ${err.message}` : `An unknown error occurred during ${asset.label} generation.`);
            break; // Stop campaign on error
        }
    }
    setCampaignPrompt('');
    setIsLoading(false);
    setLoadingMessage("Crafting your creative...");
  };

  return (
    <div>
      {!logoAsset ? (
        <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg">
            <strong>Action Required:</strong> Please generate a logo in the Identity Studio before creating marketing assets.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-700/50">
                <h3 className="text-2xl font-bold mb-2">Single Creative</h3>
                <p className="text-slate-400 mb-6">Generate one-off assets for any purpose.</p>
                
                <label className="block text-sm font-semibold text-slate-300 mb-2">Prompt</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., An Instagram post for a new coffee blend called 'Morning Rush'."
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
                    rows={3}
                    disabled={isLoading}
                />

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Creative Type</label>
                        <select value={creativeType} onChange={e => setCreativeType(e.target.value as AssetType)} disabled={isLoading} className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                            {creativeTypeOptions.map(opt => <option key={opt.type} value={opt.type}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">Upload Image (Optional)</label>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            ref={fileInputRef}
                            disabled={isLoading}
                            className="block w-full text-sm text-slate-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 disabled:opacity-50 transition-colors"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Logo Position (Optional)</label>
                    <div className="flex flex-wrap gap-2">
                        {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as LogoPosition[]).map(pos => (
                            <button key={pos} onClick={() => setLogoPosition(logoPosition === pos ? null : pos)} disabled={isLoading} className={`px-3 py-1 text-xs rounded-full transition-colors font-semibold ${logoPosition === pos ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                {pos.replace('-', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => handleGenerate()}
                    disabled={isLoading || !prompt.trim()}
                    className="mt-6 flex-shrink-0 flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 font-semibold bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-900/50 disabled:cursor-not-allowed shadow-md"
                >
                    <SparklesIcon className="w-5 h-5" />
                    {isLoading && loadingMessage.startsWith("Crafting") ? 'Generating...' : 'Generate Creative'}
                </button>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-700/50">
                <h3 className="text-2xl font-bold mb-2">One-Click Campaign</h3>
                <p className="text-slate-400 mb-6">Generate a full set of matching creatives from a single theme.</p>
                
                <label className="block text-sm font-semibold text-slate-300 mb-2">Campaign Theme / Tagline</label>
                <input
                    type="text"
                    value={campaignPrompt}
                    onChange={(e) => setCampaignPrompt(e.target.value)}
                    placeholder="e.g., 'Summer Sale: 50% Off Everything!'"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
                    disabled={isLoading}
                />

                <div className="mt-4">
                     <label className="block text-sm font-semibold text-slate-300 mb-2">Select Creatives to Generate</label>
                     <div className="grid grid-cols-2 gap-3">
                        {campaignAssets.map(asset => (
                            <label key={asset.type} className={`flex items-center gap-3 p-3 rounded-md transition-colors cursor-pointer ${selectedCampaignTypes.includes(asset.type) ? 'bg-purple-900/50 border-purple-600' : 'bg-slate-700/50 border-slate-600'} border`}>
                                <input
                                    type="checkbox"
                                    checked={selectedCampaignTypes.includes(asset.type)}
                                    onChange={() => handleCampaignTypeToggle(asset.type)}
                                    className="h-4 w-4 rounded bg-slate-600 border-slate-500 text-purple-600 focus:ring-purple-500"
                                    disabled={isLoading}
                                />
                                <span className="text-sm font-medium text-slate-200">{asset.label.split('(')[0]}</span>
                            </label>
                        ))}
                     </div>
                </div>

                <button onClick={handleGenerateCampaign} disabled={isLoading || !campaignPrompt.trim() || selectedCampaignTypes.length === 0} className="mt-6 flex items-center gap-2 px-6 py-2.5 font-semibold bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors disabled:bg-purple-900/50 disabled:cursor-not-allowed shadow-md">
                    <SparklesIcon className="w-5 h-5"/>
                    {isLoading && loadingMessage.startsWith("Generating Campaign") ? 'Generating...' : 'Generate Campaign Pack'}
                </button>
            </div>
        </div>
      )}

      {isLoading && <div className="mt-8 flex justify-center"><Loader message={loadingMessage}/></div>}
      {error && <p className="mt-4 text-center text-red-400">Error: {error}</p>}

      <div className="mt-12">
        <h4 className="text-2xl font-bold mb-4 text-slate-100">Generated Creatives</h4>
        {creativeAssets.length === 0 && !isLoading && (
            <p className="text-slate-500 italic">Your generated creatives will appear here.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {creativeAssets.map((asset) => (
            <div key={asset.id} className="group relative rounded-lg bg-slate-800 overflow-hidden shadow-lg border border-slate-700/50 cursor-pointer aspect-[4/5] flex justify-center items-center" onClick={() => setPreviewingAsset(asset)}>
              <AsyncImage assetId={asset.id} alt="Generated creative" className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                 <p className="text-sm font-semibold text-slate-100 drop-shadow-lg truncate">{asset.prompt}</p>
                 <p className="text-xs text-slate-300">{asset.type.replace('_', ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
       {previewingAsset && (
        <AssetPreviewModal
            asset={previewingAsset}
            onClose={() => setPreviewingAsset(null)}
            onDownload={handleDownload}
            onEdit={(asset) => {
                setPreviewingAsset(null);
                setEditingAsset(asset);
                setEditPrompt(asset.prompt)
            }}
        />
      )}

       {editingAsset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full shadow-2xl border border-slate-700">
                <h3 className="text-xl font-semibold mb-4 text-slate-100">Edit Creative</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-32 h-auto bg-slate-700 rounded-md p-1 flex-shrink-0">
                        <AsyncImage assetId={editingAsset.id} alt="creative to edit" className="w-full object-contain"/>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-slate-400 mb-2">Describe your changes:</p>
                        <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="e.g., Make the background darker, change slogan"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
                            rows={3}
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <div className="flex gap-4 mt-6 justify-end">
                    <button onClick={() => setEditingAsset(null)} disabled={isLoading} className="px-4 py-2 bg-slate-600 font-semibold rounded-lg hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={() => handleGenerate(editingAsset)} disabled={isLoading || !editPrompt.trim()} className="px-4 py-2 bg-indigo-600 font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-900/50 disabled:cursor-not-allowed">{isLoading ? "Saving..." : "Generate Edit"}</button>
                </div>
            </div>
        </div>
       )}
    </div>
  );
};

export default CreativeLab;