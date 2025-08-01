import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Asset, AssetType, OptimizedAsset, AssetProcessingJob, ProcessingType, ProcessingStatus } from '../models/asset.interface';

export interface OptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: string;
  progressive?: boolean;
  stripMetadata?: boolean;
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  optimizedAsset: OptimizedAsset;
}

export interface OptimizationRecommendation {
  type: 'format' | 'quality' | 'dimensions' | 'compression';
  title: string;
  description: string;
  potentialSavings: number;
  action: string;
  options?: OptimizationOptions;
}

@Injectable({
  providedIn: 'root'
})
export class AssetOptimizationService {
  private processingJobs = new Map<string, BehaviorSubject<AssetProcessingJob>>();

  constructor() {}

  /**
   * Optimize an asset with given options
   */
  async optimizeAsset(asset: Asset, options: OptimizationOptions = {}): Promise<AssetProcessingJob> {
    const jobId = this.generateJobId();
    const job: AssetProcessingJob = {
      id: jobId,
      assetId: asset.id,
      type: ProcessingType.OPTIMIZATION,
      status: ProcessingStatus.PENDING,
      progress: 0,
      startedAt: new Date()
    };

    const jobSubject = new BehaviorSubject(job);
    this.processingJobs.set(jobId, jobSubject);

    // Start optimization process
    this.processOptimization(asset, options, jobSubject);

    return job;
  }

  /**
   * Compress an image asset
   */
  async compressImage(asset: Asset, quality: number = 85): Promise<CompressionResult> {
    if (asset.type !== AssetType.IMAGE) {
      throw new Error('Asset is not an image');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedSize = blob.size;
            const compressionRatio = ((asset.size - compressedSize) / asset.size) * 100;

            const optimizedAsset: OptimizedAsset = {
              format: 'jpeg',
              url: URL.createObjectURL(blob),
              size: compressedSize,
              quality,
              dimensions: asset.dimensions
            };

            resolve({
              originalSize: asset.size,
              compressedSize,
              compressionRatio,
              optimizedAsset
            });
          }, 'image/jpeg', quality / 100);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = asset.url;
    });
  }

  /**
   * Convert image to WebP format
   */
  async convertToWebP(asset: Asset, quality: number = 85): Promise<OptimizedAsset> {
    if (asset.type !== AssetType.IMAGE) {
      throw new Error('Asset is not an image');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to convert to WebP'));
              return;
            }

            const optimizedAsset: OptimizedAsset = {
              format: 'webp',
              url: URL.createObjectURL(blob),
              size: blob.size,
              quality,
              dimensions: asset.dimensions
            };

            resolve(optimizedAsset);
          }, 'image/webp', quality / 100);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = asset.url;
    });
  }

  /**
   * Resize an image asset
   */
  async resizeImage(asset: Asset, maxWidth: number, maxHeight: number): Promise<OptimizedAsset> {
    if (asset.type !== AssetType.IMAGE || !asset.dimensions) {
      throw new Error('Asset is not an image or dimensions are not available');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate new dimensions while maintaining aspect ratio
          const { width: newWidth, height: newHeight } = this.calculateResizeDimensions(
            asset.dimensions.width,
            asset.dimensions.height,
            maxWidth,
            maxHeight
          );

          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to resize image'));
              return;
            }

            const optimizedAsset: OptimizedAsset = {
              format: 'jpeg',
              url: URL.createObjectURL(blob),
              size: blob.size,
              dimensions: { width: newWidth, height: newHeight }
            };

            resolve(optimizedAsset);
          }, 'image/jpeg', 0.9);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = asset.url;
    });
  }

  /**
   * Generate multiple optimized versions of an asset
   */
  async generateOptimizedVersions(asset: Asset): Promise<OptimizedAsset[]> {
    if (asset.type !== AssetType.IMAGE) {
      return [];
    }

    const optimizedVersions: OptimizedAsset[] = [];

    try {
      // Generate WebP version
      const webpVersion = await this.convertToWebP(asset, 85);
      optimizedVersions.push(webpVersion);

      // Generate compressed JPEG version
      const compressionResult = await this.compressImage(asset, 85);
      optimizedVersions.push(compressionResult.optimizedAsset);

      // Generate thumbnail if image is large
      if (asset.dimensions && (asset.dimensions.width > 400 || asset.dimensions.height > 400)) {
        const thumbnail = await this.resizeImage(asset, 400, 400);
        thumbnail.format = 'thumbnail';
        optimizedVersions.push(thumbnail);
      }

      // Generate small version for previews
      if (asset.dimensions && (asset.dimensions.width > 150 || asset.dimensions.height > 150)) {
        const small = await this.resizeImage(asset, 150, 150);
        small.format = 'small';
        optimizedVersions.push(small);
      }
    } catch (error) {
      console.error('Failed to generate optimized versions:', error);
    }

    return optimizedVersions;
  }

  /**
   * Get optimization recommendations for an asset
   */
  getOptimizationRecommendations(asset: Asset): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (asset.type === AssetType.IMAGE) {
      // File size recommendations
      if (asset.size > 1024 * 1024) { // > 1MB
        recommendations.push({
          type: 'compression',
          title: 'Large File Size',
          description: 'This image is quite large and could benefit from compression.',
          potentialSavings: Math.round(asset.size * 0.3), // Estimate 30% savings
          action: 'Compress image',
          options: { quality: 85 }
        });
      }

      // Format recommendations
      if (asset.metadata.mimeType === 'image/png' && asset.size > 500 * 1024) {
        recommendations.push({
          type: 'format',
          title: 'PNG to WebP Conversion',
          description: 'Converting to WebP format can significantly reduce file size.',
          potentialSavings: Math.round(asset.size * 0.4), // Estimate 40% savings
          action: 'Convert to WebP',
          options: { format: 'webp', quality: 85 }
        });
      }

      // Dimension recommendations
      if (asset.dimensions && (asset.dimensions.width > 2000 || asset.dimensions.height > 2000)) {
        recommendations.push({
          type: 'dimensions',
          title: 'Large Dimensions',
          description: 'This image has very large dimensions that may not be necessary for web use.',
          potentialSavings: Math.round(asset.size * 0.5), // Estimate 50% savings
          action: 'Resize image',
          options: { maxWidth: 1920, maxHeight: 1080 }
        });
      }

      // Quality recommendations
      if (asset.size > 2 * 1024 * 1024) { // > 2MB
        recommendations.push({
          type: 'quality',
          title: 'High Quality',
          description: 'Reducing quality slightly can significantly reduce file size with minimal visual impact.',
          potentialSavings: Math.round(asset.size * 0.25), // Estimate 25% savings
          action: 'Reduce quality',
          options: { quality: 75 }
        });
      }
    }

    return recommendations;
  }

  /**
   * Get processing job updates
   */
  getProcessingJobUpdates(jobId: string): Observable<AssetProcessingJob> {
    const jobSubject = this.processingJobs.get(jobId);
    if (!jobSubject) {
      throw new Error(`Processing job ${jobId} not found`);
    }
    return jobSubject.asObservable();
  }

  /**
   * Cancel a processing job
   */
  cancelProcessingJob(jobId: string): void {
    const jobSubject = this.processingJobs.get(jobId);
    if (jobSubject) {
      const job = jobSubject.value;
      job.status = ProcessingStatus.CANCELLED;
      jobSubject.next(job);
      this.processingJobs.delete(jobId);
    }
  }

  /**
   * Process optimization (private method)
   */
  private async processOptimization(
    asset: Asset, 
    options: OptimizationOptions, 
    jobSubject: BehaviorSubject<AssetProcessingJob>
  ): Promise<void> {
    const job = jobSubject.value;
    
    try {
      // Update job status
      job.status = ProcessingStatus.PROCESSING;
      job.progress = 10;
      jobSubject.next(job);

      // Generate optimized versions
      job.progress = 30;
      jobSubject.next(job);

      const optimizedVersions = await this.generateOptimizedVersions(asset);
      
      job.progress = 80;
      jobSubject.next(job);

      // Complete the job
      job.status = ProcessingStatus.COMPLETED;
      job.progress = 100;
      job.completedAt = new Date();
      job.result = {
        outputAssets: optimizedVersions,
        metrics: {
          originalSize: asset.size,
          compressedSize: optimizedVersions.reduce((sum, opt) => sum + opt.size, 0),
          compressionRatio: 0, // Will be calculated
          processingTime: Date.now() - job.startedAt.getTime()
        }
      };

      // Calculate compression ratio
      if (job.result.metrics.compressedSize > 0) {
        job.result.metrics.compressionRatio = 
          ((asset.size - job.result.metrics.compressedSize) / asset.size) * 100;
      }

      jobSubject.next(job);
    } catch (error) {
      job.status = ProcessingStatus.FAILED;
      job.error = error instanceof Error ? error.message : 'Unknown error';
      jobSubject.next(job);
    }
  }

  /**
   * Calculate resize dimensions while maintaining aspect ratio
   */
  private calculateResizeDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return 'opt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check if browser supports WebP
   */
  supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      
      canvas.toBlob((blob) => {
        resolve(blob !== null);
      }, 'image/webp');
    });
  }

  /**
   * Get optimal format for an image
   */
  async getOptimalFormat(asset: Asset): Promise<string> {
    if (asset.type !== AssetType.IMAGE) {
      return asset.metadata.mimeType;
    }

    const supportsWebP = await this.supportsWebP();
    
    if (supportsWebP) {
      return 'image/webp';
    }

    // Fallback logic
    if (asset.metadata.mimeType === 'image/png' && asset.size > 500 * 1024) {
      return 'image/jpeg'; // Convert large PNGs to JPEG
    }

    return asset.metadata.mimeType;
  }

  /**
   * Estimate file size after optimization
   */
  estimateOptimizedSize(asset: Asset, options: OptimizationOptions): number {
    let estimatedSize = asset.size;

    // Quality reduction estimation
    if (options.quality && options.quality < 100) {
      const qualityFactor = options.quality / 100;
      estimatedSize *= qualityFactor;
    }

    // Format conversion estimation
    if (options.format === 'webp' && asset.metadata.mimeType !== 'image/webp') {
      estimatedSize *= 0.7; // WebP typically 30% smaller
    }

    // Dimension reduction estimation
    if (options.maxWidth || options.maxHeight) {
      if (asset.dimensions) {
        const { width: newWidth, height: newHeight } = this.calculateResizeDimensions(
          asset.dimensions.width,
          asset.dimensions.height,
          options.maxWidth || asset.dimensions.width,
          options.maxHeight || asset.dimensions.height
        );
        
        const dimensionReduction = (newWidth * newHeight) / (asset.dimensions.width * asset.dimensions.height);
        estimatedSize *= dimensionReduction;
      }
    }

    return Math.round(estimatedSize);
  }
}