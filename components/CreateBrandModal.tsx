import React, { useState } from 'react';
import { Brand } from '../types';
import SparklesIcon from './icons/SparklesIcon';
import XMarkIcon from './icons/XMarkIcon';

interface CreateBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBrand: (newBrand: Brand) => void;
}

const CreateBrandModal: React.FC<CreateBrandModalProps> = ({ isOpen, onClose, onAddBrand }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      alert('Please fill out both fields.');
      return;
    }
    const newBrand: Brand = {
      id: crypto.randomUUID(),
      name,
      description,
      assets: [],
      createdAt: new Date().toISOString(),
    };
    onAddBrand(newBrand);
    onClose();
    setName('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create a New Brand</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
            </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="brand-name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Brand Name
            </label>
            <input
              id="brand-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Quantum Coffee"
              className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-slate-900 dark:text-slate-100"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="brand-description" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Brand Description
            </label>
            <textarea
              id="brand-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., A specialty coffee roaster focusing on sustainable, single-origin beans for the modern connoisseur."
              className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow text-slate-900 dark:text-slate-100"
              rows={4}
              required
            />
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50" disabled={!name.trim() || !description.trim()}>
              <SparklesIcon className="w-5 h-5" />
              Create Brand
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBrandModal;
