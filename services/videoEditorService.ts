// Using @ts-ignore because ffmpeg is loaded from a script tag in index.html
// @ts-ignore 
const { createFFmpeg, fetchFile } = FFmpeg;
let ffmpeg: any; // FFMpeg instance

import { Brand, TextOverlay } from '../types';

export type ClipTransition = {
    type: 'fade';
    duration: number;
};

type Clip = {
    id: string;
    assetId: string;
    sourceUrl: string;
    duration: number;
    trimStart: number;
    trimEnd: number;
    transition?: ClipTransition;
};

type ProgressCallback = (progress: { ratio: number; time?: number; message?: string }) => void;

interface RenderVideoParams {
    clips: Clip[];
    textOverlays: TextOverlay[];
    brand: Brand;
    onProgress: ProgressCallback;
}

const loadFont = async (fontName: string): Promise<string> => {
    const fontFileName = `${fontName.replace(/\s/g, '_')}.ttf`;
    try {
        // Check if font is already in virtual filesystem
        ffmpeg.FS('readFile', fontFileName);
        return fontFileName;
    } catch (e) {
        // Not loaded, so fetch it
    }

    try {
        const googleFontCssUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700`;
        const cssResponse = await fetch(googleFontCssUrl, {
            headers: {
                // Google Fonts serves different font formats based on User-Agent.
                // We pretend to be a standard browser to get WOFF2 or TTF.
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            }
        });

        if (!cssResponse.ok) {
            throw new Error(`Failed to fetch Google Font CSS for ${fontName}. Status: ${cssResponse.status}`);
        }
        const cssText = await cssResponse.text();
        
        // Regex to find WOFF2 or TTF URLs
        const fontUrlMatch = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/s\/[^\)]+\.(?:ttf|woff2))\)/);
        if (!fontUrlMatch || !fontUrlMatch[1]) {
            console.warn(`Could not find a .ttf or .woff2 font file for ${fontName}. The styling might be incorrect.`);
            // As a fallback, we won't load a font and ffmpeg will use its default.
            return '';
        }
        const fontUrl = fontUrlMatch[1];
        
        const fontFileResponse = await fetch(fontUrl);
        if (!fontFileResponse.ok) {
            throw new Error(`Failed to fetch font file from ${fontUrl}. Status: ${fontFileResponse.status}`);
        }
        const fontFileData = await fontFileResponse.arrayBuffer();

        ffmpeg.FS('writeFile', fontFileName, new Uint8Array(fontFileData));
        return fontFileName;
    } catch (error) {
        console.error(`Error loading font ${fontName}:`, error);
        // Return empty string to let ffmpeg use its default font
        return '';
    }
};

export const renderVideo = async ({ clips, textOverlays, brand, onProgress }: RenderVideoParams): Promise<string> => {
    if (!ffmpeg || !ffmpeg.isLoaded()) {
        onProgress({ ratio: 0, message: "Initializing FFmpeg..." });
        ffmpeg = createFFmpeg({
            log: true,
            progress: (p: { ratio: number, time: number}) => onProgress({ ...p, ratio: Math.min(1, p.ratio), message: "Rendering..." }),
        });
        await ffmpeg.load();
    }
    onProgress({ ratio: 0, message: "FFmpeg loaded." });

    // Load all necessary fonts
    onProgress({ ratio: 0, message: "Loading fonts..." });
    const typography = brand.assets.find(a => a.type === 'typography')?.typography;
    const fontFiles: Record<string, string> = {};
    const fontFamilies = [...new Set(textOverlays.map(t => t.fontFamily))];
    if (typography) {
        fontFamilies.push(typography.headlineFont.name);
        fontFamilies.push(typography.bodyFont.name);
    }
    for (const font of [...new Set(fontFamilies)]) {
        fontFiles[font] = await loadFont(font);
    }
    
    onProgress({ ratio: 0, message: "Loading video files..." });
    const inputFiles: string[] = [];
    for (const [index, clip] of clips.entries()) {
        const fileName = `input_${index}.mp4`;
        inputFiles.push(fileName);
        ffmpeg.FS('writeFile', fileName, await fetchFile(clip.sourceUrl));
    }
    const inputArgs = inputFiles.flatMap(file => ['-i', file]);

    onProgress({ ratio: 0, message: "Building processing command..." });
    
    let complexFilter = clips.map((clip, i) => 
        `[${i}:v]trim=start=${clip.trimStart}:end=${clip.trimEnd},setpts=PTS-STARTPTS,scale=1280:720,setsar=1[v${i}]`
    ).join(';');
    
    const finalVideo = clips.map((_, i) => `[v${i}]`).join('');
    complexFilter += `${finalVideo}concat=n=${clips.length}:v=1[concatted];`;
    
    let lastStream = 'concatted';
    textOverlays.forEach((overlay, i) => {
        const fontFileName = fontFiles[overlay.fontFamily];
        const fontArg = fontFileName ? `fontfile=${fontFileName}:` : '';
        // Sanitize text for ffmpeg
        const sanitizedText = overlay.text.replace(/'/g, "'\\''").replace(/:/g, '\\:');
        
        const nextStream = `text${i}`;
        complexFilter += `[${lastStream}]drawtext=${fontArg}text='${sanitizedText}':fontsize=(h*${overlay.fontSize/100}):fontcolor=${overlay.color}:x=(w*${overlay.position.x/100}):y=(h*${overlay.position.y/100}):enable='between(t,${overlay.startTime},${overlay.endTime})'[${nextStream}];`;
        lastStream = nextStream;
    });

    const outputFilename = 'output.mp4';
    
    await ffmpeg.run(
        ...inputArgs,
        '-filter_complex',
        complexFilter,
        '-map',
        `[${lastStream}]`,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        outputFilename
    );
    
    onProgress({ ratio: 1, message: "Render complete. Finalizing..." });
    const data = ffmpeg.FS('readFile', outputFilename);
    
    inputFiles.forEach(file => ffmpeg.FS('unlink', file));
    ffmpeg.FS('unlink', outputFilename);
    Object.values(fontFiles).forEach(file => {
        if(file) ffmpeg.FS('unlink', file);
    });

    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
