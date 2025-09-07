// Fix: Removed incorrect import of 'GeneratedPart' to fix a circular dependency.
// The 'GeneratedPart' type is defined and exported from this file.

export type AssetType = 'logo' | 'palette' | 'typography' | 'poster' | 'banner' | 'social_ad' | 'instagram_story' | 'twitter_post' | 'youtube_thumbnail' | 'video_ad';

export interface ColorInfo {
  hex: string;
  name: string;
}

export interface ColorPalette {
  paletteName: string;
  description: string;
  colors: ColorInfo[];
}

export interface TypographyPairing {
  headlineFont: { name: string; description: string; };
  bodyFont: { name: string; description: string; };
}

export interface CustomTemplate {
  id: string;
  name: string;
  prompt: string;
}

export interface BrandAsset {
  id: string;
  type: AssetType;
  prompt: string;
  // imageUrl?: string; // Removed to prevent localStorage quota issues
  palette?: ColorPalette;
  typography?: TypographyPairing;
  createdAt: string;
  tags?: string[];
  parentId?: string; // ID of the original asset this is a variation of
  variantLabel?: string; // e.g., 'Variant A', 'B', etc.
  isPrimary?: boolean; // For selecting the main brand logo
  sourceVideoIds?: string[]; // For edited videos, the IDs of the source clips
  editedDetails?: string; // A description of the edits made
}

export interface Brand {
  id: string;
  name: string;
  description: string;
  assets: BrandAsset[];
  createdAt: string;
  customTemplates?: CustomTemplate[];
}

export interface GeneratedImagePart {
    mimeType: string;
    data: string;
}

export type GeneratedPart = { text: string } | { inlineData: GeneratedImagePart };