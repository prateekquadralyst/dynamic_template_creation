import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs';
import { Asset, AssetType } from '../models/asset.interface';
import { Section } from '../models/section.interface';
import { Project } from '../models/project.interface';
import { AssetService } from './asset.service';
import { AssetOptimizationService } from './asset-optimization.service';
import { AssetReplacementService } from './asset-replacement.service';
import { ProjectService } from './project.service';

export interface AssetIntegrationContext {
  projectId?: string;
  sectionId?: string;
  variableName?: string;
  componentType?: 'template-builder' | 'section-editor' | 'global-styling';
}

export interface AssetUsageInfo {
  asset: Asset;
  usageLocations: AssetUsageLocation[];
  optimizationRecommendations: any[];
  replacementSuggestions: Asset[];
}

export interface AssetUsageLocation {
  projectId: string;
  projectName: string;
  sectionId: string;
  sectionName: string;
  variableName: string;
  variableLabel: string;
}

export interface AssetIntegrationEvent {
  type: 'asset-selected' | 'asset-optimized' | 'asset-replaced' | 'asset-uploaded';
  asset: Asset;
  context: AssetIntegrationContext;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AssetIntegrationService {
  private integrationEventsSubject = new BehaviorSubject<AssetIntegrationEvent | null>(null);
  private assetUsageCache = new Map<string, AssetUsageInfo>();

  constructor(
    private assetService: AssetService,
    private assetOptimizationService: AssetOptimizationService,
    private assetReplacementService: AssetReplacementService,
    private projectService: ProjectService
  ) {
    this.setupAssetUsageTracking();
  }

  /**
   * Setup asset usage tracking across the application
   */
  private setupAssetUsageTracking(): void {
    // Listen to asset updates and refresh usage cache
    this.assetService.getAssetsUpdates().subscribe(() => {
      this.refreshAssetUsageCache();
    });
  }

  /**
   * Get enhanced asset picker configuration for a specific context
   */
  getAssetPickerConfig(context: AssetIntegrationContext): any {
    const baseConfig = {
      allowedTypes: this.getAllowedTypesForContext(context),
      multiSelect: false,
      showUpload: true,
      showOptimization: true,
      showReplacement: true,
      title: this.getTitleForContext(context),
      emptyMessage: 'No assets found'
    };

    // Add context-specific configurations
    switch (context.componentType) {
      case 'template-builder':
        return {
          ...baseConfig,
          title: 'Select Template Asset',
          showAdvancedOptions: true,
          enableDragDrop: true
        };
      
      case 'section-editor':
        return {
          ...baseConfig,
          title: 'Select Section Asset',
          showUsageTracking: true,
          enableBulkOperations: false
        };
      
      case 'global-styling':
        return {
          ...baseConfig,
          title: 'Select Global Asset',
          allowedTypes: [AssetType.IMAGE, AssetType.FONT],
          showOptimization: true
        };
      
      default:
        return baseConfig;
    }
  }

  /**
   * Handle asset selection with context awareness
   */
  async handleAssetSelection(
    asset: Asset, 
    context: AssetIntegrationContext
  ): Promise<void> {
    try {
      // Track asset usage if context is provided
      if (context.projectId && context.sectionId && context.variableName) {
        await this.assetService.trackAssetUsage(
          asset.id,
          context.projectId,
          context.sectionId,
          context.variableName
        );
      }

      // Update asset usage cache
      await this.updateAssetUsageInfo(asset.id);

      // Emit integration event
      this.emitIntegrationEvent({
        type: 'asset-selected',
        asset,
        context
      });

      // Auto-optimize if recommended
      await this.checkAndSuggestOptimization(asset, context);

    } catch (error) {
      console.error('Failed to handle asset selection:', error);
      throw error;
    }
  }

  /**
   * Handle asset optimization with context awareness
   */
  async handleAssetOptimization(
    asset: Asset,
    context: AssetIntegrationContext
  ): Promise<Asset> {
    try {
      // Start optimization process
      const optimizationJob = await this.assetOptimizationService.optimizeAsset(asset);
      
      // Wait for completion (simplified - in real app would use observables)
      const optimizedAsset = await this.waitForOptimizationCompletion(optimizationJob.id);

      // Update all usage locations with optimized asset
      await this.updateAssetInAllLocations(asset.id, optimizedAsset.id);

      // Emit integration event
      this.emitIntegrationEvent({
        type: 'asset-optimized',
        asset: optimizedAsset,
        context,
        metadata: { originalAsset: asset }
      });

      return optimizedAsset;
    } catch (error) {
      console.error('Failed to handle asset optimization:', error);
      throw error;
    }
  }

  /**
   * Handle asset replacement with context awareness
   */
  async handleAssetReplacement(
    oldAsset: Asset,
    newAsset: Asset,
    context: AssetIntegrationContext
  ): Promise<void> {
    try {
      // Get all usage locations for the old asset
      const usageInfo = await this.getAssetUsageInfo(oldAsset.id);

      // Replace asset in all locations or specific context
      if (context.projectId && context.sectionId && context.variableName) {
        // Replace in specific location
        await this.assetReplacementService.replaceAssetInSection(
          context.projectId,
          context.sectionId,
          oldAsset.id,
          newAsset.id
        );
      } else {
        // Replace in all locations
        await this.replaceAssetGlobally(oldAsset.id, newAsset.id);
      }

      // Update usage tracking
      await this.transferAssetUsage(oldAsset.id, newAsset.id);

      // Emit integration event
      this.emitIntegrationEvent({
        type: 'asset-replaced',
        asset: newAsset,
        context,
        metadata: { oldAsset, usageLocations: usageInfo.usageLocations }
      });

    } catch (error) {
      console.error('Failed to handle asset replacement:', error);
      throw error;
    }
  }

  /**
   * Handle asset upload with context awareness
   */
  async handleAssetUpload(
    file: File,
    context: AssetIntegrationContext,
    options?: any
  ): Promise<Asset> {
    try {
      // Upload asset with context-specific options
      const uploadOptions = {
        optimize: true,
        generateThumbnails: true,
        ...options,
        ...this.getUploadOptionsForContext(context)
      };

      const asset = await this.assetService.uploadAsset(file, uploadOptions);

      // Auto-select if context is provided
      if (context.projectId && context.sectionId && context.variableName) {
        await this.handleAssetSelection(asset, context);
      }

      // Emit integration event
      this.emitIntegrationEvent({
        type: 'asset-uploaded',
        asset,
        context,
        metadata: { fileName: file.name, fileSize: file.size }
      });

      return asset;
    } catch (error) {
      console.error('Failed to handle asset upload:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive asset usage information
   */
  async getAssetUsageInfo(assetId: string): Promise<AssetUsageInfo> {
    // Check cache first
    if (this.assetUsageCache.has(assetId)) {
      return this.assetUsageCache.get(assetId)!;
    }

    // Load fresh data
    const asset = await this.assetService.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset ${assetId} not found`);
    }

    const usageLocations = await this.loadAssetUsageLocations(assetId);
    const optimizationRecommendations = this.assetOptimizationService.getOptimizationRecommendations(asset);
    const replacementSuggestions = await this.assetReplacementService.getReplacementSuggestions(assetId);

    const usageInfo: AssetUsageInfo = {
      asset,
      usageLocations,
      optimizationRecommendations,
      replacementSuggestions
    };

    // Cache the result
    this.assetUsageCache.set(assetId, usageInfo);

    return usageInfo;
  }

  /**
   * Get assets with enhanced metadata for a specific context
   */
  async getAssetsForContext(context: AssetIntegrationContext): Promise<Asset[]> {
    const allowedTypes = this.getAllowedTypesForContext(context);
    
    const assets = await this.assetService.getAssets({
      type: allowedTypes.length === 1 ? allowedTypes[0] : undefined
    });

    // Filter by allowed types if multiple
    const filteredAssets = allowedTypes.length > 1 
      ? assets.filter(asset => allowedTypes.includes(asset.type))
      : assets;

    // Add context-specific metadata
    return filteredAssets.map(asset => ({
      ...asset,
      contextMetadata: this.getAssetContextMetadata(asset, context)
    }));
  }

  /**
   * Get integration events observable
   */
  getIntegrationEvents(): Observable<AssetIntegrationEvent | null> {
    return this.integrationEventsSubject.asObservable();
  }

  /**
   * Get asset recommendations for a specific context
   */
  async getAssetRecommendations(context: AssetIntegrationContext): Promise<Asset[]> {
    const recentAssets = await this.assetService.getRecentAssets(10);
    const allowedTypes = this.getAllowedTypesForContext(context);
    
    return recentAssets.filter(asset => allowedTypes.includes(asset.type));
  }

  /**
   * Bulk optimize assets for a project
   */
  async bulkOptimizeProjectAssets(projectId: string): Promise<void> {
    try {
      const project = await this.projectService.getProject(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const projectAssets = await this.getProjectAssets(projectId);
      const imageAssets = projectAssets.filter(asset => asset.type === AssetType.IMAGE);

      // Optimize each image asset
      for (const asset of imageAssets) {
        try {
          await this.handleAssetOptimization(asset, { 
            projectId, 
            componentType: 'section-editor' 
          });
        } catch (error) {
          console.warn(`Failed to optimize asset ${asset.name}:`, error);
        }
      }

    } catch (error) {
      console.error('Failed to bulk optimize project assets:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private getAllowedTypesForContext(context: AssetIntegrationContext): AssetType[] {
    switch (context.componentType) {
      case 'template-builder':
        return [AssetType.IMAGE, AssetType.ICON];
      case 'section-editor':
        return [AssetType.IMAGE, AssetType.VIDEO];
      case 'global-styling':
        return [AssetType.IMAGE, AssetType.FONT];
      default:
        return Object.values(AssetType);
    }
  }

  private getTitleForContext(context: AssetIntegrationContext): string {
    switch (context.componentType) {
      case 'template-builder':
        return 'Select Template Asset';
      case 'section-editor':
        return 'Select Section Asset';
      case 'global-styling':
        return 'Select Global Asset';
      default:
        return 'Select Asset';
    }
  }

  private getUploadOptionsForContext(context: AssetIntegrationContext): any {
    switch (context.componentType) {
      case 'template-builder':
        return {
          optimize: true,
          generateThumbnails: true,
          formats: ['webp'],
          quality: 90
        };
      case 'section-editor':
        return {
          optimize: true,
          generateThumbnails: true,
          formats: ['webp', 'jpeg'],
          quality: 85
        };
      case 'global-styling':
        return {
          optimize: false, // Preserve original quality for global assets
          generateThumbnails: false
        };
      default:
        return {
          optimize: true,
          generateThumbnails: true,
          quality: 85
        };
    }
  }

  private async loadAssetUsageLocations(assetId: string): Promise<AssetUsageLocation[]> {
    // This would load actual usage locations from the database
    // For now, return empty array as placeholder
    return [];
  }

  private getAssetContextMetadata(asset: Asset, context: AssetIntegrationContext): any {
    return {
      isRecommended: this.isAssetRecommendedForContext(asset, context),
      usageCount: asset.usageCount,
      lastUsed: asset.updatedAt,
      optimizationPotential: this.calculateOptimizationPotential(asset)
    };
  }

  private isAssetRecommendedForContext(asset: Asset, context: AssetIntegrationContext): boolean {
    // Simple recommendation logic based on context
    const allowedTypes = this.getAllowedTypesForContext(context);
    return allowedTypes.includes(asset.type) && asset.usageCount > 0;
  }

  private calculateOptimizationPotential(asset: Asset): number {
    if (asset.type !== AssetType.IMAGE) return 0;
    
    let potential = 0;
    
    // Size-based potential
    if (asset.size > 1024 * 1024) potential += 30; // Large files
    if (asset.size > 2 * 1024 * 1024) potential += 20; // Very large files
    
    // Format-based potential
    if (asset.metadata?.mimeType === 'image/png' && asset.size > 500 * 1024) {
      potential += 25; // PNG to WebP conversion
    }
    
    // Dimension-based potential
    if (asset.dimensions && (asset.dimensions.width > 2000 || asset.dimensions.height > 2000)) {
      potential += 35; // Large dimensions
    }
    
    return Math.min(potential, 100);
  }

  private async updateAssetUsageInfo(assetId: string): Promise<void> {
    // Remove from cache to force refresh
    this.assetUsageCache.delete(assetId);
    
    // Reload usage info
    await this.getAssetUsageInfo(assetId);
  }

  private async checkAndSuggestOptimization(asset: Asset, context: AssetIntegrationContext): Promise<void> {
    if (asset.type !== AssetType.IMAGE) return;
    
    const recommendations = this.assetOptimizationService.getOptimizationRecommendations(asset);
    
    if (recommendations.length > 0) {
      // Could emit a suggestion event or show a notification
      console.log(`Optimization suggestions available for ${asset.name}:`, recommendations);
    }
  }

  private async waitForOptimizationCompletion(jobId: string): Promise<Asset> {
    // This would wait for the optimization job to complete
    // For now, return a placeholder
    throw new Error('Optimization completion waiting not implemented');
  }

  private async updateAssetInAllLocations(oldAssetId: string, newAssetId: string): Promise<void> {
    // This would update the asset in all usage locations
    // For now, just log the operation
    console.log(`Updating asset ${oldAssetId} to ${newAssetId} in all locations`);
  }

  private async replaceAssetGlobally(oldAssetId: string, newAssetId: string): Promise<void> {
    // This would replace the asset globally across all projects
    await this.assetService.replaceAsset(oldAssetId, newAssetId);
  }

  private async transferAssetUsage(oldAssetId: string, newAssetId: string): Promise<void> {
    // This would transfer usage tracking from old asset to new asset
    const oldAsset = await this.assetService.getAsset(oldAssetId);
    const newAsset = await this.assetService.getAsset(newAssetId);
    
    if (oldAsset && newAsset) {
      await this.assetService.updateAsset(newAssetId, {
        usageCount: newAsset.usageCount + oldAsset.usageCount
      });
      
      await this.assetService.updateAsset(oldAssetId, {
        usageCount: 0
      });
    }
  }

  private async getProjectAssets(projectId: string): Promise<Asset[]> {
    // This would get all assets used in a specific project
    // For now, return empty array as placeholder
    return [];
  }

  private async refreshAssetUsageCache(): Promise<void> {
    // Clear cache to force refresh on next access
    this.assetUsageCache.clear();
  }

  private emitIntegrationEvent(event: AssetIntegrationEvent): void {
    this.integrationEventsSubject.next(event);
  }
}