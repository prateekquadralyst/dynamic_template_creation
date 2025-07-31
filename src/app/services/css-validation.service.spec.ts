import { TestBed } from '@angular/core/testing';
import { CssValidationService } from './css-validation.service';

describe('CssValidationService', () => {
  let service: CssValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CssValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should validate valid CSS without errors', () => {
    const validCSS = `
      .test {
        color: red;
        background: blue;
        margin: 10px;
      }
    `;

    const result = service.validateCSS(validCSS);

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect syntax errors', () => {
    const invalidCSS = `
      .test {
        color: red
        background: blue;
      }
    `;

    const result = service.validateCSS(invalidCSS);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.isValid).toBe(false);
  });

  it('should detect invalid color values', () => {
    const cssWithInvalidColor = `
      .test {
        color: invalid-color;
      }
    `;

    const result = service.validateCSS(cssWithInvalidColor);

    expect(result.errors.some(error => error.message.includes('Invalid color'))).toBe(true);
  });

  it('should detect missing semicolons', () => {
    const cssWithMissingSemicolon = `
      .test {
        color: red
        background: blue;
      }
    `;

    const result = service.validateCSS(cssWithMissingSemicolon);

    expect(result.warnings.some(warning => warning.message.includes('Missing semicolon'))).toBe(true);
  });

  it('should detect CSS conflicts', () => {
    const cssWithConflicts = `
      .test {
        color: red;
        color: blue;
      }
    `;

    const result = service.validateCSS(cssWithConflicts);

    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  it('should optimize CSS correctly', () => {
    const unoptimizedCSS = `
      /* This is a comment */
      .test {
        color: red;
        background: blue;
        margin: 0px;
      }
    `;

    const result = service.optimizeCSS(unoptimizedCSS);

    expect(result.optimizedSize).toBeLessThan(result.originalSize);
    expect(result.optimizedCSS).not.toContain('/* This is a comment */');
    expect(result.optimizedCSS).toContain('margin:0');
    expect(result.compressionRatio).toBeGreaterThan(0);
  });

  it('should shorten hex colors', () => {
    const cssWithLongHex = `
      .test {
        color: #ff0000;
        background: #00ff00;
      }
    `;

    const result = service.optimizeCSS(cssWithLongHex);

    expect(result.optimizedCSS).toContain('#f00');
    expect(result.optimizedCSS).toContain('#0f0');
  });

  it('should remove unnecessary units from zero values', () => {
    const cssWithZeroUnits = `
      .test {
        margin: 0px;
        padding: 0em;
        border: 0rem solid red;
      }
    `;

    const result = service.optimizeCSS(cssWithZeroUnits);

    expect(result.optimizedCSS).toContain('margin:0');
    expect(result.optimizedCSS).toContain('padding:0');
    expect(result.optimizedCSS).toContain('border:0 solid red');
  });

  it('should handle empty CSS', () => {
    const result = service.validateCSS('');

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.warnings.length).toBe(0);
    expect(result.conflicts.length).toBe(0);
  });

  it('should detect deprecated properties', () => {
    const cssWithDeprecated = `
      .test {
        filter: alpha(opacity=50);
      }
    `;

    const result = service.validateCSS(cssWithDeprecated);

    expect(result.warnings.some(warning => warning.message.includes('deprecated'))).toBe(true);
  });
});