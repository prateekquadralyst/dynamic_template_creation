import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnChanges, 
  SimpleChanges,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtml } from '@angular/platform-browser';
import { TemplateSection } from '../../models/template.interface';
import { 
  TemplatePreviewService, 
  TemplatePreviewOptions, 
  TemplatePreviewResult 
} from '../../services/template-preview.service';

@Component({
  selector: 'app-template-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './template-preview.component.html',
  styleUrls: ['./template-preview.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplatePreviewComponent implements OnInit, OnChanges {
  @ViewChild('previewContainer', { static: true }) previewContainer!: ElementRef;

  @Input() template!: TemplateSection;
  @Input() width: number = 300;
  @Input() height: number = 200;
  @Input() scale: number = 0.5;
  @Input() showInteractive: boolean = false;
  @Input() includeStyles: boolean = true;
  @Input() showPreviewButton: boolean = true;
  @Input() showSelectButton: boolean = true;
  @Input() isSelected: boolean = false;
  @Input() showHoverEffects: boolean = true;
  @Input() enableClickToPreview: boolean = true;

  @Output() templateSelected = new EventEmitter<TemplateSection>();
  @Output() templatePreviewed = new EventEmitter<TemplateSection>();
  @Output() previewError = new EventEmitter<string>();

  previewResult: TemplatePreviewResult | null = null;
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';

  constructor(private templatePreviewService: TemplatePreviewService) {}

  ngOnInit(): void {
    this.generatePreview();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['template'] || changes['width'] || changes['height'] || changes['scale']) {
      this.generatePreview();
    }
  }

  /**
   * Generate template preview
   */
  private generatePreview(): void {
    if (!this.template) {
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    try {
      const options: TemplatePreviewOptions = {
        width: this.width,
        height: this.height,
        scale: this.scale,
        showInteractive: this.showInteractive,
        includeStyles: this.includeStyles
      };

      this.previewResult = this.templatePreviewService.generateTemplatePreview(
        this.template, 
        options
      );

      if (this.previewResult.errors && this.previewResult.errors.length > 0) {
        this.hasError = true;
        this.errorMessage = this.previewResult.errors.join(', ');
        this.previewError.emit(this.errorMessage);
      }
    } catch (error) {
      this.hasError = true;
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.previewError.emit(this.errorMessage);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Handle template selection
   */
  onSelectTemplate(): void {
    this.templateSelected.emit(this.template);
  }

  /**
   * Handle template preview
   */
  onPreviewTemplate(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.templatePreviewed.emit(this.template);
  }

  /**
   * Handle click on preview container
   */
  onPreviewClick(): void {
    if (this.enableClickToPreview) {
      this.onPreviewTemplate();
    }
  }

  /**
   * Get preview container classes
   */
  getPreviewClasses(): string[] {
    const classes = ['template-preview-wrapper'];
    
    if (this.isSelected) classes.push('selected');
    if (this.isLoading) classes.push('loading');
    if (this.hasError) classes.push('error');
    if (this.showHoverEffects) classes.push('hover-effects');
    if (this.enableClickToPreview) classes.push('clickable');
    if (!this.template.isBuiltIn) classes.push('custom-template');
    
    return classes;
  }

  /**
   * Get template type display name
   */
  getTemplateTypeDisplayName(): string {
    switch (this.template.type) {
      case 'hero':
        return 'Hero Section';
      case 'features':
        return 'Features Section';
      case 'testimonials':
        return 'Testimonials Section';
      case 'pricing':
        return 'Pricing Section';
      case 'contact':
        return 'Contact Section';
      default:
        return 'Template';
    }
  }

  /**
   * Refresh preview
   */
  refreshPreview(): void {
    this.generatePreview();
  }
}