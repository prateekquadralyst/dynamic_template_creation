import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil, debounceTime } from "rxjs";
import { GlobalStylingService } from "../../services/global-styling.service";
import { FontManagementService } from "../../services/font-management.service";
import { CssValidationService, CSSValidationError } from "../../services/css-validation.service";
import { CssEditorComponent } from "../css-editor/css-editor.component";
import { FontManagerComponent } from "../font-manager/font-manager.component";
import {
  GlobalStyles,
  TypographySettings,
  ColorSettings,
  SpacingSettings,
  EffectSettings,
} from "../../models/project.interface";
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
    private cssValidationService: CssValidationService
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
}
