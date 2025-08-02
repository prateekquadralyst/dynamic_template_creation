import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreviewComponent } from '../preview/preview.component';
import { GlobalStylingControlsComponent } from './global-styling-controls/global-styling-controls.component';
import { AssetManagerComponent } from './asset-manager/asset-manager.component';
import { SectionManagerComponent } from './section-manager/section-manager.component';
import { ResponsiveDesignEditorComponent, DevicePreset } from './responsive-design-editor/responsive-design-editor.component';
import { DeviceType, ResponsiveSettings } from '../models/section.interface';
import { AssetService } from '../services/asset.service';
import { TemplateService } from '../services/template.service';
import { GlobalStylingService } from '../services/global-styling.service';
import { ProjectService } from '../services/project.service';

describe('Responsive Integration', () => {
  let previewComponent: PreviewComponent;
  let previewFixture: ComponentFixture<PreviewComponent>;
  
  let globalStylingComponent: GlobalStylingControlsComponent;
  let globalStylingFixture: ComponentFixture<GlobalStylingControlsComponent>;

  const mockDevicePreset: DevicePreset = {
    name: 'iPhone 14 Pro',
    type: DeviceType.MOBILE,
    width: 393,
    height: 852,
    pixelRatio: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    icon: 'phone',
    orientation: 'portrait'
  };

  const mockResponsiveSettings: ResponsiveSettings = {
    breakpoints: [
      { name: 'mobile', minWidth: 0, maxWidth: 767 },
      { name: 'tablet', minWidth: 768, maxWidth: 1023 },
      { name: 'desktop', minWidth: 1024 }
    ],
    deviceSpecificStyles: {
      mobile: { fontSize: '14px', padding: '8px' },
      tablet: { fontSize: '16px', padding: '12px' },
      desktop: { fontSize: '18px', padding: '16px' }
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PreviewComponent,
        GlobalStylingControlsComponent,
        AssetManagerComponent,
        SectionManagerComponent,
        ResponsiveDesignEditorComponent
      ],
      providers: [
        { provide: AssetService, useValue: jasmine.createSpyObj('AssetService', ['getAssets', 'uploadAsset']) },
        { provide: TemplateService, useValue: jasmine.createSpyObj('TemplateService', ['getTemplateById']) },
        { provide: GlobalStylingService, useValue: jasmine.createSpyObj('GlobalStylingService', ['updateTypography', 'updateColors']) },
        { provide: ProjectService, useValue: jasmine.createSpyObj('ProjectService', ['getProject']) }
      ]
    }).compileComponents();

    previewFixture = TestBed.createComponent(PreviewComponent);
    previewComponent = previewFixture.componentInstance;

    globalStylingFixture = TestBed.createComponent(GlobalStylingControlsComponent);
    globalStylingComponent = globalStylingFixture.componentInstance;
  });

  describe('PreviewComponent Responsive Integration', () => {
    it('should create preview component with responsive inputs', () => {
      expect(previewComponent).toBeTruthy();
      expect(previewComponent.currentDevice).toBeNull();
      expect(previewComponent.responsiveSettings).toBeNull();
      expect(previewComponent.enableDeviceSimulation).toBeFalse();
    });

    it('should accept responsive settings input', () => {
      previewComponent.responsiveSettings = mockResponsiveSettings;
      previewComponent.currentDevice = mockDevicePreset;
      previewComponent.enableDeviceSimulation = true;

      previewFixture.detectChanges();

      expect(previewComponent.responsiveSettings).toEqual(mockResponsiveSettings);
      expect(previewComponent.currentDevice).toEqual(mockDevicePreset);
      expect(previewComponent.enableDeviceSimulation).toBeTrue();
    });

    it('should update preview mode based on device type', () => {
      previewComponent.currentDevice = mockDevicePreset;
      previewComponent.enableDeviceSimulation = true;

      previewComponent.ngOnChanges({
        currentDevice: {
          currentValue: mockDevicePreset,
          previousValue: null,
          firstChange: true,
          isFirstChange: () => true
        }
      });

      expect(previewComponent.previewMode).toBe('mobile');
    });

    it('should generate device-specific styles', () => {
      previewComponent.responsiveSettings = mockResponsiveSettings;
      previewComponent.currentDevice = mockDevicePreset;

      const styles = (previewComponent as any).generateDeviceSpecificStyles();
      
      expect(styles).toContain('device-mobile');
      expect(styles).toContain('fontSize: 14px');
      expect(styles).toContain('padding: 8px');
    });

    it('should apply responsive image handling when enabled', () => {
      previewComponent.enableDeviceSimulation = true;
      previewComponent.currentDevice = mockDevicePreset;

      const testHtml = '<img src="test.jpg" alt="test">';
      const processedHtml = (previewComponent as any).applyResponsiveImageHandling(testHtml);

      expect(processedHtml).toContain('loading="lazy"');
      expect(processedHtml).toContain('style="max-width: 100%; height: auto;"');
    });
  });

  describe('GlobalStylingControlsComponent Responsive Integration', () => {
    it('should create global styling component with responsive inputs', () => {
      expect(globalStylingComponent).toBeTruthy();
      expect(globalStylingComponent.currentDevice).toBeNull();
      expect(globalStylingComponent.responsiveSettings).toBeNull();
      expect(globalStylingComponent.enableResponsiveControls).toBeFalse();
    });

    it('should accept responsive settings input', () => {
      globalStylingComponent.responsiveSettings = mockResponsiveSettings;
      globalStylingComponent.currentDevice = mockDevicePreset;
      globalStylingComponent.enableResponsiveControls = true;

      globalStylingFixture.detectChanges();

      expect(globalStylingComponent.responsiveSettings).toEqual(mockResponsiveSettings);
      expect(globalStylingComponent.currentDevice).toEqual(mockDevicePreset);
      expect(globalStylingComponent.enableResponsiveControls).toBeTrue();
    });

    it('should emit device change events', () => {
      spyOn(globalStylingComponent.deviceChange, 'emit');

      globalStylingComponent.onDeviceChange(mockDevicePreset);

      expect(globalStylingComponent.deviceChange.emit).toHaveBeenCalledWith(mockDevicePreset);
    });

    it('should emit responsive settings change events', () => {
      spyOn(globalStylingComponent.responsiveSettingsChange, 'emit');

      globalStylingComponent.onResponsiveSettingsChange(mockResponsiveSettings);

      expect(globalStylingComponent.responsiveSettingsChange.emit).toHaveBeenCalledWith(mockResponsiveSettings);
    });

    it('should scale font sizes for mobile devices', () => {
      globalStylingComponent.currentDevice = mockDevicePreset;
      globalStylingComponent.enableResponsiveControls = true;

      const originalTypography = {
        headingFont: 'Arial',
        bodyFont: 'Arial',
        fontSizes: {
          h1: '2rem',
          h2: '1.5rem',
          h3: '1.25rem',
          h4: '1rem',
          h5: '0.875rem',
          h6: '0.75rem',
          body: '1rem',
          small: '0.875rem'
        },
        lineHeights: {
          heading: 1.2,
          body: 1.5
        }
      };

      const adjustedTypography = (globalStylingComponent as any).applyDeviceTypographyAdjustments(originalTypography);

      expect(parseFloat(adjustedTypography.fontSizes.h1)).toBeLessThan(parseFloat(originalTypography.fontSizes.h1));
      expect(parseFloat(adjustedTypography.fontSizes.body)).toBeLessThan(parseFloat(originalTypography.fontSizes.body));
    });

    it('should get current device type name', () => {
      globalStylingComponent.currentDevice = mockDevicePreset;

      const deviceName = globalStylingComponent.getCurrentDeviceTypeName();

      expect(deviceName).toBe('Mobile');
    });

    it('should check if responsive mode is active', () => {
      globalStylingComponent.enableResponsiveControls = true;
      globalStylingComponent.currentDevice = mockDevicePreset;

      expect(globalStylingComponent.isResponsiveModeActive).toBeTrue();

      globalStylingComponent.currentDevice = null;

      expect(globalStylingComponent.isResponsiveModeActive).toBeFalse();
    });
  });

  describe('Integration Tests', () => {
    it('should coordinate responsive settings between components', () => {
      // Setup preview component
      previewComponent.responsiveSettings = mockResponsiveSettings;
      previewComponent.currentDevice = mockDevicePreset;
      previewComponent.enableDeviceSimulation = true;

      // Setup global styling component
      globalStylingComponent.responsiveSettings = mockResponsiveSettings;
      globalStylingComponent.currentDevice = mockDevicePreset;
      globalStylingComponent.enableResponsiveControls = true;

      previewFixture.detectChanges();
      globalStylingFixture.detectChanges();

      // Both components should have the same responsive settings
      expect(previewComponent.responsiveSettings).toEqual(globalStylingComponent.responsiveSettings);
      expect(previewComponent.currentDevice).toEqual(globalStylingComponent.currentDevice);
    });

    it('should handle device changes across components', () => {
      const tabletDevice: DevicePreset = {
        name: 'iPad Pro',
        type: DeviceType.TABLET,
        width: 1024,
        height: 1366,
        pixelRatio: 2,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        icon: 'tablet',
        orientation: 'portrait'
      };

      // Change device in global styling component
      globalStylingComponent.currentDevice = tabletDevice;
      globalStylingComponent.onDeviceChange(tabletDevice);

      // Preview component should be updated with the same device
      previewComponent.currentDevice = tabletDevice;
      previewComponent.ngOnChanges({
        currentDevice: {
          currentValue: tabletDevice,
          previousValue: mockDevicePreset,
          firstChange: false,
          isFirstChange: () => false
        }
      });

      expect(previewComponent.previewMode).toBe('tablet');
      expect(globalStylingComponent.getCurrentDeviceTypeName()).toBe('Tablet');
    });
  });
});