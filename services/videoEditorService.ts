// Using @ts-ignore because ffmpeg is loaded from a script tag in index.html
// @ts-ignore 
const { createFFmpeg, fetchFile } = FFmpeg;
let ffmpeg: any; // FFMpeg instance

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
    onProgress: ProgressCallback;
}

export const renderVideo = async ({ clips, onProgress }: RenderVideoParams): Promise<string> => {
    if (!ffmpeg || !ffmpeg.isLoaded()) {
        onProgress({ ratio: 0, message: "Initializing FFmpeg..." });
        ffmpeg = createFFmpeg({
            log: true,
            progress: (p: { ratio: number, time: number}) => onProgress({ ...p, ratio: Math.min(1, p.ratio) }), // Cap ratio at 1
        });
        await ffmpeg.load();
        onProgress({ ratio: 0, message: "FFmpeg loaded." });
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
    
    // 1. Trim all clips first
    const trimFilters = clips.map((clip, i) => 
        `[${i}:v]trim=start=${clip.trimStart}:end=${clip.trimEnd},setpts=PTS-STARTPTS,scale=1280:720,setsar=1[v${i}]`
    ).join(';');
    
    const clipDurations = clips.map(c => c.trimEnd - c.trimStart);

    // 2. Chain them together with xfade
    let xfadeFilters = '';
    let lastOutputStream = 'v0';
    let accumulatedDuration = 0;

    if (clips.length > 1) {
        for (let i = 0; i < clips.length - 1; i++) {
            const currentClipDuration = clipDurations[i];
            const nextClip = clips[i + 1];
            
            // The transition is on the *second* clip of the pair
            const transition = nextClip.transition || { type: 'fade', duration: 0 }; 
            
            // Ensure transition isn't longer than either clip part
            const transitionDuration = Math.max(0, Math.min(transition.duration, currentClipDuration, clipDurations[i + 1]));

            const offset = accumulatedDuration + currentClipDuration - transitionDuration;
            const outputStream = `vout${i}`;
            
            xfadeFilters += `[${lastOutputStream}][v${i + 1}]xfade=transition=${transition.type}:duration=${transitionDuration}:offset=${offset}[${outputStream}];`;
            
            lastOutputStream = outputStream;
            accumulatedDuration += currentClipDuration - transitionDuration;
        }
    }

    const filterComplex = `${trimFilters}${xfadeFilters ? ';' + xfadeFilters : ''}`;
    const finalOutputMap = clips.length > 1 ? `[${lastOutputStream}]` : '[v0]';
    const outputFilename = 'output.mp4';

    onProgress({ ratio: 0, message: "Starting render..." });
    
    await ffmpeg.run(
        ...inputArgs,
        '-filter_complex',
        filterComplex,
        '-map',
        finalOutputMap,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        outputFilename
    );
    
    onProgress({ ratio: 1, message: "Render complete. Finalizing..." });
    const data = ffmpeg.FS('readFile', outputFilename);
    
    // Cleanup filesystem
    inputFiles.forEach(file => ffmpeg.FS('unlink', file));
    ffmpeg.FS('unlink', outputFilename);

    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(blob);
    });
};