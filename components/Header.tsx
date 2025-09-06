import React from 'react';
import SparklesIcon from './icons/SparklesIcon';
import ThemeToggle from './ThemeToggle';

const Header: React.FC = () => {
  return (
    <header className="py-4 px-8 border-b border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            BrandForge <span className="text-indigo-500 dark:text-indigo-400">AI</span>
          </h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;
