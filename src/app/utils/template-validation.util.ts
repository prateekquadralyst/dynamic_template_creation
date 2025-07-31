import { 
  CustomTemplate, 
  TemplateVariable, 
  TemplateProcessingResult, 
  TemplateError, 
  TemplateWarning,
  ErrorType,
  WarningType
} from '../models/template.interface';
import { VariableType } from '../models/section.interface';

/**
 * Convenience function to validate a template
 */
export function validateTemplate(template: Partial<CustomTemplate>): TemplateProcessingResult {
  return TemplateValidationUtil.validateTemplate(template);
}

/**
 * Template validation utilities for custom template creation and processing
 */
export class TemplateValidationUtil {
  
  /**
   * Validates a custom template structure and content
   */
  static validateTemplate(template: Partial<CustomTemplate>): TemplateProcessingResult {
    const errors: TemplateError[] = [];
    const warnings: TemplateWarning[] = [];
    
    // Validate required fields
    if (!template.name?.trim()) {
      errors.push({
        type: ErrorType.MISSING_VARIABLE,
        message: 'Template name is required'
      });
    }
    
    if (!template.html?.trim()) {
      errors.push({
        type: ErrorType.MISSING_VARIABLE,
        message: 'Template HTML is required'
      });
    }
    
    if (!template.css?.trim()) {
      warnings.push({
        type: WarningType.PERFORMANCE_ISSUE,
        message: 'Template CSS is empty',
        suggestion: 'Consider adding basic styling for better appearance'
      });
    }
    
    // Validate HTML structure
    if (template.html) {
      const htmlValidation = this.validateHTML(template.html);
      errors.push(...htmlValidation.errors);
      warnings.push(...htmlValidation.warnings);
    }
    
    // Validate CSS syntax
    if (template.css) {
      const cssValidation = this.validateCSS(template.css);
      errors.push(...cssValidation.errors);
      warnings.push(...cssValidation.warnings);
    }
    
    // Validate template variables
    if (template.variables) {
      const variableValidation = this.validateTemplateVariables(template.variables, template.html || '');
      errors.push(...variableValidation.errors);
      warnings.push(...variableValidation.warnings);
    }
    
    return {
      html: template.html || '',
      css: template.css || '',
      errors,
      warnings
    };
  }
  
  /**
   * Validates HTML content for syntax and structure
   */
  private static validateHTML(html: string): { errors: TemplateError[], warnings: TemplateWarning[] } {
    const errors: TemplateError[] = [];
    const warnings: TemplateWarning[] = [];
    
    try {
      // Create a temporary DOM element to validate HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Check for unclosed tags
      const openTags = html.match(/<[^/][^>]*>/g) || [];
      const closeTags = html.match(/<\/[^>]*>/g) || [];
      
      if (openTags.length !== closeTags.length) {
        warnings.push({
          type: WarningType.DEPRECATED_SYNTAX,
          message: 'Potential unclosed HTML tags detected',
          suggestion: 'Ensure all HTML tags are properly closed'
        });
      }
      
      // Check for accessibility issues
      if (!html.includes('alt=') && html.includes('<img')) {
        warnings.push({
          type: WarningType.ACCESSIBILITY_ISSUE,
          message: 'Images without alt attributes detected',
          suggestion: 'Add alt attributes to images for accessibility'
        });
      }
      
      // Check for inline styles (should use CSS instead)
      if (html.includes('style=')) {
        warnings.push({
          type: WarningType.PERFORMANCE_ISSUE,
          message: 'Inline styles detected',
          suggestion: 'Consider moving styles to CSS section for better maintainability'
        });
      }
      
    } catch (error) {
      errors.push({
        type: ErrorType.SYNTAX_ERROR,
        message: `HTML syntax error: ${error}`
      });
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validates CSS content for syntax and best practices
   */
  private static validateCSS(css: string): { errors: TemplateError[], warnings: TemplateWarning[] } {
    const errors: TemplateError[] = [];
    const warnings: TemplateWarning[] = [];
    
    try {
      // Basic CSS syntax validation
      const braceCount = (css.match(/{/g) || []).length - (css.match(/}/g) || []).length;
      if (braceCount !== 0) {
        errors.push({
          type: ErrorType.SYNTAX_ERROR,
          message: 'Unmatched CSS braces detected'
        });
      }
      
      // Check for vendor prefixes without standard property
      const vendorPrefixes = ['-webkit-', '-moz-', '-ms-', '-o-'];
      vendorPrefixes.forEach(prefix => {
        const escapedPrefix = prefix.replace(/-/g, '\\-');
        const prefixedProps = css.match(new RegExp(`${escapedPrefix}[a-zA-Z-]+:`, 'g'));
        if (prefixedProps) {
          prefixedProps.forEach(prop => {
            const standardProp = prop.replace(prefix, '').replace(':', '');
            if (!css.includes(`${standardProp}:`)) {
              warnings.push({
                type: WarningType.PERFORMANCE_ISSUE,
                message: `Vendor prefix ${prop} found without standard property`,
                suggestion: `Add standard property: ${standardProp}`
              });
            }
          });
        }
      });
      
      // Check for !important usage
      if (css.includes('!important')) {
        warnings.push({
          type: WarningType.PERFORMANCE_ISSUE,
          message: '!important declarations found',
          suggestion: 'Consider using more specific selectors instead of !important'
        });
      }
      
    } catch (error) {
      errors.push({
        type: ErrorType.SYNTAX_ERROR,
        message: `CSS syntax error: ${error}`
      });
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validates template variables and their usage in HTML
   */
  private static validateTemplateVariables(
    variables: TemplateVariable[], 
    html: string
  ): { errors: TemplateError[], warnings: TemplateWarning[] } {
    const errors: TemplateError[] = [];
    const warnings: TemplateWarning[] = [];
    
    // Check for duplicate variable names
    const variableNames = variables.map(v => v.name);
    const duplicates = variableNames.filter((name, index) => variableNames.indexOf(name) !== index);
    duplicates.forEach(name => {
      errors.push({
        type: ErrorType.INVALID_VARIABLE,
        message: `Duplicate variable name: ${name}`,
        variable: name
      });
    });
    
    // Validate each variable
    variables.forEach(variable => {
      const variableErrors = this.validateVariable(variable);
      errors.push(...variableErrors);
      
      // Check if variable is used in HTML
      const variablePlaceholder = `{{${variable.name}}}`;
      if (!html.includes(variablePlaceholder)) {
        warnings.push({
          type: WarningType.UNUSED_VARIABLE,
          message: `Variable '${variable.name}' is defined but not used in template`,
          suggestion: `Use {{${variable.name}}} in your HTML or remove the variable`
        });
      }
    });
    
    // Check for undefined variables in HTML
    const htmlVariables = html.match(/\{\{([^}]+)\}\}/g) || [];
    htmlVariables.forEach(placeholder => {
      const variableName = placeholder.replace(/[{}]/g, '').trim();
      const isDefined = variables.some(v => v.name === variableName);
      if (!isDefined) {
        errors.push({
          type: ErrorType.MISSING_VARIABLE,
          message: `Variable '${variableName}' is used in template but not defined`,
          variable: variableName
        });
      }
    });
    
    return { errors, warnings };
  }
  
  /**
   * Validates individual template variable
   */
  private static validateVariable(variable: TemplateVariable): TemplateError[] {
    const errors: TemplateError[] = [];
    
    // Validate variable name
    if (!variable.name?.trim()) {
      errors.push({
        type: ErrorType.INVALID_VARIABLE,
        message: 'Variable name is required',
        variable: variable.name
      });
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
      errors.push({
        type: ErrorType.INVALID_VARIABLE,
        message: `Invalid variable name '${variable.name}'. Use only letters, numbers, and underscores.`,
        variable: variable.name
      });
    }
    
    // Validate variable label
    if (!variable.label?.trim()) {
      errors.push({
        type: ErrorType.INVALID_VARIABLE,
        message: `Variable '${variable.name}' must have a label`,
        variable: variable.name
      });
    }
    
    // Validate default value based on type
    if (variable.defaultValue !== undefined) {
      const typeValidation = this.validateVariableType(variable.type, variable.defaultValue);
      if (!typeValidation.isValid) {
        errors.push({
          type: ErrorType.INVALID_VARIABLE,
          message: `Default value for '${variable.name}' doesn't match type ${variable.type}: ${typeValidation.error}`,
          variable: variable.name
        });
      }
    }
    
    // Validate options for select/radio types
    if ([VariableType.SELECT, VariableType.RADIO].includes(variable.type)) {
      if (!variable.options || variable.options.length === 0) {
        errors.push({
          type: ErrorType.INVALID_VARIABLE,
          message: `Variable '${variable.name}' of type ${variable.type} must have options`,
          variable: variable.name
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Validates variable value against its type
   */
  private static validateVariableType(type: VariableType, value: any): { isValid: boolean, error?: string } {
    switch (type) {
      case VariableType.TEXT:
      case VariableType.TEXTAREA:
        return { isValid: typeof value === 'string' };
      
      case VariableType.NUMBER:
        return { isValid: typeof value === 'number' && !isNaN(value) };
      
      case VariableType.BOOLEAN:
        return { isValid: typeof value === 'boolean' };
      
      case VariableType.COLOR:
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        return { 
          isValid: typeof value === 'string' && colorRegex.test(value),
          error: 'Color must be in hex format (#RRGGBB or #RGB)'
        };
      
      case VariableType.IMAGE:
        return { 
          isValid: typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:image')),
          error: 'Image must be a valid URL or data URL'
        };
      
      case VariableType.ARRAY:
        return { isValid: Array.isArray(value) };
      
      case VariableType.OBJECT:
        return { isValid: typeof value === 'object' && value !== null && !Array.isArray(value) };
      
      default:
        return { isValid: true };
    }
  }
  
  /**
   * Validates template dependencies
   */
  static validateDependencies(dependencies: string[]): { errors: TemplateError[], warnings: TemplateWarning[] } {
    const errors: TemplateError[] = [];
    const warnings: TemplateWarning[] = [];
    
    dependencies.forEach(dependency => {
      // Check for circular dependencies (basic check)
      if (dependencies.filter(d => d === dependency).length > 1) {
        errors.push({
          type: ErrorType.CIRCULAR_DEPENDENCY,
          message: `Circular dependency detected: ${dependency}`
        });
      }
      
      // Validate dependency format
      if (!dependency.trim()) {
        errors.push({
          type: ErrorType.INVALID_VARIABLE,
          message: 'Empty dependency found'
        });
      }
    });
    
    return { errors, warnings };
  }
  
  /**
   * Processes template with variables to generate final HTML/CSS
   */
  static processTemplate(template: CustomTemplate, variableValues: { [key: string]: any }): TemplateProcessingResult {
    let processedHtml = template.html;
    let processedCss = template.css;
    const errors: TemplateError[] = [];
    const warnings: TemplateWarning[] = [];
    
    try {
      // Replace variables in HTML
      template.variables.forEach(variable => {
        const placeholder = `{{${variable.name}}}`;
        const value = variableValues[variable.name] ?? variable.defaultValue ?? '';
        
        // Validate value before replacement
        const validation = this.validateVariableType(variable.type, value);
        if (!validation.isValid) {
          errors.push({
            type: ErrorType.INVALID_VARIABLE,
            message: `Invalid value for variable '${variable.name}': ${validation.error}`,
            variable: variable.name
          });
          return;
        }
        
        // Process value based on type
        let processedValue = value;
        if (variable.type === VariableType.IMAGE && value) {
          processedValue = `<img src="${value}" alt="${variable.label}" />`;
        }
        
        processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), processedValue);
      });
      
      // Check for unprocessed variables
      const remainingVariables = processedHtml.match(/\{\{([^}]+)\}\}/g);
      if (remainingVariables) {
        remainingVariables.forEach(placeholder => {
          const variableName = placeholder.replace(/[{}]/g, '').trim();
          warnings.push({
            type: WarningType.UNUSED_VARIABLE,
            message: `Unprocessed variable found: ${variableName}`,
            suggestion: 'Ensure all variables have values or default values'
          });
        });
      }
      
    } catch (error) {
      errors.push({
        type: ErrorType.COMPILATION_ERROR,
        message: `Template processing error: ${error}`
      });
    }
    
    return {
      html: processedHtml,
      css: processedCss,
      errors,
      warnings
    };
  }
}