# BrandForge AI
✨ Your All-in-One AI-Powered Branding and Creative Studio ✨

BrandForge AI is a comprehensive web application designed to streamline the entire brand creation process. It leverages the power of generative AI to take you from a simple idea to a full suite of launch-ready marketing assets—including logos, color palettes, social media campaigns, and video ads—in a matter of minutes.

![BrandForge AI Showcase](https://storage.googleapis.com/aistudio-o-images/project_showcase/brandforge_showcase.gif)

---

## 🚀 Core Features

- **🤖 AI-Powered Identity Studio**:
  - **Logo Generation**: Create unique, professional logos from text prompts, templates, or reference images.
  - **Color Palettes**: Instantly generate harmonious color palettes that match your brand's description.
  - **Typography Pairings**: Discover professional headline and body font pairings from Google Fonts.

- **🎨 Creative Lab**:
  - **Multi-Format Assets**: Produce banners, posters, and social media ads from simple text prompts.
  - **Campaign Generation**: Create a cohesive set of creatives for different platforms with a single click.
  - **Brand Consistency**: Automatically applies your brand's logo and color palette to all generated assets.

- **🎬 YouTube Thumbnail Studio**:
  - **Specialized Tools**: A dedicated workspace with fine-tuned controls for style, emotion, text overlays, and graphical elements to maximize CTR.
  - **Template-Driven**: Start with templates designed for various YouTube genres like gaming, tech, lifestyle, and business.
  - **Conversational Editing**: Refine any generated thumbnail by simply describing the changes you want.

- **🎥 Video Ad Studio**:
  - **Image-to-Video Generator**: Transform static images into dynamic, engaging video ads using the Fal.ai API.
  - **Timeline-Based Editor**: Combine multiple video clips, add text overlays, trim footage, and render professional-quality videos directly in your browser with an `ffmpeg.wasm`-powered engine.

- **📚 Centralized Asset Library**:
  - **Unified Hub**: View, filter, and sort all your generated assets for every brand in one place.
  - **Detailed View**: Inspect asset prompts, manage tags, and generate A/B test variants.
  - **One-Click Export**: Download your entire brand kit, including logos, creatives, and brand guidelines, as a structured ZIP file.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI & Machine Learning**:
  - **Google Gemini API (`@google/genai`)**: For all text, image, and structured JSON generation. The `gemini-2.5-flash-image-preview` model powers the conversational image editing features.
  - **Fal.ai API**: Used in the Video Generator for high-quality image-to-video conversion.
- **In-Browser Video Processing**:
  - **`ffmpeg.wasm`**: Powers the client-side video editor, enabling timeline-based editing, overlay rendering, and exporting without a server.
- **Client-Side Storage**:
  - **IndexedDB**: For robust, persistent storage of large binary assets like images and videos, overcoming the limitations of `localStorage`.
- **Utilities**:
  - **JSZip**: For creating and downloading the brand asset ZIP archives.

---

## ⚙️ Getting Started

To run this project locally, follow these steps:

### 1. Prerequisites
- Node.js and npm (or your preferred package manager).
- API keys for Google AI and Fal.ai.

### 2. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/your-username/brandforge-ai.git
cd brandforge-ai
npm install
```

### 3. API Key Configuration

The application requires two API keys to function correctly:

- **Google Gemini API Key**:
  This key is required for all core AI generation features. The application is designed to source this key from a `process.env.API_KEY` environment variable. You will need to set this up in your deployment environment or local development server.

- **Fal.ai API Key**:
  This key is specifically for the image-to-video generation feature in the "Video Ad Studio".
  1. Navigate to the **Video Ad Studio** within the application.
  2. Enter your Fal.ai API key (e.g., `falkey_...`) into the configuration input field.
  3. Click "Save". The key will be stored securely in your browser's `localStorage` for future use.

### 4. Running the Application
Start the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) (or your configured port) in your browser to view the application.

---

## 📄 License
This project is licensed under the MIT License. See the `LICENSE` file for details.
