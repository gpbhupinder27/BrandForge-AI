import React from 'react';
import SparklesIcon from './icons/SparklesIcon';

const Header: React.FC = () => {
  return (
    <header className="py-4 px-8 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="container mx-auto flex items-center gap-3">
        <SparklesIcon className="w-8 h-8 text-indigo-400" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">
          BrandForge <span className="text-indigo-400">AI</span>
        </h1>
      </div>
    </header>
  );
};

export default Header;