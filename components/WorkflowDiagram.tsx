import React from 'react';
import PaletteIcon from './icons/PaletteIcon';
import SparklesIcon from './icons/SparklesIcon';
import ExportIcon from './icons/ExportIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

const WorkflowDiagram = () => {
    const Step = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
        <div className="flex flex-col items-center text-center p-4 bg-white dark:bg-slate-800/50 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700/50 flex-1">
            <div className="flex items-center justify-center w-16 h-16 mb-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-500 dark:text-indigo-400">
                {icon}
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
    );

    const Arrow = () => (
        <div className="flex-shrink-0 self-center hidden md:block">
            <ChevronRightIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
    );

    return (
        <div className="w-full flex flex-col md:flex-row items-stretch justify-between gap-4">
            <Step 
                icon={<PaletteIcon className="w-8 h-8" />}
                title="1. Define Identity"
                description="Generate color palettes, typography, and logos for your brand."
            />
            <Arrow />
            <Step 
                icon={<SparklesIcon className="w-8 h-8" />}
                title="2. Create Assets"
                description="Craft social media posts, banners, and ad campaigns with one click."
            />
            <Arrow />
            <Step 
                icon={<ExportIcon className="w-8 h-8" />}
                title="3. Export & Use"
                description="Download all your brand assets in a neatly organized ZIP file."
            />
        </div>
    );
};

export default WorkflowDiagram;
