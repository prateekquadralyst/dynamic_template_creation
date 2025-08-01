import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { SafeHtml } from "@angular/platform-browser";
import { TemplateSection } from "../../models/template.interface";
import { TemplatePreviewService } from "../../services/template-preview.service";

@Component({
  selector: "app-template-preview-modal",
  standalone: true,
  imports: [CommonModule],
  templateUrl: './template-preview-modal.component.html',
  styleUrls: ["./template-preview-modal.component.css"],
})
export class TemplatePreviewModalComponent implements OnInit {
  @ViewChild("modalElement", { static: true }) modalElement!: ElementRef;

  @Input() template!: TemplateSection;
  @Input() isVisible: boolean = false;

  @Output() templateSelected = new EventEmitter<TemplateSection>();
  @Output() modalClosed = new EventEmitter<void>();

  previewHtml: SafeHtml | null = null;
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = "";

  constructor(private templatePreviewService: TemplatePreviewService) {}

  ngOnInit(): void {
    if (this.template && this.isVisible) {
      this.generatePreview();
    }
  }

  ngOnChanges(): void {
    if (this.template && this.isVisible) {
      this.generatePreview();
    }
  }

  /**
   * Generate full-size template preview
   */
  public generatePreview(): void {
    if (!this.template) return;

    this.isLoading = true;
    this.hasError = false;

    try {
      const preview = this.templatePreviewService.generateTemplatePreview(
        this.template,
        {
          width: 1000,
          height: 700,
          scale: 1,
          showInteractive: true,
          includeStyles: true,
        }
      );

      this.previewHtml = preview.html;

      if (preview.errors && preview.errors.length > 0) {
        this.hasError = true;
        this.errorMessage = preview.errors.join(", ");
      }
    } catch (error) {
      this.hasError = true;
      this.errorMessage =
        error instanceof Error ? error.message : "Unknown error";
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Handle escape key to close modal
   */
  @HostListener("document:keydown.escape", ["$event"])
  handleEscapeKey(event: KeyboardEvent): void {
    if (this.isVisible) {
      this.closeModal();
    }
  }

  /**
   * Handle backdrop click to close modal
   */
  onBackdropClick(event: Event): void {
    if (event.target === this.modalElement.nativeElement) {
      this.closeModal();
    }
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.modalClosed.emit();
  }

  /**
   * Select template and close modal
   */
  selectTemplate(): void {
    this.templateSelected.emit(this.template);
    this.closeModal();
  }

  /**
   * Get template type display name
   */
  getTemplateTypeDisplayName(): string {
    switch (this.template?.type) {
      case "hero":
        return "Hero Section";
      case "features":
        return "Features Section";
      case "testimonials":
        return "Testimonials Section";
      case "pricing":
        return "Pricing Section";
      case "contact":
        return "Contact Section";
      default:
        return "Template";
    }
  }
}
