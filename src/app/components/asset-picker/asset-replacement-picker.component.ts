import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Asset, AssetType } from '../../models/asset.interface';
import { AssetReplacementService, AssetReplacementPreview } from '../../services/asset-replacement.service';

@Component({
  selector: 'app-asset-replacement-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Replacement Picker Modal -->
    <div class="replacement-modal" [class.visible]="isVisible" *ngIf="isVisible">
      <div class="modal-backdrop" (click)="close()"></div>
      
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h4 class="modal-title">
            <i class="bi bi-arrow-repeat"></i>
            Replace Asset
          </h4>
          <button class="btn-close" (click)="close()">
            <i class="bi bi-x"></i>
          </button>
        </div>

        <!-- Current Asset -->
        <div class="current-asset-section" *ngIf="originalAsset">
          <h5 class="section-title">Current Asset</h5>
          <div class="asset-card current">
            <div class="asset-preview">
              <img 
                *ngIf="originalAsset.type === AssetType.IMAGE" 
                [src]="originalAsset.url" 
                [alt]="originalAsset.name"
                class="preview-image"
              >
              <div 
                *ngIf="originalAsset.type !== AssetType.IMAGE"
                class="preview-placeholder"
                [style.background-color]="getAssetTypeColor(originalAsset.type)"
              >
                <span class="preview-icon">{{ getAssetTypeIcon(originalAsset.type) }}</span>
              </div>
            </div>
            
            <div class="asset-info">
              <div class="asset-name">{{ originalAsset.name }}</div>
              <div class="asset-meta">
                <span class="meta-item">{{ formatFileSize(originalAsset.size) }}</span>
                <span class="meta-item" *ngIf="originalAsset.dimensions">
                  {{ originalAsset.dimensions.width }}×{{ originalAsset.dimensions.height }}
                </span>
                <span class="meta-item">{{ originalAsset.type | titlecase }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Replacement Suggestions -->
        <div class="suggestions-section" *ngIf="suggestions.length > 0">
          <h5 class="section-title">
            <i class="bi bi-lightbulb"></i>
            Suggested Replacements
          </h5>
          
          <div class="suggestions-grid">
            <div 
              *ngFor="let asset of suggestions"
              class="asset-card suggestion"
              [class.selected]="selectedAsset?.id === asset.id"
              (click)="selectAsset(asset)"
            >
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
              
              <div class="asset-info">
                <div class="asset-name">{{ asset.name }}</div>
                <div class="asset-meta">
                  <span class="meta-item">{{ formatFileSize(asset.size) }}</span>
                  <span class="meta-item" *ngIf="asset.dimensions">
                    {{ asset.dimensions.width }}×{{ asset.dimensions.height }}
                  </span>
                </div>
                
                <!-- Similarity indicators -->
                <div class="similarity-indicators">
                  <span 
                    class="similarity-badge"
                    *ngIf="hasSameDimensions(asset)"
                    title="Same dimensions"
                  >
                    <i class="bi bi-aspect-ratio"></i>
                  </span>
                  <span 
                    class="similarity-badge"
                    *ngIf="hasSimilarSize(asset)"
                    title="Similar file size"
                  >
                    <i class="bi bi-file-earmark"></i>
                  </span>
                  <span 
                    class="similarity-badge"
                    *ngIf="hasCommonTags(asset)"
                    title="Common tags"
                  >
                    <i class="bi bi-tags"></i>
                  </span>
                </div>
              </div>
              
              <div class="selection-indicator" *ngIf="selectedAsset?.id === asset.id">
                <i class="bi bi-check-circle-fill"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Browse All Assets -->
        <div class="browse-section">
          <button 
            class="btn btn-outline-primary btn-block"
            (click)="showAllAssets = !showAllAssets"
          >
            <i class="bi bi-folder2-open"></i>
            {{ showAllAssets ? 'Hide' : 'Browse All Assets' }}
          </button>
        </div>

        <!-- All Assets Grid -->
        <div class="all-assets-section" *ngIf="showAllAssets">
          <div class="search-bar">
            <input 
              type="text" 
              class="form-control"
              placeholder="Search assets..."
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
            >
          </div>
          
          <div class="assets-grid">
            <div 
              *ngFor="let asset of filteredAssets"
              class="asset-card"
              [class.selected]="selectedAsset?.id === asset.id"
              (click)="selectAsset(asset)"
            >
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
              
              <div class="asset-info">
                <div class="asset-name">{{ asset.name }}</div>
                <div class="asset-meta">
                  <span class="meta-item">{{ formatFileSize(asset.size) }}</span>
                </div>
              </div>
              
              <div class="selection-indicator" *ngIf="selectedAsset?.id === asset.id">
                <i class="bi bi-check-circle-fill"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview Section -->
        <div class="preview-section" *ngIf="selectedAsset && showPreview">
          <h5 class="section-title">
            <i class="bi bi-eye"></i>
            Replacement Preview
          </h5>
          
          <div class="replacement-preview" *ngIf="replacementPreview">
            <div class="preview-info">
              <p>This replacement will affect:</p>
              <ul class="affected-list">
                <li *ngFor="let change of replacementPreview.previewChanges">
                  <strong>{{ change.projectName }}</strong> - {{ change.sectionName }} ({{ change.variableName }})
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button 
            class="btn btn-outline-secondary"
            (click)="close()"
          >
            Cancel
          </button>
          
          <button 
            class="btn btn-primary"
            (click)="confirmReplacement()"
            [disabled]="!selectedAsset || isLoading"
          >
            <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2"></span>
            <i *ngIf="!isLoading" class="bi bi-arrow-repeat"></i>
            {{ isLoading ? 'Replacing...' : 'Replace Asset' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./asset-replacement-picker.component.css']
})
export class AssetReplacementPickerComponent implements OnInit {
  @Input() isVisible = false;
  @Input() originalAsset: Asset | null = null;
  @Input() suggestions: Asset[] = [];
  @Input() allowedTypes: AssetType[] = [];
  @Input() showPreview = true;
  
  @Output() assetSelected = new EventEmitter<Asset>();
  @Output() closed = new EventEmitter<void>();

  selectedAsset: Asset | null = null;
  allAssets: Asset[] = [];
  filteredAssets: Asset[] = [];
  searchQuery = '';
  showAllAssets = false;
  isLoading = false;
  replacementPreview: AssetReplacementPreview | null = null;

  // Enums for template
  AssetType = AssetType;

  constructor(private assetReplacementService: AssetReplacementService) {}

  ngOnInit(): void {
    if (this.isVisible) {
      this.loadAllAssets();
    }
  }

  /**
   * Load all available assets
   */
  private async loadAllAssets(): Promise<void> {
    try {
      // Get all assets, filtered by allowed types if specified
      this.allAssets = []; // Would be loaded from AssetService
      this.filteredAssets = this.allAssets;
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  }

  /**
   * Handle search input change
   */
  onSearchChange(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredAssets = this.allAssets.filter(asset =>
      asset.name.toLowerCase().includes(query) ||
      asset.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  /**
   * Select an asset for replacement
   */
  async selectAsset(asset: Asset): Promise<void> {
    this.selectedAsset = asset;
    
    if (this.showPreview && this.originalAsset) {
      try {
        this.replacementPreview = await this.assetReplacementService.previewAssetReplacement(
          this.originalAsset.id,
          asset.id
        );
      } catch (error) {
        console.error('Failed to load replacement preview:', error);
        this.replacementPreview = null;
      }
    }
  }

  /**
   * Confirm asset replacement
   */
  confirmReplacement(): void {
    if (!this.selectedAsset) return;
    
    this.isLoading = true;
    this.assetSelected.emit(this.selectedAsset);
  }

  /**
   * Close the picker
   */
  close(): void {
    this.selectedAsset = null;
    this.replacementPreview = null;
    this.showAllAssets = false;
    this.searchQuery = '';
    this.isLoading = false;
    this.closed.emit();
  }

  /**
   * Check if asset has same dimensions as original asset
   */
  hasSameDimensions(asset: Asset): boolean {
    if (!this.originalAsset?.dimensions || !asset.dimensions) return false;
    return this.originalAsset.dimensions.width === asset.dimensions.width &&
           this.originalAsset.dimensions.height === asset.dimensions.height;
  }

  /**
   * Check if asset has similar size to original asset
   */
  hasSimilarSize(asset: Asset): boolean {
    if (!this.originalAsset) return false;
    const ratio = Math.min(this.originalAsset.size, asset.size) / Math.max(this.originalAsset.size, asset.size);
    return ratio > 0.7; // Within 30% size difference
  }

  /**
   * Check if asset has common tags with original asset
   */
  hasCommonTags(asset: Asset): boolean {
    if (!this.originalAsset) return false;
    return this.originalAsset.tags.some(tag => asset.tags.includes(tag));
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