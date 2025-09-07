import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { GeneratedPart, ColorPalette } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Please set your API key for the app to function.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

interface ImageInput {
    data: string; // base64 string
    mimeType: string;
}

// Pre-defined base64 encoded strings for blank white PNGs of various aspect ratios.
const BLANK_IMAGES = {
    '1:1': 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAQAAAAnOwcEAAAADklEQVR42mNkAANGCAUAACMAA2w/AMgAAAAASUVORK5CYII=',
    '16:9': 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAJCAQAAACRI2S5AAAADklEQVR42mNkAAJGCAUAACMAA2w/AMgAAAAASUVORK5CYII=',
    '9:16': 'iVBORw0KGgoAAAANSUhEUgAAAAkAAAAQCAQAAABuQZ3IAAAADklEQVR42mNkAAJGCAUAACMAA2w/AMgAAAAASUVORK5CYII=',
    '4:3': 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAQAAAAe/YwQAAAADklEQVR42mNkAAJGCAUAACMAA2w/AMgAAAAASUVORK5CYII=',
    '3:4': 'iVBORw0KGgoAAAANSUhEUgAAAAMAAAAECAQAAAD//+iTAAAADklEQVR42mNkAAJGCAUAACMAA2w/AMgAAAAASUVORK5CYII=',
    // Aspect ratio for 1200x628 banners
    '1.91:1': 'iVBORw0KGgoAAAANSUhEUgAAAL8AAABkCAQAAACrs348AAAAF0lEQVR42mNkwA4w+I9WPywYgB82AwD3yQYg2e2E4gAAAABJRU5ErkJggg==',
};

/**
 * Finds the closest matching pre-defined blank image for a given width and height.
 * @param width The target width.
 * @param height The target height.
 * @returns An ImageInput object with base64 data, or null if no match is found.
 */
const getBlankImageForAspectRatio = (width: number, height: number): ImageInput | null => {
    const ratio = width / height;
    let closestRatioKey: keyof typeof BLANK_IMAGES | null = null;
    
    // Using a small tolerance for float comparison
    if (Math.abs(ratio - 1) < 0.01) closestRatioKey = '1:1';
    else if (Math.abs(ratio - 16 / 9) < 0.01) closestRatioKey = '16:9';
    else if (Math.abs(ratio - 9 / 16) < 0.01) closestRatioKey = '9:16';
    else if (Math.abs(ratio - 4 / 3) < 0.01) closestRatioKey = '4:3';
    else if (Math.abs(ratio - 3 / 4) < 0.01) closestRatioKey = '3:4';
    else if (Math.abs(ratio - 1.91) < 0.02) closestRatioKey = '1.91:1';

    if (closestRatioKey) {
        return {
            data: BLANK_IMAGES[closestRatioKey],
            mimeType: 'image/png',
        };
    }

    console.warn(`No pre-defined blank image for aspect ratio ~${ratio.toFixed(2)} (${width}x${height}).`);
    return null;
};


export const generateWithNanoBanana = async (prompt: string, images: ImageInput[], width?: number, height?: number): Promise<GeneratedPart[]> => {
    try {
        let allImages = [...images];
        if (width && height) {
            const blankImage = getBlankImageForAspectRatio(width, height);
            if (blankImage) {
                // Append the blank image as the last image. The model will adopt the aspect ratio
                // of the last image provided in the prompt.
                allImages.push(blankImage);
            }
        }

        const imageParts = allImages.map(img => ({
            inlineData: {
                data: img.data,
                mimeType: img.mimeType
            }
        }));

        const textPart = { text: prompt };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [...imageParts, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        if (response.candidates && response.candidates.length > 0) {
            return response.candidates[0].content.parts as GeneratedPart[];
        }
        return [];

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate content with Gemini API.");
    }
};

export const generateStructuredContent = async <T>(prompt: string, schema: any): Promise<T> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        // Fix: Access response.text directly
        const jsonString = response.text.trim();
        const cleanedJsonString = jsonString.replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonString) as T;

    } catch (error) {
        console.error("Error calling Gemini API for structured content:", error);
        throw new Error("Failed to generate structured content with Gemini API.");
    }
}

export const generateTagsForCreative = async (creativePrompt: string): Promise<string[]> => {
    const tagGenerationPrompt = `Analyze the following marketing prompt for a creative asset and generate a list of up to 5 relevant keyword tags for categorization. Tags should be single words or short two-word phrases. Focus on themes, product types, promotions, and seasons mentioned or implied in the prompt. Do not include generic tags like "advertisement" or "social media".

Marketing Prompt: "${creativePrompt}"

Return the tags as a JSON array of strings. For example: ["sale", "new product", "summer collection"]`;
    
    try {
        const schema = {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        };
        const result = await generateStructuredContent<string[]>(tagGenerationPrompt, schema);
        // Filter out any empty or null tags that might be returned
        return result?.filter(tag => tag && tag.trim() !== '') || [];
    } catch (error) {
        console.error("Error generating tags:", error);
        // Return empty array on failure so it doesn't block asset creation
        return [];
    }
};

export const describeImage = async (imageBase64: string, mimeType: string): Promise<string> => {
    try {
        const imagePart = { inlineData: { data: imageBase64, mimeType } };
        const textPart = { text: "Briefly describe this image for a marketing copywriter. Focus on the main subject, style, and mood. This description will be used to generate creative ad copy." };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        // Fix: Access response.text directly
        return response.text;
    } catch (error) {
        console.error("Error describing image with Gemini API:", error);
        // Return an empty string on failure so it doesn't block the suggestion flow
        return ""; 
    }
};

export const generatePromptSuggestions = async (
    creativeTypeLabel: string, 
    brandDescription: string, 
    imageDescription?: string,
    palette?: ColorPalette | null
): Promise<{ goal: string; prompt: string; overlayText?: string; }[]> => {
    
    const imageContext = imageDescription 
        ? `The creative will incorporate an image described as: "${imageDescription}". The prompt should leverage this image.` 
        : "The creative will be generated from scratch based on the prompt.";

    const paletteContext = palette
        ? `The brand's color palette is described as "${palette.description}" and includes colors like ${palette.colors.map(c => `${c.name} (${c.hex})`).join(', ')}. This visual identity is crucial.`
        : 'No specific color palette is defined.';

    let prompt: string;
    let schema: any;

    if (creativeTypeLabel === "YouTube Thumbnail") {
        prompt = `
            You are an expert marketing and branding strategist for YouTube. Your task is to generate 3 distinct and compelling ideas for a "YouTube Thumbnail". Each idea will include an image prompt, a text overlay, and a marketing goal.

            **CRITICAL BRAND GUIDELINES (Adhere Strictly):**
            1.  **Brand Essence:** The brand is described as: "${brandDescription}". Every idea must reflect this core identity.
            2.  **Visual Mood & Colors:** ${paletteContext} The image prompts **must** suggest imagery, styles, and moods that are perfectly aligned with this color palette.

            **Creative Context:**
            ${imageContext}

            **Your Task:**
            Generate a list of 3 creative ideas. Each idea must:
            - Align with a different marketing goal (e.g., announcing a new video, teasing content, driving clicks).
            - Be directly inspired by the Brand Essence and Visual Mood.
            - Include a concise, powerful, ready-to-use **image prompt** for an AI image generator.
            - Include a short, punchy **overlay text** (4-6 words maximum) that is highly clickable and complements the image prompt.

            Return the suggestions as a JSON array of objects, where each object has a "goal", a "prompt", and an "overlayText".
        `;
        schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    goal: { type: Type.STRING, description: "The marketing goal for the video." },
                    prompt: { type: Type.STRING, description: "The prompt for the AI to generate the thumbnail's base image." },
                    overlayText: { type: Type.STRING, description: "A short, punchy text for the thumbnail overlay (4-6 words max)." }
                },
                required: ["goal", "prompt", "overlayText"]
            }
        };
    } else {
        prompt = `
            You are an expert marketing and branding strategist. Your task is to generate 3 distinct and compelling prompt ideas for a "${creativeTypeLabel}". These prompts will be fed into an AI image generator.

            **CRITICAL BRAND GUIDELINES (Adhere Strictly):**
            1.  **Brand Essence:** The brand is described as: "${brandDescription}". Every prompt must reflect this core identity.
            2.  **Visual Mood & Colors:** ${paletteContext} The prompts **must** suggest imagery, styles, and moods that are perfectly aligned with this color palette. For instance, if the palette is 'Coastal Sunset', prompts should suggest things like 'warm orange glow', 'serene beach at dusk', 'soft purple clouds'.

            **Creative Context:**
            ${imageContext}

            **Your Task:**
            Generate a list of 3 creative prompt ideas. Each idea must:
            - Align with a different marketing goal (e.g., announcing a sale, launching a new product, building community engagement).
            - Be directly inspired by the Brand Essence and Visual Mood described above.
            - Be a concise, powerful, and ready-to-use prompt for an AI image generator.

            Return the suggestions as a JSON array of objects, where each object has a "goal" and a "prompt".
        `;
        schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    goal: { type: Type.STRING, description: "The marketing goal, e.g., 'Promote a Sale'" },
                    prompt: { type: Type.STRING, description: "The suggested prompt for the user." }
                },
                required: ["goal", "prompt"]
            }
        };
    }

    try {
        const result = await generateStructuredContent<{ goal: string; prompt: string; overlayText?: string; }[]>(prompt, schema);
        return result || [];

    } catch (error) {
        console.error("Error generating prompt suggestions:", error);
        return [];
    }
};

export const generateThumbnailElementSuggestions = async (
    style: string,
    emotion: string,
    overlayText: string,
    baseImagePrompt: string,
    imageDescription: string,
    brandDescription: string,
    palette: ColorPalette | null
): Promise<string[]> => {
    
    const paletteContext = palette
        ? `The brand's color palette is described as "${palette.description}" and includes colors like ${palette.colors.map(c => `${c.name} (${c.hex})`).join(', ')}. This is a key part of their visual identity.`
        : 'No specific color palette is defined.';

    const prompt = `
        You are an expert YouTube thumbnail designer and branding consultant. Your task is to suggest 3-5 high-impact graphical elements to add to a thumbnail's base image prompt.

        **CRITICAL BRAND GUIDELINES (Adhere Strictly):**
        1.  **Brand Essence:** The brand is described as: "${brandDescription}". All suggestions must be appropriate for this brand.
        2.  **Visual Mood & Colors:** ${paletteContext} The suggested elements **must** complement and enhance this specific visual mood and color scheme. For example, for a 'calm, natural' palette, suggest 'soft light leaks' or 'subtle dust motes', not 'neon explosions'.

        **Thumbnail Context:**
        - Style: "${style}"
        - Emotion to Convey: "${emotion}"
        - Overlay Text: "${overlayText || 'Not specified'}"
        - Base Image Concept: "${baseImagePrompt || imageDescription || 'Not specified'}"

        **Your Task:**
        Based on the **full brand and thumbnail context**, suggest 3-5 simple, clickable graphical elements. These suggestions will be added to the AI image generation prompt. They should be short, descriptive strings.

        - **Good examples for a 'tech' brand:** 'glowing circuit board lines', 'a holographic data overlay', 'subtle lens flare'.
        - **Bad examples for a 'tech' brand:** 'hand-drawn doodles', 'rustic wood texture'.

        Return the suggestions as a JSON array of strings.
    `;
    try {
        const schema = {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        };
        const result = await generateStructuredContent<string[]>(prompt, schema);
        return result || [];
    } catch (error) {
        console.error("Error generating thumbnail element suggestions:", error);
        return [];
    }
};

export const generateThumbnailTextSuggestions = async (
    brandDescription: string,
    templateName: string,
    baseImageConcept: string,
    palette: ColorPalette | null
): Promise<string[]> => {
    const paletteContext = palette
        ? `The brand's color palette is described as "${palette.description}". The visual identity is crucial.`
        : 'No specific color palette is defined.';

    const prompt = `
        You are an expert copywriter for YouTube thumbnails, specializing in viral, high-click-through-rate titles.

        **CRITICAL BRAND GUIDELINES (Adhere Strictly):**
        1.  **Brand Essence:** The brand is described as: "${brandDescription}". All text suggestions must align with this brand's tone and voice.
        2.  **Visual Mood:** ${paletteContext}

        **Thumbnail Context:**
        - Template / Theme: "${templateName}"
        - Video Concept: "${baseImageConcept}"

        **Your Task:**
        Generate 3 short, punchy text overlays for the YouTube thumbnail. Each suggestion must:
        - Be EXTREMELY concise (4-6 words maximum).
        - Be tailored to the brand's identity and the specific video concept.
        - Fit the theme of the selected template ('${templateName}').
        - Create curiosity or a strong emotional reaction.

        **Example:** For a tech brand, a 'New Product' template, and a video about a new phone, good suggestions would be: "The Phone That Changes EVERYTHING", "Is THIS The New #1?", "DON'T BUY A PHONE Until You See This!".

        Return the suggestions as a JSON array of strings.
    `;
    try {
        const schema = {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        };
        const result = await generateStructuredContent<string[]>(prompt, schema);
        return result || [];
    } catch (error) {
        console.error("Error generating thumbnail text suggestions:", error);
        return [];
    }
};