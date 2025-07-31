import { Observable } from 'rxjs';
import { 
  Asset, 
  AssetUploadOptions, 
  AssetSearchOptions,
  AssetUsage,
  AssetProcessingJob 
} from '../../models/asset.interface';

// Asset service interface for dependency injection and testing
export interface IAssetService {
  // Asset upload and management
  uploadAsset(file: File, options?: AssetUploadOptions): Promise<Asset>;
  uploadMultipleAssets(files: File[], options?: AssetUploadOptions): Promise<Asset[]>;
  getAssets(options?: AssetSearchOptions): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | null>;
  updateAsset(id: string, updates: Partial<Asset>): Promise<Asset>;
  deleteAsset(id: string): Promise<void>;
  deleteMultipleAssets(ids: string[]): Promise<void>;
  
  // Asset optimization and processing
  optimizeAsset(id: string): Promise<AssetProcessingJob>;
  generateThumbnails(id: string): Promise<AssetProcessingJob>;
  convertAssetFormat(id: string, targetFormat: string): Promise<AssetProcessingJob>;
  getProcessingJob(jobId: string): Promise<AssetProcessingJob>;
  getProcessingJobs(assetId: string): Promise<AssetProcessingJob[]>;
  
  // Asset search and filtering
  searchAssets(query: string): Promise<Asset[]>;
  getAssetsByType(type: string): Promise<Asset[]>;
  getAssetsByTags(tags: string[]): Promise<Asset[]>;
  getRecentAssets(limit?: number): Promise<Asset[]>;
  
  // Asset usage tracking
  trackAssetUsage(assetId: string, projectId: string, sectionId: string, variableName: string): Promise<void>;
  getAssetUsage(assetId: string): Promise<AssetUsage[]>;
  findUnusedAssets(): Promise<Asset[]>;
  replaceAsset(oldAssetId: string, newAssetId: string): Promise<void>;
  
  // Asset organization
  addTagsToAsset(assetId: string, tags: string[]): Promise<void>;
  removeTagsFromAsset(assetId: string, tags: string[]): Promise<void>;
  getAllTags(): Promise<string[]>;
  
  // Asset validation and analysis
  validateAsset(file: File): Promise<AssetValidationResult>;
  analyzeAsset(assetId: string): Promise<AssetAnalysis>;
  
  // Observable streams
  getAssetsUpdates(): Observable<Asset[]>;
  getAssetUpdates(assetId: string): Observable<Asset>;
  getProcessingJobUpdates(jobId: string): Observable<AssetProcessingJob>;
}

export interface AssetValidationResult {
  isValid: boolean;
  errors: AssetValidationError[];
  warnings: AssetValidationWarning[];
  metadata: AssetValidationMetadata;
}

export interface AssetValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface AssetValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export interface AssetValidationMetadata {
  fileSize: number;
  dimensions?: { width: number; height: number };
  format: string;
  colorSpace?: string;
  hasTransparency?: boolean;
}

export interface AssetAnalysis {
  assetId: string;
  fileSize: number;
  optimizationPotential: number;
  recommendedFormats: string[];
  colorAnalysis?: ColorAnalysis;
  performanceImpact: PerformanceImpact;
}

export interface ColorAnalysis {
  dominantColors: string[];
  colorCount: number;
  hasTransparency: boolean;
  averageBrightness: number;
}

export interface PerformanceImpact {
  loadTime: number;
  bandwidthUsage: number;
  renderingComplexity: number;
  recommendations: string[];
}