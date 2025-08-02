import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from "rxjs";
import { AssetService } from "../../services/asset.service";
import { DevicePreset } from "../responsive-design-editor/responsive-design-editor.component";
import {
  Asset,
  AssetType,
  AssetSearchOptions,
  AssetSortBy,
  SortOrder,
} from "../../models/asset.interface";
import { DeviceType } from "../../models/section.interface";

export interface AssetPickerConfig {
  allowedTypes?: AssetType[];
  multiSelect?: boolean;
  showUpload?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  maxSelections?: number;
  title?: string;
  emptyMessage?: string;
}

@Component({
  selector: "app-asset-picker",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./asset-picker.component.html",
  styleUrls: ["./asset-picker.component.css"],
})
export class AssetPickerComponent implements OnInit, OnDestroy {
  @Input() isVisible = false;
  @Input() config: AssetPickerConfig = {};
  @Input() selectedAssets: Asset[] = [];

  // Responsive design inputs
  @Input() currentDevice: DevicePreset | null = null;
  @Input() enableResponsiveOptimization: boolean = false;

  @Output() assetSelected = new EventEmitter<Asset>();
  @Output() assetsSelected = new EventEmitter<Asset[]>();
  @Output() selectionChanged = new EventEmitter<Asset[]>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild("fileInput") fileInput!: ElementRef<HTMLInputElement>;

  // Component state
  assets: Asset[] = [];
  filteredAssets: Asset[] = [];
  currentSelections: Set<string> = new Set();

  // Search and filtering
  searchQuery = "";
  activeTypeFilter: AssetType | null = null;
  sortBy: AssetSortBy = AssetSortBy.UPLOAD_DATE;
  sortOrder: SortOrder = SortOrder.DESC;

  // Pagination
  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 1;

  // UI state
  isLoading = false;
  viewMode: "grid" | "list" = "grid";
  isDragOver = false;
  uploadProgress: Map<string, number> = new Map();

  // Enums for template
  AssetType = AssetType;
  AssetSortBy = AssetSortBy;
  SortOrder = SortOrder;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(private assetService: AssetService) {
    // Setup search debouncing
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.performSearch(query);
      });
  }

  ngOnInit(): void {
    this.initializeSelections();
    this.loadAssets();
    this.setupAssetUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize current selections from input
   */
  private initializeSelections(): void {
    this.currentSelections.clear();
    this.selectedAssets.forEach((asset) => {
      this.currentSelections.add(asset.id);
    });
  }

  /**
   * Load assets from service
   */
  private async loadAssets(): Promise<void> {
    this.isLoading = true;
    try {
      const searchOptions: AssetSearchOptions = {
        type: this.activeTypeFilter || undefined,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      };

      // Filter by allowed types if specified
      if (this.config.allowedTypes && this.config.allowedTypes.length > 0) {
        if (
          !this.activeTypeFilter ||
          !this.config.allowedTypes.includes(this.activeTypeFilter)
        ) {
          // If no type filter is active or it's not in allowed types, get all allowed types
          const allAssets = await this.assetService.getAssets(searchOptions);
          this.assets = allAssets.filter((asset) =>
            this.config.allowedTypes!.includes(asset.type)
          );
        } else {
          this.assets = await this.assetService.getAssets(searchOptions);
        }
      } else {
        this.assets = await this.assetService.getAssets(searchOptions);
      }

      this.applyFilters();
    } catch (error) {
      console.error("Failed to load assets:", error);
      this.assets = [];
      this.filteredAssets = [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Setup asset updates subscription
   */
  private setupAssetUpdates(): void {
    this.assetService
      .getAssetsUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadAssets();
      });
  }

  /**
   * Apply current filters to assets
   */
  private applyFilters(): void {
    let filtered = [...this.assets];

    // Apply type filter
    if (this.activeTypeFilter) {
      filtered = filtered.filter(
        (asset) => asset.type === this.activeTypeFilter
      );
    }

    // Apply allowed types filter
    if (this.config.allowedTypes && this.config.allowedTypes.length > 0) {
      filtered = filtered.filter((asset) =>
        this.config.allowedTypes!.includes(asset.type)
      );
    }

    this.filteredAssets = filtered;
    this.updatePagination();
  }

  /**
   * Update pagination
   */
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredAssets.length / this.itemsPerPage);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
  }

  /**
   * Get paginated assets
   */
  get paginatedAssets(): Asset[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredAssets.slice(start, end);
  }

  /**
   * Handle search input change
   */
  onSearchChange(event: any): void {
    const query = event.target?.value || "";
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  /**
   * Perform search
   */
  private async performSearch(query: string): Promise<void> {
    if (!query.trim()) {
      this.applyFilters();
      return;
    }

    try {
      const searchResults = await this.assetService.searchAssets(query);
      let filtered = searchResults;

      // Apply allowed types filter to search results
      if (this.config.allowedTypes && this.config.allowedTypes.length > 0) {
        filtered = filtered.filter((asset) =>
          this.config.allowedTypes!.includes(asset.type)
        );
      }

      // Apply type filter to search results
      if (this.activeTypeFilter) {
        filtered = filtered.filter(
          (asset) => asset.type === this.activeTypeFilter
        );
      }

      this.filteredAssets = filtered;
      this.updatePagination();
    } catch (error) {
      console.error("Search failed:", error);
    }
  }

  /**
   * Set type filter
   */
  setTypeFilter(type: AssetType | null): void {
    this.activeTypeFilter = type;
    this.applyFilters();
  }

  /**
   * Set sort options
   */
  setSortOptions(sortBy: AssetSortBy, sortOrder: SortOrder): void {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.loadAssets();
  }

  /**
   * Set view mode
   */
  setViewMode(mode: "grid" | "list"): void {
    this.viewMode = mode;
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  /**
   * Toggle asset selection
   */
  toggleAssetSelection(asset: Asset): void {
    if (this.currentSelections.has(asset.id)) {
      this.currentSelections.delete(asset.id);
    } else {
      // Check max selections limit
      if (
        this.config.maxSelections &&
        this.currentSelections.size >= this.config.maxSelections
      ) {
        return;
      }

      // For single select, clear previous selections
      if (!this.config.multiSelect) {
        this.currentSelections.clear();
      }

      this.currentSelections.add(asset.id);
    }

    this.emitSelectionChange();
  }

  /**
   * Select asset (for single selection)
   */
  selectAsset(asset: Asset): void {
    if (!this.config.multiSelect) {
      this.assetSelected.emit(asset);
      this.close();
    } else {
      this.toggleAssetSelection(asset);
    }
  }

  /**
   * Confirm selection (for multi-select)
   */
  confirmSelection(): void {
    const selectedAssets = this.assets.filter((asset) =>
      this.currentSelections.has(asset.id)
    );
    this.assetsSelected.emit(selectedAssets);
    this.close();
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.currentSelections.clear();
    this.emitSelectionChange();
  }

  /**
   * Emit selection change event
   */
  private emitSelectionChange(): void {
    const selectedAssets = this.assets.filter((asset) =>
      this.currentSelections.has(asset.id)
    );
    this.selectionChanged.emit(selectedAssets);
  }

  /**
   * Check if asset is selected
   */
  isAssetSelected(asset: Asset): boolean {
    return this.currentSelections.has(asset.id);
  }

  /**
   * Get selection count
   */
  get selectionCount(): number {
    return this.currentSelections.size;
  }

  /**
   * Check if max selections reached
   */
  get isMaxSelectionsReached(): boolean {
    return !!(
      this.config.maxSelections &&
      this.currentSelections.size >= this.config.maxSelections
    );
  }

  /**
   * Close the picker
   */
  close(): void {
    this.closed.emit();
  }

  /**
   * Handle file upload
   */
  triggerFileUpload(): void {
    this.fileInput.nativeElement.click();
  }

  /**
   * Handle file input change
   */
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length > 0) {
      this.uploadFiles(files);
    }
    input.value = ""; // Reset input
  }

  /**
   * Handle drag and drop
   */
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

  /**
   * Upload files
   */
  private async uploadFiles(files: File[]): Promise<void> {
    for (const file of files) {
      try {
        // Validate file type if allowed types are specified
        if (this.config.allowedTypes && this.config.allowedTypes.length > 0) {
          const fileType = this.getFileAssetType(file);
          if (!this.config.allowedTypes.includes(fileType)) {
            console.warn(`File type ${fileType} not allowed`);
            continue;
          }
        }

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
          }
        }, 200);

        // Determine upload options based on responsive optimization setting
        let uploadOptions: any = {
          optimize: true,
          generateThumbnails: true,
          formats: ["webp"],
          quality: 85,
        };

        // Add responsive optimization if enabled
        if (this.enableResponsiveOptimization && this.isImageFile(file)) {
          uploadOptions = {
            ...uploadOptions,
            generateResponsiveVersions: true,
            deviceTypes: [
              DeviceType.MOBILE,
              DeviceType.TABLET,
              DeviceType.DESKTOP,
            ],
          };
        }

        // Upload asset
        const asset = await this.assetService.uploadAsset(file, uploadOptions);

        // Complete progress
        clearInterval(progressInterval);
        this.uploadProgress.set(uploadId, 100);

        // Remove progress after delay
        setTimeout(() => {
          this.uploadProgress.delete(uploadId);
        }, 1000);

        // Auto-select uploaded asset if single select
        if (!this.config.multiSelect) {
          this.selectAsset(asset);
        }

        console.log(`Successfully uploaded: ${asset.name}`);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }
  }

  /**
   * Get asset type from file
   */
  private getFileAssetType(file: File): AssetType {
    const mimeType = file.type.toLowerCase();

    if (mimeType.startsWith("image/")) return AssetType.IMAGE;
    if (mimeType.startsWith("video/")) return AssetType.VIDEO;
    if (mimeType.startsWith("audio/")) return AssetType.AUDIO;
    if (mimeType.includes("pdf") || mimeType.includes("document"))
      return AssetType.DOCUMENT;
    if (mimeType.includes("font")) return AssetType.FONT;

    return AssetType.OTHER;
  }

  /**
   * Get available type filters
   */
  get availableTypeFilters(): AssetType[] {
    if (this.config.allowedTypes && this.config.allowedTypes.length > 0) {
      return this.config.allowedTypes;
    }
    return Object.values(AssetType);
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
      [AssetType.IMAGE]: "🖼️",
      [AssetType.VIDEO]: "🎥",
      [AssetType.AUDIO]: "🎵",
      [AssetType.DOCUMENT]: "📄",
      [AssetType.FONT]: "🔤",
      [AssetType.ICON]: "⭐",
      [AssetType.OTHER]: "📎",
    };
    return icons[type] || "📎";
  }

  /**
   * Get asset type color
   */
  getAssetTypeColor(type: AssetType): string {
    const colors = {
      [AssetType.IMAGE]: "#4CAF50",
      [AssetType.VIDEO]: "#2196F3",
      [AssetType.AUDIO]: "#FF9800",
      [AssetType.DOCUMENT]: "#9C27B0",
      [AssetType.FONT]: "#607D8B",
      [AssetType.ICON]: "#FFC107",
      [AssetType.OTHER]: "#795548",
    };
    return colors[type] || "#795548";
  }

  /**
   * Get accept types for file input
   */
  getAcceptTypes(): string {
    if (this.config.allowedTypes && this.config.allowedTypes.length > 0) {
      return this.config.allowedTypes
        .map((type) => {
          switch (type) {
            case AssetType.IMAGE:
              return "image/*";
            case AssetType.VIDEO:
              return "video/*";
            case AssetType.AUDIO:
              return "audio/*";
            case AssetType.DOCUMENT:
              return ".pdf,.doc,.docx,.txt";
            case AssetType.FONT:
              return ".ttf,.otf,.woff,.woff2";
            default:
              return "*/*";
          }
        })
        .join(",");
    }
    return "*/*";
  }

  // Responsive Asset Methods

  /**
   * Get responsive image URL for current device
   */
  getResponsiveImageUrl(asset: Asset): string {
    if (!this.currentDevice || asset.type !== AssetType.IMAGE) {
      return asset.url;
    }

    // Check if optimized versions exist for current device
    const optimizedVersion = asset.optimizedVersions?.find(
      (version) => version.deviceType === this.currentDevice!.type
    );

    return optimizedVersion?.url || asset.url;
  }

  /**
   * Get responsive image srcset for current asset
   */
  getResponsiveImageSrcset(asset: Asset): string {
    if (
      !this.currentDevice ||
      asset.type !== AssetType.IMAGE ||
      !asset.optimizedVersions
    ) {
      return "";
    }

    const srcsetEntries: string[] = [];

    // Add original image
    srcsetEntries.push(`${asset.url} 1x`);

    // Add optimized versions
    asset.optimizedVersions.forEach((version) => {
      if (version.deviceType === this.currentDevice!.type) {
        const pixelRatio = this.getPixelRatioForDevice(version.deviceType);
        srcsetEntries.push(`${version.url} ${pixelRatio}x`);
      }
    });

    return srcsetEntries.join(", ");
  }

  /**
   * Get pixel ratio for device type
   */
  private getPixelRatioForDevice(deviceType: DeviceType): number {
    switch (deviceType) {
      case DeviceType.MOBILE:
        return 2; // Typical mobile pixel ratio
      case DeviceType.TABLET:
        return 2; // Typical tablet pixel ratio
      case DeviceType.DESKTOP:
        return 1; // Standard desktop pixel ratio
      default:
        return 1;
    }
  }

  /**
   * Check if asset has responsive optimizations
   */
  hasResponsiveOptimizations(asset: Asset): boolean {
    return !!(asset.optimizedVersions && asset.optimizedVersions.length > 0);
  }

  /**
   * Get responsive optimization status for asset
   */
  getResponsiveOptimizationStatus(asset: Asset): string {
    if (!this.enableResponsiveOptimization) {
      return "disabled";
    }

    if (asset.type !== AssetType.IMAGE) {
      return "not-applicable";
    }

    if (!asset.optimizedVersions || asset.optimizedVersions.length === 0) {
      return "not-optimized";
    }

    const deviceTypes = [
      DeviceType.MOBILE,
      DeviceType.TABLET,
      DeviceType.DESKTOP,
    ];
    const optimizedDeviceTypes = asset.optimizedVersions.map(
      (v) => v.deviceType
    );
    const missingOptimizations = deviceTypes.filter(
      (type) => !optimizedDeviceTypes.includes(type)
    );

    if (missingOptimizations.length === 0) {
      return "fully-optimized";
    } else if (missingOptimizations.length < deviceTypes.length) {
      return "partially-optimized";
    } else {
      return "not-optimized";
    }
  }

  /**
   * Get responsive optimization status color
   */
  getResponsiveOptimizationStatusColor(status: string): any {
    const colors: any = {
      "fully-optimized": "#4CAF50",
      "partially-optimized": "#FF9800",
      "not-optimized": "#F44336",
      "not-applicable": "#9E9E9E",
      disabled: "#9E9E9E",
    };
    return colors[status] || "#9E9E9E";
  }

  /**
   * Get responsive optimization status icon
   */
  getResponsiveOptimizationStatusIcon(status: string): any {
    const icons: any = {
      "fully-optimized": "✅",
      "partially-optimized": "⚠️",
      "not-optimized": "❌",
      "not-applicable": "➖",
      disabled: "🔒",
    };
    return icons[status] || "❓";
  }

  /**
   * Check if file is an image
   */
  private isImageFile(file: File): boolean {
    return file.type.startsWith("image/");
  }

  /**
   * Get current device display name
   */
  getCurrentDeviceName(): string {
    return this.currentDevice?.name || "No device selected";
  }

  /**
   * Check if responsive optimization is available for asset
   */
  canOptimizeForDevice(asset: Asset): boolean {
    return (
      this.enableResponsiveOptimization &&
      !!this.currentDevice &&
      asset.type === AssetType.IMAGE
    );
  }

  /**
   * Get asset thumbnail URL optimized for current device
   */
  getAssetThumbnailUrl(asset: Asset): string {
    if (!this.currentDevice || asset.type !== AssetType.IMAGE) {
      return asset.thumbnailUrl || asset.url;
    }

    // For mobile devices, use smaller thumbnails
    if (this.currentDevice.type === DeviceType.MOBILE) {
      return asset.thumbnailUrl || asset.url;
    }

    // For tablet and desktop, use larger thumbnails or original
    return asset.url;
  }

  /**
   * Get asset display size based on current device
   */
  getAssetDisplaySize(asset: Asset): { width: string; height: string } {
    if (!this.currentDevice) {
      return { width: "100px", height: "100px" };
    }

    switch (this.currentDevice.type) {
      case DeviceType.MOBILE:
        return { width: "80px", height: "80px" };
      case DeviceType.TABLET:
        return { width: "100px", height: "100px" };
      case DeviceType.DESKTOP:
        return { width: "120px", height: "120px" };
      default:
        return { width: "100px", height: "100px" };
    }
  }
}
