import React from 'react';
import PlusIcon from './icons/PlusIcon';
import WorkflowDiagram from './WorkflowDiagram';
import PaletteIcon from './icons/PaletteIcon';
import SparklesIcon from './icons/SparklesIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import BeakerIcon from './icons/BeakerIcon';

interface HomepageProps {
  onGetStarted: () => void;
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="group relative p-6 rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 bg-white/40 dark:bg-slate-800/40 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-2xl">
        <div 
            className="absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-80 transition-opacity duration-300" 
            aria-hidden="true"
        ></div>
        <div className="relative">
            <div className="flex items-center justify-center w-12 h-12 mb-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-500 dark:text-indigo-400 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110">
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
    </div>
);

const Homepage: React.FC<HomepageProps> = ({ onGetStarted }) => {
  return (
    <div className="animate-fade-in bg-white dark:bg-slate-900">
      {/* Hero Section */}
      <section className="relative text-center pt-24 pb-28 sm:pt-32 sm:pb-36 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] max-w-7xl max-h-7xl bg-[radial-gradient(ellipse_at_center,rgba(101,116,205,0.15),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.2),transparent_70%)]"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 z-10">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Build Your Brand in Minutes, <span className="text-indigo-500 dark:text-indigo-400">Not Weeks</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            BrandForge AI is your personal branding studio. Generate logos, color palettes, social media assets, and entire campaigns with the power of generative AI.
            </p>
            <button
            onClick={onGetStarted}
            className="mt-10 flex items-center gap-2 mx-auto px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors shadow-lg text-lg transform hover:scale-105"
            >
            <PlusIcon className="w-6 h-6" />
            Create Your First Brand
            </button>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">A Simple, Powerful Workflow</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400">Go from idea to launch-ready brand in four easy steps.</p>
            </div>
            <WorkflowDiagram />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Everything You Need to Build a Powerful Brand</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400">From initial identity to full-scale marketing campaigns, we've got you covered.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FeatureCard 
                    icon={<PaletteIcon className="w-6 h-6" />}
                    title="Identity Studio"
                    description="Generate foundational assets like logos, color palettes, and font pairings to define your brand's unique look and feel."
                />
                <FeatureCard 
                    icon={<SparklesIcon className="w-6 h-6" />}
                    title="Creative Lab"
                    description="Produce stunning marketing materials, from social media posts to web banners, perfectly aligned with your brand identity."
                />
                <FeatureCard 
                    icon={<ChatBubbleIcon className="w-6 h-6" />}
                    title="Conversational Editing"
                    description="Refine any generated asset with simple, conversational text prompts. Just ask for the changes you want to see."
                />
                <FeatureCard 
                    icon={<BeakerIcon className="w-6 h-6" />}
                    title="A/B Testing"
                    description="Instantly create variations of your logos and creatives to test which designs perform best with your audience."
                />
            </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;