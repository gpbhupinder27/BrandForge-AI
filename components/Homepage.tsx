import React from 'react';
import PlusIcon from './icons/PlusIcon';
import WorkflowDiagram from './WorkflowDiagram';

interface HomepageProps {
  onGetStarted: () => void;
}

const Homepage: React.FC<HomepageProps> = ({ onGetStarted }) => {
  return (
    <div className="text-center p-4 sm:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Build Your Brand in Minutes, <span className="text-indigo-500 dark:text-indigo-400">Not Weeks</span>
        </h1>
        <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          BrandForge AI is your personal branding studio. Generate logos, color palettes, social media assets, and entire campaigns with the power of generative AI.
        </p>
        <button
          onClick={onGetStarted}
          className="mt-10 flex items-center gap-2 mx-auto px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors shadow-lg text-lg"
        >
          <PlusIcon className="w-6 h-6" />
          Create Your First Brand
        </button>
      </div>

      <div className="max-w-5xl mx-auto mt-20">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-8">How It Works</h2>
        <WorkflowDiagram />
      </div>
    </div>
  );
};

export default Homepage;
