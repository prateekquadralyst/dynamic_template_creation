import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  FontFamily, 
  FontCategory, 
  FontSource, 
  FontWeight, 
  FontStyle, 
  FontPairing, 
  GoogleFont, 
  CustomFontUpload, 
  FontSettings,
  FontLoadingOptions,
  FontDisplay
} from '../models/font.interface';

@Injectable({
  providedIn: 'root'
})
export class FontManagementService {
  private availableFontsSubject = new BehaviorSubject<FontFamily[]>([]);
  public availableFonts$ = this.availableFontsSubject.asObservable();

  private customFontsSubject = new BehaviorSubject<FontFamily[]>([]);
  public customFonts$ = this.customFontsSubject.asObservable();

  private fontPairingsSubject = new BehaviorSubject<FontPairing[]>([]);
  public fontPairings$ = this.fontPairingsSubject.asObservable();

  private loadedFontsSubject = new BehaviorSubject<Set<string>>(new Set());
  public loadedFonts$ = this.loadedFontsSubject.asObservable();

  private fontSettings: FontSettings = {
    maxCustomFonts: 10,
    allowedFormats: ['woff2', 'woff', 'ttf', 'otf'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    previewTexts: {
      [FontCategory.SERIF]: 'The quick brown fox jumps over the lazy dog',
      [FontCategory.SANS_SERIF]: 'The quick brown fox jumps over the lazy dog',
      [FontCategory.DISPLAY]: 'Amazing Typography',
      [FontCategory.HANDWRITING]: 'Beautiful handwriting style',
      [FontCategory.MONOSPACE]: 'console.log("Hello World");'
    }
  };

  // Popular Google Fonts (subset for demo)
  private popularGoogleFonts: GoogleFont[] = [
    {
      family: 'Inter',
      variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
      subsets: ['latin', 'latin-ext'],
      category: 'sans-serif',
      files: {
        '400': 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
      },
      popularity: 1
    },
    {
      family: 'Roboto',
      variants: ['100', '300', '400', '500', '700', '900'],
      subsets: ['latin', 'latin-ext'],
      category: 'sans-serif',
      files: {
        '400': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2'
      },
      popularity: 2
    },
    {
      family: 'Open Sans',
      variants: ['300', '400', '500', '600', '700', '800'],
      subsets: ['latin', 'latin-ext'],
      category: 'sans-serif',
      files: {
        '400': 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.woff2'
      },
      popularity: 3
    },
    {
      family: 'Playfair Display',
      variants: ['400', '500', '600', '700', '800', '900'],
      subsets: ['latin', 'latin-ext'],
      category: 'serif',
      files: {
        '400': 'https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-F2qO0isEw.woff2'
      },
      popularity: 4
    },
    {
      family: 'Montserrat',
      variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
      subsets: ['latin', 'latin-ext'],
      category: 'sans-serif',
      files: {
        '400': 'https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXpsog.woff2'
      },
      popularity: 5
    },
    {
      family: 'Poppins',
      variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
      subsets: ['latin', 'latin-ext'],
      category: 'sans-serif',
      files: {
        '400': 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecnFHGPc.woff2'
      },
      popularity: 6
    }
  ];

  constructor() {
    this.initializeDefaultFonts();
    this.initializeFontPairings();
  }

  /**
   * Initialize default system and Google fonts
   */
  private initializeDefaultFonts(): void {
    const systemFonts: FontFamily[] = [
      {
        id: 'arial',
        name: 'Arial',
        displayName: 'Arial',
        category: FontCategory.SANS_SERIF,
        variants: [
          { weight: FontWeight.REGULAR, style: FontStyle.NORMAL },
          { weight: FontWeight.BOLD, style: FontStyle.NORMAL }
        ],
        subsets: ['latin'],
        source: FontSource.SYSTEM,
        isCustom: false
      },
      {
        id: 'helvetica',
        name: 'Helvetica',
        displayName: 'Helvetica',
        category: FontCategory.SANS_SERIF,
        variants: [
          { weight: FontWeight.REGULAR, style: FontStyle.NORMAL },
          { weight: FontWeight.BOLD, style: FontStyle.NORMAL }
        ],
        subsets: ['latin'],
        source: FontSource.SYSTEM,
        isCustom: false
      },
      {
        id: 'times',
        name: 'Times New Roman',
        displayName: 'Times New Roman',
        category: FontCategory.SERIF,
        variants: [
          { weight: FontWeight.REGULAR, style: FontStyle.NORMAL },
          { weight: FontWeight.BOLD, style: FontStyle.NORMAL }
        ],
        subsets: ['latin'],
        source: FontSource.SYSTEM,
        isCustom: false
      },
      {
        id: 'georgia',
        name: 'Georgia',
        displayName: 'Georgia',
        category: FontCategory.SERIF,
        variants: [
          { weight: FontWeight.REGULAR, style: FontStyle.NORMAL },
          { weight: FontWeight.BOLD, style: FontStyle.NORMAL }
        ],
        subsets: ['latin'],
        source: FontSource.SYSTEM,
        isCustom: false
      }
    ];

    const googleFonts: FontFamily[] = this.popularGoogleFonts.map(gFont => ({
      id: gFont.family.toLowerCase().replace(/\s+/g, '-'),
      name: gFont.family,
      displayName: gFont.family,
      category: this.mapGoogleFontCategory(gFont.category),
      variants: gFont.variants.map(variant => ({
        weight: variant as FontWeight,
        style: FontStyle.NORMAL,
        url: gFont.files[variant]
      })),
      subsets: gFont.subsets,
      source: FontSource.GOOGLE,
      isCustom: false,
      files: gFont.files,
      popularity: gFont.popularity
    }));

    const allFonts = [...systemFonts, ...googleFonts];
    this.availableFontsSubject.next(allFonts);
  }

  /**
   * Initialize font pairings
   */
  private initializeFontPairings(): void {
    const pairings: FontPairing[] = [
      {
        id: 'classic-elegance',
        name: 'Classic Elegance',
        description: 'Playfair Display for headings with Open Sans for body text',
        headingFont: this.getFontByName('Playfair Display')!,
        bodyFont: this.getFontByName('Open Sans')!,
        rating: 4.8,
        category: 'elegant'
      },
      {
        id: 'modern-minimal',
        name: 'Modern Minimal',
        description: 'Inter for both headings and body text',
        headingFont: this.getFontByName('Inter')!,
        bodyFont: this.getFontByName('Inter')!,
        rating: 4.9,
        category: 'minimal'
      },
      {
        id: 'friendly-approachable',
        name: 'Friendly & Approachable',
        description: 'Poppins for headings with Open Sans for body text',
        headingFont: this.getFontByName('Poppins')!,
        bodyFont: this.getFontByName('Open Sans')!,
        rating: 4.7,
        category: 'friendly'
      },
      {
        id: 'professional-corporate',
        name: 'Professional Corporate',
        description: 'Montserrat for headings with Roboto for body text',
        headingFont: this.getFontByName('Montserrat')!,
        bodyFont: this.getFontByName('Roboto')!,
        rating: 4.6,
        category: 'corporate'
      }
    ];

    this.fontPairingsSubject.next(pairings);
  }

  /**
   * Get all available fonts
   */
  getAvailableFonts(): FontFamily[] {
    return this.availableFontsSubject.value;
  }

  /**
   * Get fonts by category
   */
  getFontsByCategory(category: FontCategory): FontFamily[] {
    return this.getAvailableFonts().filter(font => font.category === category);
  }

  /**
   * Get font by name
   */
  getFontByName(name: string): FontFamily | undefined {
    return this.getAvailableFonts().find(font => font.name === name);
  }

  /**
   * Search fonts
   */
  searchFonts(query: string): FontFamily[] {
    const searchTerm = query.toLowerCase();
    return this.getAvailableFonts().filter(font => 
      font.name.toLowerCase().includes(searchTerm) ||
      font.displayName.toLowerCase().includes(searchTerm) ||
      font.category.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Load Google Font
   */
  loadGoogleFont(fontFamily: FontFamily): Observable<boolean> {
    return new Observable(observer => {
      if (fontFamily.source !== FontSource.GOOGLE) {
        observer.error('Font is not a Google Font');
        return;
      }

      const loadedFonts = this.loadedFontsSubject.value;
      if (loadedFonts.has(fontFamily.name)) {
        observer.next(true);
        observer.complete();
        return;
      }

      // Create font face declarations
      const fontFaceRules: string[] = [];
      fontFamily.variants.forEach(variant => {
        if (variant.url) {
          const fontFaceRule = `
            @font-face {
              font-family: '${fontFamily.name}';
              font-style: ${variant.style};
              font-weight: ${variant.weight};
              font-display: swap;
              src: url('${variant.url}') format('woff2');
            }
          `;
          fontFaceRules.push(fontFaceRule);
        }
      });

      // Add font face rules to document
      const styleElement = document.createElement('style');
      styleElement.textContent = fontFaceRules.join('\n');
      document.head.appendChild(styleElement);

      // Mark font as loaded
      const updatedLoadedFonts = new Set(loadedFonts);
      updatedLoadedFonts.add(fontFamily.name);
      this.loadedFontsSubject.next(updatedLoadedFonts);

      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Upload custom font
   */
  uploadCustomFont(upload: CustomFontUpload): Observable<FontFamily> {
    return new Observable(observer => {
      // Validate upload
      const validation = this.validateCustomFontUpload(upload);
      if (!validation.isValid) {
        observer.error(validation.errors.join(', '));
        return;
      }

      // Process font files
      const fontFiles: { [variant: string]: string } = {};
      const processedFiles: Promise<void>[] = [];

      upload.files.forEach((file, index) => {
        const variant = upload.variants[index];
        const variantKey = `${variant.weight}${variant.style === FontStyle.ITALIC ? 'italic' : ''}`;
        
        const promise = new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            fontFiles[variantKey] = result;
            resolve();
          };
          reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
          reader.readAsDataURL(file);
        });

        processedFiles.push(promise);
      });

      Promise.all(processedFiles)
        .then(() => {
          const customFont: FontFamily = {
            id: `custom-${upload.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name: upload.name,
            displayName: upload.name,
            category: this.detectFontCategory(upload.name),
            variants: upload.variants,
            subsets: ['latin'],
            source: FontSource.CUSTOM,
            isCustom: true,
            files: fontFiles
          };

          // Add to custom fonts
          const currentCustomFonts = this.customFontsSubject.value;
          const updatedCustomFonts = [...currentCustomFonts, customFont];
          this.customFontsSubject.next(updatedCustomFonts);

          // Add to available fonts
          const currentAvailableFonts = this.availableFontsSubject.value;
          const updatedAvailableFonts = [...currentAvailableFonts, customFont];
          this.availableFontsSubject.next(updatedAvailableFonts);

          // Load the font
          this.loadCustomFont(customFont).subscribe({
            next: () => {
              observer.next(customFont);
              observer.complete();
            },
            error: (error) => observer.error(error)
          });
        })
        .catch(error => observer.error(error));
    });
  }

  /**
   * Load custom font
   */
  private loadCustomFont(fontFamily: FontFamily): Observable<boolean> {
    return new Observable(observer => {
      if (!fontFamily.files) {
        observer.error('No font files available');
        return;
      }

      const fontFaceRules: string[] = [];
      Object.entries(fontFamily.files).forEach(([variant, dataUrl]) => {
        const weight = variant.replace('italic', '');
        const style = variant.includes('italic') ? FontStyle.ITALIC : FontStyle.NORMAL;
        
        const fontFaceRule = `
          @font-face {
            font-family: '${fontFamily.name}';
            font-style: ${style};
            font-weight: ${weight};
            font-display: swap;
            src: url('${dataUrl}');
          }
        `;
        fontFaceRules.push(fontFaceRule);
      });

      // Add font face rules to document
      const styleElement = document.createElement('style');
      styleElement.textContent = fontFaceRules.join('\n');
      document.head.appendChild(styleElement);

      // Mark font as loaded
      const loadedFonts = this.loadedFontsSubject.value;
      const updatedLoadedFonts = new Set(loadedFonts);
      updatedLoadedFonts.add(fontFamily.name);
      this.loadedFontsSubject.next(updatedLoadedFonts);

      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Delete custom font
   */
  deleteCustomFont(fontId: string): Observable<boolean> {
    return new Observable(observer => {
      const currentCustomFonts = this.customFontsSubject.value;
      const fontToDelete = currentCustomFonts.find(font => font.id === fontId);
      
      if (!fontToDelete) {
        observer.error('Font not found');
        return;
      }

      // Remove from custom fonts
      const updatedCustomFonts = currentCustomFonts.filter(font => font.id !== fontId);
      this.customFontsSubject.next(updatedCustomFonts);

      // Remove from available fonts
      const currentAvailableFonts = this.availableFontsSubject.value;
      const updatedAvailableFonts = currentAvailableFonts.filter(font => font.id !== fontId);
      this.availableFontsSubject.next(updatedAvailableFonts);

      // Remove from loaded fonts
      const loadedFonts = this.loadedFontsSubject.value;
      const updatedLoadedFonts = new Set(loadedFonts);
      updatedLoadedFonts.delete(fontToDelete.name);
      this.loadedFontsSubject.next(updatedLoadedFonts);

      observer.next(true);
      observer.complete();
    });
  }

  /**
   * Get font pairings
   */
  getFontPairings(): FontPairing[] {
    return this.fontPairingsSubject.value;
  }

  /**
   * Get font pairings by category
   */
  getFontPairingsByCategory(category: string): FontPairing[] {
    return this.getFontPairings().filter(pairing => pairing.category === category);
  }

  /**
   * Generate font pairing suggestions
   */
  generateFontPairingSuggestions(selectedFont: FontFamily): FontPairing[] {
    const allFonts = this.getAvailableFonts();
    const suggestions: FontPairing[] = [];

    // Simple pairing logic based on font categories
    if (selectedFont.category === FontCategory.SERIF) {
      // Pair serif headings with sans-serif body
      const sansSerifFonts = allFonts.filter(font => font.category === FontCategory.SANS_SERIF);
      sansSerifFonts.slice(0, 3).forEach((bodyFont, index) => {
        suggestions.push({
          id: `suggestion-${selectedFont.id}-${bodyFont.id}`,
          name: `${selectedFont.displayName} + ${bodyFont.displayName}`,
          description: `Elegant ${selectedFont.displayName} headings with readable ${bodyFont.displayName} body text`,
          headingFont: selectedFont,
          bodyFont: bodyFont,
          rating: 4.5 - (index * 0.1),
          category: 'elegant'
        });
      });
    } else if (selectedFont.category === FontCategory.SANS_SERIF) {
      // Pair sans-serif with serif or same font
      const serifFonts = allFonts.filter(font => font.category === FontCategory.SERIF);
      
      // Same font pairing
      suggestions.push({
        id: `suggestion-${selectedFont.id}-same`,
        name: `${selectedFont.displayName} Mono`,
        description: `Clean and consistent ${selectedFont.displayName} for both headings and body`,
        headingFont: selectedFont,
        bodyFont: selectedFont,
        rating: 4.7,
        category: 'minimal'
      });

      // Serif body pairings
      serifFonts.slice(0, 2).forEach((bodyFont, index) => {
        suggestions.push({
          id: `suggestion-${selectedFont.id}-${bodyFont.id}`,
          name: `${selectedFont.displayName} + ${bodyFont.displayName}`,
          description: `Modern ${selectedFont.displayName} headings with classic ${bodyFont.displayName} body text`,
          headingFont: selectedFont,
          bodyFont: bodyFont,
          rating: 4.3 - (index * 0.1),
          category: 'mixed'
        });
      });
    }

    return suggestions;
  }

  /**
   * Get preview text for font category
   */
  getPreviewText(category: FontCategory): string {
    return this.fontSettings.previewTexts[category] || 'The quick brown fox jumps over the lazy dog';
  }

  /**
   * Validate custom font upload
   */
  private validateCustomFontUpload(upload: CustomFontUpload): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check font name
    if (!upload.name || upload.name.trim().length === 0) {
      errors.push('Font name is required');
    }

    // Check file count
    if (!upload.files || upload.files.length === 0) {
      errors.push('At least one font file is required');
    }

    // Check custom font limit
    const currentCustomFonts = this.customFontsSubject.value;
    if (currentCustomFonts.length >= this.fontSettings.maxCustomFonts) {
      errors.push(`Maximum ${this.fontSettings.maxCustomFonts} custom fonts allowed`);
    }

    // Check file formats and sizes
    upload.files?.forEach((file, index) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !this.fontSettings.allowedFormats.includes(extension)) {
        errors.push(`File ${index + 1}: Unsupported format. Allowed: ${this.fontSettings.allowedFormats.join(', ')}`);
      }

      if (file.size > this.fontSettings.maxFileSize) {
        errors.push(`File ${index + 1}: File too large. Maximum size: ${this.fontSettings.maxFileSize / (1024 * 1024)}MB`);
      }
    });

    // Check variants match files
    if (upload.files && upload.variants && upload.files.length !== upload.variants.length) {
      errors.push('Number of files must match number of variants');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Detect font category from name
   */
  private detectFontCategory(fontName: string): FontCategory {
    const name = fontName.toLowerCase();
    
    if (name.includes('serif') && !name.includes('sans')) {
      return FontCategory.SERIF;
    } else if (name.includes('mono') || name.includes('code')) {
      return FontCategory.MONOSPACE;
    } else if (name.includes('script') || name.includes('hand')) {
      return FontCategory.HANDWRITING;
    } else if (name.includes('display') || name.includes('title')) {
      return FontCategory.DISPLAY;
    } else {
      return FontCategory.SANS_SERIF;
    }
  }

  /**
   * Map Google Font category to our enum
   */
  private mapGoogleFontCategory(googleCategory: string): FontCategory {
    switch (googleCategory.toLowerCase()) {
      case 'serif':
        return FontCategory.SERIF;
      case 'sans-serif':
        return FontCategory.SANS_SERIF;
      case 'display':
        return FontCategory.DISPLAY;
      case 'handwriting':
        return FontCategory.HANDWRITING;
      case 'monospace':
        return FontCategory.MONOSPACE;
      default:
        return FontCategory.SANS_SERIF;
    }
  }

  /**
   * Get font CSS declaration
   */
  getFontCSSDeclaration(fontFamily: FontFamily, weight?: FontWeight, style?: FontStyle): string {
    const fontStack = this.buildFontStack(fontFamily);
    let css = `font-family: ${fontStack};`;
    
    if (weight) {
      css += ` font-weight: ${weight};`;
    }
    
    if (style && style !== FontStyle.NORMAL) {
      css += ` font-style: ${style};`;
    }
    
    return css;
  }

  /**
   * Build font stack with fallbacks
   */
  private buildFontStack(fontFamily: FontFamily): string {
    const fallbacks = this.getFallbackFonts(fontFamily.category);
    return `"${fontFamily.name}", ${fallbacks.join(', ')}`;
  }

  /**
   * Get fallback fonts for category
   */
  private getFallbackFonts(category: FontCategory): string[] {
    switch (category) {
      case FontCategory.SERIF:
        return ['Georgia', 'Times', '"Times New Roman"', 'serif'];
      case FontCategory.SANS_SERIF:
        return ['Arial', 'Helvetica', 'sans-serif'];
      case FontCategory.MONOSPACE:
        return ['"Courier New"', 'Courier', 'monospace'];
      case FontCategory.HANDWRITING:
        return ['cursive'];
      case FontCategory.DISPLAY:
        return ['Arial', 'sans-serif'];
      default:
        return ['sans-serif'];
    }
  }
}