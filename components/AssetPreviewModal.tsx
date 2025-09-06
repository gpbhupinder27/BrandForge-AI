import React, { useEffect, useState } from 'react';
import { BrandAsset } from '../types';
import AsyncImage from './AsyncImage';
import EditIcon from './icons/EditIcon';
import DownloadIcon from './icons/DownloadIcon';
import XMarkIcon from './icons/XMarkIcon';
import BeakerIcon from './icons/BeakerIcon';

interface AssetPreviewModalProps {
  asset: BrandAsset;
  onClose: () => void;
  onEdit: (asset: BrandAsset) => void;
  onDownload: (assetId: string, assetType: string) => void;
  onUpdateTags: (assetId: string, newTags: string[]) => void;
  onGenerateVariants?: (asset: BrandAsset) => void;
  availableTags?: string[];
}

const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({ asset, onClose, onEdit, onDownload, onUpdateTags, onGenerateVariants, availableTags }) => {
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = asset.tags?.filter(t => t !== tagToRemove) || [];
    onUpdateTags(asset.id, newTags);
  };

  const handleAddTag = (tagToAdd: string) => {
    const newTag = tagToAdd.trim();
    if (!newTag) return;
    
    const currentTags = asset.tags || [];
    if (!currentTags.includes(newTag)) {
        onUpdateTags(asset.id, [...currentTags, newTag]);
    }
    setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && tagInput.trim()) {
          e.preventDefault();
          handleAddTag(tagInput);
      }
  };

  const isCreativeAsset = ['poster', 'banner', 'social_ad', 'instagram_story', 'twitter_post'].includes(asset.type);
  const isLogoAsset = asset.type === 'logo';

  return (
    <div 
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col sm:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex-1 bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center p-4">
             <AsyncImage assetId={asset.id} alt={`Preview of ${asset.type}`} className="max-w-full max-h-[80vh] object-contain"/>
        </div>
        <div className="w-full sm:w-80 p-6 flex flex-col bg-white dark:bg-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold mb-1 text-slate-900 dark:text-white capitalize">{asset.type.replace('_', ' ')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Created: {new Date(asset.createdAt).toLocaleString()}</p>
              </div>
              {asset.variantLabel && (
                <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-xs font-medium px-2.5 py-1 rounded-full">{asset.variantLabel}</span>
              )}
            </div>
            
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Prompt:</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 p-3 rounded-md max-h-48 overflow-y-auto">{asset.prompt}</p>

            <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tags:</p>
                <div className="flex flex-wrap gap-2 mb-3">
                    {asset.tags?.map(tag => (
                        <div key={tag} className="flex items-center bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-sm font-medium px-2.5 py-1 rounded-full">
                            <span>{tag}</span>
                            <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 -mr-1 p-0.5 rounded-full hover:bg-indigo-200/60 dark:hover:bg-indigo-700/60" aria-label={`Remove ${tag} tag`}>
                                <XMarkIcon className="w-3 h-3"/>
                            </button>
                        </div>
                    ))}
                    {!asset.tags?.length && <p className="text-xs text-slate-500 dark:text-slate-400 italic">No tags yet.</p>}
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Add a tag..."
                        list="available-tags"
                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    {availableTags && (
                        <datalist id="available-tags">
                            {availableTags.filter(t => !asset.tags?.includes(t)).map(tag => <option key={tag} value={tag} />)}
                        </datalist>
                    )}
                </div>
            </div>

            <div className="mt-auto pt-6 flex flex-col gap-3">
                {(isCreativeAsset || isLogoAsset) && !asset.parentId && onGenerateVariants && (
                  <button onClick={() => onGenerateVariants(asset)} className="w-full text-sm flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-500 transition-colors">
                      <BeakerIcon className="w-4 h-4" /> Generate A/B Variants
                  </button>
                )}
                <button onClick={() => onEdit(asset)} className="w-full text-sm flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-500 transition-colors">
                    <EditIcon className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => onDownload(asset.id, asset.type)} className="w-full text-sm flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 px-4 py-2 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                    <DownloadIcon className="w-4 h-4" /> Download
                </button>
                 <button onClick={onClose} className="w-full mt-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Close</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AssetPreviewModal;