import React, { useState, useMemo } from 'react';
import { Brand } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import SparklesIcon from './icons/SparklesIcon';
import ScissorsIcon from './icons/ScissorsIcon';
import VideoGenerator from './VideoGenerator';
import VideoEditor from './VideoEditor';

interface VideoAdStudioProps {
  brand: Brand;
  onUpdateBrand: (brand: Brand) => void;
  initialImageId?: string | null;
  onConversionHandled?: () => void;
}

type StudioTab = 'generator' | 'editor';

const VideoAdStudio: React.FC<VideoAdStudioProps> = ({ brand, onUpdateBrand, initialImageId, onConversionHandled }) => {
    const [activeTab, setActiveTab] = useState<StudioTab>('generator');
    const [falApiKey, setFalApiKey] = useLocalStorage('fal-api-key', '');
    const [apiKeyInput, setApiKeyInput] = useState('');

    const videoAssets = useMemo(() => brand.assets.filter(a => a.type === 'video_ad').sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [brand.assets]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-700/50">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Fal.ai API Configuration</h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Your API key is saved only in your browser's local storage and is not stored on our servers. It is used solely to make requests to Fal.ai on your behalf.</p>
                <div className="flex gap-2 items-center">
                    <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="Enter your Fal.ai API Key (e.g., falkey_...)" className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100 transition-shadow"/>
                    <button onClick={() => setFalApiKey(apiKeyInput)} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors">Save</button>
                </div>
                {falApiKey && <p className="text-xs text-green-600 dark:text-green-400 mt-2">API Key is set.</p>}
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-2">
                    <button
                        onClick={() => setActiveTab('generator')}
                        className={`py-3 px-4 font-semibold rounded-t-md transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'generator' ? 'text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 border-indigo-500 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                        <SparklesIcon className="w-5 h-5" />
                        Generator
                    </button>
                    <button
                        onClick={() => setActiveTab('editor')}
                        className={`py-3 px-4 font-semibold rounded-t-md transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'editor' ? 'text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 border-indigo-500 dark:border-indigo-400' : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                        <ScissorsIcon className="w-5 h-5" />
                        Editor
                    </button>
                </nav>
            </div>

            <div>
                {activeTab === 'generator' && (
                    <VideoGenerator 
                        brand={brand} 
                        onUpdateBrand={onUpdateBrand} 
                        falApiKey={falApiKey}
                        videoAssets={videoAssets}
                        initialImageId={initialImageId}
                        onConversionHandled={onConversionHandled}
                    />
                )}
                 {activeTab === 'editor' && (
                    <VideoEditor
                        brand={brand}
                        onUpdateBrand={onUpdateBrand}
                        videoAssets={videoAssets}
                    />
                )}
            </div>

        </div>
    );
};

export default VideoAdStudio;