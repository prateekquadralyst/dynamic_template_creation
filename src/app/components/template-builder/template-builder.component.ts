import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { EnhancedAssetInputComponent } from '../asset-picker/enhanced-asset-input.component';
import { Asset, AssetType } from '../../models/asset.interface';
import { 
  CustomTemplate, 
  TemplateVariable, 
  TemplateProcessingResult,
  TemplateError,
  ErrorType,
  WarningType
} from '../../models/template.interface';
import { VariableType } from '../../models/section.interface';
import { SectionType } from '../../models/section.interface';
import { TemplateService } from '../../services/template.service';
import { validateTemplate } from '../../utils/template-validation.util';

@Component({
  selector: 'app-template-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, EnhancedAssetInputComponent],
  templateUrl: './template-builder.component.html',
  styleUrls: ['./template-builder.component.css']
})
export class TemplateBuilderComponent implements OnInit, OnDestroy {
  @ViewChild('htmlEditor', { static: false }) htmlEditor!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('cssEditor', { static: false }) cssEditor!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('previewFrame', { static: false }) previewFrame!: ElementRef<HTMLIFrameElement>;

  // Component state
  isVisible = false;
  activeTab: 'editor' | 'variables' | 'preview' = 'editor';
  editorTab: 'html' | 'css' = 'html';
  
  // Template data
  template: CustomTemplate = {
    id: '',
    name: 'New Template',
    description: '',
    type: SectionType.HERO,
    html: '',
    css: '',
    variables: [],
    previewImage: '',
    isCustom: true,
    createdBy: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
    tags: [],
    dependencies: []
  };

  // Variable management
  newVariable: TemplateVariable = this.createEmptyVariable();
  isAddingVariable = false;
  editingVariableIndex = -1;

  // Validation and processing
  validationResult: TemplateProcessingResult = {
    html: '',
    css: '',
    errors: [],
    warnings: []
  };

  // Preview data
  previewData: { [key: string]: any } = {};
  isPreviewLoading = false;

  // Drag and drop
  isDragging = false;
  draggedVariable: TemplateVariable | null = null;

  // Available options
  sectionTypes = Object.values(SectionType);
  variableTypes = Object.values(VariableType);

  private destroy$ = new Subject<void>();
  private validationSubject = new Subject<void>();

  constructor(private templateService: TemplateService) {}

  ngOnInit(): void {
    this.setupValidation();
    this.generatePreviewData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup real-time validation
   */
  private setupValidation(): void {
    this.validationSubject
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.validateTemplate();
      });
  }

  /**
   * Show the template builder
   */
  show(): void {
    this.isVisible = true;
    this.resetTemplate();
  }

  /**
   * Hide the template builder
   */
  hide(): void {
    this.isVisible = false;
  }

  /**
   * Reset template to default state
   */
  resetTemplate(): void {
    this.template = {
      id: this.generateTemplateId(),
      name: 'New Template',
      description: '',
      type: SectionType.HERO,
      html: this.getDefaultHtml(),
      css: this.getDefaultCss(),
      variables: [],
      previewImage: '',
      isCustom: true,
      createdBy: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      tags: [],
      dependencies: []
    };
    
    this.generatePreviewData();
    this.triggerValidation();
  }

  /**
   * Load an existing template for editing
   */
  loadTemplate(template: CustomTemplate): void {
    this.template = { ...template };
    this.generatePreviewData();
    this.triggerValidation();
    this.show();
  }

  /**
   * Switch between tabs
   */
  setActiveTab(tab: 'editor' | 'variables' | 'preview'): void {
    this.activeTab = tab;
    
    if (tab === 'preview') {
      this.updatePreview();
    }
  }

  /**
   * Switch between editor tabs
   */
  setEditorTab(tab: 'html' | 'css'): void {
    this.editorTab = tab;
  }

  /**
   * Handle HTML content change
   */
  onHtmlChange(): void {
    this.template.updatedAt = new Date();
    this.triggerValidation();
  }

  /**
   * Handle CSS content change
   */
  onCssChange(): void {
    this.template.updatedAt = new Date();
    this.triggerValidation();
  }

  /**
   * Trigger template validation
   */
  triggerValidation(): void {
    this.validationSubject.next();
  }

  /**
   * Validate the current template
   */
  private validateTemplate(): void {
    this.validationResult = validateTemplate(this.template);
    
    if (this.activeTab === 'preview') {
      this.updatePreview();
    }
  }

  /**
   * Add a new variable
   */
  addVariable(): void {
    this.newVariable = this.createEmptyVariable();
    this.isAddingVariable = true;
  }

  /**
   * Save the new variable
   */
  saveVariable(): void {
    if (this.newVariable.name && this.newVariable.label) {
      if (this.editingVariableIndex >= 0) {
        // Update existing variable
        this.template.variables[this.editingVariableIndex] = { ...this.newVariable };
        this.editingVariableIndex = -1;
      } else {
        // Add new variable
        this.template.variables.push({ ...this.newVariable });
      }
      
      this.isAddingVariable = false;
      this.generatePreviewData();
      this.triggerValidation();
    }
  }

  /**
   * Cancel variable editing
   */
  cancelVariable(): void {
    this.isAddingVariable = false;
    this.editingVariableIndex = -1;
    this.newVariable = this.createEmptyVariable();
  }

  /**
   * Edit an existing variable
   */
  editVariable(index: number): void {
    this.newVariable = { ...this.template.variables[index] };
    this.editingVariableIndex = index;
    this.isAddingVariable = true;
  }

  /**
   * Remove a variable
   */
  removeVariable(index: number): void {
    this.template.variables.splice(index, 1);
    this.generatePreviewData();
    this.triggerValidation();
  }

  /**
   * Handle variable drag start
   */
  onVariableDragStart(event: DragEvent, variable: TemplateVariable): void {
    this.isDragging = true;
    this.draggedVariable = variable;
    
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', `{{${variable.name}}}`);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  /**
   * Handle variable drag end
   */
  onVariableDragEnd(): void {
    this.isDragging = false;
    this.draggedVariable = null;
  }

  /**
   * Handle drop on HTML editor
   */
  onHtmlEditorDrop(event: DragEvent): void {
    event.preventDefault();
    
    if (this.draggedVariable && this.htmlEditor) {
      const placeholder = `{{${this.draggedVariable.name}}}`;
      this.insertTextAtCursor(this.htmlEditor.nativeElement, placeholder);
      this.onHtmlChange();
    }
  }

  /**
   * Handle drop on CSS editor
   */
  onCssEditorDrop(event: DragEvent): void {
    event.preventDefault();
    
    if (this.draggedVariable && this.cssEditor) {
      const placeholder = `{{${this.draggedVariable.name}}}`;
      this.insertTextAtCursor(this.cssEditor.nativeElement, placeholder);
      this.onCssChange();
    }
  }

  /**
   * Prevent default drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  /**
   * Insert text at cursor position
   */
  private insertTextAtCursor(textarea: HTMLTextAreaElement, text: string): void {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    
    textarea.value = value.substring(0, start) + text + value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  }

  /**
   * Update preview
   */
  updatePreview(): void {
    if (!this.previewFrame) return;
    
    this.isPreviewLoading = true;
    
    try {
      const processedHtml = this.processTemplate(this.template.html, this.previewData);
      const processedCss = this.processTemplate(this.template.css, this.previewData);
      
      const previewContent = this.generatePreviewHtml(processedHtml, processedCss);
      
      const iframe = this.previewFrame.nativeElement;
      iframe.srcdoc = previewContent;
      
      iframe.onload = () => {
        this.isPreviewLoading = false;
      };
    } catch (error) {
      console.error('Preview update failed:', error);
      this.isPreviewLoading = false;
    }
  }

  /**
   * Process template with data
   */
  private processTemplate(template: string, data: { [key: string]: any }): string {
    let result = template;
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  /**
   * Generate preview HTML
   */
  private generatePreviewHtml(html: string, css: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Template Preview</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
        <style>
          body { margin: 0; padding: 20px; background-color: #f8f9fa; }
          .preview-container { background-color: white; border-radius: 8px; overflow: hidden; }
          ${css}
        </style>
      </head>
      <body>
        <div class="preview-container">
          ${html}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate preview data for variables
   */
  private generatePreviewData(): void {
    this.previewData = {};
    
    for (const variable of this.template.variables) {
      this.previewData[variable.name] = this.getDefaultValueForVariable(variable);
    }
  }

  /**
   * Get default value for a variable based on its type
   */
  private getDefaultValueForVariable(variable: TemplateVariable): any {
    if (variable.defaultValue !== undefined) {
      return variable.defaultValue;
    }
    
    switch (variable.type) {
      case VariableType.TEXT:
        return 'Sample Text';
      case VariableType.TEXTAREA:
        return 'Sample longer text content that spans multiple lines.';
      case VariableType.NUMBER:
        return 42;
      case VariableType.BOOLEAN:
        return true;
      case VariableType.COLOR:
        return '#007bff';
      case VariableType.IMAGE:
        return 'https://via.placeholder.com/400x300';
      case VariableType.SELECT:
      case VariableType.RADIO:
        return variable.options?.[0]?.value || 'Option 1';
      case VariableType.CHECKBOX:
        return false;
      case VariableType.ARRAY:
        return ['Item 1', 'Item 2', 'Item 3'];
      case VariableType.OBJECT:
        return { key: 'value' };
      default:
        return 'Sample Value';
    }
  }

  /**
   * Save the template
   */
  async saveTemplate(): Promise<void> {
    try {
      if (this.validationResult.errors.length > 0) {
        alert('Please fix validation errors before saving.');
        return;
      }
      
      this.template.updatedAt = new Date();
      
      if (this.template.id && this.template.id.startsWith('template_')) {
        // Update existing template
        await this.templateService.updateCustomTemplate(this.template.id, this.template);
      } else {
        // Create new template
        this.template.id = this.generateTemplateId();
        await this.templateService.createCustomTemplate(this.template);
      }
      
      alert('Template saved successfully!');
      this.hide();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    }
  }

  /**
   * Create empty variable
   */
  private createEmptyVariable(): TemplateVariable {
    return {
      name: '',
      type: VariableType.TEXT,
      label: '',
      description: '',
      defaultValue: '',
      required: false,
      validation: [],
      options: []
    };
  }

  /**
   * Generate unique template ID
   */
  private generateTemplateId(): string {
    return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get default HTML template
   */
  private getDefaultHtml(): string {
    return `<div class="container py-5">
  <div class="row">
    <div class="col-12 text-center">
      <h1>{{title}}</h1>
      <p class="lead">{{description}}</p>
      <button class="btn btn-primary">{{buttonText}}</button>
    </div>
  </div>
</div>`;
  }

  /**
   * Get default CSS template
   */
  private getDefaultCss(): string {
    return `.container {
  background-color: #f8f9fa;
  border-radius: 8px;
}

h1 {
  color: #212529;
  margin-bottom: 1rem;
}

.lead {
  color: #6c757d;
  margin-bottom: 2rem;
}

.btn-primary {
  padding: 0.75rem 2rem;
  font-weight: 500;
}`;
  }

  /**
   * Get error type display name
   */
  getErrorTypeName(type: ErrorType): string {
    switch (type) {
      case ErrorType.SYNTAX_ERROR:
        return 'Syntax Error';
      case ErrorType.MISSING_VARIABLE:
        return 'Missing Variable';
      case ErrorType.INVALID_VARIABLE:
        return 'Invalid Variable';
      case ErrorType.CIRCULAR_DEPENDENCY:
        return 'Circular Dependency';
      case ErrorType.COMPILATION_ERROR:
        return 'Compilation Error';
      default:
        return 'Error';
    }
  }

  /**
   * Get warning type display name
   */
  getWarningTypeName(type: WarningType): string {
    switch (type) {
      case WarningType.UNUSED_VARIABLE:
        return 'Unused Variable';
      case WarningType.DEPRECATED_SYNTAX:
        return 'Deprecated Syntax';
      case WarningType.PERFORMANCE_ISSUE:
        return 'Performance Issue';
      case WarningType.ACCESSIBILITY_ISSUE:
        return 'Accessibility Issue';
      default:
        return 'Warning';
    }
  }

  /**
   * Get variable type display name
   */
  getVariableTypeName(type: VariableType): string {
    switch (type) {
      case VariableType.TEXT:
        return 'Text';
      case VariableType.TEXTAREA:
        return 'Textarea';
      case VariableType.NUMBER:
        return 'Number';
      case VariableType.BOOLEAN:
        return 'Boolean';
      case VariableType.COLOR:
        return 'Color';
      case VariableType.IMAGE:
        return 'Image';
      case VariableType.SELECT:
        return 'Select';
      case VariableType.RADIO:
        return 'Radio';
      case VariableType.CHECKBOX:
        return 'Checkbox';
      case VariableType.ARRAY:
        return 'Array';
      case VariableType.OBJECT:
        return 'Object';
      default:
        return type;
    }
  }

  /**
   * Handle asset selection for image variables
   */
  onVariableAssetSelected(asset: Asset | null): void {
    if (asset) {
      this.newVariable.defaultValue = asset.url;
      // Store asset reference for future use
      (this.newVariable as any).selectedAsset = asset;
    } else {
      this.newVariable.defaultValue = '';
      (this.newVariable as any).selectedAsset = null;
    }
  }

  /**
   * Get selected asset for current variable
   */
  getSelectedAssetForVariable(): Asset | null {
    return (this.newVariable as any).selectedAsset || null;
  }

  /**
   * Get allowed asset types for image variables
   */
  get allowedImageTypes(): AssetType[] {
    return [AssetType.IMAGE];
  }

  /**
   * Check if current variable is an image type
   */
  isImageVariable(): boolean {
    return this.newVariable.type === VariableType.IMAGE;
  }
}