import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PreviewComponent } from "../preview/preview.component";
import { GlobalStylingControlsComponent } from "./global-styling-controls/global-styling-controls.component";
import { AssetManagerComponent } from "./asset-manager/asset-manager.component";
import { SectionManagerComponent } from "./section-manager/section-manager.component";
import {
  ResponsiveDesignEditorComponent,
  DevicePreset,
} from "./responsive-design-editor/responsive-design-editor.component";
import {
  DeviceType,
  ResponsiveSettings,
  Section,
} from "../models/section.interface";
import { GlobalStyles } from "../models/project.interface";
import { Asset } from "../models/asset.interface";

@Component({
  selector: "app-responsive-integration-demo",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PreviewComponent,
    GlobalStylingControlsComponent,
    AssetManagerComponent,
    SectionManagerComponent,
    ResponsiveDesignEditorComponent,
  ],
  template: `
    <div class="responsive-integration-demo">
      <h2>Responsive Integration Demo</h2>

      <!-- Device Selection -->
      <div class="device-controls">
        <h3>Device Simulation</h3>
        <label>
          <input type="checkbox" [(ngModel)]="enableResponsiveMode" />
          Enable Responsive Mode
        </label>

        <div *ngIf="enableResponsiveMode" class="device-selector">
          <label for="device-select">Select Device:</label>
          <select
            id="device-select"
            [(ngModel)]="selectedDeviceIndex"
            (change)="onDeviceChange()"
          >
            <option
              *ngFor="let device of availableDevices; let i = index"
              [value]="i"
            >
              {{ device.name }} ({{ device.width }}x{{ device.height }})
            </option>
          </select>
        </div>
      </div>

      <!-- Responsive Design Editor -->
      <div *ngIf="enableResponsiveMode" class="responsive-editor">
        <h3>Responsive Design Editor</h3>
        <app-responsive-design-editor
          [responsiveSettings]="responsiveSettings"
          [currentContent]="currentContent"
          [isVisible]="true"
          (responsiveSettingsChange)="onResponsiveSettingsChange($event)"
          (devicePreviewChange)="onDevicePreviewChange($event)"
        >
        </app-responsive-design-editor>
      </div>

      <!-- Global Styling Controls with Responsive Support -->
      <div class="global-styling">
        <h3>Global Styling (Responsive)</h3>
        <app-global-styling-controls
          [currentDevice]="currentDevice"
          [responsiveSettings]="responsiveSettings"
          [enableResponsiveControls]="enableResponsiveMode"
          (deviceChange)="onDeviceChangeFromComponent($event)"
          (responsiveSettingsChange)="onResponsiveSettingsChange($event)"
        >
        </app-global-styling-controls>
      </div>

      <!-- Section Manager with Responsive Support -->
      <div class="section-manager">
        <h3>Section Manager (Responsive)</h3>
        <app-section-manager
          [sections]="sections"
          [currentDevice]="currentDevice"
          [responsiveSettings]="responsiveSettings"
          [enableResponsiveControls]="enableResponsiveMode"
          (sectionsChange)="onSectionsChange($event)"
          (sectionResponsiveSettingsChanged)="
            onSectionResponsiveSettingsChanged($event)
          "
        >
        </app-section-manager>
      </div>

      <!-- Asset Manager with Responsive Support -->
      <div class="asset-manager">
        <h3>Asset Manager (Responsive)</h3>
        <app-asset-manager
          [currentDevice]="currentDevice"
          [enableResponsiveOptimization]="enableResponsiveMode"
          (assetOptimizedForDevice)="onAssetOptimizedForDevice($event)"
        >
        </app-asset-manager>
      </div>

      <!-- Preview with Device Simulation -->
      <div class="preview-container">
        <h3>Preview (Device Simulation)</h3>
        <div class="preview-info" *ngIf="currentDevice">
          <p><strong>Current Device:</strong> {{ currentDevice.name }}</p>
          <p>
            <strong>Dimensions:</strong> {{ currentDevice.width }}x{{
              currentDevice.height
            }}
          </p>
          <p>
            <strong>Type:</strong> {{ getDeviceTypeName(currentDevice.type) }}
          </p>
          <p><strong>Pixel Ratio:</strong> {{ currentDevice.pixelRatio }}</p>
        </div>

        <app-preview
          [sections]="sections"
          [globalStyles]="globalStylesCSS"
          [currentDevice]="currentDevice"
          [responsiveSettings]="responsiveSettings"
          [enableDeviceSimulation]="enableResponsiveMode"
          [enableTransitions]="true"
        >
        </app-preview>
      </div>

      <!-- Integration Status -->
      <div class="integration-status">
        <h3>Integration Status</h3>
        <div class="status-grid">
          <div class="status-item">
            <strong>Responsive Mode:</strong>
            <span
              [class]="
                enableResponsiveMode ? 'status-active' : 'status-inactive'
              "
            >
              {{ enableResponsiveMode ? "Active" : "Inactive" }}
            </span>
          </div>

          <div class="status-item" *ngIf="currentDevice">
            <strong>Current Device:</strong>
            <span class="status-info">{{ currentDevice.name }}</span>
          </div>

          <div class="status-item">
            <strong>Breakpoints:</strong>
            <span class="status-info"
              >{{ responsiveSettings.breakpoints.length }} configured</span
            >
          </div>

          <div class="status-item">
            <strong>Sections:</strong>
            <span class="status-info"
              >{{ getVisibleSectionsCount() }} visible on current device</span
            >
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .responsive-integration-demo {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .device-controls {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
      }

      .device-selector {
        margin-top: 10px;
      }

      .device-selector select {
        padding: 8px;
        border-radius: 4px;
        border: 1px solid #ccc;
        min-width: 200px;
      }

      .responsive-editor,
      .global-styling,
      .section-manager,
      .asset-manager,
      .preview-container {
        margin-bottom: 30px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
      }

      .preview-info {
        background: #e3f2fd;
        padding: 10px;
        border-radius: 4px;
        margin-bottom: 15px;
      }

      .preview-info p {
        margin: 5px 0;
      }

      .integration-status {
        background: #f9f9f9;
        padding: 20px;
        border-radius: 8px;
        border: 2px solid #4caf50;
      }

      .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
        margin-top: 15px;
      }

      .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background: white;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
      }

      .status-active {
        color: #4caf50;
        font-weight: bold;
      }

      .status-inactive {
        color: #f44336;
        font-weight: bold;
      }

      .status-info {
        color: #2196f3;
        font-weight: bold;
      }

      h2,
      h3 {
        color: #333;
        margin-bottom: 15px;
      }

      h2 {
        text-align: center;
        border-bottom: 2px solid #4caf50;
        padding-bottom: 10px;
      }
    `,
  ],
})
export class ResponsiveIntegrationDemoComponent implements OnInit {
  // Responsive mode state
  enableResponsiveMode = false;
  selectedDeviceIndex = 0;
  currentDevice: DevicePreset | null = null;

  // Responsive settings
  responsiveSettings: ResponsiveSettings = {
    breakpoints: [
      { name: "mobile", minWidth: 0, maxWidth: 767 },
      { name: "tablet", minWidth: 768, maxWidth: 1023 },
      { name: "desktop", minWidth: 1024 },
    ],
    deviceSpecificStyles: {
      mobile: {
        fontSize: "14px",
        padding: "8px",
        margin: "4px",
      },
      tablet: {
        fontSize: "16px",
        padding: "12px",
        margin: "8px",
      },
      desktop: {
        fontSize: "18px",
        padding: "16px",
        margin: "12px",
      },
    },
  };

  // Available devices for testing
  availableDevices: DevicePreset[] = [
    {
      name: "iPhone 14 Pro",
      type: DeviceType.MOBILE,
      width: 393,
      height: 852,
      pixelRatio: 3,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      icon: "phone",
      orientation: "portrait",
    },
    {
      name: "Samsung Galaxy S23",
      type: DeviceType.MOBILE,
      width: 360,
      height: 780,
      pixelRatio: 3,
      userAgent: "Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36",
      icon: "phone",
      orientation: "portrait",
    },
    {
      name: 'iPad Pro 12.9"',
      type: DeviceType.TABLET,
      width: 1024,
      height: 1366,
      pixelRatio: 2,
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      icon: "tablet",
      orientation: "portrait",
    },
    {
      name: "Desktop 1920x1080",
      type: DeviceType.DESKTOP,
      width: 1920,
      height: 1080,
      pixelRatio: 1,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      icon: "display",
      orientation: "landscape",
    },
  ];

  // Demo content
  sections: Section[] = [];
  globalStylesCSS = "";
  currentContent = "<div>Sample content for responsive testing</div>";

  ngOnInit(): void {
    this.initializeDemoData();
  }

  /**
   * Initialize demo data
   */
  private initializeDemoData(): void {
    // Create sample sections
    this.sections = [
      {
        id: "demo-hero",
        type: "hero" as any,
        templateId: "hero-modern",
        content: {
          headerText: "Responsive Demo",
          heroSubheading:
            "Testing responsive integration across all components",
          imageUrl:
            "https://images.unsplash.com/photo-1734784547207-7ad9f04c1f0a",
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
        responsiveSettings: this.responsiveSettings,
        metadata: {
          name: "Demo Hero Section",
          description: "Hero section for responsive demo",
          createdAt: new Date(),
          updatedAt: new Date(),
          isDuplicate: false,
          customizations: [],
        },
      },
    ];

    // Set initial device
    this.currentDevice = this.availableDevices[0];
  }

  /**
   * Handle device change from dropdown
   */
  onDeviceChange(): void {
    if (
      this.selectedDeviceIndex >= 0 &&
      this.selectedDeviceIndex < this.availableDevices.length
    ) {
      this.currentDevice = this.availableDevices[this.selectedDeviceIndex];
    }
  }

  /**
   * Handle device change from components
   */
  onDeviceChangeFromComponent(device: DevicePreset): void {
    this.currentDevice = device;
    this.selectedDeviceIndex = this.availableDevices.findIndex(
      (d) => d.name === device.name
    );
  }

  /**
   * Handle device preview change from responsive editor
   */
  onDevicePreviewChange(device: DevicePreset): void {
    this.onDeviceChangeFromComponent(device);
  }

  /**
   * Handle responsive settings change
   */
  onResponsiveSettingsChange(settings: ResponsiveSettings): void {
    this.responsiveSettings = settings;

    // Update all sections with new responsive settings
    this.sections = this.sections.map((section) => ({
      ...section,
      responsiveSettings: settings,
      metadata: {
        ...section.metadata,
        updatedAt: new Date(),
      },
    }));
  }

  /**
   * Handle sections change
   */
  onSectionsChange(sections: Section[]): void {
    this.sections = sections;
  }

  /**
   * Handle section responsive settings change
   */
  onSectionResponsiveSettingsChanged(event: {
    section: Section;
    responsiveSettings: ResponsiveSettings;
  }): void {
    const updatedSections = this.sections.map((section) =>
      section.id === event.section.id
        ? { ...section, responsiveSettings: event.responsiveSettings }
        : section
    );
    this.sections = updatedSections;
  }

  /**
   * Handle asset optimization for device
   */
  onAssetOptimizedForDevice(event: {
    asset: Asset;
    device: DevicePreset;
  }): void {
    console.log(`Asset ${event.asset.name} optimized for ${event.device.name}`);
  }

  /**
   * Get device type display name
   */
  getDeviceTypeName(deviceType: DeviceType): string {
    switch (deviceType) {
      case DeviceType.MOBILE:
        return "Mobile";
      case DeviceType.TABLET:
        return "Tablet";
      case DeviceType.DESKTOP:
        return "Desktop";
      default:
        return "Unknown";
    }
  }

  /**
   * Get count of sections visible on current device
   */
  getVisibleSectionsCount(): number {
    if (!this.currentDevice) {
      return this.sections.filter((s) => s.isVisible).length;
    }

    return this.sections.filter((section) => {
      const hideOnDevices = section.responsiveSettings?.hideOnDevices || [];
      return (
        section.isVisible && !hideOnDevices.includes(this.currentDevice!.type)
      );
    }).length;
  }
}
