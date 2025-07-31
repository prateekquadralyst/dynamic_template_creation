import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GlobalStyles, TypographySettings, ColorSettings, SpacingSettings, EffectSettings } from '../models/project.interface';

@Injectable({
  providedIn: 'root'
})
export class GlobalStylingService {
  private globalStylesSubject = new BehaviorSubject<GlobalStyles>(this.getDefaultGlobalStyles());
  public globalStyles$ = this.globalStylesSubject.asObservable();

  private cssCustomPropertiesSubject = new BehaviorSubject<string>('');
  public cssCustomProperties$ = this.cssCustomPropertiesSubject.asObservable();

  constructor() {
    // Initialize with default styles and generate CSS custom properties
    this.updateCssCustomProperties();
  }

  /**
   * Get default global styles
   */
  private getDefaultGlobalStyles(): GlobalStyles {
    return {
      typography: {
        headingFont: 'Inter, sans-serif',
        bodyFont: 'Inter, sans-serif',
        fontSizes: {
          h1: '2.5rem',
          h2: '2rem',
          h3: '1.75rem',
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
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
        text: '#1f2937',
        background: '#ffffff',
        surface: '#f8fafc'
      },
      spacing: {
        baseUnit: 16,
        sectionPadding: '4rem 0',
        elementMargin: '1rem 0'
      },
      effects: {
        shadows: true,
        animations: true,
        transitions: true
      }
    };
  }

  /**
   * Get current global styles
   */
  getCurrentGlobalStyles(): GlobalStyles {
    return this.globalStylesSubject.value;
  }

  /**
   * Update global styles
   */
  updateGlobalStyles(styles: Partial<GlobalStyles>): void {
    const currentStyles = this.globalStylesSubject.value;
    const updatedStyles = this.deepMerge(currentStyles, styles);
    this.globalStylesSubject.next(updatedStyles);
    this.updateCssCustomProperties();
  }

  /**
   * Update typography settings
   */
  updateTypography(typography: Partial<TypographySettings>): void {
    const currentStyles = this.getCurrentGlobalStyles();
    this.updateGlobalStyles({
      typography: { ...currentStyles.typography, ...typography }
    });
  }

  /**
   * Update color settings
   */
  updateColors(colors: Partial<ColorSettings>): void {
    const currentStyles = this.getCurrentGlobalStyles();
    this.updateGlobalStyles({
      colors: { ...currentStyles.colors, ...colors }
    });
  }

  /**
   * Update spacing settings
   */
  updateSpacing(spacing: Partial<SpacingSettings>): void {
    const currentStyles = this.getCurrentGlobalStyles();
    this.updateGlobalStyles({
      spacing: { ...currentStyles.spacing, ...spacing }
    });
  }

  /**
   * Update effect settings
   */
  updateEffects(effects: Partial<EffectSettings>): void {
    const currentStyles = this.getCurrentGlobalStyles();
    this.updateGlobalStyles({
      effects: { ...currentStyles.effects, ...effects }
    });
  }

  /**
   * Generate CSS custom properties from global styles
   */
  private updateCssCustomProperties(): void {
    const styles = this.getCurrentGlobalStyles();
    
    const cssProperties = `
      :root {
        /* Typography */
        --font-heading: ${styles.typography.headingFont};
        --font-body: ${styles.typography.bodyFont};
        --font-size-h1: ${styles.typography.fontSizes.h1};
        --font-size-h2: ${styles.typography.fontSizes.h2};
        --font-size-h3: ${styles.typography.fontSizes.h3};
        --font-size-h4: ${styles.typography.fontSizes.h4};
        --font-size-h5: ${styles.typography.fontSizes.h5};
        --font-size-h6: ${styles.typography.fontSizes.h6};
        --font-size-body: ${styles.typography.fontSizes.body};
        --font-size-small: ${styles.typography.fontSizes.small};
        --line-height-heading: ${styles.typography.lineHeights.heading};
        --line-height-body: ${styles.typography.lineHeights.body};

        /* Colors */
        --color-primary: ${styles.colors.primary};
        --color-secondary: ${styles.colors.secondary};
        --color-accent: ${styles.colors.accent};
        --color-text: ${styles.colors.text};
        --color-background: ${styles.colors.background};
        --color-surface: ${styles.colors.surface};

        /* Spacing */
        --spacing-base: ${styles.spacing.baseUnit}px;
        --spacing-section: ${styles.spacing.sectionPadding};
        --spacing-element: ${styles.spacing.elementMargin};

        /* Effects */
        --shadow-sm: ${styles.effects.shadows ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'};
        --shadow-md: ${styles.effects.shadows ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none'};
        --shadow-lg: ${styles.effects.shadows ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'none'};
        --transition-fast: ${styles.effects.transitions ? '150ms ease-in-out' : 'none'};
        --transition-normal: ${styles.effects.transitions ? '300ms ease-in-out' : 'none'};
        --transition-slow: ${styles.effects.transitions ? '500ms ease-in-out' : 'none'};
      }

      /* Apply global styles */
      body {
        font-family: var(--font-body);
        font-size: var(--font-size-body);
        line-height: var(--line-height-body);
        color: var(--color-text);
        background-color: var(--color-background);
      }

      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-heading);
        line-height: var(--line-height-heading);
        color: var(--color-text);
      }

      h1 { font-size: var(--font-size-h1); }
      h2 { font-size: var(--font-size-h2); }
      h3 { font-size: var(--font-size-h3); }
      h4 { font-size: var(--font-size-h4); }
      h5 { font-size: var(--font-size-h5); }
      h6 { font-size: var(--font-size-h6); }

      .btn-primary {
        background-color: var(--color-primary);
        border-color: var(--color-primary);
        transition: var(--transition-fast);
      }

      .btn-secondary {
        background-color: var(--color-secondary);
        border-color: var(--color-secondary);
        transition: var(--transition-fast);
      }

      .card {
        background-color: var(--color-surface);
        box-shadow: var(--shadow-md);
        transition: var(--transition-normal);
      }

      .section {
        padding: var(--spacing-section);
      }

      .element-margin {
        margin: var(--spacing-element);
      }
    `;

    this.cssCustomPropertiesSubject.next(cssProperties);
  }

  /**
   * Get current CSS custom properties
   */
  getCurrentCssCustomProperties(): string {
    return this.cssCustomPropertiesSubject.value;
  }

  /**
   * Reset to default styles
   */
  resetToDefaults(): void {
    this.globalStylesSubject.next(this.getDefaultGlobalStyles());
    this.updateCssCustomProperties();
  }

  /**
   * Deep merge utility for nested objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Export global styles as JSON
   */
  exportStyles(): string {
    return JSON.stringify(this.getCurrentGlobalStyles(), null, 2);
  }

  /**
   * Import global styles from JSON
   */
  importStyles(stylesJson: string): boolean {
    try {
      const styles = JSON.parse(stylesJson) as GlobalStyles;
      this.validateGlobalStyles(styles);
      this.globalStylesSubject.next(styles);
      this.updateCssCustomProperties();
      return true;
    } catch (error) {
      console.error('Failed to import styles:', error);
      return false;
    }
  }

  /**
   * Validate global styles structure
   */
  private validateGlobalStyles(styles: any): void {
    if (!styles || typeof styles !== 'object') {
      throw new Error('Invalid styles format');
    }

    const requiredSections = ['typography', 'colors', 'spacing', 'effects'];
    for (const section of requiredSections) {
      if (!styles[section]) {
        throw new Error(`Missing required section: ${section}`);
      }
    }
  }
}