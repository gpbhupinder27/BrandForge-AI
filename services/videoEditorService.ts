// Using @ts-ignore because ffmpeg is loaded from a script tag in index.html
// @ts-ignore 
const { createFFmpeg, fetchFile } = FFmpeg;
let ffmpeg: any; // FFMpeg instance

type Clip = {
    id: string;
    assetId: string;
    sourceUrl: string;
    duration: number;
    trimStart: number;
    trimEnd: number;
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
            progress: (p: { ratio: number, time: number}) => onProgress(p),
        });
        await ffmpeg.load();
        onProgress({ ratio: 0, message: "FFmpeg loaded." });
    }

    onProgress({ ratio: 0, message: "Loading video files..." });
    const inputArgs: string[] = [];
    for (const [index, clip] of clips.entries()) {
        const fileName = `input_${index}.mp4`;
        ffmpeg.FS('writeFile', fileName, await fetchFile(clip.sourceUrl));
        inputArgs.push('-i', fileName);
    }

    onProgress({ ratio: 0, message: "Building processing command..." });
    let filterComplex = '';
    clips.forEach((clip, i) => {
        const clipDuration = clip.trimEnd - clip.trimStart;
        filterComplex += `[${i}:v]trim=start=${clip.trimStart}:end=${clip.trimEnd},setpts=PTS-STARTPTS[v${i}];`;
    });

    const concatInputs = clips.map((_, i) => `[v${i}]`).join('');
    filterComplex += `${concatInputs}concat=n=${clips.length}:v=1:a=0[outv]`;
    
    const outputFilename = 'output.mp4';

    onProgress({ ratio: 0, message: "Starting render..." });
    await ffmpeg.run(
        ...inputArgs,
        '-filter_complex',
        filterComplex,
        '-map',
        '[outv]',
        '-c:v', 'libx264', // Use a standard codec
        '-preset', 'fast', // Optimize for speed
        '-pix_fmt', 'yuv420p', // Standard pixel format for compatibility
        outputFilename
    );

    onProgress({ ratio: 1, message: "Render complete. Finalizing..." });
    const data = ffmpeg.FS('readFile', outputFilename);
    
    // Cleanup filesystem
    clips.forEach((_, i) => ffmpeg.FS('unlink', `input_${i}.mp4`));
    ffmpeg.FS('unlink', outputFilename);

    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(blob);
    });
};
