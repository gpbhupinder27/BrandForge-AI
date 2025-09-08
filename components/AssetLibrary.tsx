import React, { useState, useMemo } from 'react';
import { Brand, BrandAsset, AssetType } from '../types';
import AsyncImage from './AsyncImage';
import FilterIcon from './icons/FilterIcon';
import SwitchVerticalIcon from './icons/SwitchVerticalIcon';
import XMarkIcon from './icons/XMarkIcon';
import ImageIcon from './icons/ImageIcon';
import ExportIcon from './icons/ExportIcon';
import PlayIcon from './icons/PlayIcon';

interface AssetLibraryProps {
  brand: Brand;
  onUpdateBrand: (updatedBrand: Brand) => void;
  onSelectAsset: (assetId: string) => void;
  onExportBrand: () => Promise<void>;
  isExporting: boolean;
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
    logo: 'Logo',
    palette: 'Palette',
    typography: 'Typography',
    poster: 'Poster',
    banner: 'Banner',
    social_ad: 'Social Ad',
    instagram_story: 'Instagram Story',
    twitter_post: 'Twitter Post',
    youtube_thumbnail: 'YouTube Thumbnail',
    video_ad: 'Video Ad',
};


const AssetCard: React.FC<{ asset: BrandAsset; onClick: () => void; }> = ({ asset, onClick }) => {
    const renderContent = () => {
        if (asset.type === 'palette' && asset.palette) {
            return (
                <div className="flex flex-col h-full w-full">
                    {asset.palette.colors.slice(0, 5).map((color) => (
                        <div key={color.hex} style={{ backgroundColor: color.hex }} className="flex-1" title={`${color.name} (${color.hex})`}></div>
                    ))}
                </div>
            );
        }
        if (asset.type === 'typography' && asset.typography) {
            return (
                <div className="p-4 flex flex-col justify-center items-start h-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <p 
                        className="text-3xl font-bold text-slate-800 dark:text-slate-100 leading-tight w-full" 
                        style={{ fontFamily: `'${asset.typography.headlineFont.name}', 'Manrope', sans-serif` }}>
                        Aa
                    </p>
                    <p 
                        className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-snug w-full" 
                        style={{ fontFamily: `'${asset.typography.bodyFont.name}', 'Manrope', sans-serif` }}>
                        The quick brown fox jumps over the lazy dog.
                    </p>
                </div>
            );
        }
        if (asset.type === 'video_ad' && asset.parentId) {
             return (
                <>
                    <AsyncImage assetId={asset.parentId} alt={asset.prompt} className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayIcon className="w-12 h-12 text-white/80" />
                    </div>
                </>
            );
        }
        // For logos, creatives, and other image-based assets
        return <AsyncImage assetId={asset.id} alt={asset.prompt} className="w-full h-full object-contain p-2" />;
    };

    return (
        <div onClick={onClick} className="group relative aspect-square rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700/50 shadow-md border border-slate-200 dark:border-slate-700/50 cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-indigo-500 dark:hover:border-indigo-400">
            {renderContent()}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-sm font-semibold text-white truncate drop-shadow-md">{ASSET_TYPE_LABELS[asset.type]}</h3>
                <p className="text-xs text-slate-300 drop-shadow-md">{new Date(asset.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
    );
};

const AssetLibrary: React.FC<AssetLibraryProps> = ({ brand, onSelectAsset, onExportBrand, isExporting }) => {
    const [typeFilters, setTypeFilters] = useState<AssetType[]>([]);
    const [tagFilters, setTagFilters] = useState<string[]>([]);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    const allAssetTypes = useMemo(() => [...new Set(brand.assets.map(a => a.type))].sort((a,b) => ASSET_TYPE_LABELS[a].localeCompare(ASSET_TYPE_LABELS[b])), [brand.assets]);
    const allTags = useMemo(() => [...new Set(brand.assets.flatMap(a => a.tags || []))].sort(), [brand.assets]);

    const filteredAndSortedAssets = useMemo(() => {
        let assets = [...brand.assets];
        if (typeFilters.length > 0) {
            assets = assets.filter(a => typeFilters.includes(a.type));
        }
        if (tagFilters.length > 0) {
            assets = assets.filter(a => tagFilters.every(filterTag => a.tags?.includes(filterTag)));
        }
        assets.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
        return assets;
    }, [brand.assets, typeFilters, tagFilters, sortOrder]);

    const handleTypeFilterToggle = (type: AssetType) => {
        setTypeFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    const handleTagFilterToggle = (tag: string) => {
        setTagFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    return (
        <div className="animate-fade-in">
            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700/50 mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2"><FilterIcon className="w-5 h-5" /> Filter Assets</h3>
                        <div className="flex flex-wrap gap-2">
                            {allAssetTypes.map(type => (
                                <button key={type} onClick={() => handleTypeFilterToggle(type)} className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${typeFilters.includes(type) ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'}`}>{ASSET_TYPE_LABELS[type]}</button>
                            ))}
                            {allTags.map(tag => (
                                <button key={tag} onClick={() => handleTagFilterToggle(tag)} className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${tagFilters.includes(tag) ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'}`}>#{tag}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <button onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md transition-colors">
                            <SwitchVerticalIcon className="w-5 h-5" />
                            {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                        </button>
                        <button onClick={onExportBrand} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-wait shadow">
                            <ExportIcon className="w-5 h-5" />
                            {isExporting ? 'Exporting...' : 'Export All'}
                        </button>
                    </div>
                </div>
                {(typeFilters.length > 0 || tagFilters.length > 0) && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => { setTypeFilters([]); setTagFilters([]); }} className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                            <XMarkIcon className="w-4 h-4" /> Clear All Filters
                        </button>
                    </div>
                )}
            </div>

            {filteredAndSortedAssets.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredAndSortedAssets.map(asset => (
                        <AssetCard key={asset.id} asset={asset} onClick={() => onSelectAsset(asset.id)} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                    <ImageIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">No Assets Found</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters or generating new assets.</p>
                </div>
            )}
        </div>
    );
};

export default AssetLibrary;