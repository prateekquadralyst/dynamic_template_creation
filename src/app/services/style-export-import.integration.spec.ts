import { TestBed } from '@angular/core/testing';
import { StyleExportImportService } from './style-export-import.service';
import { GlobalStylingService } from './global-styling.service';
import { GlobalStyles } from '../models/project.interface';

describe('StyleExportImportService Integration', () => {
  let styleService: StyleExportImportService;
  let globalStylingService: GlobalStylingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    styleService = TestBed.inject(StyleExportImportService);
    globalStylingService = TestBed.inject(GlobalStylingService);
  });

  it('should export and import styles maintaining data integrity', () => {
    // Get current global styles
    const originalStyles = globalStylingService.getCurrentGlobalStyles();
    
    // Modify some styles
    const modifiedStyles: GlobalStyles = {
      ...originalStyles,
      colors: {
        ...originalStyles.colors,
        primary: '#ff0000',
        secondary: '#00ff00'
      },
      typography: {
        ...originalStyles.typography,
        headingFont: 'Arial, sans-serif'
      }
    };
    
    globalStylingService.updateGlobalStyles(modifiedStyles);
    
    // Export the modified styles
    const packageInfo = {
      name: 'Integration Test Package',
      description: 'Test package for integration testing',
      tags: ['test', 'integration'],
      createdBy: 'Test Suite'
    };
    
    const customCSS = '.test { color: blue; }';
    const stylePackage = styleService.exportStylePackage(
      modifiedStyles,
      customCSS,
      packageInfo
    );
    
    // Verify export
    expect(stylePackage.name).toBe(packageInfo.name);
    expect(stylePackage.globalStyles.colors.primary).toBe('#ff0000');
    expect(stylePackage.globalStyles.colors.secondary).toBe('#00ff00');
    expect(stylePackage.globalStyles.typography.headingFont).toBe('Arial, sans-serif');
    expect(stylePackage.customCSS).toBe(customCSS);
    
    // Export as JSON
    const jsonString = styleService.exportStylePackageAsJson(stylePackage);
    
    // Import the JSON
    const importResult = styleService.importStylePackage(jsonString);
    
    // Verify import success
    expect(importResult.success).toBe(true);
    expect(importResult.errors).toEqual([]);
    expect(importResult.stylePackage).toBeDefined();
    
    // Verify imported data matches exported data
    const importedPackage = importResult.stylePackage!;
    expect(importedPackage.name).toBe(stylePackage.name);
    expect(importedPackage.globalStyles.colors.primary).toBe('#ff0000');
    expect(importedPackage.globalStyles.colors.secondary).toBe('#00ff00');
    expect(importedPackage.globalStyles.typography.headingFont).toBe('Arial, sans-serif');
    expect(importedPackage.customCSS).toBe(customCSS);
  });

  it('should create and share style templates', () => {
    const originalStyles = globalStylingService.getCurrentGlobalStyles();
    
    // Create a style package
    const packageInfo = {
      name: 'Shareable Template',
      description: 'A template for sharing',
      tags: ['shareable', 'template'],
      createdBy: 'Test User'
    };
    
    const stylePackage = styleService.exportStylePackage(
      originalStyles,
      '',
      packageInfo
    );
    
    // Create template from package
    const template = styleService.createStyleTemplate(stylePackage);
    
    expect(template.id).toBeDefined();
    expect(template.name).toBe(packageInfo.name);
    expect(template.isShared).toBe(false);
    expect(template.downloads).toBe(0);
    expect(template.rating).toBe(0);
    
    // Share the template
    const sharedTemplate = styleService.shareStyleTemplate(template);
    
    expect(sharedTemplate.isShared).toBe(true);
    expect(sharedTemplate.shareId).toBeDefined();
    expect(sharedTemplate.sharedAt).toBeInstanceOf(Date);
    expect(sharedTemplate.shareUrl).toBeDefined();
    expect(sharedTemplate.shareUrl).toContain(template.id);
  });

  it('should provide predefined style templates', () => {
    const templates = styleService.getPredefinedStyleTemplates();
    
    expect(templates.length).toBeGreaterThan(0);
    
    // Verify each template has required properties
    templates.forEach(template => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.globalStyles).toBeDefined();
      expect(template.globalStyles.typography).toBeDefined();
      expect(template.globalStyles.colors).toBeDefined();
      expect(template.globalStyles.spacing).toBeDefined();
      expect(template.globalStyles.effects).toBeDefined();
      expect(template.isShared).toBe(true);
      expect(template.createdBy).toBe('System');
    });
    
    // Verify specific templates exist
    const templateNames = templates.map(t => t.name);
    expect(templateNames).toContain('Modern Minimal');
    expect(templateNames).toContain('Warm Creative');
    expect(templateNames).toContain('Professional Dark');
  });

  it('should validate style packages correctly', () => {
    const validStyles = globalStylingService.getCurrentGlobalStyles();
    
    // Test valid package
    const validPackage = styleService.exportStylePackage(
      validStyles,
      '',
      { name: 'Valid Package', description: 'Valid' }
    );
    
    const validResult = styleService.validateStylePackage(validPackage);
    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toEqual([]);
    
    // Test invalid package - missing required fields
    const invalidPackage = {
      name: 'Invalid Package'
      // Missing other required fields
    };
    
    const invalidResult = styleService.validateStylePackage(invalidPackage);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors.length).toBeGreaterThan(0);
    
    // Test package with invalid colors
    const packageWithInvalidColors = {
      ...validPackage,
      globalStyles: {
        ...validPackage.globalStyles,
        colors: {
          ...validPackage.globalStyles.colors,
          primary: 'invalid-color-format'
        }
      }
    };
    
    const colorValidationResult = styleService.validateStylePackage(packageWithInvalidColors);
    expect(colorValidationResult.warnings.length).toBeGreaterThan(0);
  });
});