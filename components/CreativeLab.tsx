import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Brand, BrandAsset, AssetType, CustomTemplate } from '../types';
import { generateWithNanoBanana, fileToBase64, generateTagsForCreative, describeImage, generatePromptSuggestions, getImageDimensions } from '../services/geminiService';
import { storeImage, getImage } from '../services/imageDb';
import Loader from './Loader';
import SparklesIcon from './icons/SparklesIcon';
import AsyncImage from './AsyncImage';
import ImageIcon from './icons/ImageIcon';
import TagIcon from './icons/TagIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import TemplateIcon from './icons/TemplateIcon';
import BookmarkIcon from './icons/BookmarkIcon';
import TrashIcon from './icons/TrashIcon';
import XMarkIcon from './icons/XMarkIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import BeakerIcon from './icons/BeakerIcon';
import VideoIcon from './icons/VideoIcon';
import AssetPreviewModal from './AssetPreviewModal';

interface CreativeLabProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
  onRequestVideoConversion: (assetId: string) => void;
}

type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'watermark' | 'none';
type CreativeTab = 'single' | 'campaign';

const templateCategories = [
    {
        name: 'Promotional & Sales',
        templates: [
            { name: 'Flash Sale', prompt: 'An exciting and eye-catching social media post announcing a flash sale. The main text should be "50% OFF FLASH SALE". Use dynamic elements and a sense of urgency. Include a "Shop Now" button.' },
            { name: 'New Product Launch', prompt: 'A clean, modern, and minimalist banner to announce a new product launch. The background should be simple to make the product stand out. Headline text: "The Future is Here". Sub-headline: "Introducing our new collection".' },
            { name: 'Limited Edition Drop', prompt: 'A post for a highly anticipated, limited edition product drop. Create a sense of exclusivity and urgency.' },
            { name: 'Discount Code Offer', prompt: "A clean, eye-catching design that prominently features a discount code, like 'SAVE20'. Include a 'Shop Now' call to action." },
            { name: 'Giveaway Announcement', prompt: "An exciting and vibrant post announcing a product giveaway. Clearly state 'GIVEAWAY!' and include visuals of the prize." },
        ],
    },
    {
        name: 'Brand & Community',
        templates: [
            { name: 'Customer Testimonial', prompt: 'A visually appealing social media post featuring a customer testimonial. Prominently display a placeholder for a customer quote and name. The design should feel authentic and trustworthy.' },
            { name: 'Behind the Scenes', prompt: "A candid, authentic-feeling post showing a glimpse behind the scenes of the brand. Could be the workshop, the team, or the creation process." },
            { name: 'Meet the Founder/Team', prompt: "A professional yet approachable post introducing the founder or a team member. Include a placeholder for a photo and a short bio or quote." },
            { name: 'Brand Values Showcase', prompt: "A simple, text-focused post that highlights a core brand value (e.g., 'Sustainability', 'Handcrafted Quality'). Use brand colors and fonts effectively." },
        ],
    },
    {
        name: 'Informational & Engagement',
        templates: [
            { name: 'Educational Tip', prompt: 'An informative and engaging Instagram post sharing a helpful tip. Title: "Pro Tip: [Your Tip Here]". Use clear visuals or an icon to illustrate the concept. Keep the text concise and easy to read. Style should be clean and authoritative.' },
            { name: 'Event Invitation', prompt: 'An elegant and professional invitation for a webinar event. Title: "You\'re Invited". Include clearly legible text placeholders for an event title, date, time, and a "Register Now" call-to-action button.' },
            { name: 'Myth vs. Fact', prompt: "An engaging post designed to bust a common myth related to the brand's industry. Use a split design with 'Myth' on one side and 'Fact' on the other." },
            { name: 'Question of the Day', prompt: "A simple, visually appealing post designed to ask the audience a question to drive engagement in the comments." },
        ],
    },
];

const CreativeLab: React.FC<CreativeLabProps> = ({ brand, onUpdateBrand, onRequestVideoConversion }) => {
  const [activeCreativeTab, setActiveCreativeTab] = useState<CreativeTab>('single');
  const [prompt, setPrompt] = useState('');
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [selectedCampaignTypes, setSelectedCampaignTypes] = useState<AssetType[]>(['social_ad']);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>('top-right');
  const [addLogo, setAddLogo] = useState(true);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImageDims, setProductImageDims] = useState<{ width: number; height: number } | null>(null);
  const [campaignImage, setCampaignImage] = useState<File | null>(null);
  const [campaignImageDims, setCampaignImageDims] = useState<{ width: number; height: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Crafting your creative...");
  const [error, setError] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<BrandAsset | null>(null);
  const [previewingAsset, setPreviewingAsset] = useState<BrandAsset | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<{ goal: string; prompt: string; overlayText?: string; }[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionLoadingMessage, setSuggestionLoadingMessage] = useState('Thinking...');
  const [campaignSuggestions, setCampaignSuggestions] = useState<{ goal: string; prompt: string; }[]>([]);
  const [isCampaignSuggesting, setIsCampaignSuggesting] = useState(false);
  const [campaignSuggestionLoadingMessage, setCampaignSuggestionLoadingMessage] = useState('Thinking...');
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [latestCampaignAssets, setLatestCampaignAssets] = useState<BrandAsset[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const campaignFileInputRef = useRef<HTMLInputElement>(null);
  const [isCreativeTemplateModalOpen, setIsCreativeTemplateModalOpen] = useState(false);
  const [activeTemplateCategory, setActiveTemplateCategory] = useState<string>(templateCategories[0].name);

  
  const logoAsset = brand.assets.find(asset => asset.type === 'logo' && asset.isPrimary) || brand.assets.find(asset => asset.type === 'logo');
  const paletteAsset = brand.assets.find(asset => asset.type === 'palette');
  const creativeAssets = brand.assets.filter(asset => ['social_ad', 'banner', 'instagram_story', 'twitter_post', 'poster'].includes(asset.type)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const allCreativeTags = [...new Set(creativeAssets.filter(a => !a.parentId).flatMap(a => a.tags || []))].sort();

  useEffect(() => {
    setSuggestions([]);
  }, [productImage]);

  useEffect(() => {
    setCampaignSuggestions([]);
  }, [campaignImage]);

  useEffect(() => {
    if (productImage) {
        const img = new Image();
        const url = URL.createObjectURL(productImage);
        img.onload = () => {
            setProductImageDims({ width: img.width, height: img.height });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    } else {
        setProductImageDims(null);
    }
  }, [productImage]);

  useEffect(() => {
    if (campaignImage) {
        const img = new Image();
        const url = URL.createObjectURL(campaignImage);
        img.onload = () => {
            setCampaignImageDims({ width: img.width, height: img.height });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    } else {
        setCampaignImageDims(null);
    }
  }, [campaignImage]);


  const handleFilterToggle = (tag: string) => {
    setActiveFilters(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };
  
  const assetGroups = useMemo(() => {
      const originals = creativeAssets.filter(a => !a.parentId);
      const variantsMap = creativeAssets.reduce((map, asset) => {
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
  }, [creativeAssets]);

  const filteredAssetGroups = useMemo(() => {
      if (activeFilters.length === 0) return assetGroups;
      return assetGroups.filter(({ original }) => 
          activeFilters.every(filter => original.tags?.includes(filter))
      );
  }, [assetGroups, activeFilters]);
  
  const handleUpdateAssetTags = (assetId: string, tags: string[]) => {
    const updatedAssets = brand.assets.map(asset => 
        asset.id === assetId ? { ...asset, tags } : asset
    );
    onUpdateBrand({ ...brand, assets: updatedAssets });
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
    document.body.removeChild(link);
  };

  const handleTemplateClick = (templatePrompt: string) => {
    const paletteInfo = paletteAsset?.palette 
        ? `The brand's color palette is described as "${paletteAsset.palette.description}" and includes these colors: ${paletteAsset.palette.colors.map(c => c.name).join(', ')}. The creative should strongly reflect this palette.`
        : '';
    const finalPrompt = `A marketing creative for "${brand.name}", a brand that is all about "${brand.description}". ${paletteInfo} The creative direction is: ${templatePrompt}`;
    setPrompt(finalPrompt);
    setIsCreativeTemplateModalOpen(false);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

 const runGeneration = async (generationPrompt: string, assetType: AssetType, imageToIncorporate: File | null, logoPos: LogoPosition | null, baseAsset?: BrandAsset, dims?: {width: number, height: number} | null): Promise<BrandAsset[]> => {
    let imageInputs = [];
    const logoAsset = brand.assets.find(asset => asset.type === 'logo' && asset.isPrimary) || brand.assets.find(asset => asset.type === 'logo');
    let logoPlacementInstruction = '';

    const shouldAddLogo = (activeCreativeTab === 'single' && addLogo && logoPos !== 'none') || (activeCreativeTab === 'campaign');

    if (shouldAddLogo && logoAsset) {
        const logoImageUrl = await getImage(logoAsset.id);
        if (!logoImageUrl) throw new Error("Logo image not found in database.");
        const logoResponse = await fetch(logoImageUrl);
        const logoBlob = await logoResponse.blob();
        const logoFile = new File([logoBlob], "logo.png", { type: logoBlob.type });
        const logoBase64 = await fileToBase64(logoFile);
        imageInputs.push({ data: logoBase64, mimeType: logoFile.type });

        const baseLogoInstruction = `CRITICAL: The first image provided is the brand's logo, which is on a plain solid white background. You MUST remove this white background completely, treating it as transparent. Integrate ONLY the logo's graphic/text seamlessly into your design. The logo should be small and unobtrusive, occupying no more than 10% of the image's width. DO NOT show the square white background of the logo file.`;
        
        const effectiveLogoPos = activeCreativeTab === 'single' ? logoPos : 'bottom-right'; // Default for campaigns

        if (effectiveLogoPos && effectiveLogoPos !== 'none') {
            if (effectiveLogoPos === 'watermark') {
                logoPlacementInstruction = baseLogoInstruction + ' Place this logo as a subtle, semi-transparent watermark across the image.';
            } else {
                logoPlacementInstruction = baseLogoInstruction + ` Place this logo in the ${effectiveLogoPos.replace('-', ' ')} corner of the image.`;
            }
        } else {
            // Default for campaign (logoPos is null)
            logoPlacementInstruction = baseLogoInstruction + ' Place this logo professionally, such as in one of the corners, ensuring it is visible but not obtrusive.';
        }
    } else {
        logoPlacementInstruction = 'Do not include the brand logo in the image.';
    }

    if (imageToIncorporate && !baseAsset) {
      const imageBase64 = await fileToBase64(imageToIncorporate);
      imageInputs.push({ data: imageBase64, mimeType: imageToIncorporate.type });
    }
    
    if (baseAsset) {
        const baseImageUrl = await getImage(baseAsset.id);
        if (!baseImageUrl) throw new Error("Base image for editing not found.");
        const baseResponse = await fetch(baseImageUrl);
        const baseBlob = await baseResponse.blob();
        const baseFile = new File([baseBlob], "base.png", { type: baseBlob.type });
        const base64 = await fileToBase64(baseFile);
        imageInputs.push({ data: base64, mimeType: baseFile.type });
    }

    const paletteInfo = paletteAsset?.palette ? ` The brand's color palette is named "${paletteAsset.palette.paletteName}" and has a mood of "${paletteAsset.palette.description}". The main colors are ${paletteAsset.palette.colors.map(c => c.hex).join(', ')}. Please use this palette.` : '';
    
    const imageIncorporateInstruction = imageToIncorporate && !baseAsset ? 'A key part of this request is to use the user-provided image (the one that is not the logo). This image is a product photo or a key brand asset. It MUST be prominently featured as the central element of the final design. The rest of the creative should be built around it.' : '';
    
    const targetWidth = dims ? dims.width : 1080;
    const targetHeight = dims ? dims.height : 1080;
    const sizeInstruction = ` The output image dimensions MUST be exactly ${targetWidth}px wide by ${targetHeight}px tall.`;
      
    const fullPrompt = `Using the provided brand logo (and other images if available), create a marketing asset.${sizeInstruction} ${imageIncorporateInstruction} ${logoPlacementInstruction} The user's request is: "${generationPrompt}". Ensure the brand logo is clearly visible and the overall style is consistent with the brand.${paletteInfo}`;
    
    const [generatedParts, generatedTags] = await Promise.all([
        generateWithNanoBanana(fullPrompt, imageInputs, targetWidth, targetHeight),
        generateTagsForCreative(generationPrompt)
    ]);
    
    const assetsToCreate: BrandAsset[] = [];
    for (const part of generatedParts) {
        if ('inlineData' in part) {
          const newId = crypto.randomUUID();
          const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          await storeImage(newId, imageUrl);
          const { width, height } = await getImageDimensions(imageUrl);
          assetsToCreate.push({
            id: newId,
            type: assetType,
            prompt: generationPrompt,
            createdAt: new Date().toISOString(),
            tags: generatedTags,
            width,
            height,
          });
        }
    }
    return assetsToCreate;
  };
  
  const handleGenerate = async (baseAsset?: BrandAsset) => {
    const currentPrompt = baseAsset ? editPrompt : prompt;
    if (!currentPrompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setLoadingMessage("Crafting your creative...");

    try {
        const newAssets = await runGeneration(currentPrompt, 'social_ad', productImage, logoPosition, baseAsset, productImageDims);
        if (newAssets.length > 0) {
            onUpdateBrand({ ...brand, assets: [...brand.assets, ...newAssets] });
        }
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

    const campaignAssetsToGenerate = selectedCampaignTypes;
    const allNewAssets: BrandAsset[] = [];

    for (let i = 0; i < campaignAssetsToGenerate.length; i++) {
        const assetType = campaignAssetsToGenerate[i];
        setLoadingMessage(`Generating Campaign (${i+1}/${campaignAssetsToGenerate.length}): ${assetType}...`);
        try {
            const campaignAssetPrompt = `Generate a ${assetType.replace('_', ' ')} for the following campaign: "${campaignPrompt}".`;
            const newAssets = await runGeneration(campaignAssetPrompt, assetType, campaignImage, null, undefined, campaignImageDims);
            allNewAssets.push(...newAssets);
        } catch(err) {
            setError(err instanceof Error ? `Failed on ${assetType}: ${err.message}` : `An unknown error occurred during ${assetType} generation.`);
            break; 
        }
    }
    
    if (allNewAssets.length > 0) {
        onUpdateBrand({ ...brand, assets: [...brand.assets, ...allNewAssets] });
        setLatestCampaignAssets(allNewAssets);
    }

    setCampaignPrompt('');
    setCampaignImage(null);
    if(campaignFileInputRef.current) campaignFileInputRef.current.value = "";
    setIsLoading(false);
    setLoadingMessage("Crafting your creative...");
  };
  
  const handleGenerateVariants = async (baseAsset: BrandAsset) => {
      setIsLoading(true);
      setLoadingMessage(`Generating A/B variants...`);
      setError(null);
      setPreviewingAsset(null);

      try {
          if (!logoAsset) throw new Error("Logo asset is missing.");

          const baseImageUrl = await getImage(baseAsset.id);
          const logoImageUrl = await getImage(logoAsset.id);
          if (!baseImageUrl || !logoImageUrl) throw new Error("Required images not found in database.");

          const [baseImageFile, logoFile] = await Promise.all([
              fetch(baseImageUrl).then(r => r.blob()).then(b => new File([b], "base.png", {type: b.type})),
              fetch(logoImageUrl).then(r => r.blob()).then(b => new File([b], "logo.png", {type: b.type}))
          ]);

          const [baseImageBase64, logoBase64] = await Promise.all([
              fileToBase64(baseImageFile),
              fileToBase64(logoFile)
          ]);

          const imageInputs = [
              { data: logoBase64, mimeType: logoFile.type },
              { data: baseImageBase64, mimeType: baseImageFile.type }
          ];

          const variantPrompt = `Create exactly 2 A/B test variations for the provided marketing creative. The original goal was: "${baseAsset.prompt}". Generate two distinct versions that target different marketing angles. For example, one variant could have a stronger call-to-action focused on a limited-time sale (e.g., "50% Off Today!"), while the other could focus on a product feature or building brand engagement (e.g., "Experience the new..."). The variations should explore different headlines, secondary text, or color schemes to achieve these different goals. Do not change the brand logo's placement or design.`;
          
          const generatedParts = await generateWithNanoBanana(variantPrompt, imageInputs, baseAsset.width || 1080, baseAsset.height || 1080);

          const newVariantAssets: BrandAsset[] = [];
          for (const [index, part] of generatedParts.filter(p => 'inlineData' in p).entries()) {
              if ('inlineData' in part) {
                  const newId = crypto.randomUUID();
                  const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                  await storeImage(newId, imageUrl);
                  newVariantAssets.push({
                      id: newId,
                      type: baseAsset.type,
                      prompt: `A/B Test Variant (Marketing Angle) of: "${baseAsset.prompt}"`,
                      createdAt: new Date().toISOString(),
                      tags: baseAsset.tags || [],
                      parentId: baseAsset.id,
                      variantLabel: `Variant ${index + 1}`,
                      width: baseAsset.width,
                      height: baseAsset.height,
                  });
              }
          }
          
          if (newVariantAssets.length === 0) {
              throw new Error("The AI did not return any image variations. Please try again.");
          }

          onUpdateBrand({ ...brand, assets: [...brand.assets, ...newVariantAssets] });
      } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred while generating variants.');
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleSuggestPrompts = async (type: 'single' | 'campaign') => {
    const isCampaign = type === 'campaign';
    if (isCampaign) {
        setIsCampaignSuggesting(true);
        setCampaignSuggestions([]);
    } else {
        setIsSuggesting(true);
        setSuggestions([]);
    }
    
    setError(null);

    try {
        const imageFile = isCampaign ? campaignImage : productImage;
        let imageDescription = '';

        if (imageFile) {
            if (isCampaign) {
                setCampaignSuggestionLoadingMessage('Analyzing image...');
            } else {
                setSuggestionLoadingMessage('Analyzing image...');
            }
            const base64 = await fileToBase64(imageFile);
            imageDescription = await describeImage(base64, imageFile.type);
        }
        
        if (isCampaign) {
            setCampaignSuggestionLoadingMessage('Generating ideas...');
        } else {
            setSuggestionLoadingMessage('Generating ideas...');
        }

        const creativeTypeLabel = isCampaign 
            ? "Marketing Campaign" 
            : "Instagram Post";

        const generatedSuggestions = await generatePromptSuggestions(
            creativeTypeLabel, 
            brand.description, 
            imageDescription,
            paletteAsset?.palette
        );
        
        if (isCampaign) {
            setCampaignSuggestions(generatedSuggestions);
        } else {
            setSuggestions(generatedSuggestions);
        }

    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while generating suggestions.');
    } finally {
        if (isCampaign) {
            setIsCampaignSuggesting(false);
            setCampaignSuggestionLoadingMessage('Thinking...');
        } else {
            setIsSuggesting(false);
            setSuggestionLoadingMessage('Thinking...');
        }
    }
  };

  const handleSaveCustomTemplate = () => {
    if (!newTemplateName.trim() || !prompt.trim()) return;
    const newTemplate: CustomTemplate = {
        id: crypto.randomUUID(),
        name: newTemplateName,
        prompt: prompt,
    };
    const currentCustomTemplates = brand.customTemplates || [];
    onUpdateBrand({
        ...brand,
        customTemplates: [...currentCustomTemplates, newTemplate]
    });
    setShowSaveTemplateModal(false);
    setNewTemplateName('');
  };

  const handleDeleteCustomTemplate = (templateId: string) => {
    if (!window.confirm("Are you sure you want to delete this template? This cannot be undone.")) {
        return;
    }
    const updatedTemplates = (brand.customTemplates || []).filter(t => t.id !== templateId);
    onUpdateBrand({
        ...brand,
        customTemplates: updatedTemplates
    });
  };

  const handleConvertToVideo = (assetToConvert: BrandAsset) => {
    setPreviewingAsset(null); // Close the modal
    onRequestVideoConversion(assetToConvert.id);
  };


  return (
    <div>
      {!logoAsset ? (
        <div className="bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded-lg">
            <strong>Action Required:</strong> Please generate a logo in the Identity Studio before creating marketing assets.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* === LEFT COLUMN: CONTROLS === */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700/50">
            <div className="border-b border-slate-200 dark:border-slate-700 -mx-6 -mt-6 mb-6">
                <nav className="flex space-x-2 px-6">
                    <button
                        onClick={() => setActiveCreativeTab('single')}
                        className={`py-3 px-4 font-semibold transition-colors border-b-2 ${activeCreativeTab === 'single' ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Single Creative
                    </button>
                    <button
                        onClick={() => setActiveCreativeTab('campaign')}
                        className={`py-3 px-4 font-semibold transition-colors border-b-2 ${activeCreativeTab === 'campaign' ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Campaign
                    </button>
                </nav>
            </div>
            
            <div className="space-y-6">
              {activeCreativeTab === 'single' && (
                  <div className="space-y-6 animate-fade-in">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Single Creative</h3>
                      
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700/50">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 shrink-0">
                              <TemplateIcon className="w-5 h-5"/>
                              Start with a Template
                          </h4>
                          <button 
                              onClick={() => setIsCreativeTemplateModalOpen(true)} 
                              disabled={isLoading}
                              className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 font-semibold bg-white dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-600 shadow-sm"
                          >
                              Browse Templates
                          </button>
                      </div>

                      {(brand.customTemplates || []).length > 0 && (
                          <div>
                              <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2"><BookmarkIcon className="w-5 h-5"/> Your Custom Templates</h4>
                              <div className="space-y-2">
                                  {brand.customTemplates?.map(template => (
                                      <div key={template.id} className="group flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-md border border-slate-200 dark:border-slate-700/50">
                                          <button onClick={() => setPrompt(template.prompt)} className="flex-1 text-left">
                                              <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{template.name}</p>
                                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{template.prompt}</p>
                                          </button>
                                          <button onClick={() => handleDeleteCustomTemplate(template.id)} className="ml-2 p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                              <TrashIcon className="w-4 h-4" />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Creative Prompt</label>
                              <button 
                                  onClick={() => handleSuggestPrompts('single')} 
                                  disabled={isSuggesting || isLoading}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-wait"
                              >
                                  <LightbulbIcon className="w-4 h-4" />
                                  {isSuggesting ? suggestionLoadingMessage : 'Get Suggestions'}
                              </button>
                          </div>
                          <div className="relative">
                              <textarea
                                  value={prompt}
                                  onChange={(e) => setPrompt(e.target.value)}
                                  placeholder="e.g., An Instagram post for a new coffee blend called 'Morning Rush'."
                                  className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-slate-900 dark:text-slate-100"
                                  rows={3}
                                  disabled={isLoading}
                              />
                              <button 
                                  onClick={() => setShowSaveTemplateModal(true)} 
                                  disabled={!prompt.trim() || isLoading}
                                  title="Save as Template"
                                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                              >
                                  <BookmarkIcon className="w-5 h-5"/>
                              </button>
                          </div>
                      </div>
                      {suggestions.length > 0 && !isSuggesting && (
                          <div className="space-y-2 animate-fade-in">
                              <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Suggestions</h5>
                              {suggestions.map((s, i) => (
                                  <button 
                                      key={i} 
                                      onClick={() => setPrompt(s.prompt)}
                                      className="w-full text-left p-2.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-md transition-colors"
                                  >
                                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{s.goal}</p>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">{s.prompt}</p>
                                  </button>
                              ))}
                          </div>
                      )}
                      
                      <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Upload Product Image (Optional)</label>
                            {productImage ? (
                                <div className="relative group">
                                    <img src={URL.createObjectURL(productImage)} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded-md border border-slate-300 dark:border-slate-600 p-1 bg-white dark:bg-slate-700/50" />
                                    <button
                                        onClick={() => {
                                            setProductImage(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                                        aria-label="Remove image"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex w-auto items-center justify-start gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <ImageIcon className="w-5 h-5" />
                                    Upload Image
                                </button>
                            )}
                             <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, setProductImage)}
                                ref={fileInputRef}
                                className="hidden"
                                disabled={isLoading}
                            />
                        </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Creative Type</label>
                            <p className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 text-slate-900 dark:text-slate-100">
                                Instagram Post (Square)
                            </p>
                          </div>
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Brand Logo</label>
                              <div className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-900/30 rounded-md">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Include Logo</span>
                                <button
                                    onClick={() => setAddLogo(!addLogo)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${addLogo ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    role="switch"
                                    aria-checked={addLogo}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${addLogo ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                              </div>
                               <div className={`mt-3 transition-opacity ${!addLogo ? 'opacity-40 pointer-events-none' : ''}`}>
                                 <div className="flex flex-wrap gap-2">
                                     {(['top-right', 'top-left', 'bottom-right', 'bottom-left', 'watermark', 'none'] as LogoPosition[]).map(pos => (
                                         <button key={pos} onClick={() => setLogoPosition(pos)} disabled={isLoading} className={`px-3 py-1 text-xs rounded-full capitalize transition-colors font-semibold ${logoPosition === pos ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200'}`}>
                                             {pos.replace('-', ' ')}
                                         </button>
                                     ))}
                                 </div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="!mt-8 flex justify-center">
                          <button
                              onClick={() => handleGenerate()}
                              disabled={isLoading || !prompt.trim()}
                              className="flex-shrink-0 flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed shadow-md"
                          >
                              <SparklesIcon className="w-5 h-5" />
                              {isLoading && loadingMessage.startsWith("Crafting") ? 'Generating...' : 'Generate Creative'}
                          </button>
                      </div>
                  </div>
              )}
              {activeCreativeTab === 'campaign' && (
                    <div className="space-y-6 animate-fade-in">
                      <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-slate-100">One-Click Campaign</h3>
                      
                      <div>
                      <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Campaign Theme / Tagline</label>
                          <button 
                              onClick={() => handleSuggestPrompts('campaign')} 
                              disabled={isCampaignSuggesting || isLoading}
                              className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-500 disabled:opacity-50 disabled:cursor-wait"
                          >
                              <LightbulbIcon className="w-4 h-4" />
                              {isCampaignSuggesting ? campaignSuggestionLoadingMessage : 'Get Suggestions'}
                          </button>
                      </div>
                      <input
                          type="text"
                          value={campaignPrompt}
                          onChange={(e) => setCampaignPrompt(e.target.value)}
                          placeholder="e.g., 'Summer Sale: 50% Off Everything!'"
                          className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-slate-900 dark:text-slate-100"
                          disabled={isLoading}
                      />
                      </div>
                      {campaignSuggestions.length > 0 && !isCampaignSuggesting && (
                          <div className="space-y-2 animate-fade-in">
                              <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Suggestions</h5>
                              {campaignSuggestions.map((s, i) => (
                                  <button 
                                      key={i} 
                                      onClick={() => setCampaignPrompt(s.prompt)}
                                      className="w-full text-left p-2.5 bg-slate-100 dark:bg-slate-700/50 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-md transition-colors"
                                  >
                                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{s.goal}</p>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">{s.prompt}</p>
                                  </button>
                              ))}
                          </div>
                      )}
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Campaign Image (Optional)</label>
                        {campaignImage ? (
                            <div className="flex items-center gap-3 p-2 bg-slate-200 dark:bg-slate-700 rounded-md">
                                <img src={URL.createObjectURL(campaignImage)} alt="Campaign Preview" className="w-12 h-12 object-contain rounded-md bg-white dark:bg-slate-600" />
                                <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">{campaignImage.name}</span>
                                <button
                                    onClick={() => {
                                        setCampaignImage(null);
                                        if (campaignFileInputRef.current) campaignFileInputRef.current.value = "";
                                    }}
                                    className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600"
                                    aria-label="Remove image"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                             <button
                                onClick={() => campaignFileInputRef.current?.click()}
                                className="flex w-auto items-center justify-start gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                <ImageIcon className="w-5 h-5" />
                                Upload Image
                            </button>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setCampaignImage)} ref={campaignFileInputRef} className="hidden" disabled={isLoading} />
                      </div>


                      <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Creatives to Generate</label>
                          <div className="grid grid-cols-2 gap-3">
                              {['social_ad', 'instagram_story', 'banner', 'twitter_post'].map(type => (
                                  <label key={type} className={`flex items-center gap-3 p-3 rounded-md transition-colors cursor-pointer ${selectedCampaignTypes.includes(type as AssetType) ? 'bg-purple-100 dark:bg-purple-900/50 border-purple-400 dark:border-purple-600' : 'bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600'} border`}>
                                      <input
                                          type="checkbox"
                                          checked={selectedCampaignTypes.includes(type as AssetType)}
                                          onChange={() => handleCampaignTypeToggle(type as AssetType)}
                                          className="h-4 w-4 rounded bg-slate-300 dark:bg-slate-600 border-slate-400 dark:border-slate-500 text-purple-600 focus:ring-purple-500"
                                          disabled={isLoading}
                                      />
                                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{type.replace('_', ' ')}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                      <div className="!mt-6 flex justify-center">
                          <button onClick={handleGenerateCampaign} disabled={isLoading || !campaignPrompt.trim() || selectedCampaignTypes.length === 0} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:bg-purple-600/50 dark:disabled:bg-purple-900/50 disabled:cursor-not-allowed shadow-md">
                              <SparklesIcon className="w-5 h-5"/>
                              {isLoading && loadingMessage.startsWith("Generating Campaign") ? 'Generating...' : 'Generate Campaign Pack'}
                          </button>
                      </div>
                  </div>
              )}
            </div>
          </div>

          {/* === RIGHT COLUMN: RESULTS === */}
          <div className="lg:col-span-2 space-y-6">
              <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Generated Creatives</h4>
              {isLoading && <div className="flex justify-center"><Loader message={loadingMessage}/></div>}
              {error && <p className="mt-4 text-center text-red-500 dark:text-red-400">Error: {error}</p>}
              
              {allCreativeTags.length > 0 && (
                <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                        <TagIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        <h5 className="font-semibold text-slate-700 dark:text-slate-200">Filter by Tag</h5>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {allCreativeTags.map(tag => (
                            <button 
                                key={tag} 
                                onClick={() => handleFilterToggle(tag)}
                                className={`px-3 py-1 text-sm rounded-full transition-colors font-semibold ${activeFilters.includes(tag) ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100'}`}
                            >
                                {tag}
                            </button>
                        ))}
                        {activeFilters.length > 0 && (
                            <button onClick={() => setActiveFilters([])} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">Clear Filters</button>
                        )}
                    </div>
                </div>
            )}
            
            {!isLoading && creativeAssets.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                <SparklesIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500" />
                <h5 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">Your Creative Canvas Awaits</h5>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">Use the forms to generate social media posts, banners, and ad campaigns for your brand.</p>
              </div>
            ) : !isLoading && filteredAssetGroups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No creatives match your selected filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredAssetGroups.map(({ original, variants }) => (
                  <div key={original.id} className="p-4 border border-slate-200 dark:border-slate-700/50 rounded-lg bg-white dark:bg-slate-800/20">
                    <div
                        className="group relative rounded-lg bg-slate-100 dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700/50 cursor-pointer flex justify-center items-center overflow-hidden"
                        style={{ aspectRatio: original.width && original.height ? `${original.width} / ${original.height}` : '1 / 1' }}
                        onClick={() => setPreviewingAsset(original)}
                    >
                        <AsyncImage assetId={original.id} alt="Generated creative" className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"/>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <p className="text-sm font-semibold text-slate-100 drop-shadow-lg capitalize">{original.type.replace('_', ' ')}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                                {original.tags?.map(tag => (
                                  <span key={tag} className="text-xs bg-slate-50/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">{tag}</span>
                                ))}
                            </div>
                        </div>
                      </div>

                      {variants.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <h5 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">A/B Test Variants</h5>
                          <div className="grid grid-cols-2 gap-4">
                            {variants.map(variant => (
                              <div
                                  key={variant.id}
                                  className="group relative rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700/50 cursor-pointer flex justify-center items-center"
                                  style={{ aspectRatio: variant.width && variant.height ? `${variant.width} / ${variant.height}` : '1 / 1' }}
                                  onClick={() => setPreviewingAsset(variant)}
                              >
                                <span className="absolute top-1.5 left-1.5 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full z-10 font-semibold">{variant.variantLabel}</span>
                                <AsyncImage assetId={variant.id} alt={`Variant creative: ${variant.prompt}`} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"/>
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
        </div>
      )}

      {isCreativeTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsCreativeTemplateModalOpen(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Browse Creative Templates</h2>
                    <button onClick={() => setIsCreativeTemplateModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                        <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                    </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-6 max-h-[60vh]">
                    <div className="sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-700/50 pr-4">
                        <nav className="flex sm:flex-col -mb-px sm:mb-0 space-x-2 sm:space-x-0 sm:space-y-1">
                            {templateCategories.map(category => (
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
                            {templateCategories.find(c => c.name === activeTemplateCategory)?.templates.map(template => (
                                <button 
                                    key={template.name} 
                                    onClick={() => handleTemplateClick(template.prompt)} 
                                    disabled={isLoading} 
                                    className="text-left p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
                                >
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{template.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{template.prompt}</p>
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
                setEditPrompt(asset.prompt)
            }}
            onUpdateTags={handleUpdateAssetTags}
            availableTags={allCreativeTags}
            onGenerateVariants={handleGenerateVariants}
            onConvertToVideo={handleConvertToVideo}
        />
      )}

       {editingAsset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Edit Creative</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-32 h-32 bg-slate-100 dark:bg-slate-700 rounded-md p-1 flex-shrink-0">
                        <AsyncImage assetId={editingAsset.id} alt="Creative to edit" className="w-full h-full object-contain"/>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Describe the changes you'd like to make:</p>
                        <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="e.g., change the background to blue, add '50% OFF'"
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-slate-900 dark:text-slate-100"
                            rows={3}
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <div className="flex gap-4 mt-6 justify-end">
                    <button onClick={() => setEditingAsset(null)} disabled={isLoading} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Cancel</button>
                    <button onClick={() => handleGenerate(editingAsset)} disabled={isLoading || !editPrompt.trim()} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-600/50 dark:disabled:bg-indigo-900/50 disabled:cursor-not-allowed">{isLoading ? "Generating..." : "Generate Edit"}</button>
                </div>
            </div>
        </div>
       )}
    </div>
  );
};

export default CreativeLab;