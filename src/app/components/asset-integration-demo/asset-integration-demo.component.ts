import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import { EnhancedAssetInputComponent } from "../asset-picker/enhanced-asset-input.component";
import { AssetManagerComponent } from "../asset-manager/asset-manager.component";
import { SectionContentEditorComponent } from "../section-editor/section-content-editor.component";
import { Asset, AssetType } from "../../models/asset.interface";
import { Section, SectionType } from "../../models/section.interface";
import {
  AssetIntegrationService,
  AssetIntegrationEvent,
} from "../../services/asset-integration.service";

@Component({
  selector: "app-asset-integration-demo",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EnhancedAssetInputComponent,
    AssetManagerComponent,
    SectionContentEditorComponent,
  ],
  template: `
    <div class="asset-integration-demo">
      <!-- Demo Header -->
      <div class="demo-header">
        <h2 class="demo-title">
          <i class="bi bi-images"></i>
          Asset Management Integration Demo
        </h2>
        <p class="demo-description">
          This demo showcases the integrated asset management system with asset
          picker, optimization, replacement, and compression tools working
          together across different editor components.
        </p>
      </div>

      <!-- Integration Features -->
      <div class="integration-features">
        <div class="feature-grid">
          <!-- Enhanced Asset Input Demo -->
          <div class="feature-card">
            <div class="feature-header">
              <h3 class="feature-title">
                <i class="bi bi-image"></i>
                Enhanced Asset Input
              </h3>
              <p class="feature-description">
                Smart asset input with optimization, replacement, and
                compression capabilities
              </p>
            </div>

            <div class="feature-demo">
              <app-enhanced-asset-input
                [allowedTypes]="[AssetType.IMAGE]"
                [(ngModel)]="selectedHeroImage"
                placeholder="Select hero image"
                label="Hero Image"
                projectId="demo-project"
                sectionId="demo-hero-section"
                variableName="heroImage"
                [showOptimization]="true"
                [showReplacement]="true"
                helpText="This input demonstrates asset selection with optimization and replacement features"
                (assetChanged)="onAssetChanged('hero', $event)"
                (assetOptimized)="onAssetOptimized('hero', $event)"
                (assetReplaced)="onAssetReplaced('hero', $event)"
                (assetUploaded)="onAssetUploaded('hero', $event)"
              ></app-enhanced-asset-input>
            </div>
          </div>

          <!-- Multiple Asset Inputs Demo -->
          <div class="feature-card">
            <div class="feature-header">
              <h3 class="feature-title">
                <i class="bi bi-collection"></i>
                Multiple Asset Management
              </h3>
              <p class="feature-description">
                Multiple asset inputs with different configurations and contexts
              </p>
            </div>

            <div class="feature-demo">
              <div class="asset-inputs-grid">
                <app-enhanced-asset-input
                  [allowedTypes]="[AssetType.IMAGE]"
                  [(ngModel)]="selectedLogoImage"
                  placeholder="Select logo"
                  label="Company Logo"
                  projectId="demo-project"
                  sectionId="demo-header-section"
                  variableName="logo"
                  [showOptimization]="true"
                  [showReplacement]="true"
                  (assetChanged)="onAssetChanged('logo', $event)"
                ></app-enhanced-asset-input>

                <app-enhanced-asset-input
                  [allowedTypes]="[AssetType.IMAGE]"
                  [(ngModel)]="selectedBackgroundImage"
                  placeholder="Select background"
                  label="Background Image"
                  projectId="demo-project"
                  sectionId="demo-hero-section"
                  variableName="backgroundImage"
                  [showOptimization]="true"
                  [showReplacement]="true"
                  (assetChanged)="onAssetChanged('background', $event)"
                ></app-enhanced-asset-input>

                <app-enhanced-asset-input
                  [allowedTypes]="[AssetType.IMAGE]"
                  [(ngModel)]="selectedTestimonialImage"
                  placeholder="Select customer photo"
                  label="Customer Photo"
                  projectId="demo-project"
                  sectionId="demo-testimonials-section"
                  variableName="customerPhoto"
                  [showOptimization]="true"
                  [showReplacement]="true"
                  (assetChanged)="onAssetChanged('testimonial', $event)"
                ></app-enhanced-asset-input>
              </div>
            </div>
          </div>

          <!-- Section Editor Integration -->
          <div class="feature-card full-width">
            <div class="feature-header">
              <h3 class="feature-title">
                <i class="bi bi-pencil-square"></i>
                Section Editor Integration
              </h3>
              <p class="feature-description">
                Complete section editing with integrated asset management
              </p>
            </div>

            <div class="feature-demo">
              <app-section-content-editor
                [section]="demoSection"
                projectId="demo-project"
                (contentChanged)="onSectionContentChanged($event)"
                (assetOptimized)="onSectionAssetOptimized($event)"
                (assetReplaced)="onSectionAssetReplaced($event)"
              ></app-section-content-editor>
            </div>
          </div>

          <!-- Asset Manager Integration -->
          <div class="feature-card full-width">
            <div class="feature-header">
              <h3 class="feature-title">
                <i class="bi bi-folder2-open"></i>
                Asset Manager Integration
              </h3>
              <p class="feature-description">
                Complete asset library management with bulk operations
              </p>
            </div>

            <div class="feature-demo">
              <div *ngIf="showAssetManager" class="asset-manager-container">
                <div class="asset-manager-header">
                  <h4>Asset Manager</h4>
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    (click)="showAssetManager = false"
                  >
                    <i class="bi bi-x"></i>
                    Close
                  </button>
                </div>
                <app-asset-manager></app-asset-manager>
              </div>

              <button
                *ngIf="!showAssetManager"
                class="btn btn-primary"
                (click)="showAssetManager = true"
              >
                <i class="bi bi-folder2-open"></i>
                Open Asset Manager
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Integration Events Log -->
      <div class="events-log" *ngIf="integrationEvents.length > 0">
        <div class="log-header">
          <h3 class="log-title">
            <i class="bi bi-activity"></i>
            Integration Events Log
          </h3>
          <button
            class="btn btn-outline-secondary btn-sm"
            (click)="clearEventsLog()"
          >
            <i class="bi bi-trash"></i>
            Clear Log
          </button>
        </div>

        <div class="log-entries">
          <div
            *ngFor="let event of integrationEvents; let i = index"
            class="log-entry"
            [class.recent]="i < 3"
          >
            <div class="log-timestamp">
              {{ formatTimestamp(event.timestamp) }}
            </div>
            <div class="log-content">
              <div class="log-type">
                <i class="bi" [class]="getEventIcon(event.type)"></i>
                {{ getEventTypeLabel(event.type) }}
              </div>
              <div class="log-details">
                <strong>{{ event.asset.name }}</strong>
                <span class="log-context" *ngIf="event.context.variableName">
                  in {{ event.context.variableName }}
                </span>
                <span class="log-metadata" *ngIf="event.metadata">
                  {{ getEventMetadata(event) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Asset Usage Summary -->
      <div class="usage-summary" *ngIf="assetUsageSummary.length > 0">
        <div class="summary-header">
          <h3 class="summary-title">
            <i class="bi bi-graph-up"></i>
            Asset Usage Summary
          </h3>
        </div>

        <div class="usage-grid">
          <div *ngFor="let usage of assetUsageSummary" class="usage-card">
            <div class="usage-asset">
              <img
                *ngIf="usage.asset.type === AssetType.IMAGE"
                [src]="usage.asset.url"
                [alt]="usage.asset.name"
                class="usage-thumbnail"
              />
              <div
                *ngIf="usage.asset.type !== AssetType.IMAGE"
                class="usage-placeholder"
                [style.background-color]="getAssetTypeColor(usage.asset.type)"
              >
                <span class="usage-icon">{{
                  getAssetTypeIcon(usage.asset.type)
                }}</span>
              </div>
            </div>

            <div class="usage-info">
              <div class="usage-name">{{ usage.asset.name }}</div>
              <div class="usage-stats">
                <span class="usage-count">
                  <i class="bi bi-link-45deg"></i>
                  {{ usage.usageCount }} usage(s)
                </span>
                <span class="usage-size">
                  <i class="bi bi-file-earmark"></i>
                  {{ formatFileSize(usage.asset.size) }}
                </span>
              </div>
              <div
                class="usage-optimization"
                *ngIf="usage.optimizationPotential > 0"
              >
                <i class="bi bi-speedometer2"></i>
                {{ usage.optimizationPotential }}% optimization potential
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ["./asset-integration-demo.component.css"],
})
export class AssetIntegrationDemoComponent implements OnInit, OnDestroy {
  // Selected assets for different contexts
  selectedHeroImage: Asset | null = null;
  selectedLogoImage: Asset | null = null;
  selectedBackgroundImage: Asset | null = null;
  selectedTestimonialImage: Asset | null = null;

  // Demo section for section editor
  demoSection: Section = {
    id: "demo-hero-section",
    type: SectionType.HERO,
    templateId: "hero-modern",
    content: {
      headerText: "Welcome to Our Platform",
      heroSubheading: "Experience the power of integrated asset management",
      imageUrl: "",
      buttonText: "Get Started",
      buttonUrl: "#",
    },
    styles: {
      customCss: "",
      overrides: {},
      theme: {
        colorScheme: "light",
        spacing: "medium" as any,
        borderRadius: "medium" as any,
        shadow: "medium" as any,
      },
    },
    order: 0,
    isVisible: true,
    responsiveSettings: {
      breakpoints: [],
      deviceSpecificStyles: {
        mobile: {},
        tablet: {},
        desktop: {},
      },
    },
    metadata: {
      name: "Demo Hero Section",
      description: "Demonstration hero section with asset integration",
      createdAt: new Date(),
      updatedAt: new Date(),
      isDuplicate: false,
      customizations: [],
    },
  };

  // UI state
  showAssetManager = false;
  integrationEvents: (AssetIntegrationEvent & { timestamp: Date })[] = [];
  assetUsageSummary: any[] = [];

  // Enums for template
  AssetType = AssetType;
  SectionType = SectionType;

  private destroy$ = new Subject<void>();

  constructor(private assetIntegrationService: AssetIntegrationService) {}

  ngOnInit(): void {
    this.setupIntegrationEventTracking();
    this.loadAssetUsageSummary();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup integration event tracking
   */
  private setupIntegrationEventTracking(): void {
    this.assetIntegrationService
      .getIntegrationEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event) {
          this.integrationEvents.unshift({
            ...event,
            timestamp: new Date(),
          });

          // Keep only last 20 events
          if (this.integrationEvents.length > 20) {
            this.integrationEvents = this.integrationEvents.slice(0, 20);
          }

          // Update usage summary
          this.updateAssetUsageSummary(event.asset);
        }
      });
  }

  /**
   * Load asset usage summary
   */
  private async loadAssetUsageSummary(): Promise<void> {
    // This would load actual usage data
    // For demo purposes, we'll populate with sample data
    this.assetUsageSummary = [];
  }

  /**
   * Handle asset change events
   */
  onAssetChanged(context: string, asset: Asset | null): void {
    console.log(`Asset changed in ${context}:`, asset);

    if (asset) {
      this.updateAssetUsageSummary(asset);
    }
  }

  /**
   * Handle asset optimization events
   */
  onAssetOptimized(context: string, asset: Asset): void {
    console.log(`Asset optimized in ${context}:`, asset);
  }

  /**
   * Handle asset replacement events
   */
  onAssetReplaced(
    context: string,
    event: { oldAsset: Asset; newAsset: Asset }
  ): void {
    console.log(`Asset replaced in ${context}:`, event);
  }

  /**
   * Handle asset upload events
   */
  onAssetUploaded(context: string, asset: Asset): void {
    console.log(`Asset uploaded in ${context}:`, asset);
  }

  /**
   * Handle section content changes
   */
  onSectionContentChanged(section: Section): void {
    this.demoSection = section;
    console.log("Section content changed:", section);
  }

  /**
   * Handle section asset optimization
   */
  onSectionAssetOptimized(event: { asset: Asset; section: Section }): void {
    console.log("Section asset optimized:", event);
  }

  /**
   * Handle section asset replacement
   */
  onSectionAssetReplaced(event: {
    oldAsset: Asset;
    newAsset: Asset;
    section: Section;
  }): void {
    console.log("Section asset replaced:", event);
  }

  /**
   * Handle asset manager selection
   */
  onAssetManagerSelection(asset: Asset): void {
    console.log("Asset selected from manager:", asset);
    this.showAssetManager = false;
  }

  /**
   * Handle bulk asset optimization
   */
  onBulkAssetsOptimized(assets: Asset[]): void {
    console.log("Bulk assets optimized:", assets);
  }

  /**
   * Handle bulk asset replacement
   */
  onBulkAssetsReplaced(
    replacements: { oldAsset: Asset; newAsset: Asset }[]
  ): void {
    console.log("Bulk assets replaced:", replacements);
  }

  /**
   * Clear events log
   */
  clearEventsLog(): void {
    this.integrationEvents = [];
  }

  /**
   * Update asset usage summary
   */
  private updateAssetUsageSummary(asset: Asset): void {
    const existingIndex = this.assetUsageSummary.findIndex(
      (item) => item.asset.id === asset.id
    );

    if (existingIndex >= 0) {
      this.assetUsageSummary[existingIndex].usageCount++;
    } else {
      this.assetUsageSummary.push({
        asset,
        usageCount: 1,
        optimizationPotential: this.calculateOptimizationPotential(asset),
      });
    }
  }

  /**
   * Calculate optimization potential
   */
  private calculateOptimizationPotential(asset: Asset): number {
    if (asset.type !== AssetType.IMAGE) return 0;

    let potential = 0;

    if (asset.size > 1024 * 1024) potential += 30;
    if (asset.size > 2 * 1024 * 1024) potential += 20;
    if (asset.metadata?.mimeType === "image/png" && asset.size > 500 * 1024)
      potential += 25;
    if (
      asset.dimensions &&
      (asset.dimensions.width > 2000 || asset.dimensions.height > 2000)
    )
      potential += 35;

    return Math.min(potential, 100);
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp: Date): string {
    return timestamp.toLocaleTimeString();
  }

  /**
   * Get event icon
   */
  getEventIcon(type: string): string {
    const icons = {
      "asset-selected": "bi-check-circle",
      "asset-optimized": "bi-speedometer2",
      "asset-replaced": "bi-arrow-repeat",
      "asset-uploaded": "bi-upload",
    };
    return icons[type as keyof typeof icons] || "bi-info-circle";
  }

  /**
   * Get event type label
   */
  getEventTypeLabel(type: string): string {
    const labels = {
      "asset-selected": "Asset Selected",
      "asset-optimized": "Asset Optimized",
      "asset-replaced": "Asset Replaced",
      "asset-uploaded": "Asset Uploaded",
    };
    return labels[type as keyof typeof labels] || type;
  }

  /**
   * Get event metadata
   */
  getEventMetadata(event: AssetIntegrationEvent & { timestamp: Date }): string {
    if (event.metadata) {
      if (event.type === "asset-uploaded") {
        return `(${this.formatFileSize(event.metadata.fileSize)})`;
      }
      if (event.type === "asset-optimized") {
        return `(from ${event.metadata.originalAsset?.name})`;
      }
      if (event.type === "asset-replaced") {
        return `(${event.metadata.usageLocations?.length || 0} locations)`;
      }
    }
    return "";
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
      [AssetType.OTHER]: "#795548",
    };
    return colors[type] || "#795548";
  }
}
