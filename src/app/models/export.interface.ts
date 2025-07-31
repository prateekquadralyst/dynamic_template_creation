// Export system interfaces
export interface ExportOptions {
  format: ExportFormat;
  includeAssets: boolean;
  optimizeCode: boolean;
  minifyOutput: boolean;
  generateSourceMaps: boolean;
  customizations: ExportCustomizations;
}

export interface ExportCustomizations {
  htmlOptions: HtmlExportOptions;
  cssOptions: CssExportOptions;
  jsOptions?: JsExportOptions;
  reactOptions?: ReactExportOptions;
}

export interface HtmlExportOptions {
  doctype: string;
  lang: string;
  charset: string;
  viewport: string;
  includeComments: boolean;
  semanticMarkup: boolean;
  accessibilityFeatures: boolean;
}

export interface CssExportOptions {
  framework: CssFramework;
  customProperties: boolean;
  browserPrefixes: boolean;
  mediaQueries: boolean;
  resetStyles: boolean;
}

export interface JsExportOptions {
  includeInteractivity: boolean;
  framework?: JsFramework;
  moduleFormat: ModuleFormat;
  bundling: boolean;
}

export interface ReactExportOptions {
  typescript: boolean;
  styledComponents: boolean;
  cssModules: boolean;
  propsInterface: boolean;
  hooks: boolean;
  componentStructure: ComponentStructure;
}

export interface ExportResult {
  id: string;
  format: ExportFormat;
  files: ExportFile[];
  assets: ExportAsset[];
  metadata: ExportMetadata;
  downloadUrl?: string;
  previewUrl?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ExportFile {
  name: string;
  path: string;
  content: string;
  type: FileType;
  size: number;
}

export interface ExportAsset {
  originalId: string;
  name: string;
  path: string;
  url: string;
  type: string;
  size: number;
}

export interface ExportMetadata {
  projectId: string;
  projectName: string;
  exportedBy: string;
  exportedAt: Date;
  version: string;
  options: ExportOptions;
  stats: ExportStats;
}

export interface ExportStats {
  totalFiles: number;
  totalAssets: number;
  totalSize: number;
  compressionRatio?: number;
  buildTime: number;
}

// Code generation interfaces
export interface CodeGenerator {
  generate(project: any, options: ExportOptions): Promise<ExportResult>;
  validate(project: any): ValidationResult;
  preview(project: any, options: ExportOptions): Promise<string>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: string;
  message: string;
  path?: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  type: string;
  message: string;
  suggestion?: string;
  path?: string;
}

// Deployment interfaces
export interface DeploymentTarget {
  id: string;
  name: string;
  type: DeploymentType;
  config: DeploymentConfig;
  isActive: boolean;
}

export interface DeploymentConfig {
  [key: string]: any;
}

export interface DeploymentResult {
  id: string;
  targetId: string;
  status: DeploymentStatus;
  url?: string;
  logs: DeploymentLog[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface DeploymentLog {
  timestamp: Date;
  level: LogLevel;
  message: string;
}

// Enums
export enum ExportFormat {
  HTML_CSS = 'html_css',
  REACT_COMPONENT = 'react_component',
  VUE_COMPONENT = 'vue_component',
  ANGULAR_COMPONENT = 'angular_component',
  STATIC_SITE = 'static_site',
  WORDPRESS_THEME = 'wordpress_theme',
  SHOPIFY_THEME = 'shopify_theme'
}

export enum CssFramework {
  NONE = 'none',
  BOOTSTRAP = 'bootstrap',
  TAILWIND = 'tailwind',
  BULMA = 'bulma',
  FOUNDATION = 'foundation',
  CUSTOM = 'custom'
}

export enum JsFramework {
  VANILLA = 'vanilla',
  JQUERY = 'jquery',
  ALPINE = 'alpine',
  STIMULUS = 'stimulus'
}

export enum ModuleFormat {
  ES6 = 'es6',
  COMMONJS = 'commonjs',
  UMD = 'umd',
  IIFE = 'iife'
}

export enum ComponentStructure {
  SINGLE_FILE = 'single_file',
  SEPARATE_FILES = 'separate_files',
  FEATURE_FOLDERS = 'feature_folders'
}

export enum FileType {
  HTML = 'html',
  CSS = 'css',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  JSON = 'json',
  MARKDOWN = 'markdown',
  CONFIG = 'config'
}

export enum DeploymentType {
  NETLIFY = 'netlify',
  VERCEL = 'vercel',
  GITHUB_PAGES = 'github_pages',
  AWS_S3 = 'aws_s3',
  FTP = 'ftp',
  CUSTOM = 'custom'
}

export enum DeploymentStatus {
  PENDING = 'pending',
  BUILDING = 'building',
  DEPLOYING = 'deploying',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}