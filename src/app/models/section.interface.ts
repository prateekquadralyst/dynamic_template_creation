// Enhanced section management interfaces and data structures

export interface Section {
  id: string;
  type: SectionType;
  templateId: string;
  content: SectionContent;
  styles: SectionStyles;
  order: number;
  isVisible: boolean;
  responsiveSettings: ResponsiveSettings;
  metadata: SectionMetadata;
}

export interface SectionMetadata {
  name?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isDuplicate?: boolean;
  originalId?: string;
  customizations: SectionCustomization[];
}

export interface SectionCustomization {
  property: string;
  value: any;
  appliedAt: Date;
}

export interface SectionContent {
  [key: string]: any; // Dynamic content based on section type
}

export interface SectionStyles {
  customCss?: string;
  overrides?: StyleOverrides;
  theme?: SectionTheme;
}

export interface SectionTheme {
  colorScheme: 'light' | 'dark' | 'auto';
  spacing: SpacingLevel;
  borderRadius: BorderRadiusLevel;
  shadow: ShadowLevel;
}

export interface StyleOverrides {
  [property: string]: string;
}

export interface ResponsiveSettings {
  breakpoints: Breakpoint[];
  deviceSpecificStyles: DeviceStyles;
  hideOnDevices?: DeviceType[];
}

export interface Breakpoint {
  name: string;
  minWidth: number;
  maxWidth?: number;
}

export interface DeviceStyles {
  mobile: StyleOverrides;
  tablet: StyleOverrides;
  desktop: StyleOverrides;
}

// Section ordering and positioning interfaces
export interface SectionPosition {
  sectionId: string;
  order: number;
  parentId?: string; // For nested sections in the future
}

export interface SectionOrderUpdate {
  sectionId: string;
  newOrder: number;
  oldOrder: number;
}

export interface SectionReorderOperation {
  type: ReorderOperationType;
  sectionId: string;
  targetPosition: number;
  sourcePosition: number;
}

// Section library and template definitions
export interface SectionLibraryItem {
  id: string;
  type: SectionType;
  name: string;
  description: string;
  category: SectionCategory;
  previewImage: string;
  templateId: string;
  isBuiltIn: boolean;
  tags: string[];
  difficulty: DifficultyLevel;
  estimatedSetupTime: number; // in minutes
}

export interface SectionTemplate {
  id: string;
  type: SectionType;
  name: string;
  html: string;
  css: string;
  defaultContent: SectionContent;
  variables: SectionVariable[];
  requiredAssets: string[];
  dependencies: string[];
}

export interface SectionVariable {
  name: string;
  type: VariableType;
  label: string;
  description?: string;
  defaultValue: any;
  required: boolean;
  validation?: ValidationRule[];
  group?: string; // For organizing variables in UI
}

export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message: string;
}

// Enums
export enum SectionType {
  // Core sections
  HERO = 'hero',
  FEATURES = 'features',
  TESTIMONIALS = 'testimonials',
  PRICING = 'pricing',
  CONTACT = 'contact',
  ABOUT = 'about',
  CTA = 'cta',
  
  // Additional sections for enhanced functionality
  GALLERY = 'gallery',
  TEAM = 'team',
  FAQ = 'faq',
  BLOG = 'blog',
  NEWSLETTER = 'newsletter',
  STATS = 'stats',
  TIMELINE = 'timeline',
  PORTFOLIO = 'portfolio',
  SERVICES = 'services',
  FOOTER = 'footer',
  HEADER = 'header',
  
  // Custom section type
  CUSTOM = 'custom'
}

export enum SectionCategory {
  HERO = 'hero',
  CONTENT = 'content',
  SOCIAL_PROOF = 'social_proof',
  CONVERSION = 'conversion',
  NAVIGATION = 'navigation',
  MEDIA = 'media',
  INFORMATION = 'information',
  CUSTOM = 'custom'
}

export enum ReorderOperationType {
  MOVE_UP = 'move_up',
  MOVE_DOWN = 'move_down',
  MOVE_TO_POSITION = 'move_to_position',
  DRAG_DROP = 'drag_drop'
}

export enum SpacingLevel {
  NONE = 'none',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large'
}

export enum BorderRadiusLevel {
  NONE = 'none',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FULL = 'full'
}

export enum ShadowLevel {
  NONE = 'none',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large'
}

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum VariableType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  COLOR = 'color',
  IMAGE = 'image',
  SELECT = 'select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  ARRAY = 'array',
  OBJECT = 'object',
  URL = 'url',
  EMAIL = 'email'
}

export enum ValidationType {
  REQUIRED = 'required',
  MIN_LENGTH = 'minLength',
  MAX_LENGTH = 'maxLength',
  MIN_VALUE = 'minValue',
  MAX_VALUE = 'maxValue',
  PATTERN = 'pattern',
  EMAIL = 'email',
  URL = 'url'
}

// Section management utility types
export type SectionFilter = {
  type?: SectionType[];
  category?: SectionCategory[];
  isVisible?: boolean;
  tags?: string[];
};

export type SectionSortBy = 'order' | 'name' | 'type' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';