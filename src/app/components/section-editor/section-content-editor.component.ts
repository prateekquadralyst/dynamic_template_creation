import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import { EnhancedAssetInputComponent } from "../asset-picker/enhanced-asset-input.component";
import {
  Section,
  SectionType,
  VariableType,
} from "../../models/section.interface";
import { Asset, AssetType } from "../../models/asset.interface";
import { TemplateService } from "../../services/template.service";

@Component({
  selector: "app-section-content-editor",
  standalone: true,
  imports: [CommonModule, FormsModule, EnhancedAssetInputComponent],
  template: `
    <div class="section-content-editor" *ngIf="section">
      <!-- Section Header -->
      <div class="editor-header">
        <h4 class="section-title">
          <i class="bi bi-pencil-square"></i>
          Edit {{ getSectionTypeDisplayName(section.type) }}
        </h4>
        <div class="editor-actions">
          <button
            class="btn btn-outline-secondary btn-sm"
            (click)="resetContent()"
          >
            <i class="bi bi-arrow-clockwise"></i>
            Reset
          </button>
          <button class="btn btn-primary btn-sm" (click)="saveContent()">
            <i class="bi bi-check"></i>
            Save
          </button>
        </div>
      </div>

      <!-- Content Fields -->
      <div class="content-fields">
        <!-- Hero Section Fields -->
        <div *ngIf="section.type === SectionType.HERO" class="field-group">
          <div class="form-group">
            <label class="form-label">Header Text</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="section.content['headerText']"
              placeholder="Enter header text"
              (input)="onContentChange()"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Subheading</label>
            <textarea
              class="form-control"
              rows="2"
              [(ngModel)]="section.content['heroSubheading']"
              placeholder="Enter subheading"
              (input)="onContentChange()"
            ></textarea>
          </div>

          <div class="form-group">
            <app-enhanced-asset-input
              [allowedTypes]="[AssetType.IMAGE]"
              [(ngModel)]="heroImageAsset"
              placeholder="Select hero image"
              label="Hero Image"
              [projectId]="projectId || undefined"
              [sectionId]="section.id"
              variableName="imageUrl"
              (assetChanged)="onHeroImageChanged($event)"
              (assetOptimized)="onAssetOptimized($event)"
              (assetReplaced)="onAssetReplaced($event)"
            ></app-enhanced-asset-input>
          </div>

          <div class="form-group">
            <label class="form-label">Button Text</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="section.content['buttonText']"
              placeholder="Enter button text"
              (input)="onContentChange()"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Button URL</label>
            <input
              type="url"
              class="form-control"
              [(ngModel)]="section.content['buttonUrl']"
              placeholder="Enter button URL"
              (input)="onContentChange()"
            />
          </div>
        </div>

        <!-- Testimonials Section Fields -->
        <div
          *ngIf="section.type === SectionType.TESTIMONIALS"
          class="field-group"
        >
          <div class="form-group">
            <label class="form-label">Section Title</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="section.content['testimonialsTitle']"
              placeholder="Enter section title"
              (input)="onContentChange()"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Section Subheading</label>
            <textarea
              class="form-control"
              rows="2"
              [(ngModel)]="section.content['testimonialsSubheading']"
              placeholder="Enter section subheading"
              (input)="onContentChange()"
            ></textarea>
          </div>

          <!-- Testimonials List -->
          <div class="testimonials-list">
            <div class="list-header">
              <h5>Testimonials</h5>
              <button
                class="btn btn-outline-primary btn-sm"
                (click)="addTestimonial()"
              >
                <i class="bi bi-plus"></i>
                Add Testimonial
              </button>
            </div>

            <div
              *ngFor="
                let testimonial of section.content['testimonials'];
                let i = index
              "
              class="testimonial-item"
            >
              <div class="item-header">
                <h6>Testimonial {{ i + 1 }}</h6>
                <button
                  class="btn btn-outline-danger btn-sm"
                  (click)="removeTestimonial(i)"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Customer Name</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="testimonial.name"
                    placeholder="Customer name"
                    (input)="onContentChange()"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Role/Company</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="testimonial.role"
                    placeholder="Role or company"
                    (input)="onContentChange()"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Testimonial Message</label>
                <textarea
                  class="form-control"
                  rows="3"
                  [(ngModel)]="testimonial.message"
                  placeholder="Enter testimonial message"
                  (input)="onContentChange()"
                ></textarea>
              </div>

              <div class="form-group">
                <app-enhanced-asset-input
                  [allowedTypes]="[AssetType.IMAGE]"
                  [(ngModel)]="testimonialImageAssets[i]"
                  placeholder="Select customer photo"
                  label="Customer Photo"
                  [projectId]="projectId || undefined"
                  [sectionId]="section.id"
                  [variableName]="'testimonial_' + i + '_image'"
                  (assetChanged)="onTestimonialImageChanged(i, $event)"
                  (assetOptimized)="onAssetOptimized($event)"
                  (assetReplaced)="onAssetReplaced($event)"
                ></app-enhanced-asset-input>
              </div>

              <div class="form-group">
                <label class="form-label">Rating</label>
                <select
                  class="form-control"
                  [(ngModel)]="testimonial.rating"
                  (change)="onContentChange()"
                >
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
            </div>

            <!-- Empty State -->
            <div
              *ngIf="section.content['testimonials']?.length === 0"
              class="empty-testimonials"
            >
              <i class="bi bi-chat-quote"></i>
              <p>No testimonials yet</p>
              <button class="btn btn-primary" (click)="addTestimonial()">
                <i class="bi bi-plus"></i>
                Add First Testimonial
              </button>
            </div>
          </div>
        </div>

        <!-- About Section Fields -->
        <div *ngIf="section.type === SectionType.ABOUT" class="field-group">
          <div class="form-group">
            <label class="form-label">About Title</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="section.content['aboutTitle']"
              placeholder="Enter about title"
              (input)="onContentChange()"
            />
          </div>

          <div class="form-group">
            <label class="form-label">About Subheading</label>
            <textarea
              class="form-control"
              rows="2"
              [(ngModel)]="section.content['aboutSubheading']"
              placeholder="Enter about subheading"
              (input)="onContentChange()"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Content</label>
            <textarea
              class="form-control"
              rows="6"
              [(ngModel)]="section.content['content']"
              placeholder="Enter about content"
              (input)="onContentChange()"
            ></textarea>
          </div>

          <div class="form-group">
            <app-enhanced-asset-input
              [allowedTypes]="[AssetType.IMAGE]"
              [(ngModel)]="aboutImageAsset"
              placeholder="Select about image"
              label="About Image"
              [projectId]="projectId || undefined"
              [sectionId]="section.id"
              variableName="aboutImage"
              (assetChanged)="onAboutImageChanged($event)"
              (assetOptimized)="onAssetOptimized($event)"
              (assetReplaced)="onAssetReplaced($event)"
            ></app-enhanced-asset-input>
          </div>
        </div>

        <!-- Contact Section Fields -->
        <div *ngIf="section.type === SectionType.CONTACT" class="field-group">
          <div class="form-group">
            <label class="form-label">Contact Title</label>
            <input
              type="text"
              class="form-control"
              [(ngModel)]="section.content['contactTitle']"
              placeholder="Enter contact title"
              (input)="onContentChange()"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Contact Subheading</label>
            <textarea
              class="form-control"
              rows="2"
              [(ngModel)]="section.content['contactSubheading']"
              placeholder="Enter contact subheading"
              (input)="onContentChange()"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input
                type="email"
                class="form-control"
                [(ngModel)]="section.content['email']"
                placeholder="contact@example.com"
                (input)="onContentChange()"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Phone</label>
              <input
                type="tel"
                class="form-control"
                [(ngModel)]="section.content['phone']"
                placeholder="+1 (555) 123-4567"
                (input)="onContentChange()"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Address</label>
            <textarea
              class="form-control"
              rows="2"
              [(ngModel)]="section.content['address']"
              placeholder="Enter address"
              (input)="onContentChange()"
            ></textarea>
          </div>
        </div>

        <!-- Generic Content Editor for other section types -->
        <div *ngIf="!isSpecialSectionType(section.type)" class="field-group">
          <div class="generic-editor">
            <h5>Content Editor</h5>
            <p class="text-muted">
              Edit the content for this
              {{ getSectionTypeDisplayName(section.type) }} section.
            </p>

            <div class="content-json-editor">
              <label class="form-label">Section Content (JSON)</label>
              <textarea
                class="form-control code-editor"
                rows="10"
                [(ngModel)]="contentJson"
                placeholder="Enter section content as JSON"
                (input)="onJsonContentChange()"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Asset Usage Summary -->
      <div class="asset-usage-summary" *ngIf="usedAssets.length > 0">
        <h5>Assets Used in This Section</h5>
        <div class="used-assets-list">
          <div *ngFor="let asset of usedAssets" class="used-asset-item">
            <div class="asset-thumbnail">
              <img
                *ngIf="asset.type === AssetType.IMAGE"
                [src]="asset.url"
                [alt]="asset.name"
                class="thumbnail-image"
              />
              <div
                *ngIf="asset.type !== AssetType.IMAGE"
                class="thumbnail-placeholder"
                [style.background-color]="getAssetTypeColor(asset.type)"
              >
                <span class="thumbnail-icon">{{
                  getAssetTypeIcon(asset.type)
                }}</span>
              </div>
            </div>

            <div class="asset-info">
              <div class="asset-name">{{ asset.name }}</div>
              <div class="asset-size">{{ formatFileSize(asset.size) }}</div>
            </div>

            <div class="asset-actions">
              <button
                class="btn btn-outline-secondary btn-sm"
                (click)="optimizeAsset(asset)"
                [disabled]="asset.type !== AssetType.IMAGE"
                title="Optimize asset"
              >
                <i class="bi bi-speedometer2"></i>
              </button>
              <button
                class="btn btn-outline-primary btn-sm"
                (click)="replaceAsset(asset)"
                title="Replace asset"
              >
                <i class="bi bi-arrow-repeat"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ["./section-content-editor.component.css"],
})
export class SectionContentEditorComponent implements OnInit, OnDestroy {
  @Input() section: Section | null = null;
  @Input() projectId: string | null = null;

  @Output() contentChanged = new EventEmitter<Section>();
  @Output() assetOptimized = new EventEmitter<{
    asset: Asset;
    section: Section;
  }>();
  @Output() assetReplaced = new EventEmitter<{
    oldAsset: Asset;
    newAsset: Asset;
    section: Section;
  }>();

  // Asset references for form binding
  heroImageAsset: Asset | null = null;
  aboutImageAsset: Asset | null = null;
  testimonialImageAssets: (Asset | null)[] = [];

  // Content JSON for generic editor
  contentJson = "";

  // Used assets tracking
  usedAssets: Asset[] = [];

  // Enums for template
  SectionType = SectionType;
  AssetType = AssetType;

  private destroy$ = new Subject<void>();

  constructor(private templateService: TemplateService) {}

  ngOnInit(): void {
    if (this.section) {
      this.initializeAssetReferences();
      this.updateContentJson();
      this.loadUsedAssets();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize asset references from section content
   */
  private initializeAssetReferences(): void {
    if (!this.section) return;

    // Initialize hero image asset
    if (
      this.section.type === SectionType.HERO &&
      this.section.content["imageUrl"]
    ) {
      // Would load asset from URL - placeholder for now
      this.heroImageAsset = null;
    }

    // Initialize about image asset
    if (
      this.section.type === SectionType.ABOUT &&
      this.section.content["aboutImage"]
    ) {
      // Would load asset from URL - placeholder for now
      this.aboutImageAsset = null;
    }

    // Initialize testimonial image assets
    if (
      this.section.type === SectionType.TESTIMONIALS &&
      this.section.content["testimonials"]
    ) {
      this.testimonialImageAssets = this.section.content["testimonials"].map(
        () => null
      );
    }
  }

  /**
   * Update content JSON for generic editor
   */
  private updateContentJson(): void {
    if (this.section) {
      this.contentJson = JSON.stringify(this.section.content, null, 2);
    }
  }

  /**
   * Load assets used in this section
   */
  private async loadUsedAssets(): Promise<void> {
    if (!this.section) return;

    // Extract asset URLs from section content and load corresponding assets
    const assetUrls = this.extractAssetUrls(this.section.content);
    this.usedAssets = []; // Would load actual assets from URLs
  }

  /**
   * Extract asset URLs from content object
   */
  private extractAssetUrls(content: any): string[] {
    const urls: string[] = [];

    const extractFromValue = (value: any) => {
      if (
        typeof value === "string" &&
        (value.startsWith("http") || value.startsWith("data:"))
      ) {
        urls.push(value);
      } else if (Array.isArray(value)) {
        value.forEach(extractFromValue);
      } else if (typeof value === "object" && value !== null) {
        Object.values(value).forEach(extractFromValue);
      }
    };

    extractFromValue(content);
    return urls;
  }

  /**
   * Handle content change
   */
  onContentChange(): void {
    if (this.section) {
      this.section.metadata.updatedAt = new Date();
      this.contentChanged.emit(this.section);
      this.updateContentJson();
    }
  }

  /**
   * Handle JSON content change
   */
  onJsonContentChange(): void {
    try {
      const parsedContent = JSON.parse(this.contentJson);
      if (this.section) {
        this.section.content = parsedContent;
        this.onContentChange();
      }
    } catch (error) {
      // Invalid JSON - don't update
      console.warn("Invalid JSON content:", error);
    }
  }

  /**
   * Handle hero image change
   */
  onHeroImageChanged(asset: Asset | null): void {
    this.heroImageAsset = asset;
    if (this.section) {
      this.section.content["imageUrl"] = asset?.url || "";
      this.onContentChange();
    }
  }

  /**
   * Handle about image change
   */
  onAboutImageChanged(asset: Asset | null): void {
    this.aboutImageAsset = asset;
    if (this.section) {
      this.section.content["aboutImage"] = asset?.url || "";
      this.onContentChange();
    }
  }

  /**
   * Handle testimonial image change
   */
  onTestimonialImageChanged(index: number, asset: Asset | null): void {
    this.testimonialImageAssets[index] = asset;
    if (
      this.section &&
      this.section.content["testimonials"] &&
      this.section.content["testimonials"][index]
    ) {
      this.section.content["testimonials"][index].image = asset?.url || "";
      this.onContentChange();
    }
  }

  /**
   * Get testimonial image asset
   */
  getTestimonialImageAsset(index: number): Asset | null {
    return this.testimonialImageAssets[index] || null;
  }

  /**
   * Add new testimonial
   */
  addTestimonial(): void {
    if (this.section) {
      if (!this.section.content["testimonials"]) {
        this.section.content["testimonials"] = [];
      }

      this.section.content["testimonials"].push({
        name: "",
        role: "",
        message: "",
        image: "",
        rating: 5,
      });

      this.testimonialImageAssets.push(null);
      this.onContentChange();
    }
  }

  /**
   * Remove testimonial
   */
  removeTestimonial(index: number): void {
    if (this.section && this.section.content["testimonials"]) {
      this.section.content["testimonials"].splice(index, 1);
      this.testimonialImageAssets.splice(index, 1);
      this.onContentChange();
    }
  }

  /**
   * Handle asset optimization
   */
  onAssetOptimized(asset: Asset): void {
    this.assetOptimized.emit({ asset, section: this.section! });
    this.loadUsedAssets(); // Refresh used assets
  }

  /**
   * Handle asset replacement
   */
  onAssetReplaced(event: { oldAsset: Asset; newAsset: Asset }): void {
    this.assetReplaced.emit({
      oldAsset: event.oldAsset,
      newAsset: event.newAsset,
      section: this.section!,
    });
    this.loadUsedAssets(); // Refresh used assets
  }

  /**
   * Optimize asset
   */
  optimizeAsset(asset: Asset): void {
    // Would trigger asset optimization
    console.log("Optimizing asset:", asset.name);
  }

  /**
   * Replace asset
   */
  replaceAsset(asset: Asset): void {
    // Would trigger asset replacement
    console.log("Replacing asset:", asset.name);
  }

  /**
   * Reset content to defaults
   */
  resetContent(): void {
    if (
      this.section &&
      confirm("Are you sure you want to reset this section content?")
    ) {
      // Reset to default content based on section type
      this.section.content = this.getDefaultContent(this.section.type);
      this.initializeAssetReferences();
      this.updateContentJson();
      this.onContentChange();
    }
  }

  /**
   * Save content
   */
  saveContent(): void {
    if (this.section) {
      this.onContentChange();
      // Could trigger additional save operations
      console.log("Content saved for section:", this.section.id);
    }
  }

  /**
   * Check if section type has special editor
   */
  isSpecialSectionType(type: SectionType): boolean {
    return [
      SectionType.HERO,
      SectionType.TESTIMONIALS,
      SectionType.ABOUT,
      SectionType.CONTACT,
    ].includes(type);
  }

  /**
   * Get section type display name
   */
  getSectionTypeDisplayName(type: SectionType): string {
    const typeNames: Record<SectionType, string> = {
      [SectionType.HERO]: "Hero",
      [SectionType.FEATURES]: "Features",
      [SectionType.TESTIMONIALS]: "Testimonials",
      [SectionType.PRICING]: "Pricing",
      [SectionType.CONTACT]: "Contact",
      [SectionType.ABOUT]: "About",
      [SectionType.CTA]: "Call to Action",
      [SectionType.GALLERY]: "Gallery",
      [SectionType.TEAM]: "Team",
      [SectionType.FAQ]: "FAQ",
      [SectionType.BLOG]: "Blog",
      [SectionType.NEWSLETTER]: "Newsletter",
      [SectionType.STATS]: "Statistics",
      [SectionType.TIMELINE]: "Timeline",
      [SectionType.PORTFOLIO]: "Portfolio",
      [SectionType.SERVICES]: "Services",
      [SectionType.FOOTER]: "Footer",
      [SectionType.HEADER]: "Header",
      [SectionType.CUSTOM]: "Custom",
    };

    return typeNames[type] || type;
  }

  /**
   * Get default content for section type
   */
  private getDefaultContent(type: SectionType): any {
    const defaultContent: Record<SectionType, any> = {
      [SectionType.HERO]: {
        headerText: "Welcome to Our Website",
        heroSubheading: "Create amazing experiences with our platform",
        imageUrl: "",
        buttonText: "Get Started",
        buttonUrl: "#",
      },
      [SectionType.TESTIMONIALS]: {
        testimonialsTitle: "What Our Customers Say",
        testimonialsSubheading: "Real feedback from real customers",
        testimonials: [],
      },
      [SectionType.ABOUT]: {
        aboutTitle: "About Us",
        aboutSubheading: "Our story and mission",
        content: "We are passionate about creating amazing experiences.",
        aboutImage: "",
      },
      [SectionType.CONTACT]: {
        contactTitle: "Get in Touch",
        contactSubheading: "We'd love to hear from you",
        address: "123 Main St, City, State 12345",
        email: "contact@example.com",
        phone: "+1 (555) 123-4567",
      },
      [SectionType.FEATURES]: { features: [] },
      [SectionType.PRICING]: { plans: [] },
      [SectionType.CTA]: {
        ctaTitle: "Ready to Get Started?",
        ctaSubheading: "Join thousands of satisfied customers",
        buttonText: "Get Started",
        buttonUrl: "#",
      },
      [SectionType.GALLERY]: { images: [] },
      [SectionType.TEAM]: { members: [] },
      [SectionType.FAQ]: { questions: [] },
      [SectionType.BLOG]: { posts: [] },
      [SectionType.NEWSLETTER]: { title: "Subscribe to our newsletter" },
      [SectionType.STATS]: { statistics: [] },
      [SectionType.TIMELINE]: { events: [] },
      [SectionType.PORTFOLIO]: { projects: [] },
      [SectionType.SERVICES]: { services: [] },
      [SectionType.FOOTER]: { links: [] },
      [SectionType.HEADER]: { navigation: [] },
      [SectionType.CUSTOM]: {},
    };

    return defaultContent[type] || {};
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Get asset type icon
   */
  getAssetTypeIcon(type: AssetType): string {
    const icons = {
      [AssetType.IMAGE]: "🖼️",
      [AssetType.VIDEO]: "🎥",
      [AssetType.AUDIO]: "🎵",
      [AssetType.DOCUMENT]: "📄",
      [AssetType.FONT]: "🔤",
      [AssetType.ICON]: "⭐",
      [AssetType.OTHER]: "📎",
    };
    return icons[type] || "📎";
  }

  /**
   * Get asset type color
   */
  getAssetTypeColor(type: AssetType): string {
    const colors = {
      [AssetType.IMAGE]: "#4CAF50",
      [AssetType.VIDEO]: "#2196F3",
      [AssetType.AUDIO]: "#FF9800",
      [AssetType.DOCUMENT]: "#9C27B0",
      [AssetType.FONT]: "#607D8B",
      [AssetType.ICON]: "#FFC107",
      [AssetType.OTHER]: "#795748",
    };
    return colors[type] || "#795548";
  }
}
