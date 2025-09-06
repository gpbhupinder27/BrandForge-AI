import React, { useState } from 'react';
import { Brand } from '../types';
import PlusIcon from './icons/PlusIcon';
import ImageIcon from './icons/ImageIcon';
import AsyncImage from './AsyncImage';

interface BrandDashboardProps {
  brands: Brand[];
  onCreateBrand: (name: string, description: string) => void;
  onSelectBrand: (brandId: string) => void;
}

const BrandDashboard: React.FC<BrandDashboardProps> = ({ brands, onCreateBrand, onSelectBrand }) => {
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBrandName.trim()) {
      onCreateBrand(newBrandName.trim(), newBrandDesc.trim());
      setNewBrandName('');
      setNewBrandDesc('');
      setShowCreateForm(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-slate-50">Brand Workspaces</h2>
        {!showCreateForm && (
            <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 rounded-lg shadow-lg hover:bg-indigo-500 transition-all duration-300 transform hover:scale-105"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="font-semibold">Create New Brand</span>
          </button>
        )}
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} className="mb-8 p-6 bg-slate-800/70 border border-slate-700 rounded-lg shadow-2xl animate-fade-in">
          <h3 className="text-xl font-semibold mb-4 text-slate-100">New Brand Workspace</h3>
          <div className="space-y-4">
            <input
              type="text"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Brand Name (e.g., CoffeeNova)"
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
              required
            />
            <textarea
              value={newBrandDesc}
              onChange={(e) => setNewBrandDesc(e.target.value)}
              placeholder="Brand Description (e.g., A premium, ethically-sourced coffee roaster)"
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-2 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
              rows={3}
            />
          </div>
          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-500 transition-colors shadow-md"
            >
              Create Workspace
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-5 py-2.5 bg-slate-600 rounded-lg font-semibold hover:bg-slate-500 transition-colors shadow-md"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {brands.length === 0 && !showCreateForm ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-lg">
            <h3 className="text-xl text-slate-400 font-semibold">No brands yet.</h3>
            <p className="text-slate-500 mt-2">Click "Create New Brand" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => {
             const logo = brand.assets.find(a => a.type === 'logo');
            return (
                <div
                key={brand.id}
                onClick={() => onSelectBrand(brand.id)}
                className="bg-slate-800 rounded-lg shadow-lg overflow-hidden cursor-pointer group hover:ring-2 hover:ring-indigo-500 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="h-48 bg-slate-700 flex items-center justify-center p-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-800 via-slate-700/50 to-transparent"></div>
                    {logo ? (
                        <AsyncImage assetId={logo.id} alt={`${brand.name} logo`} className="h-full w-full object-contain p-4 drop-shadow-lg"/>
                    ) : (
                        <ImageIcon className="w-16 h-16 text-slate-500"/>
                    )}
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-slate-100">{brand.name}</h3>
                  <p className="text-slate-400 text-sm mt-1 h-10 overflow-hidden">{brand.description}</p>
                  <p className="text-xs font-medium text-slate-500 mt-4">{brand.assets.length} assets</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default BrandDashboard;