import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Asset, AssetType, AssetProcessingJob, ProcessingStatus } from '../../models/asset.interface';
import { AssetService } from '../../services/asset.service';
import { AssetOptimizationService, OptimizationOptions, OptimizationRecommendation, CompressionResult } from '../../services/asset-optimization.service';

@Component({
  selector: 'app-asset-optimization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Asset Optimization Panel -->
    <div class="optimization-panel" *ngIf="asset">
      
      <!-- Header -->
      <div class="panel-header">
        <h4 class="panel-title">
          <i class="bi bi-speedometer2"></i>
          Asset Optimization
        </h4>
        <button class="btn btn-outline-secondary btn-sm" (click)="close()">
          <i class="bi bi-x"></i>
        </button>
      </div>

      <!-- Asset Info -->
      <div class="asset-summary">
        <div class="asset-preview">
          <img 
            *ngIf="asset.type === AssetType.IMAGE" 
            [src]="asset.url" 
            [alt]="asset.name"
            class="preview-image"
          >
          <div 
            *ngIf="asset.type !== AssetType.IMAGE"
            class="preview-placeholder"
            [style.background-color]="getAssetTypeColor(asset.type)"
          >
            <span class="preview-icon">{{ getAssetTypeIcon(asset.type) }}</span>
          </div>
        </div>
        
        <div class="asset-details">
          <h5 class="asset-name">{{ asset.name }}</h5>
          <div class="asset-meta">
            <span class="meta-item">
              <i class="bi bi-file-earmark"></i>
              {{ formatFileSize(asset.size) }}
            </span>
            <span class="meta-item" *ngIf="asset.dimensions">
              <i class="bi bi-aspect-ratio"></i>
              {{ asset.dimensions.width }}×{{ asset.dimensions.height }}
            </span>
            <span class="meta-item">
              <i class="bi bi-tag"></i>
              {{ asset.type | titlecase }}
            </span>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="recommendations-section" *ngIf="recommendations.length > 0">
        <h5 class="section-title">
          <i class="bi bi-lightbulb"></i>
          Optimization Recommendations
        </h5>
        
        <div class="recommendations-list">
          <div 
            *ngFor="let recommendation of recommendations"
            class="recommendation-card"
            [class.selected]="selectedRecommendation === recommendation"
            (click)="selectRecommendation(recommendation)"
          >
            <div class="recommendation-header">
              <div class="recommendation-title">{{ recommendation.title }}</div>
              <div class="potential-savings">
                <i class="bi bi-arrow-down-circle text-success"></i>
                {{ formatFileSize(recommendation.potentialSavings) }}
              </div>
            </div>
            <div class="recommendation-description">{{ recommendation.description }}</div>
            <div class="recommendation-action">
              <i class="bi bi-gear"></i>
              {{ recommendation.action }}
            </div>
          </div>
        </div>
      </div>

      <!-- Optimization Options -->
      <div class="optimization-options" *ngIf="asset.type === AssetType.IMAGE">
        <h5 class="section-title">
          <i class="bi bi-sliders"></i>
          Optimization Settings
        </h5>
        
        <div class="options-grid">
          <div class="option-group">
            <label class="option-label">Quality</label>
            <div class="quality-slider">
              <input 
                type="range" 
                min="10" 
                max="100" 
                step="5"
                [(ngModel)]="optimizationOptions.quality"
                class="slider"
                (input)="updateEstimate()"
              >
              <div class="slider-value">{{ optimizationOptions.quality }}%</div>
            </div>
          </div>
          
          <div class="option-group">
            <label class="option-label">Format</label>
            <select [(ngModel)]="optimizationOptions.format" class="form-select" (change)="updateEstimate()">
              <option value="">Keep Original</option>
              <option value="webp">WebP</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
            </select>
          </div>
          
          <div class="option-group" *ngIf="asset.dimensions">
            <label class="option-label">Max Width</label>
            <input 
              type="number" 
              [(ngModel)]="optimizationOptions.maxWidth"
              class="form-control"
              [placeholder]="asset.dimensions.width.toString()"
              (input)="updateEstimate()"
            >
          </div>
          
          <div class="option-group" *ngIf="asset.dimensions">
            <label class="option-label">Max Height</label>
            <input 
              type="number" 
              [(ngModel)]="optimizationOptions.maxHeight"
              class="form-control"
              [placeholder]="asset.dimensions.height.toString()"
              (input)="updateEstimate()"
            >
          </div>
        </div>

        <!-- Advanced Options -->
        <div class="advanced-options">
          <button 
            class="btn btn-outline-secondary btn-sm"
            (click)="showAdvancedOptions = !showAdvancedOptions"
          >
            <i class="bi" [class.bi-chevron-down]="!showAdvancedOptions" [class.bi-chevron-up]="showAdvancedOptions"></i>
            Advanced Options
          </button>
          
          <div class="advanced-panel" [class.expanded]="showAdvancedOptions">
            <div class="option-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="optimizationOptions.progressive"
                >
                Progressive JPEG
              </label>
            </div>
            
            <div class="option-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="optimizationOptions.stripMetadata"
                >
                Strip Metadata
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Size Estimate -->
      <div class="size-estimate" *ngIf="estimatedSize > 0">
        <div class="estimate-comparison">
          <div class="size-before">
            <div class="size-label">Current</div>
            <div class="size-value">{{ formatFileSize(asset.size) }}</div>
          </div>
          
          <div class="size-arrow">
            <i class="bi bi-arrow-right"></i>
          </div>
          
          <div class="size-after">
            <div class="size-label">Estimated</div>
            <div class="size-value">{{ formatFileSize(estimatedSize) }}</div>
          </div>
          
          <div class="size-savings" [class.positive]="savings > 0" [class.negative]="savings < 0">
            <div class="savings-label">{{ savings > 0 ? 'Savings' : 'Increase' }}</div>
            <div class="savings-value">
              <i class="bi" [class.bi-arrow-down]="savings > 0" [class.bi-arrow-up]="savings < 0"></i>
              {{ formatFileSize(Math.abs(savings)) }} ({{ savingsPercentage }}%)
            </div>
          </div>
        </div>
      </div>

      <!-- Processing Status -->
      <div class="processing-status" *ngIf="currentJob">
        <div class="status-header">
          <div class="status-title">
            <i class="bi bi-gear-fill spin" *ngIf="currentJob.status === ProcessingStatus.PROCESSING"></i>
            <i class="bi bi-check-circle-fill text-success" *ngIf="currentJob.status === ProcessingStatus.COMPLETED"></i>
            <i class="bi bi-x-circle-fill text-danger" *ngIf="currentJob.status === ProcessingStatus.FAILED"></i>
            {{ getStatusText(currentJob.status) }}
          </div>
          <div class="status-progress">{{ currentJob.progress }}%</div>
        </div>
        
        <div class="progress-bar">
          <div 
            class="progress-fill"
            [style.width.%]="currentJob.progress"
            [class.success]="currentJob.status === ProcessingStatus.COMPLETED"
            [class.error]="currentJob.status === ProcessingStatus.FAILED"
          ></div>
        </div>
        
        <div class="status-message" *ngIf="currentJob.error">
          {{ currentJob.error }}
        </div>
      </div>

      <!-- Compression Results -->
      <div class="compression-results" *ngIf="compressionResult">
        <h5 class="section-title">
          <i class="bi bi-check-circle text-success"></i>
          Compression Results
        </h5>
        
        <div class="results-grid">
          <div class="result-item">
            <div class="result-label">Original Size</div>
            <div class="result-value">{{ formatFileSize(compressionResult.originalSize) }}</div>
          </div>
          
          <div class="result-item">
            <div class="result-label">Compressed Size</div>
            <div class="result-value">{{ formatFileSize(compressionResult.compressedSize) }}</div>
          </div>
          
          <div class="result-item">
            <div class="result-label">Compression Ratio</div>
            <div class="result-value">{{ compressionResult.compressionRatio.toFixed(1) }}%</div>
          </div>
        </div>
        
        <div class="result-preview" *ngIf="compressionResult.optimizedAsset">
          <img 
            [src]="compressionResult.optimizedAsset.url" 
            [alt]="asset.name + ' (optimized)'"
            class="optimized-preview"
          >
        </div>
      </div>

      <!-- Actions -->
      <div class="panel-actions">
        <button 
          class="btn btn-outline-secondary"
          (click)="resetOptions()"
          [disabled]="isProcessing"
        >
          <i class="bi bi-arrow-clockwise"></i>
          Reset
        </button>
        
        <button 
          class="btn btn-primary"
          (click)="startOptimization()"
          [disabled]="isProcessing || !canOptimize"
        >
          <span *ngIf="isProcessing" class="spinner-border spinner-border-sm me-2"></span>
          <i *ngIf="!isProcessing" class="bi bi-play-fill"></i>
          {{ isProcessing ? 'Processing...' : 'Optimize' }}
        </button>
        
        <button 
          class="btn btn-success"
          (click)="applyOptimization()"
          *ngIf="compressionResult"
          [disabled]="isProcessing"
        >
          <i class="bi bi-check"></i>
          Apply Changes
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./asset-optimization.component.css']
})
export class AssetOptimizationComponent implements OnInit, OnDestroy {
  @Input() asset: Asset | null = null;
  @Input() isVisible = false;
  
  @Output() optimizationCompleted = new EventEmitter<Asset>();
  @Output() closed = new EventEmitter<void>();

  // Component state
  recommendations: OptimizationRecommendation[] = [];
  selectedRecommendation: OptimizationRecommendation | null = null;
  optimizationOptions: OptimizationOptions = {
    quality: 85,
    stripMetadata: true,
    progressive: false
  };
  
  // Processing state
  currentJob: AssetProcessingJob | null = null;
  isProcessing = false;
  compressionResult: CompressionResult | null = null;
  
  // UI state
  showAdvancedOptions = false;
  estimatedSize = 0;
  
  // Enums for template
  AssetType = AssetType;
  ProcessingStatus = ProcessingStatus;
  
  private destroy$ = new Subject<void>();

  constructor(
    private assetService: AssetService,
    private assetOptimizationService: AssetOptimizationService
  ) {}

  ngOnInit(): void {
    if (this.asset) {
      this.loadRecommendations();
      this.updateEstimate();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load optimization recommendations
   */
  private loadRecommendations(): void {
    if (!this.asset) return;
    
    this.recommendations = this.assetOptimizationService.getOptimizationRecommendations(this.asset);
  }

  /**
   * Select a recommendation
   */
  selectRecommendation(recommendation: OptimizationRecommendation): void {
    this.selectedRecommendation = recommendation;
    
    // Apply recommendation options
    if (recommendation.options) {
      this.optimizationOptions = { ...this.optimizationOptions, ...recommendation.options };
      this.updateEstimate();
    }
  }

  /**
   * Update size estimate
   */
  updateEstimate(): void {
    if (!this.asset) return;
    
    this.estimatedSize = this.assetOptimizationService.estimateOptimizedSize(this.asset, this.optimizationOptions);
  }

  /**
   * Get savings amount
   */
  get savings(): number {
    return this.asset ? this.asset.size - this.estimatedSize : 0;
  }

  /**
   * Get savings percentage
   */
  get savingsPercentage(): string {
    if (!this.asset || this.asset.size === 0) return '0';
    return Math.abs((this.savings / this.asset.size) * 100).toFixed(1);
  }

  /**
   * Check if optimization can be performed
   */
  get canOptimize(): boolean {
    return !!(this.asset && this.asset.type === AssetType.IMAGE);
  }

  /**
   * Start optimization process
   */
  async startOptimization(): Promise<void> {
    if (!this.asset || this.isProcessing) return;
    
    this.isProcessing = true;
    this.compressionResult = null;
    
    try {
      // Start with compression
      this.compressionResult = await this.assetOptimizationService.compressImage(
        this.asset, 
        this.optimizationOptions.quality || 85
      );
      
      // Start full optimization job
      this.currentJob = await this.assetService.optimizeAsset(this.asset.id);
      
      // Subscribe to job updates
      this.assetService.getProcessingJobUpdates(this.currentJob.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe(job => {
          this.currentJob = job;
          
          if (job.status === ProcessingStatus.COMPLETED || job.status === ProcessingStatus.FAILED) {
            this.isProcessing = false;
          }
        });
        
    } catch (error) {
      console.error('Optimization failed:', error);
      this.isProcessing = false;
    }
  }

  /**
   * Apply optimization results
   */
  async applyOptimization(): Promise<void> {
    if (!this.asset || !this.compressionResult) return;
    
    try {
      // Update asset with optimized version
      const updatedAsset = await this.assetService.updateAsset(this.asset.id, {
        url: this.compressionResult.optimizedAsset.url,
        size: this.compressionResult.compressedSize,
        optimizedVersions: [...(this.asset.optimizedVersions || []), this.compressionResult.optimizedAsset]
      });
      
      this.optimizationCompleted.emit(updatedAsset);
      this.close();
    } catch (error) {
      console.error('Failed to apply optimization:', error);
    }
  }

  /**
   * Reset optimization options
   */
  resetOptions(): void {
    this.optimizationOptions = {
      quality: 85,
      stripMetadata: true,
      progressive: false
    };
    this.selectedRecommendation = null;
    this.compressionResult = null;
    this.updateEstimate();
  }

  /**
   * Close the optimization panel
   */
  close(): void {
    this.closed.emit();
  }

  /**
   * Get status text
   */
  getStatusText(status: ProcessingStatus): string {
    switch (status) {
      case ProcessingStatus.PENDING:
        return 'Preparing...';
      case ProcessingStatus.PROCESSING:
        return 'Processing...';
      case ProcessingStatus.COMPLETED:
        return 'Completed';
      case ProcessingStatus.FAILED:
        return 'Failed';
      case ProcessingStatus.CANCELLED:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get asset type icon
   */
  getAssetTypeIcon(type: AssetType): string {
    const icons = {
      [AssetType.IMAGE]: '🖼️',
      [AssetType.VIDEO]: '🎥',
      [AssetType.AUDIO]: '🎵',
      [AssetType.DOCUMENT]: '📄',
      [AssetType.FONT]: '🔤',
      [AssetType.ICON]: '⭐',
      [AssetType.OTHER]: '📎'
    };
    return icons[type] || '📎';
  }

  /**
   * Get asset type color
   */
  getAssetTypeColor(type: AssetType): string {
    const colors = {
      [AssetType.IMAGE]: '#4CAF50',
      [AssetType.VIDEO]: '#2196F3',
      [AssetType.AUDIO]: '#FF9800',
      [AssetType.DOCUMENT]: '#9C27B0',
      [AssetType.FONT]: '#607D8B',
      [AssetType.ICON]: '#FFC107',
      [AssetType.OTHER]: '#795548'
    };
    return colors[type] || '#795548';
  }
}