import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { AssetService } from '../../services/asset.service';
import { AssetOptimizationComponent } from '../asset-picker/asset-optimization.component';
import { 
  Asset, 
  AssetType, 
  AssetSearchOptions, 
  AssetSortBy, 
  SortOrder,
  AssetUsage,
  AssetProcessingJob
} from '../../models/asset.interface';

export interface AssetViewMode {
  GRID: 'grid';
  LIST: 'list';
}

export interface AssetFilter {
  type?: AssetType;
  tags: string[];
  sizeRange?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
}

@Component({
  selector: 'app-asset-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asset-manager.component.html',
  styleUrls: ['./asset-manager.component.css']
})
export class AssetManagerComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('dropZone') dropZone!: ElementRef<HTMLDivElement>;

  // Component state
  assets: Asset[] = [];
  filteredAssets: Asset[] = [];
  selectedAssets: Set<string> = new Set();
  availableTags: string[] = [];
  
  // View configuration
  viewMode: 'grid' | 'list' = 'grid';
  itemsPerPage = 20;
  currentPage = 1;
  totalPages = 1;
  
  // Search and filtering
  searchQuery = '';
  activeFilters: AssetFilter = { tags: [] };
  sortBy: AssetSortBy = AssetSortBy.UPLOAD_DATE;
  sortOrder: SortOrder = SortOrder.DESC;
  
  // Upload state
  isDragOver = false;
  uploadProgress: Map<string, number> = new Map();
  processingJobs: Map<string, AssetProcessingJob> = new Map();
  
  // UI state
  isLoading = false;
  showFilters = false;
  showUploadModal = false;
  showAssetDetails = false;
  selectedAssetForDetails: Asset | null = null;
  selectedAssetUsage: AssetUsage[] = [];
  
  // Enums for template
  AssetType = AssetType;
  AssetSortBy = AssetSortBy;
  SortOrder = SortOrder;
  
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private assetService: AssetService,
    private cdr: ChangeDetectorRef
  ) {
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  ngOnInit(): void {
    this.loadAssets();
    this.loadAvailableTags();
    this.setupAssetUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Asset loading and management
  async loadAssets(): Promise<void> {
    this.isLoading = true;
    try {
      const searchOptions: AssetSearchOptions = {
        sortBy: this.sortBy,
        sortOrder: this.sortOrder
      };
      
      this.assets = await this.assetService.getAssets(searchOptions);
      this.applyFilters();
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadAvailableTags(): Promise<void> {
    try {
      this.availableTags = await this.assetService.getAllTags();
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }

  private setupAssetUpdates(): void {
    this.assetService.getAssetsUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(assets => {
        this.assets = assets;
        this.applyFilters();
        this.cdr.detectChanges();
      });
  }

  // Search and filtering
  onSearchChange(event: any): void {
    const query = event.target?.value
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  private async performSearch(query: string): Promise<void> {
    if (!query.trim()) {
      this.applyFilters();
      return;
    }

    try {
      const searchResults = await this.assetService.searchAssets(query);
      this.filteredAssets = this.applyActiveFilters(searchResults);
      this.updatePagination();
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  applyFilters(): void {
    this.filteredAssets = this.applyActiveFilters(this.assets);
    this.updatePagination();
  }

  private applyActiveFilters(assets: Asset[]): Asset[] {
    let filtered = [...assets];

    // Type filter
    if (this.activeFilters.type) {
      filtered = filtered.filter(asset => asset.type === this.activeFilters.type);
    }

    // Tags filter
    if (this.activeFilters.tags.length > 0) {
      filtered = filtered.filter(asset =>
        this.activeFilters.tags.some(tag => asset.tags.includes(tag))
      );
    }

    // Size filter
    if (this.activeFilters.sizeRange) {
      const { min, max } = this.activeFilters.sizeRange;
      filtered = filtered.filter(asset => asset.size >= min && asset.size <= max);
    }

    // Date filter
    if (this.activeFilters.dateRange) {
      const { start, end } = this.activeFilters.dateRange;
      filtered = filtered.filter(asset => {
        const uploadDate = new Date(asset.uploadedAt);
        return uploadDate >= start && uploadDate <= end;
      });
    }

    return filtered;
  }

  // Sorting
  onSortChange(sortBy: AssetSortBy, sortOrder: SortOrder): void {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.loadAssets();
  }

  // View mode
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  // Pagination
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredAssets.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
  }

  get paginatedAssets(): Asset[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredAssets.slice(start, end);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Asset selection
  toggleAssetSelection(assetId: string): void {
    if (this.selectedAssets.has(assetId)) {
      this.selectedAssets.delete(assetId);
    } else {
      this.selectedAssets.add(assetId);
    }
  }

  selectAllAssets(): void {
    this.paginatedAssets.forEach(asset => {
      this.selectedAssets.add(asset.id);
    });
  }

  clearSelection(): void {
    this.selectedAssets.clear();
  }

  get hasSelection(): boolean {
    return this.selectedAssets.size > 0;
  }

  // File upload - Drag and drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length > 0) {
      this.uploadFiles(files);
    }
  }

  // File upload - File input
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length > 0) {
      this.uploadFiles(files);
    }
    input.value = ''; // Reset input
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  // File upload processing
  async uploadFiles(files: File[]): Promise<void> {
    for (const file of files) {
      try {
        // Validate file
        const validation = await this.assetService.validateAsset(file);
        if (!validation.isValid) {
          console.error(`Invalid file ${file.name}:`, validation.errors);
          continue;
        }

        // Start upload with progress tracking
        const uploadId = `upload_${Date.now()}_${Math.random()}`;
        this.uploadProgress.set(uploadId, 0);

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          const currentProgress = this.uploadProgress.get(uploadId) || 0;
          if (currentProgress < 90) {
            this.uploadProgress.set(uploadId, currentProgress + 10);
            this.cdr.detectChanges();
          }
        }, 200);

        // Upload asset
        const asset = await this.assetService.uploadAsset(file, {
          optimize: true,
          generateThumbnails: true,
          formats: ['webp'],
          quality: 85
        });

        // Complete progress
        clearInterval(progressInterval);
        this.uploadProgress.set(uploadId, 100);
        
        // Remove progress after delay
        setTimeout(() => {
          this.uploadProgress.delete(uploadId);
          this.cdr.detectChanges();
        }, 1000);

        console.log(`Successfully uploaded: ${asset.name}`);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }
  }

  // Asset actions
  async deleteSelectedAssets(): Promise<void> {
    if (!this.hasSelection) return;

    const assetIds = Array.from(this.selectedAssets);
    
    try {
      await this.assetService.deleteMultipleAssets(assetIds);
      this.clearSelection();
      console.log(`Deleted ${assetIds.length} assets`);
    } catch (error) {
      console.error('Failed to delete assets:', error);
    }
  }

  async deleteAsset(assetId: string): Promise<void> {
    try {
      await this.assetService.deleteAsset(assetId);
      console.log(`Deleted asset: ${assetId}`);
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  }

  // Asset details and usage
  async showAssetDetailsModal(asset: Asset): Promise<void> {
    this.selectedAssetForDetails = asset;
    this.showAssetDetails = true;
    
    // Load usage information
    try {
      this.selectedAssetUsage = await this.assetService.getAssetUsage(asset.id);
    } catch (error) {
      console.error('Failed to load asset usage:', error);
      this.selectedAssetUsage = [];
    }
  }

  closeAssetDetails(): void {
    this.showAssetDetails = false;
    this.selectedAssetForDetails = null;
    this.selectedAssetUsage = [];
  }

  // Asset tagging
  async addTagToAssets(tag: string): Promise<void> {
    if (!this.hasSelection || !tag.trim()) return;

    const assetIds = Array.from(this.selectedAssets);
    
    try {
      for (const assetId of assetIds) {
        await this.assetService.addTagsToAsset(assetId, [tag.trim()]);
      }
      await this.loadAvailableTags();
      console.log(`Added tag "${tag}" to ${assetIds.length} assets`);
    } catch (error) {
      console.error('Failed to add tags:', error);
    }
  }

  async removeTagFromAssets(tag: string): Promise<void> {
    if (!this.hasSelection) return;

    const assetIds = Array.from(this.selectedAssets);
    
    try {
      for (const assetId of assetIds) {
        await this.assetService.removeTagsFromAsset(assetId, [tag]);
      }
      await this.loadAvailableTags();
      console.log(`Removed tag "${tag}" from ${assetIds.length} assets`);
    } catch (error) {
      console.error('Failed to remove tags:', error);
    }
  }

  // Filter management
  toggleFilter(type: AssetType): void {
    this.activeFilters.type = this.activeFilters.type === type ? undefined : type;
    this.applyFilters();
  }

  toggleTagFilter(tag: string): void {
    const index = this.activeFilters.tags.indexOf(tag);
    if (index > -1) {
      this.activeFilters.tags.splice(index, 1);
    } else {
      this.activeFilters.tags.push(tag);
    }
    this.applyFilters();
  }

  clearFilters(): void {
    this.activeFilters = { tags: [] };
    this.searchQuery = '';
    this.applyFilters();
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

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