interface FalImageToVideoParams {
    apiKey: string;
    imageUrl: string; // data URL
    prompt: string;
    aspectRatio?: 'auto' | '16:9' | '1:1' | '9:16';
}

interface FalImageToVideoResponse {
    video: {
        url: string;
        content_type: string;
        width: number;
        height: number;
    };
}

export const generateVideoFromImage = async ({
    apiKey,
    imageUrl,
    prompt,
    aspectRatio = '16:9'
}: FalImageToVideoParams): Promise<FalImageToVideoResponse> => {
    
    if (!apiKey) {
        throw new Error("Fal.ai API key is not provided.");
    }
    
    const API_URL = 'https://fal.run/fal-ai/wan/v2.2-a14b/image-to-video/turbo';
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_url: imageUrl,
                prompt: prompt,
                aspect_ratio: aspectRatio,
                seed: Math.floor(Math.random() * 100000),
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Fal.ai API Error:", errorBody);
            throw new Error(`Fal.ai API error (${response.status}): ${errorBody.detail || 'Unknown error'}`);
        }

        return await response.json() as FalImageToVideoResponse;

    } catch (error) {
        console.error("Error calling Fal.ai API:", error);
        throw new Error("Failed to generate video with Fal.ai API.");
    }
};