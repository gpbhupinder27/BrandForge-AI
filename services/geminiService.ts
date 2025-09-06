import { GoogleGenAI, Modality, Type } from "@google/genai";
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

        const response = await ai.models.generateContent({
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const jsonString = response.text.trim();
        const cleanedJsonString = jsonString.replace(/^```json\s*|```$/g, '');
        return JSON.parse(cleanedJsonString) as T;

    } catch (error) {
        console.error("Error calling Gemini API for structured content:", error);
        throw new Error("Failed to generate structured content with Gemini API.");
    }
}