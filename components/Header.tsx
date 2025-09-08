import React from 'react';
import SparklesIcon from './icons/SparklesIcon';
import ThemeToggle from './ThemeToggle';
import RectangleStackIcon from './icons/RectangleStackIcon';

interface HeaderProps {
  onGoToDashboard: () => void;
  onGoToHomepage: () => void;
}

const Header: React.FC<HeaderProps> = ({ onGoToDashboard, onGoToHomepage }) => {
  return (
    <header className="py-4 px-8 border-b border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
      <div className="container mx-auto flex items-center justify-between">
        <button onClick={onGoToHomepage} className="flex items-center gap-3 group" aria-label="Go to homepage">
          <SparklesIcon className="w-8 h-8 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            BrandForge <span className="text-indigo-500 dark:text-indigo-400">AI</span>
          </h1>
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={onGoToDashboard}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Go to dashboard"
          >
            <RectangleStackIcon className="w-5 h-5" />
            Dashboard
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;