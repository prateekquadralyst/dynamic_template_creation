import { Injectable } from '@angular/core';
import { GlobalStyles } from '../models/project.interface';

export interface StylePackage {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: Date;
  createdBy: string;
  tags: string[];
  globalStyles: GlobalStyles;
  customCSS?: string;
  metadata: StylePackageMetadata;
}

export interface StylePackageMetadata {
  exportedFrom: string;
  compatibility: string[];
  dependencies: string[];
  screenshots?: string[];
  usage: {
    downloads: number;
    rating: number;
    reviews: number;
  };
}

export interface StyleImportResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  stylePackage?: StylePackage;
}

export interface StyleValidationResult {
  isValid: boolean;
  errors: StyleValidationError[];
  warnings: StyleValidationWarning[];
}

export interface StyleValidationError {
  field: string;
  message: string;
  code: string;
}

export interface StyleValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

@Injectable({
  providedIn: 'root'
})
export class StyleExportImportService {
  private readonly STYLE_PACKAGE_VERSION = '1.0.0';
  private readonly SUPPORTED_VERSIONS = ['1.0.0'];

  constructor() {}

  /**
   * Export global styles as a style package
   */
  exportStylePackage(
    globalStyles: GlobalStyles,
    customCSS: string = '',
    packageInfo: {
      name: string;
      description: string;
      tags?: string[];
      createdBy?: string;
    }
  ): StylePackage {
    const stylePackage: StylePackage = {
      id: this.generateId(),
      name: packageInfo.name,
      description: packageInfo.description,
      version: this.STYLE_PACKAGE_VERSION,
      createdAt: new Date(),
      createdBy: packageInfo.createdBy || 'Anonymous',
      tags: packageInfo.tags || [],
      globalStyles: this.deepClone(globalStyles),
      customCSS: customCSS || undefined,
      metadata: {
        exportedFrom: 'Enhanced Dynamic Builder',
        compatibility: this.SUPPORTED_VERSIONS,
        dependencies: [],
        usage: {
          downloads: 0,
          rating: 0,
          reviews: 0
        }
      }
    };

    return stylePackage;
  }

  /**
   * Export style package as JSON string
   */
  exportStylePackageAsJson(stylePackage: StylePackage): string {
    return JSON.stringify(stylePackage, null, 2);
  }

  /**
   * Download style package as JSON file
   */
  downloadStylePackage(stylePackage: StylePackage): void {
    const jsonString = this.exportStylePackageAsJson(stylePackage);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.sanitizeFilename(stylePackage.name)}-styles.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Import style package from JSON string
   */
  importStylePackage(jsonString: string): StyleImportResult {
    const result: StyleImportResult = {
      success: false,
      errors: [],
      warnings: []
    };

    try {
      const stylePackage = JSON.parse(jsonString) as StylePackage;
      
      // Validate the style package
      const validationResult = this.validateStylePackage(stylePackage);
      
      if (!validationResult.isValid) {
        result.errors = validationResult.errors.map(e => e.message);
        result.warnings = validationResult.warnings.map(w => w.message);
        return result;
      }

      // Add warnings if any
      result.warnings = validationResult.warnings.map(w => w.message);

      // Check version compatibility
      if (!this.isVersionCompatible(stylePackage.version)) {
        result.warnings.push(`Style package version ${stylePackage.version} may not be fully compatible with current version.`);
      }

      result.success = true;
      result.stylePackage = stylePackage;

    } catch (error) {
      result.errors.push(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Import style package from file
   */
  importStylePackageFromFile(): Promise<StyleImportResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            const result = this.importStylePackage(e.target.result);
            resolve(result);
          };
          reader.onerror = () => {
            resolve({
              success: false,
              errors: ['Failed to read file'],
              warnings: []
            });
          };
          reader.readAsText(file);
        } else {
          resolve({
            success: false,
            errors: ['No file selected'],
            warnings: []
          });
        }
      };

      input.click();
    });
  }

  /**
   * Validate style package structure and content
   */
  validateStylePackage(stylePackage: any): StyleValidationResult {
    const result: StyleValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check required fields
    const requiredFields = ['id', 'name', 'version', 'globalStyles'];
    for (const field of requiredFields) {
      if (!stylePackage[field]) {
        result.errors.push({
          field,
          message: `Missing required field: ${field}`,
          code: 'MISSING_FIELD'
        });
      }
    }

    // Validate globalStyles structure
    if (stylePackage.globalStyles) {
      const globalStylesValidation = this.validateGlobalStyles(stylePackage.globalStyles);
      result.errors.push(...globalStylesValidation.errors);
      result.warnings.push(...globalStylesValidation.warnings);
    }

    // Validate version format
    if (stylePackage.version && !this.isValidVersion(stylePackage.version)) {
      result.warnings.push({
        field: 'version',
        message: 'Invalid version format',
        suggestion: 'Use semantic versioning (e.g., 1.0.0)'
      });
    }

    // Validate custom CSS if present
    if (stylePackage.customCSS) {
      const cssValidation = this.validateCustomCSS(stylePackage.customCSS);
      result.warnings.push(...cssValidation.warnings);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate global styles structure
   */
  private validateGlobalStyles(globalStyles: any): StyleValidationResult {
    const result: StyleValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const requiredSections = ['typography', 'colors', 'spacing', 'effects'];
    for (const section of requiredSections) {
      if (!globalStyles[section]) {
        result.errors.push({
          field: `globalStyles.${section}`,
          message: `Missing required section: ${section}`,
          code: 'MISSING_SECTION'
        });
      }
    }

    // Validate typography section
    if (globalStyles.typography) {
      const typography = globalStyles.typography;
      if (!typography.headingFont || !typography.bodyFont) {
        result.errors.push({
          field: 'globalStyles.typography',
          message: 'Missing required font settings',
          code: 'MISSING_FONT'
        });
      }

      if (!typography.fontSizes || !typography.lineHeights) {
        result.errors.push({
          field: 'globalStyles.typography',
          message: 'Missing font size or line height settings',
          code: 'MISSING_TYPOGRAPHY_SETTINGS'
        });
      }
    }

    // Validate colors section
    if (globalStyles.colors) {
      const colors = globalStyles.colors;
      const requiredColors = ['primary', 'secondary', 'text', 'background'];
      for (const color of requiredColors) {
        if (!colors[color]) {
          result.errors.push({
            field: `globalStyles.colors.${color}`,
            message: `Missing required color: ${color}`,
            code: 'MISSING_COLOR'
          });
        } else if (!this.isValidColor(colors[color])) {
          result.warnings.push({
            field: `globalStyles.colors.${color}`,
            message: `Invalid color format: ${colors[color]}`,
            suggestion: 'Use hex, rgb, or named colors'
          });
        }
      }
    }

    // Validate spacing section
    if (globalStyles.spacing) {
      const spacing = globalStyles.spacing;
      if (typeof spacing.baseUnit !== 'number' || spacing.baseUnit <= 0) {
        result.warnings.push({
          field: 'globalStyles.spacing.baseUnit',
          message: 'Base unit should be a positive number',
          suggestion: 'Use a value like 16 for 16px base unit'
        });
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate custom CSS
   */
  private validateCustomCSS(css: string): StyleValidationResult {
    const result: StyleValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Basic CSS validation
    if (css.trim()) {
      // Check for balanced braces
      const openBraces = (css.match(/{/g) || []).length;
      const closeBraces = (css.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        result.warnings.push({
          field: 'customCSS',
          message: 'Unbalanced braces in CSS',
          suggestion: 'Check that all CSS rules are properly closed'
        });
      }

      // Check for potentially dangerous CSS
      const dangerousPatterns = [
        /javascript:/i,
        /expression\(/i,
        /behavior:/i,
        /@import/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(css)) {
          result.warnings.push({
            field: 'customCSS',
            message: 'Potentially unsafe CSS detected',
            suggestion: 'Remove JavaScript expressions and imports'
          });
          break;
        }
      }
    }

    return result;
  }

  /**
   * Create a style template from a style package
   */
  createStyleTemplate(stylePackage: StylePackage): StyleTemplate {
    return {
      id: this.generateId(),
      name: stylePackage.name,
      description: stylePackage.description,
      tags: stylePackage.tags,
      globalStyles: this.deepClone(stylePackage.globalStyles),
      customCSS: stylePackage.customCSS,
      createdAt: new Date(),
      createdBy: stylePackage.createdBy,
      isShared: false,
      downloads: 0,
      rating: 0
    };
  }

  /**
   * Share style template (prepare for sharing)
   */
  shareStyleTemplate(template: StyleTemplate): ShareableStyleTemplate {
    return {
      ...template,
      isShared: true,
      shareId: this.generateShareId(),
      sharedAt: new Date(),
      shareUrl: this.generateShareUrl(template.id)
    };
  }

  /**
   * Get predefined style templates
   */
  getPredefinedStyleTemplates(): StyleTemplate[] {
    return [
      {
        id: 'modern-minimal',
        name: 'Modern Minimal',
        description: 'Clean and minimal design with subtle shadows and modern typography',
        tags: ['minimal', 'modern', 'clean'],
        globalStyles: {
          typography: {
            headingFont: 'Inter, sans-serif',
            bodyFont: 'Inter, sans-serif',
            fontSizes: {
              h1: '3rem',
              h2: '2.5rem',
              h3: '2rem',
              h4: '1.5rem',
              h5: '1.25rem',
              h6: '1rem',
              body: '1rem',
              small: '0.875rem'
            },
            lineHeights: {
              heading: 1.2,
              body: 1.6
            }
          },
          colors: {
            primary: '#2563eb',
            secondary: '#64748b',
            accent: '#0ea5e9',
            text: '#1e293b',
            background: '#ffffff',
            surface: '#f8fafc'
          },
          spacing: {
            baseUnit: 16,
            sectionPadding: '5rem 0',
            elementMargin: '1.5rem 0'
          },
          effects: {
            shadows: true,
            animations: true,
            transitions: true
          }
        },
        createdAt: new Date(),
        createdBy: 'System',
        isShared: true,
        downloads: 0,
        rating: 0
      },
      {
        id: 'warm-creative',
        name: 'Warm Creative',
        description: 'Warm color palette with creative typography and playful effects',
        tags: ['warm', 'creative', 'colorful'],
        globalStyles: {
          typography: {
            headingFont: 'Poppins, sans-serif',
            bodyFont: 'Open Sans, sans-serif',
            fontSizes: {
              h1: '3.5rem',
              h2: '2.75rem',
              h3: '2.25rem',
              h4: '1.75rem',
              h5: '1.5rem',
              h6: '1.25rem',
              body: '1.125rem',
              small: '1rem'
            },
            lineHeights: {
              heading: 1.1,
              body: 1.7
            }
          },
          colors: {
            primary: '#f59e0b',
            secondary: '#ef4444',
            accent: '#ec4899',
            text: '#1f2937',
            background: '#fffbeb',
            surface: '#fef3c7'
          },
          spacing: {
            baseUnit: 20,
            sectionPadding: '6rem 0',
            elementMargin: '2rem 0'
          },
          effects: {
            shadows: true,
            animations: true,
            transitions: true
          }
        },
        createdAt: new Date(),
        createdBy: 'System',
        isShared: true,
        downloads: 0,
        rating: 0
      },
      {
        id: 'professional-dark',
        name: 'Professional Dark',
        description: 'Professional dark theme with high contrast and elegant typography',
        tags: ['dark', 'professional', 'elegant'],
        globalStyles: {
          typography: {
            headingFont: 'Playfair Display, serif',
            bodyFont: 'Source Sans Pro, sans-serif',
            fontSizes: {
              h1: '4rem',
              h2: '3rem',
              h3: '2.25rem',
              h4: '1.875rem',
              h5: '1.5rem',
              h6: '1.25rem',
              body: '1.125rem',
              small: '1rem'
            },
            lineHeights: {
              heading: 1.1,
              body: 1.8
            }
          },
          colors: {
            primary: '#60a5fa',
            secondary: '#a78bfa',
            accent: '#34d399',
            text: '#f9fafb',
            background: '#111827',
            surface: '#1f2937'
          },
          spacing: {
            baseUnit: 18,
            sectionPadding: '5rem 0',
            elementMargin: '1.75rem 0'
          },
          effects: {
            shadows: true,
            animations: true,
            transitions: true
          }
        },
        createdAt: new Date(),
        createdBy: 'System',
        isShared: true,
        downloads: 0,
        rating: 0
      }
    ];
  }

  /**
   * Utility methods
   */
  private generateId(): string {
    return 'style_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateShareId(): string {
    return 'share_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateShareUrl(templateId: string): string {
    // In a real implementation, this would generate a proper sharing URL
    return `${window.location.origin}/shared-styles/${templateId}`;
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private isVersionCompatible(version: string): boolean {
    return this.SUPPORTED_VERSIONS.includes(version);
  }

  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    return semverRegex.test(version);
  }

  private isValidColor(color: string): boolean {
    // Basic color validation - hex, rgb, rgba, hsl, hsla, and named colors
    const colorRegex = /^(#[0-9a-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|[a-z]+)$/i;
    return colorRegex.test(color);
  }
}

// Additional interfaces for style templates
export interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  globalStyles: GlobalStyles;
  customCSS?: string;
  createdAt: Date;
  createdBy: string;
  isShared: boolean;
  downloads: number;
  rating: number;
}

export interface ShareableStyleTemplate extends StyleTemplate {
  shareId: string;
  sharedAt: Date;
  shareUrl: string;
}