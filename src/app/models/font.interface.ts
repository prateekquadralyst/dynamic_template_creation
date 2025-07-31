// Font management interfaces for the enhanced dynamic builder

export interface FontFamily {
  id: string;
  name: string;
  displayName: string;
  category: FontCategory;
  variants: FontVariant[];
  subsets: string[];
  source: FontSource;
  isCustom: boolean;
  files?: FontFiles;
  previewText?: string;
  popularity?: number;
  lastUsed?: Date;
}

export interface FontVariant {
  weight: FontWeight;
  style: FontStyle;
  url?: string;
}

export interface FontFiles {
  [variant: string]: string; // variant -> file URL/path
}

export interface FontPairing {
  id: string;
  name: string;
  description: string;
  headingFont: FontFamily;
  bodyFont: FontFamily;
  rating: number;
  category: string;
}

export interface GoogleFont {
  family: string;
  variants: string[];
  subsets: string[];
  category: string;
  files: { [variant: string]: string };
  popularity?: number;
}

export interface CustomFontUpload {
  name: string;
  files: File[];
  variants: FontVariant[];
}

export interface FontPreview {
  fontFamily: FontFamily;
  text: string;
  size: string;
  weight: FontWeight;
  style: FontStyle;
}

// Enums
export enum FontCategory {
  SERIF = 'serif',
  SANS_SERIF = 'sans-serif',
  DISPLAY = 'display',
  HANDWRITING = 'handwriting',
  MONOSPACE = 'monospace'
}

export enum FontSource {
  GOOGLE = 'google',
  CUSTOM = 'custom',
  SYSTEM = 'system'
}

export enum FontWeight {
  THIN = '100',
  EXTRA_LIGHT = '200',
  LIGHT = '300',
  REGULAR = '400',
  MEDIUM = '500',
  SEMI_BOLD = '600',
  BOLD = '700',
  EXTRA_BOLD = '800',
  BLACK = '900'
}

export enum FontStyle {
  NORMAL = 'normal',
  ITALIC = 'italic'
}

// Font management settings
export interface FontSettings {
  googleFontsApiKey?: string;
  maxCustomFonts: number;
  allowedFormats: string[];
  maxFileSize: number; // in bytes
  previewTexts: { [category: string]: string };
}

// Font loading and optimization
export interface FontLoadingOptions {
  display: FontDisplay;
  preload: boolean;
  fallback: string[];
}

export enum FontDisplay {
  AUTO = 'auto',
  BLOCK = 'block',
  SWAP = 'swap',
  FALLBACK = 'fallback',
  OPTIONAL = 'optional'
}