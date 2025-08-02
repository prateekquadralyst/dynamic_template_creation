import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ResponsiveDesignEditorComponent, DevicePreset, ResponsiveIssue } from './responsive-design-editor.component';
import { ResponsiveSettings, DeviceType } from '../../models/section.interface';

describe('ResponsiveDesignEditorComponent', () => {
  let component: ResponsiveDesignEditorComponent;
  let fixture: ComponentFixture<ResponsiveDesignEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResponsiveDesignEditorComponent, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResponsiveDesignEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default device presets', () => {
    expect(component.devicePresets).toBeDefined();
    expect(component.devicePresets.length).toBeGreaterThan(0);
    expect(component.selectedDevice).toBe(component.devicePresets[0]);
  });

  it('should initialize default breakpoints if none provided', () => {
    component.responsiveSettings = { breakpoints: [], deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} } };
    component.ngOnInit();
    
    expect(component.responsiveSettings.breakpoints.length).toBe(3);
    expect(component.responsiveSettings.breakpoints[0].name).toBe('mobile');
    expect(component.responsiveSettings.breakpoints[1].name).toBe('tablet');
    expect(component.responsiveSettings.breakpoints[2].name).toBe('desktop');
  });

  it('should select device and emit change event', () => {
    spyOn(component.devicePreviewChange, 'emit');
    const tabletDevice = component.devicePresets.find(d => d.type === DeviceType.TABLET);
    
    if (tabletDevice) {
      component.selectDevice(tabletDevice);
      
      expect(component.selectedDevice).toBe(tabletDevice);
      expect(component.devicePreviewChange.emit).toHaveBeenCalledWith(tabletDevice);
    }
  });

  it('should add custom breakpoint', () => {
    const initialCount = component.responsiveSettings.breakpoints.length;
    component.customBreakpoint = { name: 'large-mobile', minWidth: 480, maxWidth: 767 };
    
    spyOn(component.breakpointChange, 'emit');
    component.addBreakpoint();
    
    expect(component.responsiveSettings.breakpoints.length).toBe(initialCount + 1);
    expect(component.breakpointChange.emit).toHaveBeenCalled();
    expect(component.customBreakpoint).toEqual({});
  });

  it('should remove breakpoint', () => {
    const initialCount = component.responsiveSettings.breakpoints.length;
    spyOn(component.breakpointChange, 'emit');
    
    component.removeBreakpoint(0);
    
    expect(component.responsiveSettings.breakpoints.length).toBe(initialCount - 1);
    expect(component.breakpointChange.emit).toHaveBeenCalled();
  });

  it('should detect overlapping breakpoints', () => {
    component.responsiveSettings.breakpoints = [
      { name: 'mobile', minWidth: 0, maxWidth: 767 },
      { name: 'tablet', minWidth: 600, maxWidth: 1023 } // Overlaps with mobile
    ];
    
    component.analyzeResponsiveIssues();
    
    const overlappingIssue = component.detectedIssues.find(issue => 
      issue.message.includes('overlaps')
    );
    expect(overlappingIssue).toBeDefined();
  });

  it('should detect gaps between breakpoints', () => {
    component.responsiveSettings.breakpoints = [
      { name: 'mobile', minWidth: 0, maxWidth: 600 },
      { name: 'tablet', minWidth: 800, maxWidth: 1023 } // Gap between 600 and 800
    ];
    
    component.analyzeResponsiveIssues();
    
    const gapIssue = component.detectedIssues.find(issue => 
      issue.message.includes('Gap detected')
    );
    expect(gapIssue).toBeDefined();
  });

  it('should detect missing viewport meta tag', () => {
    component.currentContent = '<html><head></head><body>Test content</body></html>';
    
    component.analyzeResponsiveIssues();
    
    const viewportIssue = component.detectedIssues.find(issue => 
      issue.message.includes('viewport meta tag')
    );
    expect(viewportIssue).toBeDefined();
    expect(viewportIssue?.type).toBe('error');
  });

  it('should detect fixed width declarations', () => {
    component.currentContent = 'div { width: 300px; } .container { width: 500px; }';
    
    component.analyzeResponsiveIssues();
    
    const fixedWidthIssue = component.detectedIssues.find(issue => 
      issue.message.includes('fixed width declarations')
    );
    expect(fixedWidthIssue).toBeDefined();
  });

  it('should detect missing media queries', () => {
    component.currentContent = 'body { font-size: 16px; } .header { color: blue; }';
    
    component.analyzeResponsiveIssues();
    
    const mediaQueryIssue = component.detectedIssues.find(issue => 
      issue.message.includes('No media queries found')
    );
    expect(mediaQueryIssue).toBeDefined();
  });

  it('should find current breakpoint for device width', () => {
    component.responsiveSettings.breakpoints = [
      { name: 'mobile', minWidth: 0, maxWidth: 767 },
      { name: 'tablet', minWidth: 768, maxWidth: 1023 },
      { name: 'desktop', minWidth: 1024 }
    ];
    
    // Test mobile device
    component.selectedDevice = component.devicePresets.find(d => d.width === 393)!; // iPhone 14 Pro
    const mobileBreakpoint = component.getCurrentBreakpoint();
    expect(mobileBreakpoint?.name).toBe('mobile');
    
    // Test tablet device
    component.selectedDevice = component.devicePresets.find(d => d.width === 1024)!; // iPad Pro
    const tabletBreakpoint = component.getCurrentBreakpoint();
    expect(tabletBreakpoint?.name).toBe('desktop'); // 1024px matches desktop breakpoint
  });

  it('should toggle breakpoint editor visibility', () => {
    expect(component.showBreakpointEditor).toBeFalse();
    
    component.toggleBreakpointEditor();
    expect(component.showBreakpointEditor).toBeTrue();
    
    component.toggleBreakpointEditor();
    expect(component.showBreakpointEditor).toBeFalse();
  });

  it('should toggle issues panel visibility', () => {
    expect(component.showIssuesPanel).toBeFalse();
    
    component.toggleIssuesPanel();
    expect(component.showIssuesPanel).toBeTrue();
    
    component.toggleIssuesPanel();
    expect(component.showIssuesPanel).toBeFalse();
  });

  it('should return correct CSS class for issue severity', () => {
    expect(component.getIssueSeverityClass('low')).toBe('issue-low');
    expect(component.getIssueSeverityClass('medium')).toBe('issue-medium');
    expect(component.getIssueSeverityClass('high')).toBe('issue-high');
  });

  it('should return correct device icon', () => {
    const mobileDevice: DevicePreset = {
      name: 'iPhone',
      type: DeviceType.MOBILE,
      width: 375,
      height: 667,
      pixelRatio: 2,
      userAgent: 'test',
      icon: 'phone',
      orientation: 'portrait'
    };
    
    expect(component.getDeviceIcon(mobileDevice)).toBe('bi-phone');
  });

  it('should check if device is selected', () => {
    const device = component.devicePresets[0];
    component.selectedDevice = device;
    
    expect(component.isDeviceSelected(device)).toBeTrue();
    expect(component.isDeviceSelected(component.devicePresets[1])).toBeFalse();
  });

  it('should emit responsive settings changes', () => {
    spyOn(component.responsiveSettingsChange, 'emit');
    
    component.updateResponsiveSettings();
    
    expect(component.responsiveSettingsChange.emit).toHaveBeenCalledWith(component.responsiveSettings);
  });

  it('should enable touch simulation for mobile devices', () => {
    const mobileDevice = component.devicePresets.find(d => d.type === DeviceType.MOBILE);
    
    if (mobileDevice) {
      component.selectDevice(mobileDevice);
      expect(component.simulateTouchInteractions).toBeTrue();
    }
  });

  it('should disable touch simulation for desktop devices', () => {
    const desktopDevice = component.devicePresets.find(d => d.type === DeviceType.DESKTOP);
    
    if (desktopDevice) {
      component.selectDevice(desktopDevice);
      expect(component.simulateTouchInteractions).toBeFalse();
    }
  });

  it('should sort breakpoints by min width', () => {
    component.responsiveSettings.breakpoints = [
      { name: 'desktop', minWidth: 1024 },
      { name: 'mobile', minWidth: 0, maxWidth: 767 },
      { name: 'tablet', minWidth: 768, maxWidth: 1023 }
    ];
    
    component.customBreakpoint = { name: 'large-mobile', minWidth: 480 };
    component.addBreakpoint();
    
    const breakpoints = component.responsiveSettings.breakpoints;
    for (let i = 1; i < breakpoints.length; i++) {
      expect(breakpoints[i].minWidth).toBeGreaterThanOrEqual(breakpoints[i - 1].minWidth);
    }
  });

  it('should not add breakpoint with invalid data', () => {
    const initialCount = component.responsiveSettings.breakpoints.length;
    
    // Test with missing name
    component.customBreakpoint = { minWidth: 480 };
    component.addBreakpoint();
    expect(component.responsiveSettings.breakpoints.length).toBe(initialCount);
    
    // Test with missing minWidth
    component.customBreakpoint = { name: 'test' };
    component.addBreakpoint();
    expect(component.responsiveSettings.breakpoints.length).toBe(initialCount);
  });

  it('should emit issues detected event', () => {
    spyOn(component.issuesDetected, 'emit');
    
    component.analyzeResponsiveIssues();
    
    expect(component.issuesDetected.emit).toHaveBeenCalledWith(component.detectedIssues);
  });

  it('should handle component destruction properly', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});