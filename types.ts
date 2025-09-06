export type AssetType = 'logo' | 'palette' | 'typography' | 'poster' | 'banner' | 'social_ad' | 'instagram_story' | 'twitter_post';

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

export interface BrandAsset {
  id: string;
  type: AssetType;
  prompt: string;
  // imageUrl?: string; // Removed to prevent localStorage quota issues
  palette?: ColorPalette;
  typography?: TypographyPairing;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  description: string;
  assets: BrandAsset[];
  createdAt: string;
}

export interface GeneratedImagePart {
    mimeType: string;
    data: string;
}

export type GeneratedPart = { text: string } | { inlineData: GeneratedImagePart };