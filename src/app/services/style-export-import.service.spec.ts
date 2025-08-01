import { TestBed } from '@angular/core/testing';
import { StyleExportImportService, StylePackage, StyleImportResult } from './style-export-import.service';
import { GlobalStyles } from '../models/project.interface';

describe('StyleExportImportService', () => {
  let service: StyleExportImportService;
  let mockGlobalStyles: GlobalStyles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StyleExportImportService);

    mockGlobalStyles = {
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
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('exportStylePackage', () => {
    it('should create a valid style package', () => {
      const packageInfo = {
        name: 'Test Style Package',
        description: 'A test style package',
        tags: ['test', 'modern'],
        createdBy: 'Test User'
      };

      const stylePackage = service.exportStylePackage(mockGlobalStyles, '', packageInfo);

      expect(stylePackage).toBeDefined();
      expect(stylePackage.name).toBe(packageInfo.name);
      expect(stylePackage.description).toBe(packageInfo.description);
      expect(stylePackage.tags).toEqual(packageInfo.tags);
      expect(stylePackage.createdBy).toBe(packageInfo.createdBy);
      expect(stylePackage.globalStyles).toEqual(mockGlobalStyles);
      expect(stylePackage.version).toBe('1.0.0');
      expect(stylePackage.id).toBeDefined();
      expect(stylePackage.createdAt).toBeInstanceOf(Date);
    });

    it('should include custom CSS when provided', () => {
      const customCSS = '.custom { color: red; }';
      const packageInfo = {
        name: 'Test Package',
        description: 'Test'
      };

      const stylePackage = service.exportStylePackage(mockGlobalStyles, customCSS, packageInfo);

      expect(stylePackage.customCSS).toBe(customCSS);
    });

    it('should use default values for optional fields', () => {
      const packageInfo = {
        name: 'Test Package',
        description: 'Test'
      };

      const stylePackage = service.exportStylePackage(mockGlobalStyles, '', packageInfo);

      expect(stylePackage.tags).toEqual([]);
      expect(stylePackage.createdBy).toBe('Anonymous');
      expect(stylePackage.customCSS).toBeUndefined();
    });
  });

  describe('exportStylePackageAsJson', () => {
    it('should export style package as formatted JSON string', () => {
      const packageInfo = {
        name: 'Test Package',
        description: 'Test'
      };

      const stylePackage = service.exportStylePackage(mockGlobalStyles, '', packageInfo);
      const jsonString = service.exportStylePackageAsJson(stylePackage);

      expect(typeof jsonString).toBe('string');
      expect(() => JSON.parse(jsonString)).not.toThrow();
      
      const parsed = JSON.parse(jsonString);
      expect(parsed.name).toBe(stylePackage.name);
      expect(parsed.globalStyles).toEqual(stylePackage.globalStyles);
    });
  });

  describe('importStylePackage', () => {
    let validStylePackage: StylePackage;
    let validJsonString: string;

    beforeEach(() => {
      const packageInfo = {
        name: 'Test Package',
        description: 'Test package for import'
      };
      validStylePackage = service.exportStylePackage(mockGlobalStyles, '', packageInfo);
      validJsonString = service.exportStylePackageAsJson(validStylePackage);
    });

    it('should successfully import a valid style package', () => {
      const result = service.importStylePackage(validJsonString);

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.stylePackage).toBeDefined();
      expect(result.stylePackage!.name).toBe(validStylePackage.name);
      expect(result.stylePackage!.globalStyles).toEqual(validStylePackage.globalStyles);
    });

    it('should fail to import invalid JSON', () => {
      const invalidJson = '{ invalid json }';
      const result = service.importStylePackage(invalidJson);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid JSON format');
      expect(result.stylePackage).toBeUndefined();
    });

    it('should fail to import style package with missing required fields', () => {
      const incompletePackage = {
        name: 'Test Package'
        // Missing other required fields
      };
      const incompleteJson = JSON.stringify(incompletePackage);
      const result = service.importStylePackage(incompleteJson);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.stylePackage).toBeUndefined();
    });

    it('should add warnings for version compatibility issues', () => {
      const packageWithOldVersion = { ...validStylePackage, version: '0.9.0' };
      const jsonString = JSON.stringify(packageWithOldVersion);
      const result = service.importStylePackage(jsonString);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('version'))).toBe(true);
    });
  });

  describe('validateStylePackage', () => {
    let validStylePackage: StylePackage;

    beforeEach(() => {
      const packageInfo = {
        name: 'Test Package',
        description: 'Test'
      };
      validStylePackage = service.exportStylePackage(mockGlobalStyles, '', packageInfo);
    });

    it('should validate a correct style package', () => {
      const result = service.validateStylePackage(validStylePackage);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const invalidPackage = { ...validStylePackage };
      delete (invalidPackage as any).name;
      delete (invalidPackage as any).globalStyles;

      const result = service.validateStylePackage(invalidPackage);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
      expect(result.errors.some(e => e.field === 'globalStyles')).toBe(true);
    });

    it('should detect missing global styles sections', () => {
      const invalidPackage = {
        ...validStylePackage,
        globalStyles: {
          typography: mockGlobalStyles.typography
          // Missing other sections
        }
      };

      const result = service.validateStylePackage(invalidPackage);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field.includes('colors'))).toBe(true);
      expect(result.errors.some(e => e.field.includes('spacing'))).toBe(true);
      expect(result.errors.some(e => e.field.includes('effects'))).toBe(true);
    });

    it('should detect invalid color formats', () => {
      const invalidPackage = {
        ...validStylePackage,
        globalStyles: {
          ...mockGlobalStyles,
          colors: {
            ...mockGlobalStyles.colors,
            primary: 'invalid-color'
          }
        }
      };

      const result = service.validateStylePackage(invalidPackage);

      expect(result.warnings.some(w => w.field.includes('primary'))).toBe(true);
    });

    it('should validate custom CSS if present', () => {
      const packageWithCSS = {
        ...validStylePackage,
        customCSS: '.test { color: red; }'
      };

      const result = service.validateStylePackage(packageWithCSS);

      expect(result.isValid).toBe(true);
    });

    it('should warn about unbalanced CSS braces', () => {
      const packageWithBadCSS = {
        ...validStylePackage,
        customCSS: '.test { color: red;'  // Missing closing brace
      };

      const result = service.validateStylePackage(packageWithBadCSS);

      expect(result.warnings.some(w => w.field === 'customCSS')).toBe(true);
    });
  });

  describe('createStyleTemplate', () => {
    it('should create a style template from a style package', () => {
      const packageInfo = {
        name: 'Test Package',
        description: 'Test'
      };
      const stylePackage = service.exportStylePackage(mockGlobalStyles, '', packageInfo);
      const template = service.createStyleTemplate(stylePackage);

      expect(template.id).toBeDefined();
      expect(template.name).toBe(stylePackage.name);
      expect(template.description).toBe(stylePackage.description);
      expect(template.globalStyles).toEqual(stylePackage.globalStyles);
      expect(template.isShared).toBe(false);
      expect(template.downloads).toBe(0);
      expect(template.rating).toBe(0);
    });
  });

  describe('shareStyleTemplate', () => {
    it('should create a shareable style template', () => {
      const packageInfo = {
        name: 'Test Package',
        description: 'Test'
      };
      const stylePackage = service.exportStylePackage(mockGlobalStyles, '', packageInfo);
      const template = service.createStyleTemplate(stylePackage);
      const sharedTemplate = service.shareStyleTemplate(template);

      expect(sharedTemplate.isShared).toBe(true);
      expect(sharedTemplate.shareId).toBeDefined();
      expect(sharedTemplate.sharedAt).toBeInstanceOf(Date);
      expect(sharedTemplate.shareUrl).toBeDefined();
      expect(sharedTemplate.shareUrl).toContain(template.id);
    });
  });

  describe('getPredefinedStyleTemplates', () => {
    it('should return predefined style templates', () => {
      const templates = service.getPredefinedStyleTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      
      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.globalStyles).toBeDefined();
        expect(template.isShared).toBe(true);
      });
    });

    it('should include different style variations', () => {
      const templates = service.getPredefinedStyleTemplates();
      const templateNames = templates.map(t => t.name);

      expect(templateNames).toContain('Modern Minimal');
      expect(templateNames).toContain('Warm Creative');
      expect(templateNames).toContain('Professional Dark');
    });
  });
});