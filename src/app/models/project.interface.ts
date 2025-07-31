import { Section, SectionContent, SectionStyles, ResponsiveSettings, StyleOverrides, Breakpoint, DeviceStyles } from './section.interface';

// Core project management interfaces
export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  sections: Section[];
  globalStyles: GlobalStyles;
  settings: ProjectSettings;
  collaborators?: Collaborator[];
  version: number;
}

export interface GlobalStyles {
  typography: TypographySettings;
  colors: ColorSettings;
  spacing: SpacingSettings;
  effects: EffectSettings;
}

export interface ProjectSettings {
  responsive: ResponsiveSettings;
  seo: SEOSettings;
  performance: PerformanceSettings;
  integrations: Integration[];
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: CollaboratorRole;
  permissions: Permission[];
  joinedAt: Date;
  isActive: boolean;
}

// Supporting interfaces

export interface SEOSettings {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

export interface PerformanceSettings {
  lazyLoading: boolean;
  imageOptimization: boolean;
  codeMinification: boolean;
}

export interface Integration {
  id: string;
  type: IntegrationType;
  config: IntegrationConfig;
  isEnabled: boolean;
}

// Enums and types

export enum CollaboratorRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

export enum IntegrationType {
  ANALYTICS = 'analytics',
  FORM_HANDLER = 'form_handler',
  THIRD_PARTY_WIDGET = 'third_party_widget',
  API = 'api'
}

// Additional supporting interfaces
export interface TypographySettings {
  headingFont: string;
  bodyFont: string;
  fontSizes: FontSizeSettings;
  lineHeights: LineHeightSettings;
}

export interface ColorSettings {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
  surface: string;
}

export interface SpacingSettings {
  baseUnit: number;
  sectionPadding: string;
  elementMargin: string;
}

export interface EffectSettings {
  shadows: boolean;
  animations: boolean;
  transitions: boolean;
}



export interface Permission {
  action: string;
  resource: string;
  granted: boolean;
}

export interface IntegrationConfig {
  [key: string]: any;
}

export interface FontSizeSettings {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  h6: string;
  body: string;
  small: string;
}

export interface LineHeightSettings {
  heading: number;
  body: number;
}