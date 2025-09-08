
import React, { useState } from 'react';
import { Brand } from '../types';
import PlusIcon from './icons/PlusIcon';
import CreateBrandModal from './CreateBrandModal';
import AsyncImage from './AsyncImage';
import ChevronRightIcon from './icons/ChevronRightIcon';
import RectangleStackIcon from './icons/RectangleStackIcon';
import TrashIcon from './icons/TrashIcon';

interface BrandDashboardProps {
  brands: Brand[];
  onSelectBrand: (id: string) => void;
  onAddBrand: (newBrand: Brand) => void;
  onDeleteBrand: (id: string) => void;
}

const BrandDashboard: React.FC<BrandDashboardProps> = ({ brands, onSelectBrand, onAddBrand, onDeleteBrand }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <div className="p-4 sm:p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Your Brands</h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors shadow-md"
          >
            <PlusIcon className="w-5 h-5" />
            Create New Brand
          </button>
        </div>

        {brands.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            <RectangleStackIcon className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500" />
            <h5 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">No Brands Yet</h5>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">Click "Create New Brand" to get started and build your first brand identity.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => {
              const logoAsset = brand.assets.find(a => a.type === 'logo');
              return (
                <div
                  key={brand.id}
                  className="bg-white dark:bg-slate-800/50 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-indigo-500 dark:hover:border-indigo-400 group relative"
                  onClick={() => onSelectBrand(brand.id)}
                >
                  <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBrand(brand.id);
                    }}
                    className="absolute top-4 right-4 z-10 p-1.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-full text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-800 hover:text-red-600 dark:hover:text-red-400"
                    aria-label={`Delete ${brand.name} brand`}
                    title="Delete Brand"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                  <div className="p-6 cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-4">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{brand.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 h-10 overflow-hidden text-ellipsis">
                          {brand.description}
                        </p>
                      </div>
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 shadow-inner flex-shrink-0">
                        {logoAsset ? (
                          <AsyncImage assetId={logoAsset.id} alt={`${brand.name} logo`} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <RectangleStackIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {brand.assets.length} assets
                        </p>
                        <div className="flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            Open Workspace
                            <ChevronRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <CreateBrandModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAddBrand={onAddBrand}
      />
    </>
  );
};

export default BrandDashboard;
