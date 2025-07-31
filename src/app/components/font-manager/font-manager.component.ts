import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { FontManagementService } from '../../services/font-management.service';
import { GlobalStylingService } from '../../services/global-styling.service';
import { 
  FontFamily, 
  FontCategory, 
  FontSource, 
  FontWeight, 
  FontStyle, 
  FontPairing, 
  CustomFontUpload 
} from '../../models/font.interface';

@Component({
  selector: 'app-font-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './font-manager.component.html',
  styleUrls: ['./font-manager.component.css']
})
export class FontManagerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  @Output() fontSelected = new EventEmitter<{ type: 'heading' | 'body', font: FontFamily }>();

  // Component state
  activeTab: 'browse' | 'upload' | 'pairings' = 'browse';
  selectedCategory: FontCategory | 'all' = 'all';
  searchQuery = '';
  
  // Font data
  availableFonts: FontFamily[] = [];
  filteredFonts: FontFamily[] = [];
  customFonts: FontFamily[] = [];
  fontPairings: FontPairing[] = [];
  loadedFonts = new Set<string>();

  // Font preview
  previewFont: FontFamily | null = null;
  previewText = 'The quick brown fox jumps over the lazy dog';
  previewSize = '18px';
  previewWeight: FontWeight = FontWeight.REGULAR;

  // Custom font upload
  uploadForm: CustomFontUpload = {
    name: '',
    files: [],
    variants: []
  };
  uploadErrors: string[] = [];
  isUploading = false;

  // Font categories
  fontCategories = [
    { value: 'all' as const, label: 'All Fonts', icon: '🔤' },
    { value: FontCategory.SANS_SERIF, label: 'Sans Serif', icon: '📝' },
    { value: FontCategory.SERIF, label: 'Serif', icon: '📖' },
    { value: FontCategory.DISPLAY, label: 'Display', icon: '🎨' },
    { value: FontCategory.HANDWRITING, label: 'Handwriting', icon: '✍️' },
    { value: FontCategory.MONOSPACE, label: 'Monospace', icon: '💻' }
  ];

  // Font weights for preview
  fontWeights = [
    { value: FontWeight.LIGHT, label: 'Light' },
    { value: FontWeight.REGULAR, label: 'Regular' },
    { value: FontWeight.MEDIUM, label: 'Medium' },
    { value: FontWeight.SEMI_BOLD, label: 'Semi Bold' },
    { value: FontWeight.BOLD, label: 'Bold' }
  ];

  constructor(
    private fontManagementService: FontManagementService,
    private globalStylingService: GlobalStylingService
  ) {}

  ngOnInit(): void {
    this.initializeData();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize component data
   */
  private initializeData(): void {
    // Subscribe to available fonts
    this.fontManagementService.availableFonts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(fonts => {
        this.availableFonts = fonts;
        this.filterFonts();
      });

    // Subscribe to custom fonts
    this.fontManagementService.customFonts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(fonts => {
        this.customFonts = fonts;
      });

    // Subscribe to font pairings
    this.fontManagementService.fontPairings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pairings => {
        this.fontPairings = pairings;
      });

    // Subscribe to loaded fonts
    this.fontManagementService.loadedFonts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(fonts => {
        this.loadedFonts = fonts;
      });
  }

  /**
   * Setup search functionality
   */
  private setupSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.searchQuery = query;
        this.filterFonts();
      });
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
  }

  /**
   * Filter fonts based on category and search
   */
  filterFonts(): void {
    let filtered = this.availableFonts;

    // Filter by category
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(font => font.category === this.selectedCategory);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      filtered = this.fontManagementService.searchFonts(this.searchQuery);
      if (this.selectedCategory !== 'all') {
        filtered = filtered.filter(font => font.category === this.selectedCategory);
      }
    }

    // Sort by popularity and name
    filtered.sort((a, b) => {
      if (a.popularity && b.popularity) {
        return a.popularity - b.popularity;
      }
      return a.name.localeCompare(b.name);
    });

    this.filteredFonts = filtered;
  }

  /**
   * Select category
   */
  selectCategory(category: FontCategory | 'all'): void {
    this.selectedCategory = category;
    this.filterFonts();
  }

  /**
   * Preview font
   */
  previewFontFamily(font: FontFamily): void {
    this.previewFont = font;
    
    // Load font if it's a Google Font and not already loaded
    if (font.source === FontSource.GOOGLE && !this.loadedFonts.has(font.name)) {
      this.fontManagementService.loadGoogleFont(font).subscribe({
        next: () => {
          console.log(`Font ${font.name} loaded successfully`);
        },
        error: (error) => {
          console.error(`Failed to load font ${font.name}:`, error);
        }
      });
    }
  }

  /**
   * Select font for heading or body
   */
  selectFont(font: FontFamily, type: 'heading' | 'body'): void {
    // Load font if needed
    if (font.source === FontSource.GOOGLE && !this.loadedFonts.has(font.name)) {
      this.fontManagementService.loadGoogleFont(font).subscribe({
        next: () => {
          this.applyFontToGlobalStyles(font, type);
        },
        error: (error) => {
          console.error(`Failed to load font ${font.name}:`, error);
        }
      });
    } else {
      this.applyFontToGlobalStyles(font, type);
    }

    this.fontSelected.emit({ type, font });
  }

  /**
   * Apply font to global styles
   */
  private applyFontToGlobalStyles(font: FontFamily, type: 'heading' | 'body'): void {
    const fontStack = this.fontManagementService.getFontCSSDeclaration(font);
    const fontFamily = fontStack.split(':')[1].trim().replace(';', '');

    if (type === 'heading') {
      this.globalStylingService.updateTypography({ headingFont: fontFamily });
    } else {
      this.globalStylingService.updateTypography({ bodyFont: fontFamily });
    }
  }

  /**
   * Apply font pairing
   */
  applyFontPairing(pairing: FontPairing): void {
    // Load fonts if needed
    const loadPromises: Promise<any>[] = [];

    if (pairing.headingFont.source === FontSource.GOOGLE && !this.loadedFonts.has(pairing.headingFont.name)) {
      loadPromises.push(this.fontManagementService.loadGoogleFont(pairing.headingFont).toPromise());
    }

    if (pairing.bodyFont.source === FontSource.GOOGLE && !this.loadedFonts.has(pairing.bodyFont.name)) {
      loadPromises.push(this.fontManagementService.loadGoogleFont(pairing.bodyFont).toPromise());
    }

    Promise.all(loadPromises).then(() => {
      this.applyFontToGlobalStyles(pairing.headingFont, 'heading');
      this.applyFontToGlobalStyles(pairing.bodyFont, 'body');
    }).catch(error => {
      console.error('Failed to load fonts for pairing:', error);
    });
  }

  /**
   * Handle file selection for custom font upload
   */
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []);
    
    this.uploadForm.files = files;
    this.uploadForm.variants = files.map(() => ({
      weight: FontWeight.REGULAR,
      style: FontStyle.NORMAL
    }));
    
    this.uploadErrors = [];
  }

  /**
   * Upload custom font
   */
  uploadCustomFont(): void {
    if (!this.uploadForm.name.trim()) {
      this.uploadErrors = ['Font name is required'];
      return;
    }

    if (this.uploadForm.files.length === 0) {
      this.uploadErrors = ['Please select font files'];
      return;
    }

    this.isUploading = true;
    this.uploadErrors = [];

    this.fontManagementService.uploadCustomFont(this.uploadForm).subscribe({
      next: (font) => {
        console.log('Custom font uploaded successfully:', font);
        this.resetUploadForm();
        this.isUploading = false;
        this.activeTab = 'browse';
      },
      error: (error) => {
        this.uploadErrors = [error];
        this.isUploading = false;
      }
    });
  }

  /**
   * Delete custom font
   */
  deleteCustomFont(font: FontFamily): void {
    if (confirm(`Are you sure you want to delete the font "${font.name}"?`)) {
      this.fontManagementService.deleteCustomFont(font.id).subscribe({
        next: () => {
          console.log('Custom font deleted successfully');
        },
        error: (error) => {
          console.error('Failed to delete custom font:', error);
        }
      });
    }
  }

  /**
   * Reset upload form
   */
  resetUploadForm(): void {
    this.uploadForm = {
      name: '',
      files: [],
      variants: []
    };
    this.uploadErrors = [];
  }

  /**
   * Get font source icon
   */
  getFontSourceIcon(source: FontSource): string {
    switch (source) {
      case FontSource.GOOGLE:
        return '🌐';
      case FontSource.CUSTOM:
        return '📁';
      case FontSource.SYSTEM:
        return '💻';
      default:
        return '🔤';
    }
  }

  /**
   * Get font category icon
   */
  getFontCategoryIcon(category: FontCategory): string {
    const categoryData = this.fontCategories.find(cat => cat.value === category);
    return categoryData?.icon || '🔤';
  }

  /**
   * Get preview text for category
   */
  getPreviewTextForCategory(category: FontCategory): string {
    return this.fontManagementService.getPreviewText(category);
  }

  /**
   * Generate font pairing suggestions
   */
  generatePairingSuggestions(font: FontFamily): void {
    const suggestions = this.fontManagementService.generateFontPairingSuggestions(font);
    // You could display these suggestions in a modal or dedicated section
    console.log('Font pairing suggestions:', suggestions);
  }

  /**
   * Get font CSS for preview
   */
  getFontPreviewStyle(font: FontFamily): any {
    const fontStack = this.fontManagementService.getFontCSSDeclaration(font, this.previewWeight);
    return {
      fontFamily: fontStack.split(':')[1].trim().replace(';', ''),
      fontSize: this.previewSize,
      fontWeight: this.previewWeight
    };
  }

  /**
   * Check if font is loaded
   */
  isFontLoaded(font: FontFamily): boolean {
    return this.loadedFonts.has(font.name) || font.source === FontSource.SYSTEM;
  }
}