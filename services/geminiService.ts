import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { GeneratedPart } from '../types';

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

const createBlankCanvas = (width: number, height: number): ImageInput => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
    }
    const dataUrl = canvas.toDataURL('image/png');
    return {
        data: dataUrl.split(',')[1],
        mimeType: 'image/png',
    };
};

export const generateWithNanoBanana = async (prompt: string, images: ImageInput[], width?: number, height?: number): Promise<GeneratedPart[]> => {
    try {
        let allImages = [...images];
        if (width && height) {
            const blankCanvas = createBlankCanvas(width, height);
            // Prepend the blank canvas so the model uses it as the base
            allImages.unshift(blankCanvas);
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
    imageDescription?: string
): Promise<{ goal: string; prompt: string; }[]> => {
    
    const imageContext = imageDescription 
        ? `The creative will incorporate an image described as: "${imageDescription}". The prompt should leverage this image.` 
        : "The creative will be generated from scratch based on the prompt.";

    const prompt = `
        You are an expert marketing strategist. A user is creating a "${creativeTypeLabel}" for a brand described as: "${brandDescription}". 
        ${imageContext}
        
        Generate a list of 3 distinct and compelling prompt ideas for the user. Each prompt should be tailored to a different marketing goal (e.g., a sale, a new product announcement, building brand engagement). The prompts should be concise, creative, and ready for an AI image generator.

        Return the suggestions as a JSON array of objects, where each object has a "goal" and a "prompt".
    `;

    try {
        const schema = {
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

        const result = await generateStructuredContent<{ goal: string; prompt: string; }[]>(prompt, schema);
        return result || [];

    } catch (error) {
        console.error("Error generating prompt suggestions:", error);
        return [];
    }
};