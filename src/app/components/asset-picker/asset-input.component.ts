import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AssetPickerComponent, AssetPickerConfig } from './asset-picker.component';
import { Asset, AssetType } from '../../models/asset.interface';
import { AssetService } from '../../services/asset.service';

@Component({
  selector: 'app-asset-input',
  standalone: true,
  imports: [CommonModule, AssetPickerComponent],
  template: `
    <!-- Asset Input Display -->
    <div class="asset-input-container" [class.has-value]="selectedAsset" [class.disabled]="disabled">
      
      <!-- Selected Asset Display -->
      <div class="selected-asset" *ngIf="selectedAsset" (click)="openPicker()">
        <div class="asset-preview">
          <img 
            *ngIf="selectedAsset.type === AssetType.IMAGE" 
            [src]="selectedAsset.url" 
            [alt]="selectedAsset.name"
            class="preview-image"
          >
          <div 
            *ngIf="selectedAsset.type !== AssetType.IMAGE"
            class="preview-placeholder"
            [style.background-color]="getAssetTypeColor(selectedAsset.type)"
          >
            <span class="preview-icon">{{ getAssetTypeIcon(selectedAsset.type) }}</span>
          </div>
        </div>
        
        <div class="asset-info">
          <div class="asset-name" [title]="selectedAsset.name">{{ selectedAsset.name }}</div>
          <div class="asset-meta">
            <span class="asset-type">{{ selectedAsset.type | titlecase }}</span>
            <span class="asset-size">{{ formatFileSize(selectedAsset.size) }}</span>
            <span class="asset-dimensions" *ngIf="selectedAsset.dimensions">
              {{ selectedAsset.dimensions.width }}×{{ selectedAsset.dimensions.height }}
            </span>
          </div>
        </div>
        
        <div class="asset-actions">
          <button 
            class="action-btn replace-btn"
            (click)="$event.stopPropagation(); openPicker()"
            [disabled]="disabled"
            title="Replace asset"
          >
            <i class="bi bi-arrow-repeat"></i>
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
        <div class="empty-icon">
          <i class="bi bi-image"></i>
        </div>
        <div class="empty-text">
          <div class="empty-title">{{ placeholder || 'Select an asset' }}</div>
          <div class="empty-subtitle">Click to browse or drag and drop</div>
        </div>
        <div class="empty-actions">
          <button class="btn btn-outline-primary btn-sm" [disabled]="disabled">
            <i class="bi bi-folder2-open"></i>
            Browse
          </button>
        </div>
      </div>

      <!-- Drag and Drop Overlay -->
      <div class="drag-overlay" [class.active]="isDragOver && !disabled">
        <div class="drag-content">
          <i class="bi bi-cloud-upload"></i>
          <span>Drop to upload and select</span>
        </div>
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
  `,
  styleUrls: ['./asset-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AssetInputComponent),
      multi: true
    }
  ]
})
export class AssetInputComponent implements ControlValueAccessor {
  @Input() placeholder = '';
  @Input() allowedTypes: AssetType[] = [];
  @Input() disabled = false;
  @Input() required = false;
  @Input() showUpload = true;
  @Input() label = '';
  @Input() helpText = '';
  
  @Output() assetChanged = new EventEmitter<Asset | null>();
  @Output() assetUploaded = new EventEmitter<Asset>();

  selectedAsset: Asset | null = null;
  showPicker = false;
  isDragOver = false;

  // Enums for template
  AssetType = AssetType;

  // ControlValueAccessor implementation
  private onChange = (value: Asset | null) => {};
  private onTouched = () => {};

  constructor(private assetService: AssetService) {}

  /**
   * Get picker configuration
   */
  get pickerConfig(): AssetPickerConfig {
    return {
      allowedTypes: this.allowedTypes.length > 0 ? this.allowedTypes : undefined,
      multiSelect: false,
      showUpload: this.showUpload,
      title: this.label || 'Select Asset',
      emptyMessage: 'No assets found'
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
  onAssetSelected(asset: Asset): void {
    this.setAsset(asset);
    this.closePicker();
  }

  /**
   * Set selected asset
   */
  private setAsset(asset: Asset | null): void {
    this.selectedAsset = asset;
    this.onChange(asset);
    this.assetChanged.emit(asset);
  }

  /**
   * Remove selected asset
   */
  removeAsset(): void {
    if (this.disabled) return;
    this.setAsset(null);
  }

  /**
   * Handle drag and drop events
   */
  onDragOver(event: DragEvent): void {
    if (this.disabled || !this.showUpload) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    if (this.disabled || !this.showUpload) return;
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    if (this.disabled || !this.showUpload) return;
    event.preventDefault();
    event.stopPropagation();
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
}