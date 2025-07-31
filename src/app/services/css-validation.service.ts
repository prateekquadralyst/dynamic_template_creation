import { Injectable } from '@angular/core';
import { parse, generate } from 'css-tree';

export interface CSSValidationResult {
  isValid: boolean;
  errors: CSSValidationError[];
  warnings: CSSValidationError[];
  conflicts: CSSConflict[];
}

export interface CSSValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  type: 'syntax' | 'property' | 'value' | 'selector';
}

export interface CSSConflict {
  selector: string;
  property: string;
  values: string[];
  locations: { line: number; column: number }[];
  severity: 'high' | 'medium' | 'low';
}

export interface CSSOptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  optimizedCSS: string;
  optimizations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CssValidationService {

  constructor() {}

  /**
   * Validate CSS code and return detailed results
   */
  validateCSS(css: string): CSSValidationResult {
    const result: CSSValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      conflicts: []
    };

    if (!css.trim()) {
      return result;
    }

    try {
      // Parse CSS using css-tree
      const ast = parse(css, {
        onParseError: (error: any) => {
          result.errors.push({
            line: error.line || 1,
            column: error.column || 1,
            message: error.message,
            severity: 'error',
            type: 'syntax'
          });
          result.isValid = false;
        }
      });

      // Perform additional validations
      this.validateProperties(css, result);
      this.validateSelectors(css, result);
      this.validateValues(css, result);
      this.detectConflicts(css, result);

    } catch (error) {
      result.errors.push({
        line: 1,
        column: 1,
        message: `Critical parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        type: 'syntax'
      });
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate CSS properties
   */
  private validateProperties(css: string, result: CSSValidationResult): void {
    const lines = css.split('\n');
    const validProperties = this.getValidCSSProperties();
    const deprecatedProperties = this.getDeprecatedProperties();

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Check for property declarations
      const propertyMatch = trimmedLine.match(/^\s*([a-zA-Z-]+)\s*:/);
      if (propertyMatch) {
        const property = propertyMatch[1].toLowerCase();

        // Check if property is deprecated
        if (deprecatedProperties.includes(property)) {
          result.warnings.push({
            line: lineNumber,
            column: line.indexOf(property) + 1,
            message: `Property '${property}' is deprecated`,
            severity: 'warning',
            type: 'property'
          });
        }

        // Check if property is valid (basic check)
        if (!validProperties.includes(property) && !property.startsWith('-webkit-') && !property.startsWith('-moz-') && !property.startsWith('-ms-')) {
          result.warnings.push({
            line: lineNumber,
            column: line.indexOf(property) + 1,
            message: `Unknown property '${property}'`,
            severity: 'warning',
            type: 'property'
          });
        }

        // Check for missing semicolons
        if (!trimmedLine.endsWith(';') && !trimmedLine.endsWith('{') && !trimmedLine.endsWith('}')) {
          result.warnings.push({
            line: lineNumber,
            column: line.length,
            message: 'Missing semicolon',
            severity: 'warning',
            type: 'syntax'
          });
        }
      }
    });
  }

  /**
   * Validate CSS selectors
   */
  private validateSelectors(css: string, result: CSSValidationResult): void {
    const lines = css.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Check for selector patterns
      if (trimmedLine.includes('{') && !trimmedLine.includes(':')) {
        const selector = trimmedLine.replace('{', '').trim();

        // Check for overly specific selectors
        const specificity = this.calculateSpecificity(selector);
        if (specificity > 300) {
          result.warnings.push({
            line: lineNumber,
            column: 1,
            message: `Selector '${selector}' has high specificity (${specificity}). Consider simplifying.`,
            severity: 'warning',
            type: 'selector'
          });
        }

        // Check for universal selector
        if (selector.includes('*') && selector !== '*') {
          result.warnings.push({
            line: lineNumber,
            column: line.indexOf('*') + 1,
            message: 'Universal selector (*) can impact performance',
            severity: 'warning',
            type: 'selector'
          });
        }

        // Check for ID selectors in components
        const idCount = (selector.match(/#/g) || []).length;
        if (idCount > 1) {
          result.warnings.push({
            line: lineNumber,
            column: 1,
            message: 'Multiple ID selectors in one rule can be overly specific',
            severity: 'warning',
            type: 'selector'
          });
        }
      }
    });
  }

  /**
   * Validate CSS values
   */
  private validateValues(css: string, result: CSSValidationResult): void {
    const lines = css.split('\n');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Check color values
      const colorMatch = trimmedLine.match(/:\s*([^;]+)/);
      if (colorMatch && this.isColorProperty(trimmedLine)) {
        const value = colorMatch[1].trim();
        if (!this.isValidColor(value)) {
          result.errors.push({
            line: lineNumber,
            column: line.indexOf(value) + 1,
            message: `Invalid color value '${value}'`,
            severity: 'error',
            type: 'value'
          });
        }
      }

      // Check for zero units
      const zeroUnitMatch = trimmedLine.match(/:\s*0(px|em|rem|%|vh|vw|pt|pc|in|cm|mm)/);
      if (zeroUnitMatch) {
        result.warnings.push({
          line: lineNumber,
          column: line.indexOf(zeroUnitMatch[0]) + 1,
          message: `Unnecessary unit for zero value: '${zeroUnitMatch[0]}'`,
          severity: 'warning',
          type: 'value'
        });
      }

      // Check for duplicate properties in same rule
      if (trimmedLine.includes(':')) {
        const property = trimmedLine.split(':')[0].trim();
        const remainingLines = lines.slice(index + 1);
        let braceCount = 0;
        
        for (let i = 0; i < remainingLines.length; i++) {
          const nextLine = remainingLines[i].trim();
          if (nextLine.includes('{')) braceCount++;
          if (nextLine.includes('}')) {
            braceCount--;
            if (braceCount < 0) break;
          }
          
          if (braceCount === 0 && nextLine.startsWith(property + ':')) {
            result.warnings.push({
              line: lineNumber,
              column: 1,
              message: `Duplicate property '${property}' found in same rule`,
              severity: 'warning',
              type: 'property'
            });
            break;
          }
        }
      }
    });
  }

  /**
   * Detect CSS conflicts
   */
  private detectConflicts(css: string, result: CSSValidationResult): void {
    try {
      const ast = parse(css);
      const selectorMap = new Map<string, Map<string, { values: string[], locations: { line: number; column: number }[] }>>();

      this.walkAST(ast, (node: any) => {
        if (node.type === 'Rule' && node.prelude && node.block) {
          const selector = this.getSelector(node);
          
          if (!selectorMap.has(selector)) {
            selectorMap.set(selector, new Map());
          }

          const propertyMap = selectorMap.get(selector)!;

          if (node.block.children) {
            node.block.children.forEach((declaration: any) => {
              if (declaration.type === 'Declaration') {
                const property = declaration.property;
                const value = this.getValue(declaration);
                const line = declaration.loc?.start?.line || 1;
                const column = declaration.loc?.start?.column || 1;

                if (!propertyMap.has(property)) {
                  propertyMap.set(property, { values: [], locations: [] });
                }

                const propertyData = propertyMap.get(property)!;
                propertyData.values.push(value);
                propertyData.locations.push({ line, column });
              }
            });
          }
        }
      });

      // Analyze conflicts
      selectorMap.forEach((propertyMap, selector) => {
        propertyMap.forEach((data, property) => {
          if (data.values.length > 1) {
            const uniqueValues = [...new Set(data.values)];
            if (uniqueValues.length > 1) {
              result.conflicts.push({
                selector,
                property,
                values: uniqueValues,
                locations: data.locations,
                severity: this.getConflictSeverity(property, uniqueValues)
              });
            }
          }
        });
      });

    } catch (error) {
      console.warn('Error detecting conflicts:', error);
    }
  }

  /**
   * Optimize CSS code
   */
  optimizeCSS(css: string): CSSOptimizationResult {
    const originalSize = css.length;
    const optimizations: string[] = [];
    let optimizedCSS = css;

    // Remove comments
    optimizedCSS = optimizedCSS.replace(/\/\*[\s\S]*?\*\//g, '');
    if (optimizedCSS.length < css.length) {
      optimizations.push('Removed comments');
    }

    // Remove unnecessary whitespace
    const beforeWhitespace = optimizedCSS.length;
    optimizedCSS = optimizedCSS
      .replace(/\s+/g, ' ')
      .replace(/\s*{\s*/g, '{')
      .replace(/;\s*/g, ';')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s*:\s*/g, ':')
      .trim();
    
    if (optimizedCSS.length < beforeWhitespace) {
      optimizations.push('Minimized whitespace');
    }

    // Remove zero units
    const beforeZeroUnits = optimizedCSS.length;
    optimizedCSS = optimizedCSS.replace(/\b0(px|em|rem|%|vh|vw|pt|pc|in|cm|mm)\b/g, '0');
    if (optimizedCSS.length < beforeZeroUnits) {
      optimizations.push('Removed unnecessary units from zero values');
    }

    // Shorten hex colors
    const beforeHex = optimizedCSS.length;
    optimizedCSS = optimizedCSS.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g, '#$1$2$3');
    if (optimizedCSS.length < beforeHex) {
      optimizations.push('Shortened hex color codes');
    }

    // Remove duplicate properties (keep last one)
    optimizedCSS = this.removeDuplicateProperties(optimizedCSS);
    optimizations.push('Removed duplicate properties');

    const optimizedSize = optimizedCSS.length;
    const compressionRatio = originalSize > 0 ? ((originalSize - optimizedSize) / originalSize) * 100 : 0;

    return {
      originalSize,
      optimizedSize,
      compressionRatio,
      optimizedCSS,
      optimizations
    };
  }

  /**
   * Remove duplicate properties within the same rule
   */
  private removeDuplicateProperties(css: string): string {
    return css.replace(/([^{}]+){([^{}]*)}/g, (match, selector, declarations) => {
      const props = new Map<string, string>();
      const declarationList = declarations.split(';').filter((d: any) => d.trim());

      declarationList.forEach((declaration: any) => {
        const [property, ...valueParts] = declaration.split(':');
        if (property && valueParts.length > 0) {
          const prop = property.trim();
          const value = valueParts.join(':').trim();
          props.set(prop, value);
        }
      });

      const optimizedDeclarations = Array.from(props.entries())
        .map(([prop, value]) => `${prop}:${value}`)
        .join(';');

      return `${selector}{${optimizedDeclarations}}`;
    });
  }

  /**
   * Calculate CSS selector specificity
   */
  private calculateSpecificity(selector: string): number {
    let specificity = 0;
    
    // Count IDs
    specificity += (selector.match(/#/g) || []).length * 100;
    
    // Count classes, attributes, and pseudo-classes
    specificity += (selector.match(/\.|:(?!:)|\[/g) || []).length * 10;
    
    // Count elements and pseudo-elements
    specificity += (selector.match(/^[a-zA-Z]|::|\s[a-zA-Z]/g) || []).length * 1;
    
    return specificity;
  }

  /**
   * Check if a property is color-related
   */
  private isColorProperty(line: string): boolean {
    const colorProperties = ['color', 'background-color', 'border-color', 'outline-color', 'text-decoration-color'];
    return colorProperties.some(prop => line.includes(prop + ':'));
  }

  /**
   * Validate color value
   */
  private isValidColor(color: string): boolean {
    const colorRegex = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)|transparent|inherit|initial|unset|currentColor|[a-zA-Z]+)$/;
    return colorRegex.test(color.trim());
  }

  /**
   * Get conflict severity based on property and values
   */
  private getConflictSeverity(property: string, values: string[]): 'high' | 'medium' | 'low' {
    const criticalProperties = ['display', 'position', 'float', 'clear'];
    const importantProperties = ['width', 'height', 'margin', 'padding', 'color', 'background'];

    if (criticalProperties.includes(property)) {
      return 'high';
    } else if (importantProperties.includes(property)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Walk through CSS AST
   */
  private walkAST(node: any, callback: (node: any) => void): void {
    if (!node) return;

    callback(node);

    if (node.children) {
      node.children.forEach((child: any) => this.walkAST(child, callback));
    }
    if (node.block) {
      this.walkAST(node.block, callback);
    }
    if (node.prelude) {
      this.walkAST(node.prelude, callback);
    }
  }

  /**
   * Get selector string from AST node
   */
  private getSelector(node: any): string {
    try {
      return generate(node.prelude);
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get value string from declaration node
   */
  private getValue(declaration: any): string {
    try {
      return generate(declaration.value);
    } catch {
      return '';
    }
  }

  /**
   * Get list of valid CSS properties
   */
  private getValidCSSProperties(): string[] {
    return [
      'align-content', 'align-items', 'align-self', 'all', 'animation', 'animation-delay',
      'animation-direction', 'animation-duration', 'animation-fill-mode', 'animation-iteration-count',
      'animation-name', 'animation-play-state', 'animation-timing-function', 'backface-visibility',
      'background', 'background-attachment', 'background-blend-mode', 'background-clip',
      'background-color', 'background-image', 'background-origin', 'background-position',
      'background-repeat', 'background-size', 'border', 'border-bottom', 'border-bottom-color',
      'border-bottom-left-radius', 'border-bottom-right-radius', 'border-bottom-style',
      'border-bottom-width', 'border-collapse', 'border-color', 'border-image',
      'border-image-outset', 'border-image-repeat', 'border-image-slice', 'border-image-source',
      'border-image-width', 'border-left', 'border-left-color', 'border-left-style',
      'border-left-width', 'border-radius', 'border-right', 'border-right-color',
      'border-right-style', 'border-right-width', 'border-spacing', 'border-style',
      'border-top', 'border-top-color', 'border-top-left-radius', 'border-top-right-radius',
      'border-top-style', 'border-top-width', 'border-width', 'bottom', 'box-decoration-break',
      'box-shadow', 'box-sizing', 'break-after', 'break-before', 'break-inside',
      'caption-side', 'caret-color', 'clear', 'clip', 'clip-path', 'color',
      'column-count', 'column-fill', 'column-gap', 'column-rule', 'column-rule-color',
      'column-rule-style', 'column-rule-width', 'column-span', 'column-width', 'columns',
      'content', 'counter-increment', 'counter-reset', 'cursor', 'direction', 'display',
      'empty-cells', 'filter', 'flex', 'flex-basis', 'flex-direction', 'flex-flow',
      'flex-grow', 'flex-shrink', 'flex-wrap', 'float', 'font', 'font-family',
      'font-feature-settings', 'font-kerning', 'font-language-override', 'font-size',
      'font-size-adjust', 'font-stretch', 'font-style', 'font-synthesis', 'font-variant',
      'font-variant-alternates', 'font-variant-caps', 'font-variant-east-asian',
      'font-variant-ligatures', 'font-variant-numeric', 'font-variant-position', 'font-weight',
      'gap', 'grid', 'grid-area', 'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows',
      'grid-column', 'grid-column-end', 'grid-column-gap', 'grid-column-start', 'grid-gap',
      'grid-row', 'grid-row-end', 'grid-row-gap', 'grid-row-start', 'grid-template',
      'grid-template-areas', 'grid-template-columns', 'grid-template-rows', 'hanging-punctuation',
      'height', 'hyphens', 'image-rendering', 'isolation', 'justify-content', 'justify-items',
      'justify-self', 'left', 'letter-spacing', 'line-break', 'line-height', 'list-style',
      'list-style-image', 'list-style-position', 'list-style-type', 'margin', 'margin-bottom',
      'margin-left', 'margin-right', 'margin-top', 'max-height', 'max-width', 'min-height',
      'min-width', 'mix-blend-mode', 'object-fit', 'object-position', 'opacity', 'order',
      'orphans', 'outline', 'outline-color', 'outline-offset', 'outline-style', 'outline-width',
      'overflow', 'overflow-wrap', 'overflow-x', 'overflow-y', 'padding', 'padding-bottom',
      'padding-left', 'padding-right', 'padding-top', 'page-break-after', 'page-break-before',
      'page-break-inside', 'perspective', 'perspective-origin', 'pointer-events', 'position',
      'quotes', 'resize', 'right', 'row-gap', 'scroll-behavior', 'tab-size', 'table-layout',
      'text-align', 'text-align-last', 'text-combine-upright', 'text-decoration',
      'text-decoration-color', 'text-decoration-line', 'text-decoration-style', 'text-indent',
      'text-justify', 'text-orientation', 'text-overflow', 'text-shadow', 'text-transform',
      'text-underline-position', 'top', 'transform', 'transform-origin', 'transform-style',
      'transition', 'transition-delay', 'transition-duration', 'transition-property',
      'transition-timing-function', 'unicode-bidi', 'user-select', 'vertical-align',
      'visibility', 'white-space', 'widows', 'width', 'word-break', 'word-spacing',
      'word-wrap', 'writing-mode', 'z-index'
    ];
  }

  /**
   * Get list of deprecated CSS properties
   */
  private getDeprecatedProperties(): string[] {
    return [
      'azimuth', 'background-position-x', 'background-position-y', 'behavior',
      'border-radius-topleft', 'border-radius-topright', 'border-radius-bottomleft',
      'border-radius-bottomright', 'clip', 'content', 'counter-increment', 'counter-reset',
      'cue', 'cue-after', 'cue-before', 'elevation', 'filter', 'ime-mode',
      'include-source', 'layer-background-color', 'layer-background-image', 'layout-flow',
      'layout-grid', 'layout-grid-char', 'layout-grid-char-spacing', 'layout-grid-line',
      'layout-grid-mode', 'layout-grid-type', 'line-break', 'marquee', 'marquee-direction',
      'marquee-play-count', 'marquee-speed', 'marquee-style', 'overflow-x', 'overflow-y',
      'pause', 'pause-after', 'pause-before', 'pitch', 'pitch-range', 'play-during',
      'richness', 'ruby-align', 'ruby-overhang', 'ruby-position', 'speak', 'speak-header',
      'speak-numeral', 'speak-punctuation', 'speech-rate', 'stress', 'text-align-last',
      'text-autospace', 'text-justify', 'text-kashida-space', 'text-overflow',
      'text-underline-position', 'voice-family', 'volume', 'word-break', 'word-wrap',
      'writing-mode', 'zoom'
    ];
  }
}