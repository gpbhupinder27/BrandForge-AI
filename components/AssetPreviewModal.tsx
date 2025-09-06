import React, { useEffect } from 'react';
import { BrandAsset } from '../types';
import AsyncImage from './AsyncImage';
import EditIcon from './icons/EditIcon';
import DownloadIcon from './icons/DownloadIcon';

interface AssetPreviewModalProps {
  asset: BrandAsset;
  onClose: () => void;
  onEdit: (asset: BrandAsset) => void;
  onDownload: (assetId: string, assetType: string) => void;
}

const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({ asset, onClose, onEdit, onDownload }) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col sm:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex-1 bg-gray-900/50 flex items-center justify-center p-4">
             <AsyncImage assetId={asset.id} alt={`Preview of ${asset.type}`} className="max-w-full max-h-[80vh] object-contain"/>
        </div>
        <div className="w-full sm:w-80 p-6 flex flex-col bg-gray-800">
            <h3 className="text-xl font-semibold mb-1 text-white capitalize">{asset.type.replace('_', ' ')}</h3>
            <p className="text-xs text-gray-500 mb-4">Created: {new Date(asset.createdAt).toLocaleString()}</p>
            
            <p className="text-sm font-semibold text-gray-300 mb-2">Prompt:</p>
            <p className="text-sm text-gray-400 bg-gray-700/50 p-3 rounded-md max-h-48 overflow-y-auto">{asset.prompt}</p>

            <div className="mt-auto pt-6 flex flex-col gap-3">
                <button onClick={() => onEdit(asset)} className="w-full text-sm flex items-center justify-center gap-2 bg-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
                    <EditIcon className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => onDownload(asset.id, asset.type)} className="w-full text-sm flex items-center justify-center gap-2 bg-gray-600 px-4 py-2 rounded-md hover:bg-gray-500 transition-colors">
                    <DownloadIcon className="w-4 h-4" /> Download
                </button>
                 <button onClick={onClose} className="w-full mt-2 text-sm text-gray-400 hover:text-white">Close</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AssetPreviewModal;
