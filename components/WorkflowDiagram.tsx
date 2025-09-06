import React from 'react';
import PaletteIcon from './icons/PaletteIcon';
import SparklesIcon from './icons/SparklesIcon';
import ExportIcon from './icons/ExportIcon';
import RectangleStackIcon from './icons/RectangleStackIcon';

const WorkflowDiagram = () => {
    const Step = ({ icon, title, description, stepNumber }: { icon: React.ReactNode, title: string, description: string, stepNumber: number }) => (
        <div className="flex flex-col items-center text-center max-w-xs mx-auto">
            <div className="relative mb-4">
                <div className="flex items-center justify-center w-20 h-20 bg-white dark:bg-slate-800 rounded-full text-indigo-500 dark:text-indigo-400 border-2 border-slate-200 dark:border-slate-700 shadow-lg">
                    {icon}
                </div>
                 <div className="absolute -top-2 -right-2 flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-indigo-600 rounded-full border-2 border-white dark:border-slate-800">
                    {stepNumber}
                </div>
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 h-12">{description}</p>
        </div>
    );

    const Connector = () => (
        <div className="flex-1 hidden md:flex items-center justify-center">
             <div className="w-full h-1 border-b-2 border-dashed border-slate-300 dark:border-slate-600"></div>
        </div>
    );

     const MobileConnector = () => (
        <div className="flex md:hidden items-center justify-center h-16">
             <div className="w-1 h-full border-l-2 border-dashed border-slate-300 dark:border-slate-600"></div>
        </div>
    );

    return (
        <div className="w-full flex flex-col md:flex-row items-center md:items-start justify-between gap-4 md:gap-0">
            <Step 
                icon={<RectangleStackIcon className="w-10 h-10" />}
                title="Create Workspace"
                description="Start by defining your brand's name and core mission."
                stepNumber={1}
            />
            <Connector />
            <MobileConnector />
            <Step 
                icon={<PaletteIcon className="w-10 h-10" />}
                title="Generate Identity"
                description="Instantly create logos, color palettes, and typography."
                stepNumber={2}
            />
            <Connector />
            <MobileConnector />
            <Step 
                icon={<SparklesIcon className="w-10 h-10" />}
                title="Craft Creatives"
                description="Produce social posts, banners, and ad campaigns in seconds."
                stepNumber={3}
            />
             <Connector />
             <MobileConnector />
            <Step 
                icon={<ExportIcon className="w-10 h-10" />}
                title="Export & Launch"
                description="Download all assets in a neatly organized ZIP file."
                stepNumber={4}
            />
        </div>
    );
};

export default WorkflowDiagram;