import { Component, Input, Output, EventEmitter, forwardRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AssetPickerComponent, AssetPickerConfig } from './asset-picker.component';
import { AssetOptimizationComponent } from './asset-optimization.component';
import { AssetReplacementPickerComponent } from './asset-replacement-picker.component';
import { Asset, AssetType } from '../../models/asset.interface';
import { AssetService } from '../../services/asset.service';
import { AssetReplacementService } from '../../services/asset-replacement.service';
import { AssetIntegrationService, AssetIntegrationContext } from '../../services/asset-integration.service';

@Component({
  selector: 'app-enhanced-asset-input',
  standalone: true,
  imports: [CommonModule, AssetPickerComponent, AssetOptimizationComponent, AssetReplacementPickerComponent],
  template: `
    <!-- Enhanced Asset Input Display -->
    <div class="enhanced-asset-input" [class.has-value]="selectedAsset" [class.disabled]="disabled">
      
      <!-- Label -->
      <label class="input-label" *ngIf="label">
        {{ label }}
        <span class="required-indicator" *ngIf="required">*</span>
      </label>

      <!-- Selected Asset Display -->
      <div class="selected-asset-display" *ngIf="selectedAsset" (click)="openPicker()">
        <div class="asset-preview">
          <img 
            *ngIf="selectedAsset.type === AssetType.IMAGE" 
            [src]="selectedAsset.url" 
            [alt]="selectedAsset.name"
            class="preview-image"
            loading="lazy"
          >
          <div 
            *ngIf="selectedAsset.type !== AssetType.IMAGE"
            class="preview-placeholder"
            [style.background-color]="getAssetTypeColor(selectedAsset.type)"
          >
            <span class="preview-icon">{{ getAssetTypeIcon(selectedAsset.type) }}</span>
          </div>
          
          <!-- Asset Type Badge -->
          <div class="asset-type-badge">
            {{ selectedAsset.type | titlecase }}
          </div>
        </div>
        
        <div class="asset-details">
          <div class="asset-name" [title]="selectedAsset.name">{{ selectedAsset.name }}</div>
          <div class="asset-meta">
            <span class="meta-item">
              <i class="bi bi-file-earmark"></i>
              {{ formatFileSize(selectedAsset.size) }}
            </span>
            <span class="meta-item" *ngIf="selectedAsset.dimensions">
              <i class="bi bi-aspect-ratio"></i>
              {{ selectedAsset.dimensions.width }}×{{ selectedAsset.dimensions.height }}
            </span>
            <span class="meta-item" *ngIf="selectedAsset.usageCount > 0">
              <i class="bi bi-link-45deg"></i>
              Used {{ selectedAsset.usageCount }} time(s)
            </span>
          </div>
          <div class="asset-tags" *ngIf="selectedAsset.tags.length > 0">
            <span class="tag" *ngFor="let tag of selectedAsset.tags.slice(0, 3)">{{ tag }}</span>
            <span class="tag-more" *ngIf="selectedAsset.tags.length > 3">+{{ selectedAsset.tags.length - 3 }}</span>
          </div>
        </div>
        
        <div class="asset-actions">
          <button 
            class="action-btn optimize-btn"
            (click)="$event.stopPropagation(); openOptimization()"
            [disabled]="disabled || selectedAsset.type !== AssetType.IMAGE"
            title="Optimize asset"
            *ngIf="showOptimization && selectedAsset?.type === AssetType.IMAGE"
          >
            <i class="bi bi-speedometer2"></i>
          </button>
          <button 
            class="action-btn replace-btn"
            (click)="$event.stopPropagation(); openReplacement()"
            [disabled]="disabled"
            title="Replace asset"
            *ngIf="showReplacement"
          >
            <i class="bi bi-arrow-repeat"></i>
          </button>
          <button 
            class="action-btn info-btn"
            (click)="$event.stopPropagation(); showAssetInfo()"
            [disabled]="disabled"
            title="Asset information"
          >
            <i class="bi bi-info-circle"></i>
          </button>
          <button 
            class="action-btn remove-btn"
            (click)="$event.stopPropagation(); removeAsset()"
            [disabled]="disabled"
            title="Remove asset"
          >
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!selectedAsset" (click)="openPicker()">
        <div class="empty-content">
          <div class="empty-icon">
            <i class="bi bi-image" *ngIf="allowedTypes.length === 0 || allowedTypes.includes(AssetType.IMAGE)"></i>
            <i class="bi bi-file-earmark" *ngIf="allowedTypes.length > 0 && !allowedTypes.includes(AssetType.IMAGE)"></i>
          </div>
          <div class="empty-text">
            <div class="empty-title">{{ placeholder || 'Select an asset' }}</div>
            <div class="empty-subtitle">Click to browse or drag and drop</div>
            <div class="empty-types" *ngIf="allowedTypes.length > 0">
              Allowed: {{ getAllowedTypesDisplay() }}
            </div>
          </div>
          <div class="empty-actions">
            <button class="btn btn-outline-primary btn-sm" [disabled]="disabled">
              <i class="bi bi-folder2-open"></i>
              Browse Assets
            </button>
          </div>
        </div>

        <!-- Drag and Drop Overlay -->
        <div class="drag-overlay" [class.active]="isDragOver && !disabled && showUpload">
          <div class="drag-content">
            <i class="bi bi-cloud-upload"></i>
            <span>Drop to upload and select</span>
          </div>
        </div>
      </div>

      <!-- Help Text -->
      <div class="help-text" *ngIf="helpText">
        <i class="bi bi-info-circle"></i>
        {{ helpText }}
      </div>

      <!-- Validation Error -->
      <div class="validation-error" *ngIf="validationError">
        <i class="bi bi-exclamation-triangle"></i>
        {{ validationError }}
      </div>
    </div>

    <!-- Asset Picker Modal -->
    <app-asset-picker
      [isVisible]="showPicker"
      [config]="pickerConfig"
      [selectedAssets]="selectedAsset ? [selectedAsset] : []"
      (assetSelected)="onAssetSelected($event)"
      (closed)="closePicker()"
    ></app-asset-picker>

    <!-- Asset Replacement Picker -->
    <app-asset-replacement-picker
      [isVisible]="showReplacementPicker"
      [originalAsset]="selectedAsset"
      [suggestions]="replacementSuggestions"
      (assetSelected)="onAssetReplacement($event)"
      (closed)="closeReplacement()"
    ></app-asset-replacement-picker>

    <!-- Asset Optimization Panel -->
    <app-asset-optimization
      [asset]="selectedAsset"
      [isVisible]="showOptimizationPanel"
      (optimizationCompleted)="onOptimizationCompleted($event)"
      (closed)="closeOptimization()"
    ></app-asset-optimization>

    <!-- Asset Info Modal -->
    <div class="asset-info-modal" [class.active]="showAssetInfoModal" (click)="closeAssetInfo()">
      <div class="modal-content" (click)="$event.stopPropagation()" *ngIf="selectedAsset">
        <div class="modal-header">
          <h4>Asset Information</h4>
          <button class="btn btn-outline-secondary btn-sm" (click)="closeAssetInfo()">
            <i class="bi bi-x"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="asset-info-grid">
            <div class="info-item">
              <label>Name</label>
              <span>{{ selectedAsset.name }}</span>
            </div>
            <div class="info-item">
              <label>Type</label>
              <span>{{ selectedAsset.type | titlecase }}</span>
            </div>
            <div class="info-item">
              <label>Size</label>
              <span>{{ formatFileSize(selectedAsset.size) }}</span>
            </div>
            <div class="info-item" *ngIf="selectedAsset.dimensions">
              <label>Dimensions</label>
              <span>{{ selectedAsset.dimensions.width }} × {{ selectedAsset.dimensions.height }}</span>
            </div>
            <div class="info-item">
              <label>Uploaded</label>
              <span>{{ formatDate(selectedAsset.uploadedAt) }}</span>
            </div>
            <div class="info-item">
              <label>Usage Count</label>
              <span>{{ selectedAsset.usageCount }}</span>
            </div>
            <div class="info-item full-width" *ngIf="selectedAsset.tags.length > 0">
              <label>Tags</label>
              <div class="tags-list">
                <span class="tag" *ngFor="let tag of selectedAsset.tags">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./enhanced-asset-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EnhancedAssetInputComponent),
      multi: true
    }
  ]
})
export class EnhancedAssetInputComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() placeholder = '';
  @Input() allowedTypes: AssetType[] = [];
  @Input() disabled = false;
  @Input() required = false;
  @Input() showUpload = true;
  @Input() showOptimization = true;
  @Input() showReplacement = true;
  @Input() label = '';
  @Input() helpText = '';
  @Input() projectId?: string;
  @Input() sectionId?: string;
  @Input() variableName?: string;
  @Input() validationError?: string;
  
  @Output() assetChanged = new EventEmitter<Asset | null>();
  @Output() assetUploaded = new EventEmitter<Asset>();
  @Output() assetOptimized = new EventEmitter<Asset>();
  @Output() assetReplaced = new EventEmitter<{ oldAsset: Asset; newAsset: Asset }>();

  selectedAsset: Asset | null = null;
  showPicker = false;
  showOptimizationPanel = false;
  showReplacementPicker = false;
  showAssetInfoModal = false;
  isDragOver = false;
  replacementSuggestions: Asset[] = [];

  // Enums for template
  AssetType = AssetType;

  // ControlValueAccessor implementation
  private onChange = (value: Asset | null) => {};
  private onTouched = () => {};
  private destroy$ = new Subject<void>();

  constructor(
    private assetService: AssetService,
    private assetReplacementService: AssetReplacementService,
    private assetIntegrationService: AssetIntegrationService
  ) {}

  ngOnInit(): void {
    this.setupDragAndDrop();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup drag and drop functionality
   */
  private setupDragAndDrop(): void {
    // Add event listeners for drag and drop
    document.addEventListener('dragover', this.onDocumentDragOver.bind(this));
    document.addEventListener('dragleave', this.onDocumentDragLeave.bind(this));
    document.addEventListener('drop', this.onDocumentDrop.bind(this));
  }

  /**
   * Get integration context
   */
  private get integrationContext(): AssetIntegrationContext {
    return {
      projectId: this.projectId,
      sectionId: this.sectionId,
      variableName: this.variableName,
      componentType: 'section-editor'
    };
  }

  /**
   * Get picker configuration
   */
  get pickerConfig(): AssetPickerConfig {
    const baseConfig = this.assetIntegrationService.getAssetPickerConfig(this.integrationContext);
    
    return {
      ...baseConfig,
      allowedTypes: this.allowedTypes.length > 0 ? this.allowedTypes : baseConfig.allowedTypes,
      title: this.label || baseConfig.title,
      showUpload: this.showUpload,
      showOptimization: this.showOptimization,
      showReplacement: this.showReplacement
    };
  }

  /**
   * Open asset picker
   */
  openPicker(): void {
    if (this.disabled) return;
    this.showPicker = true;
    this.onTouched();
  }

  /**
   * Close asset picker
   */
  closePicker(): void {
    this.showPicker = false;
  }

  /**
   * Handle asset selection from picker
   */
  async onAssetSelected(asset: Asset): Promise<void> {
    try {
      await this.assetIntegrationService.handleAssetSelection(asset, this.integrationContext);
      this.setAsset(asset);
      this.closePicker();
    } catch (error) {
      console.error('Failed to handle asset selection:', error);
      // Fallback to basic selection
      this.setAsset(asset);
      this.closePicker();
    }
  }

  /**
   * Set selected asset
   */
  private setAsset(asset: Asset | null): void {
    const oldAsset = this.selectedAsset;
    this.selectedAsset = asset;
    this.onChange(asset);
    this.assetChanged.emit(asset);

    // Track asset usage if context is provided
    if (asset && this.projectId && this.sectionId && this.variableName) {
      this.assetService.trackAssetUsage(asset.id, this.projectId, this.sectionId, this.variableName);
    }
  }

  /**
   * Remove selected asset
   */
  removeAsset(): void {
    if (this.disabled) return;
    this.setAsset(null);
  }

  /**
   * Open asset optimization panel
   */
  openOptimization(): void {
    if (this.disabled || !this.selectedAsset || this.selectedAsset.type !== AssetType.IMAGE) return;
    this.showOptimizationPanel = true;
  }

  /**
   * Close optimization panel
   */
  closeOptimization(): void {
    this.showOptimizationPanel = false;
  }

  /**
   * Handle optimization completion
   */
  onOptimizationCompleted(optimizedAsset: Asset): void {
    this.setAsset(optimizedAsset);
    this.assetOptimized.emit(optimizedAsset);
    this.closeOptimization();
  }

  /**
   * Open replacement picker
   */
  async openReplacement(): Promise<void> {
    if (this.disabled || !this.selectedAsset) return;
    
    try {
      // Load replacement suggestions
      this.replacementSuggestions = await this.assetReplacementService.getReplacementSuggestions(this.selectedAsset.id);
      this.showReplacementPicker = true;
    } catch (error) {
      console.error('Failed to load replacement suggestions:', error);
      // Fallback to regular picker
      this.showPicker = true;
    }
  }

  /**
   * Close replacement picker
   */
  closeReplacement(): void {
    this.showReplacementPicker = false;
    this.replacementSuggestions = [];
  }

  /**
   * Handle asset replacement
   */
  async onAssetReplacement(newAsset: Asset): Promise<void> {
    if (!this.selectedAsset) return;

    const oldAsset = this.selectedAsset;
    
    try {
      // If we have project/section context, replace in specific location
      if (this.projectId && this.sectionId && this.variableName) {
        await this.assetReplacementService.replaceAssetInSection(
          this.projectId,
          this.sectionId,
          oldAsset.id,
          newAsset.id
        );
      }

      // Update the selected asset
      this.setAsset(newAsset);
      this.assetReplaced.emit({ oldAsset, newAsset });
      this.closeReplacement();

      console.log(`Successfully replaced ${oldAsset.name} with ${newAsset.name}`);
    } catch (error) {
      console.error('Failed to replace asset:', error);
    }
  }

  /**
   * Show asset information modal
   */
  showAssetInfo(): void {
    if (!this.selectedAsset) return;
    this.showAssetInfoModal = true;
  }

  /**
   * Close asset information modal
   */
  closeAssetInfo(): void {
    this.showAssetInfoModal = false;
  }

  /**
   * Handle document drag over
   */
  private onDocumentDragOver(event: DragEvent): void {
    if (this.disabled || !this.showUpload) return;
    event.preventDefault();
    this.isDragOver = true;
  }

  /**
   * Handle document drag leave
   */
  private onDocumentDragLeave(event: DragEvent): void {
    if (this.disabled || !this.showUpload) return;
    // Only hide drag overlay if leaving the document
    if (!event.relatedTarget) {
      this.isDragOver = false;
    }
  }

  /**
   * Handle document drop
   */
  private onDocumentDrop(event: DragEvent): void {
    if (this.disabled || !this.showUpload) return;
    event.preventDefault();
    this.isDragOver = false;

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.uploadFile(files[0]); // Only take the first file for single selection
    }
  }

  /**
   * Upload file and select it
   */
  private async uploadFile(file: File): Promise<void> {
    try {
      // Validate file type if allowed types are specified
      if (this.allowedTypes.length > 0) {
        const fileType = this.getFileAssetType(file);
        if (!this.allowedTypes.includes(fileType)) {
          console.warn(`File type ${fileType} not allowed`);
          return;
        }
      }

      // Validate file
      const validation = await this.assetService.validateAsset(file);
      if (!validation.isValid) {
        console.error(`Invalid file ${file.name}:`, validation.errors);
        return;
      }

      // Upload asset
      const asset = await this.assetService.uploadAsset(file, {
        optimize: true,
        generateThumbnails: true,
        formats: ['webp'],
        quality: 85
      });

      // Select the uploaded asset
      this.setAsset(asset);
      this.assetUploaded.emit(asset);

      console.log(`Successfully uploaded and selected: ${asset.name}`);
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
    }
  }

  /**
   * Get asset type from file
   */
  private getFileAssetType(file: File): AssetType {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.startsWith('image/')) return AssetType.IMAGE;
    if (mimeType.startsWith('video/')) return AssetType.VIDEO;
    if (mimeType.startsWith('audio/')) return AssetType.AUDIO;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return AssetType.DOCUMENT;
    if (mimeType.includes('font')) return AssetType.FONT;
    
    return AssetType.OTHER;
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
   * Format date
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
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

  // ControlValueAccessor implementation
  writeValue(value: Asset | null): void {
    this.selectedAsset = value;
  }

  registerOnChange(fn: (value: Asset | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /**
   * Get allowed types display string
   */
  getAllowedTypesDisplay(): string {
    return this.allowedTypes.map(type => {
      switch (type) {
        case AssetType.IMAGE: return 'Images';
        case AssetType.VIDEO: return 'Videos';
        case AssetType.AUDIO: return 'Audio';
        case AssetType.DOCUMENT: return 'Documents';
        case AssetType.FONT: return 'Fonts';
        case AssetType.ICON: return 'Icons';
        default: return 'Files';
      }
    }).join(', ');
  }
}