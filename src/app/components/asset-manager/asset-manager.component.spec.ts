import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, BehaviorSubject } from 'rxjs';
import { AssetManagerComponent } from './asset-manager.component';
import { AssetService } from '../../services/asset.service';
import { Asset, AssetType, AssetSortBy, SortOrder } from '../../models/asset.interface';

describe('AssetManagerComponent', () => {
  let component: AssetManagerComponent;
  let fixture: ComponentFixture<AssetManagerComponent>;
  let mockAssetService: jasmine.SpyObj<AssetService>;

  const mockAssets: Asset[] = [
    {
      id: 'asset1',
      name: 'test-image.jpg',
      type: AssetType.IMAGE,
      url: 'data:image/jpeg;base64,test',
      size: 1024000,
      dimensions: { width: 800, height: 600 },
      optimizedVersions: [],
      usageCount: 2,
      tags: ['test', 'image'],
      uploadedAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      metadata: {
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        fileExtension: 'jpg',
        checksum: 'test-checksum'
      }
    },
    {
      id: 'asset2',
      name: 'document.pdf',
      type: AssetType.DOCUMENT,
      url: 'data:application/pdf;base64,test',
      size: 2048000,
      optimizedVersions: [],
      usageCount: 0,
      tags: ['document'],
      uploadedAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      metadata: {
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        fileExtension: 'pdf',
        checksum: 'test-checksum-2'
      }
    }
  ];

  beforeEach(async () => {
    const assetServiceSpy = jasmine.createSpyObj('AssetService', [
      'getAssets',
      'getAllTags',
      'getAssetsUpdates',
      'searchAssets',
      'uploadAsset',
      'uploadMultipleAssets',
      'deleteAsset',
      'deleteMultipleAssets',
      'addTagsToAsset',
      'removeTagsFromAsset',
      'getAssetUsage',
      'validateAsset'
    ]);

    await TestBed.configureTestingModule({
      imports: [AssetManagerComponent, FormsModule],
      providers: [
        { provide: AssetService, useValue: assetServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AssetManagerComponent);
    component = fixture.componentInstance;
    mockAssetService = TestBed.inject(AssetService) as jasmine.SpyObj<AssetService>;

    // Setup default mock returns
    mockAssetService.getAssets.and.returnValue(Promise.resolve(mockAssets));
    mockAssetService.getAllTags.and.returnValue(Promise.resolve(['test', 'image', 'document']));
    mockAssetService.getAssetsUpdates.and.returnValue(of(mockAssets));
    mockAssetService.searchAssets.and.returnValue(Promise.resolve(mockAssets));
    mockAssetService.validateAsset.and.returnValue(Promise.resolve({
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        fileSize: 1024,
        format: 'image/jpeg',
        hasTransparency: false
      }
    }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load assets on init', async () => {
    await component.ngOnInit();
    
    expect(mockAssetService.getAssets).toHaveBeenCalled();
    expect(component.assets).toEqual(mockAssets);
    expect(component.filteredAssets).toEqual(mockAssets);
  });

  it('should load available tags on init', async () => {
    await component.ngOnInit();
    
    expect(mockAssetService.getAllTags).toHaveBeenCalled();
    expect(component.availableTags).toEqual(['test', 'image', 'document']);
  });

  it('should filter assets by search query', async () => {
    component.assets = mockAssets;
    mockAssetService.searchAssets.and.returnValue(Promise.resolve([mockAssets[0]]));
    
    await component.onSearchChange('image');
    
    // Wait for debounced search
    await new Promise(resolve => setTimeout(resolve, 350));
    
    expect(mockAssetService.searchAssets).toHaveBeenCalledWith('image');
  });

  it('should apply type filter', () => {
    component.assets = mockAssets;
    component.activeFilters = { tags: [] };
    
    component.toggleFilter(AssetType.IMAGE);
    
    expect(component.activeFilters.type).toBe(AssetType.IMAGE);
    expect(component.filteredAssets).toEqual([mockAssets[0]]);
  });

  it('should apply tag filter', () => {
    component.assets = mockAssets;
    component.activeFilters = { tags: [] };
    
    component.toggleTagFilter('test');
    
    expect(component.activeFilters.tags).toContain('test');
    expect(component.filteredAssets).toEqual([mockAssets[0]]);
  });

  it('should toggle asset selection', () => {
    const assetId = 'asset1';
    
    component.toggleAssetSelection(assetId);
    expect(component.selectedAssets.has(assetId)).toBe(true);
    
    component.toggleAssetSelection(assetId);
    expect(component.selectedAssets.has(assetId)).toBe(false);
  });

  it('should select all assets', () => {
    component.filteredAssets = mockAssets;
    component.currentPage = 1;
    component.itemsPerPage = 20;
    
    component.selectAllAssets();
    
    expect(component.selectedAssets.size).toBe(2);
    expect(component.selectedAssets.has('asset1')).toBe(true);
    expect(component.selectedAssets.has('asset2')).toBe(true);
  });

  it('should clear selection', () => {
    component.selectedAssets.add('asset1');
    component.selectedAssets.add('asset2');
    
    component.clearSelection();
    
    expect(component.selectedAssets.size).toBe(0);
  });

  it('should change view mode', () => {
    component.setViewMode('list');
    expect(component.viewMode).toBe('list');
    
    component.setViewMode('grid');
    expect(component.viewMode).toBe('grid');
  });

  it('should handle pagination', () => {
    component.filteredAssets = mockAssets;
    component.itemsPerPage = 1;
    // Call applyFilters which internally calls updatePagination
    component.applyFilters();
    
    expect(component.totalPages).toBe(2);
    
    component.goToPage(2);
    expect(component.currentPage).toBe(2);
    
    const paginatedAssets = component.paginatedAssets;
    expect(paginatedAssets.length).toBe(1);
    expect(paginatedAssets[0]).toBe(mockAssets[1]);
  });

  it('should handle file upload', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const mockAsset = mockAssets[0];
    
    mockAssetService.uploadAsset.and.returnValue(Promise.resolve(mockAsset));
    
    await component.uploadFiles([mockFile]);
    
    expect(mockAssetService.validateAsset).toHaveBeenCalledWith(mockFile);
    expect(mockAssetService.uploadAsset).toHaveBeenCalledWith(mockFile, {
      optimize: true,
      generateThumbnails: true,
      formats: ['webp'],
      quality: 85
    });
  });

  it('should handle drag and drop', () => {
    const mockEvent = {
      preventDefault: jasmine.createSpy(),
      stopPropagation: jasmine.createSpy(),
      dataTransfer: {
        files: [new File(['test'], 'test.jpg', { type: 'image/jpeg' })]
      }
    } as any;
    
    spyOn(component, 'uploadFiles');
    
    component.onDrop(mockEvent);
    
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(component.isDragOver).toBe(false);
    expect(component.uploadFiles).toHaveBeenCalled();
  });

  it('should delete selected assets', async () => {
    component.selectedAssets.add('asset1');
    component.selectedAssets.add('asset2');
    
    await component.deleteSelectedAssets();
    
    expect(mockAssetService.deleteMultipleAssets).toHaveBeenCalledWith(['asset1', 'asset2']);
    expect(component.selectedAssets.size).toBe(0);
  });

  it('should delete single asset', async () => {
    await component.deleteAsset('asset1');
    
    expect(mockAssetService.deleteAsset).toHaveBeenCalledWith('asset1');
  });

  it('should add tags to assets', async () => {
    component.selectedAssets.add('asset1');
    
    await component.addTagToAssets('new-tag');
    
    expect(mockAssetService.addTagsToAsset).toHaveBeenCalledWith('asset1', ['new-tag']);
    expect(mockAssetService.getAllTags).toHaveBeenCalled();
  });

  it('should remove tags from assets', async () => {
    component.selectedAssets.add('asset1');
    
    await component.removeTagFromAssets('test');
    
    expect(mockAssetService.removeTagsFromAsset).toHaveBeenCalledWith('asset1', ['test']);
    expect(mockAssetService.getAllTags).toHaveBeenCalled();
  });

  it('should show asset details modal', async () => {
    const asset = mockAssets[0];
    mockAssetService.getAssetUsage.and.returnValue(Promise.resolve([]));
    
    await component.showAssetDetailsModal(asset);
    
    expect(component.showAssetDetails).toBe(true);
    expect(component.selectedAssetForDetails).toBe(asset);
    expect(component.selectedAssetUsage).toEqual([]);
    expect(mockAssetService.getAssetUsage).toHaveBeenCalledWith(asset.id);
  });

  it('should close asset details modal', () => {
    component.showAssetDetails = true;
    component.selectedAssetForDetails = mockAssets[0];
    
    component.closeAssetDetails();
    
    expect(component.showAssetDetails).toBe(false);
    expect(component.selectedAssetForDetails).toBeNull();
  });

  it('should format file size correctly', () => {
    expect(component.formatFileSize(0)).toBe('0 Bytes');
    expect(component.formatFileSize(1024)).toBe('1 KB');
    expect(component.formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(component.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should format date correctly', () => {
    const date = new Date('2024-01-01');
    const formatted = component.formatDate(date);
    expect(formatted).toBe(date.toLocaleDateString());
  });

  it('should get correct asset type icon', () => {
    expect(component.getAssetTypeIcon(AssetType.IMAGE)).toBe('🖼️');
    expect(component.getAssetTypeIcon(AssetType.VIDEO)).toBe('🎥');
    expect(component.getAssetTypeIcon(AssetType.AUDIO)).toBe('🎵');
    expect(component.getAssetTypeIcon(AssetType.DOCUMENT)).toBe('📄');
    expect(component.getAssetTypeIcon(AssetType.FONT)).toBe('🔤');
    expect(component.getAssetTypeIcon(AssetType.ICON)).toBe('⭐');
    expect(component.getAssetTypeIcon(AssetType.OTHER)).toBe('📎');
  });

  it('should get correct asset type color', () => {
    expect(component.getAssetTypeColor(AssetType.IMAGE)).toBe('#4CAF50');
    expect(component.getAssetTypeColor(AssetType.VIDEO)).toBe('#2196F3');
    expect(component.getAssetTypeColor(AssetType.AUDIO)).toBe('#FF9800');
    expect(component.getAssetTypeColor(AssetType.DOCUMENT)).toBe('#9C27B0');
    expect(component.getAssetTypeColor(AssetType.FONT)).toBe('#607D8B');
    expect(component.getAssetTypeColor(AssetType.ICON)).toBe('#FFC107');
    expect(component.getAssetTypeColor(AssetType.OTHER)).toBe('#795548');
  });

  it('should clear filters', () => {
    component.activeFilters = {
      type: AssetType.IMAGE,
      tags: ['test']
    };
    component.searchQuery = 'test query';
    
    component.clearFilters();
    
    expect(component.activeFilters).toEqual({ tags: [] });
    expect(component.searchQuery).toBe('');
  });

  it('should handle sorting', async () => {
    await component.onSortChange(AssetSortBy.NAME, SortOrder.ASC);
    
    expect(component.sortBy).toBe(AssetSortBy.NAME);
    expect(component.sortOrder).toBe(SortOrder.ASC);
    expect(mockAssetService.getAssets).toHaveBeenCalledWith({
      sortBy: AssetSortBy.NAME,
      sortOrder: SortOrder.ASC
    });
  });
});