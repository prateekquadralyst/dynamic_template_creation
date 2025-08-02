// Asset management interfaces
export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  thumbnailUrl?: string;
  size: number;
  dimensions?: AssetDimensions;
  optimizedVersions?: OptimizedAsset[];
  usageCount: number;
  tags: string[];
  uploadedAt: Date;
  updatedAt: Date;
  metadata: AssetMetadata;
}

export interface AssetDimensions {
  width: number;
  height: number;
}

export interface OptimizedAsset {
  format: string;
  url: string;
  size: number;
  quality?: number;
  dimensions?: AssetDimensions;
  deviceType?: import('./section.interface').DeviceType;
  pixelRatio?: number;
}

export interface AssetMetadata {
  originalName: string;
  mimeType: string;
  fileExtension: string;
  checksum: string;
  exifData?: ExifData;
  colorProfile?: string;
}

export interface ExifData {
  [key: string]: any;
}

export interface AssetUsage {
  projectId: string;
  sectionId: string;
  variableName: string;
  usedAt: Date;
}

export interface AssetUploadOptions {
  optimize: boolean;
  generateThumbnails: boolean;
  formats: string[];
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface AssetSearchOptions {
  query?: string;
  type?: AssetType;
  tags?: string[];
  dateRange?: DateRange;
  sizeRange?: SizeRange;
  sortBy?: AssetSortBy;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SizeRange {
  min: number;
  max: number;
}

// Asset processing interfaces
export interface AssetProcessingJob {
  id: string;
  assetId: string;
  type: ProcessingType;
  status: ProcessingStatus;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: ProcessingResult;
}

export interface ProcessingResult {
  outputAssets: OptimizedAsset[];
  metrics: ProcessingMetrics;
}

export interface ProcessingMetrics {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
}

// Enums
export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  FONT = 'font',
  ICON = 'icon',
  OTHER = 'other'
}

export enum AssetSortBy {
  NAME = 'name',
  SIZE = 'size',
  UPLOAD_DATE = 'uploadedAt',
  USAGE_COUNT = 'usageCount',
  TYPE = 'type'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export enum ProcessingType {
  OPTIMIZATION = 'optimization',
  FORMAT_CONVERSION = 'format_conversion',
  THUMBNAIL_GENERATION = 'thumbnail_generation',
  METADATA_EXTRACTION = 'metadata_extraction'
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}