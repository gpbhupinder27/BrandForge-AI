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

interface HomepageProps {
  onGetStarted: () => void;
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description:string }) => (
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
    <div className="animate-fade-in bg-slate-50 dark:bg-slate-900">
      {/* Hero Section */}
      <section className="relative text-center pt-24 pb-28 sm:pt-32 sm:pb-36 overflow-hidden">
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
      
      {/* Features Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
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
                    icon={<ImageIcon className="w-6 h-6" />}
                    title="Thumbnail Studio"
                    description="Design professional YouTube thumbnails with specialized tools, templates, and fine-tuned controls for maximum engagement."
                />
                <FeatureCard 
                    icon={<VideoIcon className="w-6 h-6" />}
                    title="Video Ad Studio"
                    description="Transform static images into dynamic, engaging video ads. Generate scenes and bring your campaigns to life with motion."
                />
            </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">A Simple, Powerful Workflow</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400">Go from idea to launch-ready brand in four easy steps.</p>
            </div>
            <WorkflowDiagram />
        </div>
      </section>

      {/* Video Ad Studio Showcase */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 mb-4">
                    <SparklesIcon className="w-4 h-4 mr-1.5" /> New Feature
                </span>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">From Static to Cinematic: Video Ad Studio</h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400">
                    Transform your ideas into captivating video ads. Generate a base image with AI, add your product, and watch it come to life with dynamic motion.
                </p>
                <ul className="mt-6 space-y-3 text-left">
                    <li className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                        <span><strong>AI Image Generation:</strong> Create the perfect scene for your ad from a simple text prompt.</span>
                    </li>
                     <li className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                        <span><strong>Conversational Editing:</strong> Fine-tune your generated image until it's exactly what you envisioned.</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                        <span><strong>Instant Video Conversion:</strong> Turn your static image into a professional video ad with one click.</span>
                    </li>
                </ul>
            </div>
            <div className="flex items-center justify-center p-8">
                <div className="flex items-center gap-4 md:gap-8">
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/50 transform transition-transform duration-500 hover:scale-105">
                        <ImageIcon className="w-20 h-20 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <ArrowRightIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/50 transform transition-transform duration-500 hover:scale-105">
                        <VideoIcon className="w-20 h-20 text-purple-500 dark:text-purple-400" />
                    </div>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;