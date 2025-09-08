import React from 'react';
import PlusIcon from './icons/PlusIcon';
import WorkflowDiagram from './WorkflowDiagram';
import PaletteIcon from './icons/PaletteIcon';
import SparklesIcon from './icons/SparklesIcon';
import VideoIcon from './icons/VideoIcon';
import WandIcon from './icons/WandIcon';
import ImageIcon from './icons/ImageIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import InteractiveVideoShowcase from './InteractiveVideoShowcase';

interface HomepageProps {
  onGetStarted: () => void;
}

const BenefitCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="text-center p-6 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-lg">
        <div className="flex items-center justify-center w-12 h-12 mb-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-500 dark:text-indigo-400 mx-auto">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
    </div>
);


const Homepage: React.FC<HomepageProps> = ({ onGetStarted }) => {
  return (
    <div className="animate-fade-in bg-slate-50 dark:bg-slate-900">
      {/* Hero Section */}
      <section className="relative text-center pt-24 pb-12 sm:pt-32 sm:pb-16 overflow-hidden">
        <div 
            className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/25 [mask-image:linear-gradient(to_bottom,white_50%,transparent_100%)]" 
            aria-hidden="true"
        ></div>
        <div className="relative max-w-4xl mx-auto px-4 z-10">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Build Your Brand in Minutes, <span className="text-indigo-500 dark:text-indigo-400">Not Weeks</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Your all-in-one AI studio to generate a complete brand identity. Go from logos and color palettes to social media campaigns and dynamic video ads, all in minutes.
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
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">A Simple, Powerful Workflow</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400">Go from idea to launch-ready brand in four easy steps.</p>
            </div>
            <WorkflowDiagram />
        </div>
      </section>
      {/* Why BrandForge AI? Section */}
      <section className="py-20 bg-slate-100/50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">The All-in-One Creative Studio</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">BrandForge AI provides a full suite of integrated tools, taking your vision from concept to a complete, launch-ready brand with unprecedented speed and consistency.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <BenefitCard 
                    icon={<PaletteIcon className="w-6 h-6" />}
                    title="Instant Brand Identity"
                    description="Generate foundational assets like logos, color palettes, and font pairings to define your brand's unique look and feel in seconds."
                />
                <BenefitCard 
                    icon={<SparklesIcon className="w-6 h-6" />}
                    title="Effortless Campaigns"
                    description="Produce stunning marketing materials, from social media posts to web banners, all perfectly aligned with your core brand identity."
                />
                <BenefitCard 
                    icon={<WandIcon className="w-6 h-6" />}
                    title="Advanced Creative Tools"
                    description="Leverage specialized studios for YouTube thumbnails and video ads, with fine-tuned controls and timeline-based editing."
                />
                <BenefitCard 
                    icon={<CheckCircleIcon className="w-6 h-6" />}
                    title="Total Brand Consistency"
                    description="Ensure every asset is cohesive with a centralized library and AI that understands and applies your brand's unique style."
                />
            </div>
        </div>
      </section>
      {/* Video Ad Studio Showcase */}
      <section className="py-20 bg-slate-100/50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4">
             <div className="text-center mb-16">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 mb-4">
                    <VideoIcon className="w-4 h-4 mr-1.5" /> Next-Gen Capabilities
                </span>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">From Static to Cinematic: Video Ad Studio</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Transform your ideas into captivating video ads. Generate a base image with AI, add your product, and watch it come to life with dynamic motion, all powered by our integrated creative suite.
                </p>
            </div>
            <InteractiveVideoShowcase />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-2xl mx-auto text-center px-4">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Ready to Forge Your Brand?</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Join hundreds of creators and businesses building their brands faster than ever before. Start for free today.</p>
             <button
                onClick={onGetStarted}
                className="mt-8 flex items-center gap-2 mx-auto px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors shadow-lg text-lg transform hover:scale-105"
            >
                <SparklesIcon className="w-6 h-6" />
                Start Building Now
            </button>
          </div>
      </section>
    </div>
  );
};

export default Homepage;