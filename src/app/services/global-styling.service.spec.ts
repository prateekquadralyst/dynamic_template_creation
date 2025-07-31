import { TestBed } from '@angular/core/testing';
import { GlobalStylingService } from './global-styling.service';
import { GlobalStyles } from '../models/project.interface';

describe('GlobalStylingService', () => {
  let service: GlobalStylingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalStylingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have default global styles', () => {
    const styles = service.getCurrentGlobalStyles();
    expect(styles).toBeDefined();
    expect(styles.typography).toBeDefined();
    expect(styles.colors).toBeDefined();
    expect(styles.spacing).toBeDefined();
    expect(styles.effects).toBeDefined();
  });

  it('should update typography settings', () => {
    const newTypography = {
      headingFont: 'Arial, sans-serif',
      bodyFont: 'Helvetica, sans-serif'
    };

    service.updateTypography(newTypography);
    const styles = service.getCurrentGlobalStyles();
    
    expect(styles.typography.headingFont).toBe('Arial, sans-serif');
    expect(styles.typography.bodyFont).toBe('Helvetica, sans-serif');
  });

  it('should update color settings', () => {
    const newColors = {
      primary: '#ff0000',
      secondary: '#00ff00'
    };

    service.updateColors(newColors);
    const styles = service.getCurrentGlobalStyles();
    
    expect(styles.colors.primary).toBe('#ff0000');
    expect(styles.colors.secondary).toBe('#00ff00');
  });

  it('should generate CSS custom properties', () => {
    const css = service.getCurrentCssCustomProperties();
    expect(css).toContain(':root');
    expect(css).toContain('--color-primary');
    expect(css).toContain('--font-heading');
  });

  it('should export and import styles', () => {
    const originalStyles = service.getCurrentGlobalStyles();
    const exportedStyles = service.exportStyles();
    
    // Modify styles
    service.updateColors({ primary: '#123456' });
    
    // Import original styles
    const success = service.importStyles(exportedStyles);
    expect(success).toBe(true);
    
    const importedStyles = service.getCurrentGlobalStyles();
    expect(importedStyles.colors.primary).toBe(originalStyles.colors.primary);
  });

  it('should reset to defaults', () => {
    // Modify styles
    service.updateColors({ primary: '#123456' });
    
    // Reset to defaults
    service.resetToDefaults();
    
    const styles = service.getCurrentGlobalStyles();
    expect(styles.colors.primary).toBe('#3b82f6'); // Default primary color
  });
});