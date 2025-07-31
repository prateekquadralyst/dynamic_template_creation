import { SectionType, VariableType, ValidationRule, ValidationType } from './section.interface';

// Enhanced template management interfaces
export interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  type: SectionType;
  html: string;
  css: string;
  variables: TemplateVariable[];
  previewImage: string;
  isCustom: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  rating?: number;
  tags: string[];
  dependencies: string[];
}

export interface TemplateVariable {
  name: string;
  type: VariableType;
  label: string;
  description?: string;
  defaultValue: any;
  required: boolean;
  validation?: ValidationRule[];
  options?: VariableOption[]; // For select/radio types
}

export interface TemplateVariables {
  [key: string]: any;
}

export interface TemplateSection {
  id: string;
  type: SectionType;
  name: string;
  previewImage: string;
  description: string;
  html: string;
  css: string;
  variables: TemplateVariables;
  isBuiltIn: boolean;
  category: string;
  tags: string[];
}

export interface VariableOption {
  label: string;
  value: any;
}

// Template processing interfaces
export interface TemplateProcessingResult {
  html: string;
  css: string;
  errors: TemplateError[];
  warnings: TemplateWarning[];
}

export interface TemplateError {
  type: ErrorType;
  message: string;
  line?: number;
  column?: number;
  variable?: string;
}

export interface TemplateWarning {
  type: WarningType;
  message: string;
  suggestion?: string;
}

// Template export/import interfaces
export interface TemplateExportData {
  template: CustomTemplate;
  dependencies: TemplateDependency[];
  metadata: TemplateExportMetadata;
}

export interface TemplateDependency {
  type: DependencyType;
  name: string;
  version?: string;
  url?: string;
}

export interface TemplateExportMetadata {
  exportedAt: Date;
  exportedBy: string;
  version: string;
  compatibility: string[];
}

// Enums

export enum ErrorType {
  SYNTAX_ERROR = 'syntax_error',
  MISSING_VARIABLE = 'missing_variable',
  INVALID_VARIABLE = 'invalid_variable',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  COMPILATION_ERROR = 'compilation_error'
}

export enum WarningType {
  UNUSED_VARIABLE = 'unused_variable',
  DEPRECATED_SYNTAX = 'deprecated_syntax',
  PERFORMANCE_ISSUE = 'performance_issue',
  ACCESSIBILITY_ISSUE = 'accessibility_issue'
}

export enum DependencyType {
  CSS_FRAMEWORK = 'css_framework',
  FONT = 'font',
  ICON_LIBRARY = 'icon_library',
  JAVASCRIPT_LIBRARY = 'javascript_library',
  IMAGE = 'image'
}