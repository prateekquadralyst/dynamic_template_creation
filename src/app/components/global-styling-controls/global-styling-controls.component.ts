import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil, debounceTime } from "rxjs";
import { GlobalStylingService } from "../../services/global-styling.service";
import { FontManagementService } from "../../services/font-management.service";
import { CssValidationService, CSSValidationError } from "../../services/css-validation.service";
import { StyleExportImportService, StyleTemplate, StylePackage, StyleImportResult } from "../../services/style-export-import.service";
import { CssEditorComponent } from "../css-editor/css-editor.component";
import { FontManagerComponent } from "../font-manager/font-manager.component";
import { ResponsiveDesignEditorComponent, DevicePreset } from "../responsive-design-editor/responsive-design-editor.component";
import {
  GlobalStyles,
  TypographySettings,
  ColorSettings,
  SpacingSettings,
  EffectSettings,
} from "../../models/project.interface";
import { ResponsiveSettings, DeviceType } from "../../models/section.interface";
import { FontFamily } from "../../models/font.interface";

@Component({
  selector: "app-global-styling-controls",
  standalone: true,
  imports: [CommonModule, FormsModule, CssEditorComponent, FontManagerComponent],
  templateUrl: "./global-styling-controls.component.html",
  styleUrls: ["./global-styling-controls.component.css"],
})
export class GlobalStylingControlsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Responsive design inputs and outputs
  @Input() responsiveSettings: ResponsiveSettings | null = null;
  @Input() currentDevice: DevicePreset | null = null;
  @Input() enableResponsiveControls: boolean = false;
  @Output() responsiveSettingsChange = new EventEmitter<ResponsiveSettings>();
  @Output() deviceChange = new EventEmitter<DevicePreset>();

  // Current global styles
  globalStyles: GlobalStyles = {} as GlobalStyles;

  // Panel collapse states
  panels = {
    typography: true,
    colors: true,
    spacing: true,
    effects: true,
    customCSS: false,
  };

  // Custom CSS properties
  customCSS: string = '';
  cssValidationErrors: CSSValidationError[] = [];
  private cssValidationSubject = new Subject<string>();

  // Font manager properties
  showFontManager = false;
  currentHeadingFont: FontFamily | null = null;
  currentBodyFont: FontFamily | null = null;

  // Font options
  fontOptions = [
    { name: "Inter", value: "Inter, sans-serif" },
    { name: "Roboto", value: "Roboto, sans-serif" },
    { name: "Open Sans", value: '"Open Sans", sans-serif' },
    { name: "Lato", value: "Lato, sans-serif" },
    { name: "Montserrat", value: "Montserrat, sans-serif" },
    { name: "Poppins", value: "Poppins, sans-serif" },
    { name: "Source Sans Pro", value: '"Source Sans Pro", sans-serif' },
    { name: "Nunito", value: "Nunito, sans-serif" },
    { name: "Playfair Display", value: '"Playfair Display", serif' },
    { name: "Merriweather", value: "Merriweather, serif" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Times New Roman", value: '"Times New Roman", serif' },
  ];

  // Font size options
  fontSizeOptions = [
    "0.75rem",
    "0.875rem",
    "1rem",
    "1.125rem",
    "1.25rem",
    "1.5rem",
    "1.75rem",
    "2rem",
    "2.25rem",
    "2.5rem",
    "3rem",
    "3.5rem",
    "4rem",
  ];

  // Style export/import properties
  styleTemplates: StyleTemplate[] = [];
  showStyleTemplates = false;
  showExportDialog = false;
  showImportDialog = false;
  exportPackageName = '';
  exportPackageDescription = '';
  exportPackageTags = '';
  importResult: StyleImportResult | null = null;

  // Predefined color palettes
  colorPalettes = [
    {
      name: "Blue Ocean",
      colors: {
        primary: "#3b82f6",
        secondary: "#64748b",
        accent: "#06b6d4",
        text: "#1f2937",
        background: "#ffffff",
        surface: "#f8fafc",
      },
    },
    {
      name: "Forest Green",
      colors: {
        primary: "#059669",
        secondary: "#6b7280",
        accent: "#f59e0b",
        text: "#111827",
        background: "#ffffff",
        surface: "#f9fafb",
      },
    },
    {
      name: "Sunset Orange",
      colors: {
        primary: "#ea580c",
        secondary: "#78716c",
        accent: "#eab308",
        text: "#1c1917",
        background: "#ffffff",
        surface: "#fafaf9",
      },
    },
    {
      name: "Purple Dream",
      colors: {
        primary: "#7c3aed",
        secondary: "#6b7280",
        accent: "#ec4899",
        text: "#1f2937",
        background: "#ffffff",
        surface: "#f9fafb",
      },
    },
    {
      name: "Dark Mode",
      colors: {
        primary: "#60a5fa",
        secondary: "#9ca3af",
        accent: "#fbbf24",
        text: "#f9fafb",
        background: "#111827",
        surface: "#1f2937",
      },
    },
  ];

  constructor(
    private globalStylingService: GlobalStylingService,
    private fontManagementService: FontManagementService,
    private cssValidationService: CssValidationService,
    private styleExportImportService: StyleExportImportService
  ) {}

  ngOnInit(): void {
    // Subscribe to global styles changes
    this.globalStylingService.globalStyles$
      .pipe(takeUntil(this.destroy$))
      .subscribe((styles) => {
        this.globalStyles = { ...styles };
      });

    // Set up CSS validation debouncing
    this.cssValidationSubject
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe(css => {
        this.validateCustomCSS(css);
      });

    // Load predefined style templates
    this.loadStyleTemplates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle panel visibility
   */
  togglePanel(panel: keyof typeof this.panels): void {
    this.panels[panel] = !this.panels[panel];
  }

  /**
   * Update typography settings
   */
  updateTypography(): void {
    this.globalStylingService.updateTypography(this.globalStyles.typography);
  }

  /**
   * Update color settings
   */
  updateColors(): void {
    this.globalStylingService.updateColors(this.globalStyles.colors);
  }

  /**
   * Update spacing settings
   */
  updateSpacing(): void {
    this.globalStylingService.updateSpacing(this.globalStyles.spacing);
  }

  /**
   * Update effect settings
   */
  updateEffects(): void {
    this.globalStylingService.updateEffects(this.globalStyles.effects);
  }

  /**
   * Apply a color palette
   */
  applyColorPalette(palette: any): void {
    this.globalStyles.colors = { ...palette.colors };
    this.updateColors();
  }

  /**
   * Reset to default styles
   */
  resetToDefaults(): void {
    if (
      confirm(
        "Are you sure you want to reset all styling to defaults? This action cannot be undone."
      )
    ) {
      this.globalStylingService.resetToDefaults();
    }
  }

  /**
   * Export styles
   */
  exportStyles(): void {
    const stylesJson = this.globalStylingService.exportStyles();
    const blob = new Blob([stylesJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "global-styles.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Import styles
   */
  importStyles(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const success = this.globalStylingService.importStyles(
            e.target.result
          );
          if (success) {
            alert("Styles imported successfully!");
          } else {
            alert("Failed to import styles. Please check the file format.");
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }

  /**
   * Generate random color
   */
  generateRandomColor(): string {
    const colors = [
      "#ef4444",
      "#f97316",
      "#f59e0b",
      "#eab308",
      "#84cc16",
      "#22c55e",
      "#10b981",
      "#14b8a6",
      "#06b6d4",
      "#0ea5e9",
      "#3b82f6",
      "#6366f1",
      "#8b5cf6",
      "#a855f7",
      "#c084fc",
      "#d946ef",
      "#ec4899",
      "#f43f5e",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Randomize color palette
   */
  randomizeColors(): void {
    this.globalStyles.colors = {
      primary: this.generateRandomColor(),
      secondary: this.generateRandomColor(),
      accent: this.generateRandomColor(),
      text: "#1f2937",
      background: "#ffffff",
      surface: "#f8fafc",
    };
    this.updateColors();
  }

  /**
   * Get contrast ratio for accessibility
   */
  getContrastRatio(color1: string, color2: string): number {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd use a proper color library
    const getLuminance = (color: string): number => {
      const hex = color.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      const sRGB = [r, g, b].map((c) => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Check if color combination meets accessibility standards
   */
  isAccessible(color1: string, color2: string): boolean {
    return this.getContrastRatio(color1, color2) >= 4.5;
  }

  /**
   * Open CSS Editor in a modal or new window
   */
  openCSSEditor(): void {
    // For now, we'll just expand the custom CSS panel and focus on the textarea
    this.panels.customCSS = true;
    
    // In a real implementation, you might open a modal with the full CSS editor
    setTimeout(() => {
      const textarea = document.querySelector('.custom-css-container textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  }

  /**
   * Update custom CSS
   */
  updateCustomCSS(): void {
    this.cssValidationSubject.next(this.customCSS);
    // Apply custom CSS to the document
    this.applyCustomCSS();
  }

  /**
   * Validate custom CSS
   */
  private validateCustomCSS(css: string): void {
    const result = this.cssValidationService.validateCSS(css);
    this.cssValidationErrors = [...result.errors, ...result.warnings];
  }

  /**
   * Apply custom CSS to the document
   */
  private applyCustomCSS(): void {
    // Remove existing custom CSS
    const existingStyle = document.getElementById('custom-css-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new custom CSS
    if (this.customCSS.trim()) {
      const style = document.createElement('style');
      style.id = 'custom-css-styles';
      style.textContent = this.customCSS;
      document.head.appendChild(style);
    }
  }

  /**
   * Format custom CSS
   */
  formatCustomCSS(): void {
    if (!this.customCSS.trim()) return;

    try {
      // Simple CSS formatting
      let formatted = this.customCSS
        .replace(/\s*{\s*/g, ' {\n  ')
        .replace(/;\s*/g, ';\n  ')
        .replace(/\s*}\s*/g, '\n}\n\n')
        .replace(/,\s*/g, ',\n')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

      this.customCSS = formatted;
      this.updateCustomCSS();
    } catch (error) {
      console.error('Error formatting CSS:', error);
    }
  }

  /**
   * Minify custom CSS
   */
  minifyCustomCSS(): void {
    if (!this.customCSS.trim()) return;

    try {
      const result = this.cssValidationService.optimizeCSS(this.customCSS);
      this.customCSS = result.optimizedCSS;
      this.updateCustomCSS();
    } catch (error) {
      console.error('Error minifying CSS:', error);
    }
  }

  /**
   * Clear custom CSS
   */
  clearCustomCSS(): void {
    if (this.customCSS.trim() && !confirm('Are you sure you want to clear all custom CSS?')) {
      return;
    }

    this.customCSS = '';
    this.cssValidationErrors = [];
    this.applyCustomCSS(); // This will remove the custom styles
  }

  /**
   * Open font manager
   */
  openFontManager(): void {
    this.showFontManager = !this.showFontManager;
  }

  /**
   * Handle font selection from font manager
   */
  onFontSelected(event: { type: 'heading' | 'body', font: FontFamily }): void {
    if (event.type === 'heading') {
      this.currentHeadingFont = event.font;
    } else {
      this.currentBodyFont = event.font;
    }
    
    // Close font manager after selection
    this.showFontManager = false;
  }

  /**
   * Get current heading font name for display
   */
  getCurrentHeadingFontName(): string {
    if (this.currentHeadingFont) {
      return this.currentHeadingFont.displayName;
    }
    
    // Extract font name from current typography settings
    const currentFont = this.globalStyles.typography?.headingFont || 'Inter, sans-serif';
    const fontName = currentFont.split(',')[0].replace(/['"]/g, '').trim();
    return fontName;
  }

  /**
   * Get current body font name for display
   */
  getCurrentBodyFontName(): string {
    if (this.currentBodyFont) {
      return this.currentBodyFont.displayName;
    }
    
    // Extract font name from current typography settings
    const currentFont = this.globalStyles.typography?.bodyFont || 'Inter, sans-serif';
    const fontName = currentFont.split(',')[0].replace(/['"]/g, '').trim();
    return fontName;
  }

  // Style Export/Import Methods

  /**
   * Load style templates
   */
  loadStyleTemplates(): void {
    this.styleTemplates = this.styleExportImportService.getPredefinedStyleTemplates();
  }

  /**
   * Toggle style templates panel
   */
  toggleStyleTemplates(): void {
    this.showStyleTemplates = !this.showStyleTemplates;
  }

  /**
   * Apply a style template
   */
  applyStyleTemplate(template: StyleTemplate): void {
    if (confirm(`Apply "${template.name}" style template? This will replace your current styles.`)) {
      this.globalStylingService.updateGlobalStyles(template.globalStyles);
      if (template.customCSS) {
        this.customCSS = template.customCSS;
        this.updateCustomCSS();
      }
      this.showStyleTemplates = false;
    }
  }

  /**
   * Open export dialog
   */
  openExportDialog(): void {
    this.showExportDialog = true;
    this.exportPackageName = '';
    this.exportPackageDescription = '';
    this.exportPackageTags = '';
  }

  /**
   * Close export dialog
   */
  closeExportDialog(): void {
    this.showExportDialog = false;
  }

  /**
   * Export style package
   */
  exportStylePackage(): void {
    if (!this.exportPackageName.trim()) {
      alert('Please enter a package name.');
      return;
    }

    const packageInfo = {
      name: this.exportPackageName.trim(),
      description: this.exportPackageDescription.trim() || 'Custom style package',
      tags: this.exportPackageTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      createdBy: 'User'
    };

    const stylePackage = this.styleExportImportService.exportStylePackage(
      this.globalStyles,
      this.customCSS,
      packageInfo
    );

    this.styleExportImportService.downloadStylePackage(stylePackage);
    this.closeExportDialog();
  }

  /**
   * Open import dialog
   */
  openImportDialog(): void {
    this.showImportDialog = true;
    this.importResult = null;
  }

  /**
   * Close import dialog
   */
  closeImportDialog(): void {
    this.showImportDialog = false;
    this.importResult = null;
  }

  /**
   * Import style package from file
   */
  async importStylePackageFromFile(): Promise<void> {
    try {
      const result = await this.styleExportImportService.importStylePackageFromFile();
      this.importResult = result;

      if (result.success && result.stylePackage) {
        // Show preview of what will be imported
        console.log('Style package imported successfully:', result.stylePackage);
      }
    } catch (error) {
      this.importResult = {
        success: false,
        errors: ['Failed to import style package'],
        warnings: []
      };
    }
  }

  /**
   * Apply imported style package
   */
  applyImportedStylePackage(): void {
    if (!this.importResult?.stylePackage) {
      return;
    }

    if (confirm('Apply imported styles? This will replace your current styles.')) {
      this.globalStylingService.updateGlobalStyles(this.importResult.stylePackage.globalStyles);
      
      if (this.importResult.stylePackage.customCSS) {
        this.customCSS = this.importResult.stylePackage.customCSS;
        this.updateCustomCSS();
      }

      this.closeImportDialog();
    }
  }

  /**
   * Enhanced export styles with package format
   */
  exportStylesEnhanced(): void {
    this.openExportDialog();
  }

  /**
   * Enhanced import styles with validation
   */
  importStylesEnhanced(): void {
    this.openImportDialog();
  }

  /**
   * Create style template from current styles
   */
  createStyleTemplate(): void {
    const templateName = prompt('Enter a name for this style template:');
    if (!templateName?.trim()) {
      return;
    }

    const templateDescription = prompt('Enter a description (optional):') || 'Custom style template';

    const packageInfo = {
      name: templateName.trim(),
      description: templateDescription.trim(),
      tags: ['custom'],
      createdBy: 'User'
    };

    const stylePackage = this.styleExportImportService.exportStylePackage(
      this.globalStyles,
      this.customCSS,
      packageInfo
    );

    const template = this.styleExportImportService.createStyleTemplate(stylePackage);
    
    // Add to local templates (in a real app, this would be persisted)
    this.styleTemplates.unshift(template);
    
    alert(`Style template "${templateName}" created successfully!`);
  }

  /**
   * Share style template
   */
  shareStyleTemplate(template: StyleTemplate): void {
    const sharedTemplate = this.styleExportImportService.shareStyleTemplate(template);
    
    // Copy share URL to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sharedTemplate.shareUrl).then(() => {
        alert(`Share URL copied to clipboard:\n${sharedTemplate.shareUrl}`);
      }).catch(() => {
        prompt('Copy this share URL:', sharedTemplate.shareUrl);
      });
    } else {
      prompt('Copy this share URL:', sharedTemplate.shareUrl);
    }
  }

  /**
   * Delete custom style template
   */
  deleteStyleTemplate(template: StyleTemplate): void {
    if (template.createdBy === 'System') {
      alert('Cannot delete system templates.');
      return;
    }

    if (confirm(`Delete style template "${template.name}"?`)) {
      const index = this.styleTemplates.findIndex(t => t.id === template.id);
      if (index > -1) {
        this.styleTemplates.splice(index, 1);
      }
    }
  }

  /**
   * Get template tags as string
   */
  getTemplateTagsString(template: StyleTemplate): string {
    return template.tags.join(', ');
  }

  /**
   * Get template preview colors
   */
  getTemplatePreviewColors(template: StyleTemplate): { primary: string; secondary: string; background: string } {
    return {
      primary: template.globalStyles.colors.primary,
      secondary: template.globalStyles.colors.secondary,
      background: template.globalStyles.colors.background
    };
  }

  // Responsive Design Methods

  /**
   * Handle device change from responsive editor
   */
  onDeviceChange(device: DevicePreset): void {
    this.deviceChange.emit(device);
  }

  /**
   * Handle responsive settings change
   */
  onResponsiveSettingsChange(settings: ResponsiveSettings): void {
    this.responsiveSettingsChange.emit(settings);
  }

  /**
   * Update typography with responsive considerations
   */
  updateTypographyResponsive(): void {
    if (this.enableResponsiveControls && this.currentDevice) {
      // Apply device-specific typography adjustments
      const adjustedTypography = this.applyDeviceTypographyAdjustments(this.globalStyles.typography);
      this.globalStylingService.updateTypography(adjustedTypography);
    } else {
      this.updateTypography();
    }
  }

  /**
   * Update colors with responsive considerations
   */
  updateColorsResponsive(): void {
    if (this.enableResponsiveControls && this.currentDevice) {
      // Apply device-specific color adjustments
      const adjustedColors = this.applyDeviceColorAdjustments(this.globalStyles.colors);
      this.globalStylingService.updateColors(adjustedColors);
    } else {
      this.updateColors();
    }
  }

  /**
   * Update spacing with responsive considerations
   */
  updateSpacingResponsive(): void {
    if (this.enableResponsiveControls && this.currentDevice) {
      // Apply device-specific spacing adjustments
      const adjustedSpacing = this.applyDeviceSpacingAdjustments(this.globalStyles.spacing);
      this.globalStylingService.updateSpacing(adjustedSpacing);
    } else {
      this.updateSpacing();
    }
  }

  /**
   * Apply device-specific typography adjustments
   */
  private applyDeviceTypographyAdjustments(typography: TypographySettings): TypographySettings {
    if (!this.currentDevice) return typography;

    const adjustedTypography = { ...typography };

    // Apply device-specific font size adjustments
    switch (this.currentDevice.type) {
      case DeviceType.MOBILE:
        // Reduce font sizes for mobile
        adjustedTypography.fontSizes = {
          ...typography.fontSizes,
          h1: this.scaleFontSize(typography.fontSizes.h1, 0.8),
          h2: this.scaleFontSize(typography.fontSizes.h2, 0.85),
          h3: this.scaleFontSize(typography.fontSizes.h3, 0.9),
          body: this.scaleFontSize(typography.fontSizes.body, 0.95)
        };
        break;
      case DeviceType.TABLET:
        // Slightly reduce font sizes for tablet
        adjustedTypography.fontSizes = {
          ...typography.fontSizes,
          h1: this.scaleFontSize(typography.fontSizes.h1, 0.9),
          h2: this.scaleFontSize(typography.fontSizes.h2, 0.95),
          body: this.scaleFontSize(typography.fontSizes.body, 0.98)
        };
        break;
      case DeviceType.DESKTOP:
        // Keep original sizes for desktop
        break;
    }

    return adjustedTypography;
  }

  /**
   * Apply device-specific color adjustments
   */
  private applyDeviceColorAdjustments(colors: ColorSettings): ColorSettings {
    if (!this.currentDevice) return colors;

    const adjustedColors = { ...colors };

    // Apply device-specific color adjustments if needed
    // For example, you might want to adjust contrast for mobile devices
    if (this.currentDevice.type === DeviceType.MOBILE) {
      // Increase contrast for mobile readability
      if (this.getContrastRatio(colors.text, colors.background) < 7) {
        adjustedColors.text = this.adjustColorContrast(colors.text, colors.background);
      }
    }

    return adjustedColors;
  }

  /**
   * Apply device-specific spacing adjustments
   */
  private applyDeviceSpacingAdjustments(spacing: SpacingSettings): SpacingSettings {
    if (!this.currentDevice) return spacing;

    const adjustedSpacing = { ...spacing };

    // Apply device-specific spacing adjustments
    switch (this.currentDevice.type) {
      case DeviceType.MOBILE:
        // Reduce spacing for mobile
        adjustedSpacing.baseUnit = Math.max(4, spacing.baseUnit * 0.8);
        adjustedSpacing.sectionPadding = this.scaleSpacing(spacing.sectionPadding, 0.7);
        adjustedSpacing.elementMargin = this.scaleSpacing(spacing.elementMargin, 0.8);
        break;
      case DeviceType.TABLET:
        // Slightly reduce spacing for tablet
        adjustedSpacing.baseUnit = Math.max(6, spacing.baseUnit * 0.9);
        adjustedSpacing.sectionPadding = this.scaleSpacing(spacing.sectionPadding, 0.85);
        adjustedSpacing.elementMargin = this.scaleSpacing(spacing.elementMargin, 0.9);
        break;
      case DeviceType.DESKTOP:
        // Keep original spacing for desktop
        break;
    }

    return adjustedSpacing;
  }

  /**
   * Scale font size by a factor
   */
  private scaleFontSize(fontSize: string, factor: number): string {
    const match = fontSize.match(/^(\d*\.?\d+)(rem|px|em)$/);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      return `${(value * factor).toFixed(2)}${unit}`;
    }
    return fontSize;
  }

  /**
   * Scale spacing value by a factor
   */
  private scaleSpacing(spacing: string, factor: number): string {
    const match = spacing.match(/^(\d*\.?\d+)(rem|px|em)$/);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      return `${(value * factor).toFixed(2)}${unit}`;
    }
    return spacing;
  }

  /**
   * Adjust color contrast for better readability
   */
  private adjustColorContrast(textColor: string, backgroundColor: string): string {
    // Simple contrast adjustment - in a real implementation, you'd use a proper color library
    const textLuminance = this.getLuminance(textColor);
    const bgLuminance = this.getLuminance(backgroundColor);
    
    if (bgLuminance > 0.5) {
      // Light background, make text darker
      return this.darkenColor(textColor, 0.2);
    } else {
      // Dark background, make text lighter
      return this.lightenColor(textColor, 0.2);
    }
  }

  /**
   * Get luminance of a color
   */
  private getLuminance(color: string): number {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const sRGB = [r, g, b].map((c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  }

  /**
   * Darken a color by a factor
   */
  private darkenColor(color: string, factor: number): string {
    const hex = color.replace("#", "");
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));
    
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  }

  /**
   * Lighten a color by a factor
   */
  private lightenColor(color: string, factor: number): string {
    const hex = color.replace("#", "");
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + (255 - parseInt(hex.substr(0, 2), 16)) * factor);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + (255 - parseInt(hex.substr(2, 2), 16)) * factor);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + (255 - parseInt(hex.substr(4, 2), 16)) * factor);
    
    return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
  }

  /**
   * Get current device type display name
   */
  getCurrentDeviceTypeName(): string {
    if (!this.currentDevice) return 'Desktop';
    
    switch (this.currentDevice.type) {
      case DeviceType.MOBILE:
        return 'Mobile';
      case DeviceType.TABLET:
        return 'Tablet';
      case DeviceType.DESKTOP:
        return 'Desktop';
      default:
        return 'Desktop';
    }
  }

  /**
   * Check if responsive controls are enabled and device is selected
   */
  get isResponsiveModeActive(): boolean {
    return this.enableResponsiveControls && !!this.currentDevice;
  }
}
