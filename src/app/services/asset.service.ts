import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { IAssetService, AssetValidationResult, AssetAnalysis } from './interfaces/asset-service.interface';
import { 
  Asset, 
  AssetUploadOptions, 
  AssetSearchOptions,
  AssetUsage,
  AssetProcessingJob,
  AssetType,
  ProcessingType,
  ProcessingStatus,
  SortOrder
} from '../models/asset.interface';
import { DatabaseService } from './database.service';
import { AssetOptimizationService } from './asset-optimization.service';

@Injectable({
  providedIn: 'root'
})
export class AssetService implements IAssetService {
  private assetsSubject = new BehaviorSubject<Asset[]>([]);
  private assetUpdateSubjects = new Map<string, BehaviorSubject<Asset>>();
  private processingJobSubjects = new Map<string, BehaviorSubject<AssetProcessingJob>>();

  constructor(
    private databaseService: DatabaseService,
    private assetOptimizationService: AssetOptimizationService
  ) {
    this.loadAssets();
  }

  /**
   * Load all assets from database
   */
  private async loadAssets(): Promise<void> {
    try {
      const assets = await this.databaseService.getAllAssets();
      this.assetsSubject.next(assets);
    } catch (error) {
      console.error('Failed to load assets:', error);
      this.assetsSubject.next([]);
    }
  }

  /**
   * Generate a unique ID for new assets
   */
  private generateAssetId(): string {
    return 'asset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Determine asset type from file
   */
  private getAssetType(file: File): AssetType {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.startsWith('image/')) return AssetType.IMAGE;
    if (mimeType.startsWith('video/')) return AssetType.VIDEO;
    if (mimeType.startsWith('audio/')) return AssetType.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return AssetType.DOCUMENT;
    if (mimeType.includes('font')) return AssetType.FONT;
    
    return AssetType.OTHER;
  }

  /**
   * Create asset URL from file
   */
  private async createAssetUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(file: File): Promise<{ width: number; height: number } | undefined> {
    if (!file.type.startsWith('image/')) return undefined;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve(undefined);
      img.src = URL.createObjectURL(file);
    });
  }

  // Asset upload and management
  async uploadAsset(file: File, options?: AssetUploadOptions): Promise<Asset> {
    const now = new Date();
    const dimensions = await this.getImageDimensions(file);
    const url = await this.createAssetUrl(file);

    const asset: Asset = {
      id: this.generateAssetId(),
      name: file.name,
      type: this.getAssetType(file),
      url,
      size: file.size,
      dimensions,
      optimizedVersions: [],
      usageCount: 0,
      tags: [],
      uploadedAt: now,
      updatedAt: now,
      metadata: {
        originalName: file.name,
        mimeType: file.type,
        fileExtension: file.name.split('.').pop() || '',
        checksum: await this.calculateChecksum(file)
      }
    };

    try {
      await this.databaseService.saveAsset(asset);
      await this.loadAssets();
      
      // Create subject for this asset
      this.assetUpdateSubjects.set(asset.id, new BehaviorSubject(asset));
      
      // Start optimization if requested
      if (options?.optimize) {
        this.optimizeAsset(asset.id);
      }
      
      return asset;
    } catch (error) {
      console.error('Failed to upload asset:', error);
      throw new Error('Failed to upload asset');
    }
  }

  async uploadMultipleAssets(files: File[], options?: AssetUploadOptions): Promise<Asset[]> {
    const uploadPromises = files.map(file => this.uploadAsset(file, options));
    return Promise.all(uploadPromises);
  }

  async getAssets(options?: AssetSearchOptions): Promise<Asset[]> {
    let assets = await this.databaseService.getAllAssets();

    // Apply filters
    if (options?.type) {
      assets = assets.filter(asset => asset.type === options.type);
    }

    if (options?.tags && options.tags.length > 0) {
      assets = assets.filter(asset => 
        options.tags!.some(tag => asset.tags.includes(tag))
      );
    }

    if (options?.query) {
      const query = options.query.toLowerCase();
      assets = assets.filter(asset => 
        asset.name.toLowerCase().includes(query) ||
        asset.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    if (options?.sortBy) {
      assets.sort((a, b) => {
        const aValue = a[options.sortBy!] as any;
        const bValue = b[options.sortBy!] as any;
        
        if (options.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        }
        return aValue > bValue ? 1 : -1;
      });
    }

    // Apply pagination
    if (options?.offset || options?.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      assets = assets.slice(start, end);
    }

    return assets;
  }

  async getAsset(id: string): Promise<Asset | null> {
    return this.databaseService.getAsset(id);
  }

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    const existingAsset = await this.getAsset(id);
    if (!existingAsset) {
      throw new Error(`Asset with ID ${id} not found`);
    }
    
    const updatedAsset: Asset = {
      ...existingAsset,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    try {
      await this.databaseService.saveAsset(updatedAsset);
      await this.loadAssets();
      
      // Update the asset subject
      const assetSubject = this.assetUpdateSubjects.get(id);
      if (assetSubject) {
        assetSubject.next(updatedAsset);
      }
      
      return updatedAsset;
    } catch (error) {
      console.error('Failed to update asset:', error);
      throw new Error('Failed to update asset');
    }
  }

  async deleteAsset(id: string): Promise<void> {
    try {
      await this.databaseService.deleteAsset(id);
      await this.loadAssets();
      
      // Clean up subjects
      this.assetUpdateSubjects.delete(id);
    } catch (error) {
      console.error('Failed to delete asset:', error);
      throw new Error('Failed to delete asset');
    }
  }

  async deleteMultipleAssets(ids: string[]): Promise<void> {
    const deletePromises = ids.map(id => this.deleteAsset(id));
    await Promise.all(deletePromises);
  }

  // Asset optimization and processing
  async optimizeAsset(id: string): Promise<AssetProcessingJob> {
    const asset = await this.getAsset(id);
    if (!asset) {
      throw new Error(`Asset with ID ${id} not found`);
    }

    try {
      const job = await this.assetOptimizationService.optimizeAsset(asset);
      
      // Subscribe to job updates and update our local subject
      const jobSubject = new BehaviorSubject(job);
      this.processingJobSubjects.set(job.id, jobSubject);
      
      this.assetOptimizationService.getProcessingJobUpdates(job.id).subscribe(updatedJob => {
        jobSubject.next(updatedJob);
        
        // If job is completed, update the asset with optimized versions
        if (updatedJob.status === ProcessingStatus.COMPLETED && updatedJob.result) {
          this.updateAsset(id, {
            optimizedVersions: updatedJob.result.outputAssets
          });
        }
      });

      return job;
    } catch (error) {
      console.error('Failed to start asset optimization:', error);
      throw new Error('Failed to start asset optimization');
    }
  }

  async generateThumbnails(id: string): Promise<AssetProcessingJob> {
    const job: AssetProcessingJob = {
      id: 'job_' + Date.now(),
      assetId: id,
      type: ProcessingType.THUMBNAIL_GENERATION,
      status: ProcessingStatus.PENDING,
      progress: 0,
      startedAt: new Date()
    };

    this.processingJobSubjects.set(job.id, new BehaviorSubject(job));
    return job;
  }

  async convertAssetFormat(id: string, targetFormat: string): Promise<AssetProcessingJob> {
    const job: AssetProcessingJob = {
      id: 'job_' + Date.now(),
      assetId: id,
      type: ProcessingType.FORMAT_CONVERSION,
      status: ProcessingStatus.PENDING,
      progress: 0,
      startedAt: new Date()
    };

    this.processingJobSubjects.set(job.id, new BehaviorSubject(job));
    return job;
  }

  async getProcessingJob(jobId: string): Promise<AssetProcessingJob> {
    // Placeholder implementation
    throw new Error('Processing job not found');
  }

  async getProcessingJobs(assetId: string): Promise<AssetProcessingJob[]> {
    // Placeholder implementation
    return [];
  }

  // Asset search and filtering
  async searchAssets(query: string): Promise<Asset[]> {
    return this.getAssets({ query });
  }

  async getAssetsByType(type: string): Promise<Asset[]> {
    return this.getAssets({ type: type as AssetType });
  }

  async getAssetsByTags(tags: string[]): Promise<Asset[]> {
    return this.getAssets({ tags });
  }

  async getRecentAssets(limit: number = 10): Promise<Asset[]> {
    const assets = await this.getAssets({
      sortBy: 'uploadedAt' as any,
      sortOrder: SortOrder.DESC,
      limit
    });
    return assets;
  }

  // Asset usage tracking (placeholder implementations)
  async trackAssetUsage(assetId: string, projectId: string, sectionId: string, variableName: string): Promise<void> {
    const asset = await this.getAsset(assetId);
    if (asset) {
      await this.updateAsset(assetId, {
        usageCount: asset.usageCount + 1
      });
    }
  }

  async getAssetUsage(assetId: string): Promise<AssetUsage[]> {
    // Placeholder implementation
    return [];
  }

  async findUnusedAssets(): Promise<Asset[]> {
    const assets = await this.getAssets();
    return assets.filter(asset => asset.usageCount === 0);
  }

  async replaceAsset(oldAssetId: string, newAssetId: string): Promise<void> {
    try {
      const oldAsset = await this.getAsset(oldAssetId);
      const newAsset = await this.getAsset(newAssetId);
      
      if (!oldAsset || !newAsset) {
        throw new Error('Asset not found');
      }

      // Get all usage locations for the old asset
      const usageLocations = await this.getAssetUsage(oldAssetId);
      
      // Update usage tracking
      for (const usage of usageLocations) {
        // Remove usage from old asset
        await this.updateAsset(oldAssetId, {
          usageCount: Math.max(0, oldAsset.usageCount - 1)
        });
        
        // Add usage to new asset
        await this.updateAsset(newAssetId, {
          usageCount: newAsset.usageCount + 1
        });
        
        // Track new usage
        await this.trackAssetUsage(newAssetId, usage.projectId, usage.sectionId, usage.variableName);
      }

      console.log(`Successfully replaced asset ${oldAssetId} with ${newAssetId} in ${usageLocations.length} locations`);
    } catch (error) {
      console.error('Failed to replace asset:', error);
      throw new Error('Failed to replace asset');
    }
  }

  // Asset organization
  async addTagsToAsset(assetId: string, tags: string[]): Promise<void> {
    const asset = await this.getAsset(assetId);
    if (asset) {
      const newTags = [...new Set([...asset.tags, ...tags])];
      await this.updateAsset(assetId, { tags: newTags });
    }
  }

  async removeTagsFromAsset(assetId: string, tags: string[]): Promise<void> {
    const asset = await this.getAsset(assetId);
    if (asset) {
      const newTags = asset.tags.filter(tag => !tags.includes(tag));
      await this.updateAsset(assetId, { tags: newTags });
    }
  }

  async getAllTags(): Promise<string[]> {
    const assets = await this.getAssets();
    const allTags = assets.flatMap(asset => asset.tags);
    return [...new Set(allTags)];
  }

  // Asset validation and analysis
  async validateAsset(file: File): Promise<AssetValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // File size validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (10MB)`
      });
    }

    // File type validation
    const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf'];
    if (!allowedTypes.some(type => file.type.startsWith(type))) {
      errors.push({
        code: 'UNSUPPORTED_FILE_TYPE',
        message: `File type ${file.type} is not supported`
      });
    }

    const dimensions = await this.getImageDimensions(file);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        fileSize: file.size,
        dimensions,
        format: file.type,
        hasTransparency: file.type === 'image/png'
      }
    };
  }

  async analyzeAsset(assetId: string): Promise<AssetAnalysis> {
    const asset = await this.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset with ID ${assetId} not found`);
    }

    return {
      assetId,
      fileSize: asset.size,
      optimizationPotential: Math.random() * 50, // Placeholder
      recommendedFormats: ['webp', 'avif'],
      performanceImpact: {
        loadTime: asset.size / 1000, // Simplified calculation
        bandwidthUsage: asset.size,
        renderingComplexity: 1,
        recommendations: ['Consider using WebP format for better compression']
      }
    };
  }

  // Observable streams
  getAssetsUpdates(): Observable<Asset[]> {
    return this.assetsSubject.asObservable();
  }

  getAssetUpdates(assetId: string): Observable<Asset> {
    if (!this.assetUpdateSubjects.has(assetId)) {
      this.assetUpdateSubjects.set(assetId, new BehaviorSubject<Asset>({} as Asset));
    }
    return this.assetUpdateSubjects.get(assetId)!.asObservable();
  }

  getProcessingJobUpdates(jobId: string): Observable<AssetProcessingJob> {
    if (!this.processingJobSubjects.has(jobId)) {
      this.processingJobSubjects.set(jobId, new BehaviorSubject<AssetProcessingJob>({} as AssetProcessingJob));
    }
    return this.processingJobSubjects.get(jobId)!.asObservable();
  }

  /**
   * Calculate file checksum (simplified implementation)
   */
  private async calculateChecksum(file: File): Promise<string> {
    // Simplified checksum calculation
    return `checksum_${file.name}_${file.size}_${file.lastModified}`;
  }
}