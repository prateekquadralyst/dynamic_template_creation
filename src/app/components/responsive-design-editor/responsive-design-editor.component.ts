import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { ResponsiveSettings, Breakpoint, DeviceStyles, DeviceType } from '../../models/section.interface';

export interface DevicePreset {
  name: string;
  type: DeviceType;
  width: number;
  height: number;
  pixelRatio: number;
  userAgent: string;
  icon: string;
  orientation: 'portrait' | 'landscape';
}

export interface ResponsiveIssue {
  type: 'warning' | 'error';
  message: string;
  element?: string;
  breakpoint?: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface TouchGesture {
  type: 'tap' | 'swipe' | 'pinch' | 'scroll';
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  duration: number;
}

@Component({
  selector: 'app-responsive-design-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './responsive-design-editor.component.html',
  styleUrls: ['./responsive-design-editor.component.css']
})
export class ResponsiveDesignEditorComponent implements OnInit, OnDestroy {
  @Input() responsiveSettings: ResponsiveSettings = {
    breakpoints: [],
    deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} }
  };
  
  @Input() currentContent: string = '';
  @Input() isVisible: boolean = true;
  
  @Output() responsiveSettingsChange = new EventEmitter<ResponsiveSettings>();
  @Output() devicePreviewChange = new EventEmitter<DevicePreset>();
  @Output() breakpointChange = new EventEmitter<Breakpoint[]>();
  @Output() issuesDetected = new EventEmitter<ResponsiveIssue[]>();
  
  @ViewChild('previewFrame', { static: false }) previewFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('deviceSimulator', { static: false }) deviceSimulator!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;
  private touchSimulation = false;

  // Device presets for accurate simulation
  devicePresets: DevicePreset[] = [
    {
      name: 'iPhone 14 Pro',
      type: DeviceType.MOBILE,
      width: 393,
      height: 852,
      pixelRatio: 3,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      icon: 'phone',
      orientation: 'portrait'
    },
    {
      name: 'iPhone 14 Pro Landscape',
      type: DeviceType.MOBILE,
      width: 852,
      height: 393,
      pixelRatio: 3,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      icon: 'phone-landscape',
      orientation: 'landscape'
    },
    {
      name: 'Samsung Galaxy S23',
      type: DeviceType.MOBILE,
      width: 360,
      height: 780,
      pixelRatio: 3,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36',
      icon: 'phone',
      orientation: 'portrait'
    },
    {
      name: 'iPad Pro 12.9"',
      type: DeviceType.TABLET,
      width: 1024,
      height: 1366,
      pixelRatio: 2,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      icon: 'tablet',
      orientation: 'portrait'
    },
    {
      name: 'iPad Pro Landscape',
      type: DeviceType.TABLET,
      width: 1366,
      height: 1024,
      pixelRatio: 2,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      icon: 'tablet-landscape',
      orientation: 'landscape'
    },
    {
      name: 'Desktop 1920x1080',
      type: DeviceType.DESKTOP,
      width: 1920,
      height: 1080,
      pixelRatio: 1,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      icon: 'display',
      orientation: 'landscape'
    },
    {
      name: 'Desktop 1440x900',
      type: DeviceType.DESKTOP,
      width: 1440,
      height: 900,
      pixelRatio: 1,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      icon: 'display',
      orientation: 'landscape'
    }
  ];

  // Current state
  selectedDevice: DevicePreset = this.devicePresets[0];
  customBreakpoint: Partial<Breakpoint> = {};
  detectedIssues: ResponsiveIssue[] = [];
  isAnalyzing = false;
  showBreakpointEditor = false;
  showIssuesPanel = false;
  simulateTouchInteractions = false;

  // Touch simulation state
  public touchGestures: TouchGesture[] = [];
  private currentGesture?: TouchGesture;

  ngOnInit(): void {
    this.initializeDefaultBreakpoints();
    this.setupResizeObserver();
    this.startResponsiveAnalysis();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  /**
   * Initialize default breakpoints if none exist
   */
  private initializeDefaultBreakpoints(): void {
    if (this.responsiveSettings.breakpoints.length === 0) {
      this.responsiveSettings.breakpoints = [
        { name: 'mobile', minWidth: 0, maxWidth: 767 },
        { name: 'tablet', minWidth: 768, maxWidth: 1023 },
        { name: 'desktop', minWidth: 1024 }
      ];
    }
  }

  /**
   * Setup resize observer for responsive analysis
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.analyzeResponsiveIssues();
      });
    }
  }

  /**
   * Start continuous responsive analysis
   */
  private startResponsiveAnalysis(): void {
    // Debounce analysis to avoid excessive processing
    const analysisSubject = new Subject<void>();
    analysisSubject.pipe(
      debounceTime(500),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.performResponsiveAnalysis();
    });

    // Trigger analysis on content changes
    setInterval(() => {
      if (this.currentContent) {
        analysisSubject.next();
      }
    }, 2000);
  }

  /**
   * Switch to a different device preset
   */
  selectDevice(device: DevicePreset): void {
    this.selectedDevice = device;
    this.updateDeviceSimulation();
    this.devicePreviewChange.emit(device);
    this.analyzeResponsiveIssues();
  }

  /**
   * Update device simulation with current device settings
   */
  public updateDeviceSimulation(): void {
    if (this.deviceSimulator) {
      const simulator = this.deviceSimulator.nativeElement;
      
      // Apply device dimensions
      simulator.style.width = `${this.selectedDevice.width}px`;
      simulator.style.height = `${this.selectedDevice.height}px`;
      
      // Apply device-specific styles
      simulator.classList.remove('mobile-device', 'tablet-device', 'desktop-device');
      simulator.classList.add(`${this.selectedDevice.type}-device`);
      
      // Update pixel ratio simulation
      simulator.style.transform = `scale(${1 / this.selectedDevice.pixelRatio})`;
      simulator.style.transformOrigin = 'top left';
      
      // Enable touch simulation for mobile devices
      this.simulateTouchInteractions = this.selectedDevice.type === DeviceType.MOBILE;
      
      if (this.previewFrame) {
        this.updatePreviewFrame();
      }
    }
  }

  /**
   * Update preview frame with device-specific settings
   */
  private updatePreviewFrame(): void {
    const frame = this.previewFrame.nativeElement;
    
    // Set frame dimensions
    frame.width = this.selectedDevice.width.toString();
    frame.height = this.selectedDevice.height.toString();
    
    // Inject device-specific styles and user agent
    const frameDoc = frame.contentDocument || frame.contentWindow?.document;
    if (frameDoc) {
      // Add viewport meta tag
      let viewportMeta = frameDoc.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = frameDoc.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        frameDoc.head.appendChild(viewportMeta);
      }
      
      const viewportContent = this.selectedDevice.type === DeviceType.MOBILE
        ? 'width=device-width, initial-scale=1.0, user-scalable=no'
        : 'width=device-width, initial-scale=1.0';
      
      viewportMeta.setAttribute('content', viewportContent);
      
      // Add device-specific CSS
      this.injectDeviceSpecificStyles(frameDoc);
      
      // Setup touch simulation if enabled
      if (this.simulateTouchInteractions) {
        this.setupTouchSimulation(frameDoc);
      }
    }
  }

  /**
   * Inject device-specific styles into preview frame
   */
  private injectDeviceSpecificStyles(doc: Document): void {
    let styleElement = doc.getElementById('responsive-device-styles') as HTMLStyleElement;
    if (!styleElement) {
      styleElement = doc.createElement('style');
      styleElement.id = 'responsive-device-styles';
      doc.head.appendChild(styleElement);
    }

    const deviceStyles = this.generateDeviceSpecificCSS();
    styleElement.textContent = deviceStyles;
  }

  /**
   * Generate CSS for current device simulation
   */
  private generateDeviceSpecificCSS(): string {
    const device = this.selectedDevice;
    
    return `
      /* Device simulation styles */
      html, body {
        width: ${device.width}px !important;
        height: ${device.height}px !important;
        overflow-x: ${device.type === DeviceType.MOBILE ? 'hidden' : 'auto'};
        -webkit-text-size-adjust: 100%;
        -webkit-font-smoothing: antialiased;
      }
      
      /* Touch-friendly styles for mobile */
      ${device.type === DeviceType.MOBILE ? `
        * {
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
          -webkit-touch-callout: none;
        }
        
        button, a, input, select, textarea {
          min-height: 44px;
          min-width: 44px;
        }
        
        input, textarea, select {
          font-size: 16px; /* Prevent zoom on iOS */
        }
      ` : ''}
      
      /* Tablet-specific adjustments */
      ${device.type === DeviceType.TABLET ? `
        body {
          font-size: 18px;
        }
        
        button, a {
          min-height: 48px;
          min-width: 48px;
        }
      ` : ''}
      
      /* High DPI display adjustments */
      ${device.pixelRatio > 1 ? `
        img, svg {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
      ` : ''}
      
      /* Orientation-specific styles */
      ${device.orientation === 'landscape' ? `
        @media (orientation: landscape) {
          .landscape-hidden { display: none !important; }
          .landscape-visible { display: block !important; }
        }
      ` : `
        @media (orientation: portrait) {
          .portrait-hidden { display: none !important; }
          .portrait-visible { display: block !important; }
        }
      `}
    `;
  }

  /**
   * Setup touch simulation for mobile devices
   */
  private setupTouchSimulation(doc: Document): void {
    if (!this.simulateTouchInteractions) return;

    // Add touch event listeners to simulate mobile interactions
    doc.addEventListener('mousedown', (e) => this.simulateTouchStart(e));
    doc.addEventListener('mousemove', (e) => this.simulateTouchMove(e));
    doc.addEventListener('mouseup', (e) => this.simulateTouchEnd(e));
    
    // Add visual feedback for touch interactions
    this.addTouchFeedbackStyles(doc);
  }

  /**
   * Add visual feedback styles for touch simulation
   */
  private addTouchFeedbackStyles(doc: Document): void {
    let touchStyles = doc.getElementById('touch-simulation-styles') as HTMLStyleElement;
    if (!touchStyles) {
      touchStyles = doc.createElement('style');
      touchStyles.id = 'touch-simulation-styles';
      doc.head.appendChild(touchStyles);
    }

    touchStyles.textContent = `
      .touch-feedback {
        position: absolute;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(0, 123, 255, 0.3);
        border: 2px solid rgba(0, 123, 255, 0.6);
        pointer-events: none;
        transform: translate(-50%, -50%);
        animation: touchRipple 0.3s ease-out;
        z-index: 10000;
      }
      
      @keyframes touchRipple {
        0% {
          transform: translate(-50%, -50%) scale(0);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 0;
        }
      }
      
      .touch-active {
        background: rgba(0, 123, 255, 0.1) !important;
        transform: scale(0.95);
        transition: all 0.1s ease;
      }
    `;
  }

  /**
   * Simulate touch start event
   */
  private simulateTouchStart(e: MouseEvent): void {
    this.currentGesture = {
      type: 'tap',
      startX: e.clientX,
      startY: e.clientY,
      duration: Date.now()
    };

    // Add visual feedback
    this.addTouchFeedback(e.clientX, e.clientY);
    
    // Add active state to touched element
    const target = e.target as HTMLElement;
    if (target) {
      target.classList.add('touch-active');
    }
  }

  /**
   * Simulate touch move event
   */
  private simulateTouchMove(e: MouseEvent): void {
    if (!this.currentGesture) return;

    const deltaX = e.clientX - this.currentGesture.startX;
    const deltaY = e.clientY - this.currentGesture.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Determine gesture type based on movement
    if (distance > 10) {
      this.currentGesture.type = 'swipe';
      this.currentGesture.endX = e.clientX;
      this.currentGesture.endY = e.clientY;
    }
  }

  /**
   * Simulate touch end event
   */
  private simulateTouchEnd(e: MouseEvent): void {
    if (!this.currentGesture) return;

    this.currentGesture.duration = Date.now() - this.currentGesture.duration;
    this.touchGestures.push({ ...this.currentGesture });

    // Remove active state from touched element
    const target = e.target as HTMLElement;
    if (target) {
      target.classList.remove('touch-active');
    }

    this.currentGesture = undefined;
  }

  /**
   * Add visual touch feedback
   */
  private addTouchFeedback(x: number, y: number): void {
    if (!this.previewFrame) return;

    const frameDoc = this.previewFrame.nativeElement.contentDocument;
    if (!frameDoc) return;

    const feedback = frameDoc.createElement('div');
    feedback.className = 'touch-feedback';
    feedback.style.left = `${x}px`;
    feedback.style.top = `${y}px`;

    frameDoc.body.appendChild(feedback);

    // Remove feedback after animation
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 300);
  }

  /**
   * Add a new custom breakpoint
   */
  addBreakpoint(): void {
    if (this.customBreakpoint.name && this.customBreakpoint.minWidth !== undefined) {
      const newBreakpoint: Breakpoint = {
        name: this.customBreakpoint.name,
        minWidth: this.customBreakpoint.minWidth,
        maxWidth: this.customBreakpoint.maxWidth
      };

      this.responsiveSettings.breakpoints.push(newBreakpoint);
      this.sortBreakpoints();
      this.customBreakpoint = {};
      this.breakpointChange.emit(this.responsiveSettings.breakpoints);
      this.analyzeResponsiveIssues();
    }
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(index: number): void {
    this.responsiveSettings.breakpoints.splice(index, 1);
    this.breakpointChange.emit(this.responsiveSettings.breakpoints);
    this.analyzeResponsiveIssues();
  }

  /**
   * Sort breakpoints by min width
   */
  private sortBreakpoints(): void {
    this.responsiveSettings.breakpoints.sort((a, b) => a.minWidth - b.minWidth);
  }

  /**
   * Perform comprehensive responsive analysis
   */
  private performResponsiveAnalysis(): void {
    this.isAnalyzing = true;
    this.detectedIssues = [];

    // Analyze each breakpoint
    for (const breakpoint of this.responsiveSettings.breakpoints) {
      this.analyzeBreakpoint(breakpoint);
    }

    // Analyze current device
    this.analyzeCurrentDevice();

    // Analyze content for responsive issues
    this.analyzeContentResponsiveness();

    this.issuesDetected.emit(this.detectedIssues);
    this.isAnalyzing = false;
  }

  /**
   * Analyze specific breakpoint for issues
   */
  private analyzeBreakpoint(breakpoint: Breakpoint): void {
    // Check for overlapping breakpoints
    const overlapping = this.responsiveSettings.breakpoints.find(bp => 
      bp !== breakpoint && 
      bp.minWidth <= (breakpoint.maxWidth || Infinity) && 
      (bp.maxWidth || Infinity) >= breakpoint.minWidth
    );

    if (overlapping) {
      this.detectedIssues.push({
        type: 'warning',
        message: `Breakpoint "${breakpoint.name}" overlaps with "${overlapping.name}"`,
        breakpoint: breakpoint.name,
        severity: 'medium',
        suggestion: 'Adjust breakpoint ranges to avoid overlaps'
      });
    }

    // Check for gaps between breakpoints
    const nextBreakpoint = this.responsiveSettings.breakpoints.find(bp => 
      bp.minWidth > (breakpoint.maxWidth || 0)
    );

    if (nextBreakpoint && breakpoint.maxWidth && 
        nextBreakpoint.minWidth > breakpoint.maxWidth + 1) {
      this.detectedIssues.push({
        type: 'warning',
        message: `Gap detected between "${breakpoint.name}" and "${nextBreakpoint.name}"`,
        breakpoint: breakpoint.name,
        severity: 'low',
        suggestion: 'Consider adjusting breakpoint ranges to eliminate gaps'
      });
    }
  }

  /**
   * Analyze current device for responsive issues
   */
  private analyzeCurrentDevice(): void {
    const device = this.selectedDevice;

    // Check if current device width matches any breakpoint
    const matchingBreakpoint = this.responsiveSettings.breakpoints.find(bp =>
      device.width >= bp.minWidth && 
      (bp.maxWidth === undefined || device.width <= bp.maxWidth)
    );

    if (!matchingBreakpoint) {
      this.detectedIssues.push({
        type: 'warning',
        message: `Current device (${device.width}px) doesn't match any defined breakpoint`,
        severity: 'medium',
        suggestion: 'Add a breakpoint that covers this device width'
      });
    }

    // Check for mobile-specific issues
    if (device.type === DeviceType.MOBILE) {
      this.analyzeMobileIssues();
    }
  }

  /**
   * Analyze mobile-specific responsive issues
   */
  private analyzeMobileIssues(): void {
    // Check for touch target sizes
    if (this.previewFrame) {
      const frameDoc = this.previewFrame.nativeElement.contentDocument;
      if (frameDoc) {
        const interactiveElements = frameDoc.querySelectorAll('button, a, input, select, textarea');
        
        interactiveElements.forEach((element: Element) => {
          const rect = element.getBoundingClientRect();
          const minTouchSize = 44; // Apple's recommended minimum touch target size
          
          if (rect.width < minTouchSize || rect.height < minTouchSize) {
            this.detectedIssues.push({
              type: 'warning',
              message: `Touch target too small: ${element.tagName.toLowerCase()}`,
              element: element.tagName.toLowerCase(),
              severity: 'high',
              suggestion: `Increase size to at least ${minTouchSize}x${minTouchSize}px`
            });
          }
        });
      }
    }

    // Check for horizontal scrolling
    if (this.selectedDevice.width < 768) {
      this.detectedIssues.push({
        type: 'warning',
        message: 'Check for horizontal scrolling on mobile devices',
        severity: 'medium',
        suggestion: 'Ensure content fits within viewport width'
      });
    }
  }

  /**
   * Analyze content for general responsive issues
   */
  private analyzeContentResponsiveness(): void {
    // Check for fixed widths in content
    const fixedWidthPattern = /width:\s*\d+px/gi;
    const fixedWidthMatches = this.currentContent.match(fixedWidthPattern);
    
    if (fixedWidthMatches && fixedWidthMatches.length > 0) {
      this.detectedIssues.push({
        type: 'warning',
        message: `Found ${fixedWidthMatches.length} fixed width declarations`,
        severity: 'medium',
        suggestion: 'Consider using relative units (%, em, rem) or max-width instead'
      });
    }

    // Check for missing viewport meta tag
    if (!this.currentContent.includes('viewport')) {
      this.detectedIssues.push({
        type: 'error',
        message: 'Missing viewport meta tag',
        severity: 'high',
        suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">'
      });
    }

    // Check for media queries
    const mediaQueryPattern = /@media[^{]+\{[^}]*\}/gi;
    const mediaQueries = this.currentContent.match(mediaQueryPattern);
    
    if (!mediaQueries || mediaQueries.length === 0) {
      this.detectedIssues.push({
        type: 'warning',
        message: 'No media queries found in styles',
        severity: 'medium',
        suggestion: 'Add media queries to optimize for different screen sizes'
      });
    }
  }

  /**
   * Analyze responsive issues (public method for external calls)
   */
  analyzeResponsiveIssues(): void {
    this.performResponsiveAnalysis();
  }

  /**
   * Toggle breakpoint editor visibility
   */
  toggleBreakpointEditor(): void {
    this.showBreakpointEditor = !this.showBreakpointEditor;
  }

  /**
   * Toggle issues panel visibility
   */
  toggleIssuesPanel(): void {
    this.showIssuesPanel = !this.showIssuesPanel;
  }

  /**
   * Get CSS class for issue severity
   */
  getIssueSeverityClass(severity: string): string {
    return `issue-${severity}`;
  }

  /**
   * Get icon for device type
   */
  getDeviceIcon(device: DevicePreset): string {
    return `bi-${device.icon}`;
  }

  /**
   * Check if device is currently selected
   */
  isDeviceSelected(device: DevicePreset): boolean {
    return this.selectedDevice === device;
  }

  /**
   * Get breakpoint that matches current device width
   */
  getCurrentBreakpoint(): Breakpoint | undefined {
    return this.responsiveSettings.breakpoints.find(bp =>
      this.selectedDevice.width >= bp.minWidth && 
      (bp.maxWidth === undefined || this.selectedDevice.width <= bp.maxWidth)
    );
  }

  /**
   * Update responsive settings and emit changes
   */
  updateResponsiveSettings(): void {
    this.responsiveSettingsChange.emit(this.responsiveSettings);
    this.analyzeResponsiveIssues();
  }
}