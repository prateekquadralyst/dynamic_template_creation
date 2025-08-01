import { 
  Component, 
  OnInit, 
  OnDestroy, 
  Input, 
  Output, 
  EventEmitter, 
  HostListener,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Subject, takeUntil, fromEvent } from 'rxjs';
import { TemplateSection } from '../../models/template.interface';
import { SectionType } from '../../models/section.interface';
import { TemplatePreviewComponent } from '../template-preview/template-preview.component';

export interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  activeTab: string;
  width: number;
}

export interface SidebarTab {
  id: string;
  label: string;
  icon: string;
  component?: string;
}

@Component({
  selector: 'app-responsive-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, TemplatePreviewComponent],
  templateUrl: './responsive-sidebar.component.html',
  styleUrls: ['./responsive-sidebar.component.css'],
  animations: [
    trigger('slideInOut', [
      state('true', style({ transform: 'translateX(0)' })),
      state('false', style({ transform: 'translateX(-100%)' })),
      transition('false => true', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')),
      transition('true => false', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),
    trigger('fadeInOut', [
      state('true', style({ opacity: 1 })),
      state('false', style({ opacity: 0 })),
      transition('false => true', animate('200ms ease-in')),
      transition('true => false', animate('200ms ease-out'))
    ])
  ]
})
export class ResponsiveSidebarComponent implements OnInit, OnDestroy {
  @ViewChild('sidebarElement', { static: true }) sidebarElement!: ElementRef;
  @ViewChild('resizeHandle', { static: false }) resizeHandle!: ElementRef;

  // Inputs
  @Input() templates: TemplateSection[] = [];
  @Input() selectedTemplateId: string | null = null;
  @Input() activeTemplateType: SectionType | null = null;
  @Input() initialWidth: number = 320;
  @Input() minWidth: number = 280;
  @Input() maxWidth: number = 500;
  @Input() showTemplatePreview: boolean = true;
  @Input() enableKeyboardNavigation: boolean = true;
  @Input() enableTemplatePreviewInSelection: boolean = true;

  // Outputs
  @Output() templateSelected = new EventEmitter<TemplateSection>();
  @Output() templatePreview = new EventEmitter<TemplateSection>();
  @Output() sidebarStateChanged = new EventEmitter<SidebarState>();
  @Output() sidebarClosed = new EventEmitter<void>();

  // Sidebar state
  sidebarState: SidebarState = {
    isOpen: true,
    isCollapsed: false,
    activeTab: 'templates',
    width: 320
  };

  // UI state
  isMobile: boolean = false;
  isTablet: boolean = false;
  isResizing: boolean = false;
  showMobileOverlay: boolean = false;
  
  // Touch gesture state
  touchStartX: number = 0;
  touchStartY: number = 0;
  touchCurrentX: number = 0;
  touchCurrentY: number = 0;
  isSwiping: boolean = false;
  swipeThreshold: number = 50;

  // Keyboard navigation
  focusedTemplateIndex: number = -1;
  keyboardNavigationEnabled: boolean = true;

  // Available tabs
  tabs: SidebarTab[] = [
    { id: 'templates', label: 'Templates', icon: 'bi-grid-3x3' },
    { id: 'preview', label: 'Preview', icon: 'bi-eye' },
    { id: 'settings', label: 'Settings', icon: 'bi-gear' }
  ];

  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeResponsiveState();
    this.setupResizeObserver();
    this.loadSidebarState();
    this.setupKeyboardNavigation();
    
    // Set initial width
    this.sidebarState.width = this.initialWidth;
    this.updateSidebarWidth();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.saveSidebarState();
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  /**
   * Initialize responsive state based on screen size
   */
  private initializeResponsiveState(): void {
    this.checkScreenSize();
    this.updateSidebarForScreenSize();
  }

  /**
   * Setup ResizeObserver to monitor screen size changes
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.checkScreenSize();
        this.updateSidebarForScreenSize();
      });
      
      this.resizeObserver.observe(document.body);
    }
  }

  /**
   * Check current screen size and update responsive flags
   */
  @HostListener('window:resize', ['$event'])
  private checkScreenSize(): void {
    const width = window.innerWidth;
    
    this.isMobile = width < 768;
    this.isTablet = width >= 768 && width < 1024;
    
    this.cdr.detectChanges();
  }

  /**
   * Update sidebar behavior based on screen size
   */
  private updateSidebarForScreenSize(): void {
    if (this.isMobile) {
      // On mobile, sidebar should be full-width overlay when open
      this.sidebarState.width = window.innerWidth;
      this.showMobileOverlay = this.sidebarState.isOpen;
      
      // Auto-collapse on mobile if open
      if (this.sidebarState.isOpen && !this.sidebarState.isCollapsed) {
        this.sidebarState.isCollapsed = false; // Keep expanded for mobile overlay
      }
    } else if (this.isTablet) {
      // On tablet, use smaller default width
      this.sidebarState.width = Math.min(this.sidebarState.width, 300);
      this.showMobileOverlay = false;
    } else {
      // On desktop, use normal width
      this.showMobileOverlay = false;
      if (this.sidebarState.width < this.minWidth) {
        this.sidebarState.width = this.minWidth;
      }
    }
    
    this.updateSidebarWidth();
    this.emitStateChange();
  }

  /**
   * Toggle sidebar open/closed state
   */
  toggleSidebar(): void {
    this.sidebarState.isOpen = !this.sidebarState.isOpen;
    
    if (this.isMobile) {
      this.showMobileOverlay = this.sidebarState.isOpen;
    }
    
    this.emitStateChange();
    this.saveSidebarState();
  }

  /**
   * Toggle sidebar collapsed state
   */
  toggleCollapse(): void {
    if (this.isMobile) {
      // On mobile, collapse means close
      this.closeSidebar();
      return;
    }
    
    this.sidebarState.isCollapsed = !this.sidebarState.isCollapsed;
    this.emitStateChange();
    this.saveSidebarState();
  }

  /**
   * Close sidebar
   */
  closeSidebar(): void {
    this.sidebarState.isOpen = false;
    this.showMobileOverlay = false;
    this.sidebarClosed.emit();
    this.emitStateChange();
    this.saveSidebarState();
  }

  /**
   * Switch active tab
   */
  switchTab(tabId: string): void {
    this.sidebarState.activeTab = tabId;
    this.emitStateChange();
    this.saveSidebarState();
  }

  /**
   * Handle template selection
   */
  onTemplateSelect(template: TemplateSection): void {
    this.selectedTemplateId = template.id;
    this.templateSelected.emit(template);
    
    // Auto-switch to preview tab when template is selected (if preview is enabled)
    if (this.enableTemplatePreviewInSelection && this.showTemplatePreview) {
      this.switchTab('preview');
    }
    
    // On mobile, close sidebar after selection
    if (this.isMobile) {
      this.closeSidebar();
    }
  }

  /**
   * Handle template preview
   */
  onTemplatePreview(template: TemplateSection, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    // Update selected template for preview
    this.selectedTemplateId = template.id;
    
    // Switch to preview tab to show the template
    this.switchTab('preview');
    
    // Emit preview event
    this.templatePreview.emit(template);
    
    // Add visual feedback
    if ('vibrate' in navigator && this.isMobile) {
      navigator.vibrate(20);
    }
  }

  /**
   * Start resize operation
   */
  startResize(event: MouseEvent): void {
    if (this.isMobile) return; // No resizing on mobile
    
    event.preventDefault();
    this.isResizing = true;
    
    const startX = event.clientX;
    const startWidth = this.sidebarState.width;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isResizing) return;
      
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(
        this.minWidth,
        Math.min(this.maxWidth, startWidth + deltaX)
      );
      
      this.sidebarState.width = newWidth;
      this.updateSidebarWidth();
    };
    
    const handleMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      this.saveSidebarState();
      this.emitStateChange();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  /**
   * Handle touch start for swipe gestures
   */
  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.isMobile) return;
    
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchCurrentX = touch.clientX;
    this.touchCurrentY = touch.clientY;
    this.isSwiping = false;
    
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  /**
   * Handle touch move for swipe gestures
   */
  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.isMobile) return;
    
    const touch = event.touches[0];
    this.touchCurrentX = touch.clientX;
    this.touchCurrentY = touch.clientY;
    
    const deltaX = this.touchCurrentX - this.touchStartX;
    const deltaY = Math.abs(this.touchCurrentY - this.touchStartY);
    
    // Determine if this is a horizontal swipe
    if (Math.abs(deltaX) > 10 && deltaY < 50) {
      this.isSwiping = true;
      event.preventDefault(); // Prevent scrolling
      
      // Visual feedback during swipe
      if (this.sidebarElement?.nativeElement) {
        const progress = Math.min(Math.abs(deltaX) / this.swipeThreshold, 1);
        const opacity = this.sidebarState.isOpen ? 1 - (progress * 0.3) : progress * 0.3;
        this.sidebarElement.nativeElement.style.opacity = opacity.toString();
      }
    }
  }

  /**
   * Handle touch end for swipe gestures
   */
  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.isMobile || !this.isSwiping) {
      // Reset opacity if we were swiping
      if (this.sidebarElement?.nativeElement) {
        this.sidebarElement.nativeElement.style.opacity = '1';
      }
      return;
    }
    
    const deltaX = this.touchCurrentX - this.touchStartX;
    
    // Reset visual feedback
    if (this.sidebarElement?.nativeElement) {
      this.sidebarElement.nativeElement.style.opacity = '1';
    }
    
    // Swipe left to close sidebar
    if (deltaX < -this.swipeThreshold && this.sidebarState.isOpen) {
      this.closeSidebar();
      // Haptic feedback for successful action
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
    // Swipe right to open sidebar
    else if (deltaX > this.swipeThreshold && !this.sidebarState.isOpen) {
      this.toggleSidebar();
      // Haptic feedback for successful action
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
    
    this.isSwiping = false;
  }

  /**
   * Handle overlay click on mobile
   */
  onOverlayClick(): void {
    if (this.isMobile && this.showMobileOverlay) {
      this.closeSidebar();
    }
  }

  /**
   * Setup keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    if (!this.enableKeyboardNavigation) return;
    
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => this.handleKeyboardNavigation(event));
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    if (!this.keyboardNavigationEnabled || !this.sidebarState.isOpen) return;
    
    // Only handle keyboard navigation when sidebar is focused
    const sidebarElement = this.sidebarElement?.nativeElement;
    if (!sidebarElement?.contains(document.activeElement)) return;
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeSidebar();
        break;
        
      case 'Tab':
        // Handle tab navigation between tabs
        if (event.shiftKey) {
          this.navigateTabs(-1);
        } else {
          this.navigateTabs(1);
        }
        event.preventDefault();
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.navigateTemplates(-1);
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        this.navigateTemplates(1);
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectFocusedTemplate();
        break;
        
      case 'p':
      case 'P':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.previewFocusedTemplate();
        }
        break;
    }
  }

  /**
   * Navigate between tabs using keyboard
   */
  private navigateTabs(direction: number): void {
    const currentIndex = this.tabs.findIndex(tab => tab.id === this.sidebarState.activeTab);
    const newIndex = (currentIndex + direction + this.tabs.length) % this.tabs.length;
    this.switchTab(this.tabs[newIndex].id);
  }

  /**
   * Navigate between templates using keyboard
   */
  private navigateTemplates(direction: number): void {
    if (this.templates.length === 0) return;
    
    this.focusedTemplateIndex = Math.max(
      0,
      Math.min(
        this.templates.length - 1,
        this.focusedTemplateIndex + direction
      )
    );
    
    // Scroll focused template into view
    this.scrollTemplateIntoView(this.focusedTemplateIndex);
  }

  /**
   * Select currently focused template
   */
  private selectFocusedTemplate(): void {
    if (this.focusedTemplateIndex >= 0 && this.focusedTemplateIndex < this.templates.length) {
      this.onTemplateSelect(this.templates[this.focusedTemplateIndex]);
    }
  }

  /**
   * Preview currently focused template
   */
  private previewFocusedTemplate(): void {
    if (this.focusedTemplateIndex >= 0 && this.focusedTemplateIndex < this.templates.length) {
      this.onTemplatePreview(this.templates[this.focusedTemplateIndex]);
    }
  }

  /**
   * Scroll template into view
   */
  private scrollTemplateIntoView(index: number): void {
    const templateElements = this.sidebarElement?.nativeElement?.querySelectorAll('.template-item');
    if (templateElements && templateElements[index]) {
      templateElements[index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }

  /**
   * Update sidebar width CSS custom property
   */
  private updateSidebarWidth(): void {
    if (this.sidebarElement?.nativeElement) {
      this.sidebarElement.nativeElement.style.setProperty(
        '--sidebar-width',
        `${this.sidebarState.width}px`
      );
    }
  }

  /**
   * Emit sidebar state change
   */
  private emitStateChange(): void {
    this.sidebarStateChanged.emit({ ...this.sidebarState });
  }

  /**
   * Save sidebar state to localStorage
   */
  private saveSidebarState(): void {
    try {
      const stateToSave = {
        isOpen: this.sidebarState.isOpen,
        isCollapsed: this.sidebarState.isCollapsed,
        activeTab: this.sidebarState.activeTab,
        width: this.sidebarState.width
      };
      localStorage.setItem('responsive-sidebar-state', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save sidebar state:', error);
    }
  }

  /**
   * Load sidebar state from localStorage
   */
  private loadSidebarState(): void {
    try {
      const savedState = localStorage.getItem('responsive-sidebar-state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this.sidebarState = {
          ...this.sidebarState,
          ...parsedState,
          width: Math.max(this.minWidth, Math.min(this.maxWidth, parsedState.width || this.initialWidth))
        };
      }
    } catch (error) {
      console.warn('Failed to load sidebar state:', error);
    }
  }

  /**
   * Get template preview image URL
   */
  getTemplatePreviewUrl(template: TemplateSection): string {
    return template.previewImage || '/assets/previews/placeholder.svg';
  }

  /**
   * Check if template is selected
   */
  isTemplateSelected(template: TemplateSection): boolean {
    return this.selectedTemplateId === template.id;
  }

  /**
   * Check if template is focused (for keyboard navigation)
   */
  isTemplateFocused(index: number): boolean {
    return this.focusedTemplateIndex === index;
  }

  /**
   * Get sidebar CSS classes
   */
  getSidebarClasses(): string[] {
    const classes = ['responsive-sidebar'];
    
    if (this.sidebarState.isOpen) classes.push('sidebar-open');
    if (this.sidebarState.isCollapsed) classes.push('sidebar-collapsed');
    if (this.isMobile) classes.push('sidebar-mobile');
    if (this.isTablet) classes.push('sidebar-tablet');
    if (this.isResizing) classes.push('sidebar-resizing');
    if (this.showMobileOverlay) classes.push('sidebar-overlay-active');
    
    return classes;
  }

  /**
   * Get template item CSS classes
   */
  getTemplateItemClasses(template: TemplateSection, index: number): string[] {
    const classes = ['template-item'];
    
    if (this.isTemplateSelected(template)) classes.push('template-selected');
    if (this.isTemplateFocused(index)) classes.push('template-focused');
    if (!template.isBuiltIn) classes.push('template-custom');
    
    return classes;
  }

  /**
   * Handle template search
   */
  onTemplateSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value.toLowerCase().trim();
    
    // This would typically filter the templates array
    // For now, we'll emit an event that the parent can handle
    console.log('Search term:', searchTerm);
  }

  /**
   * Handle image error
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = '/assets/previews/placeholder.svg';
  }

  /**
   * Handle preview toggle
   */
  onPreviewToggle(enabled: boolean): void {
    this.showTemplatePreview = enabled;
    this.saveSidebarState();
  }

  /**
   * Handle width change
   */
  onWidthChange(width: number): void {
    this.sidebarState.width = Math.max(this.minWidth, Math.min(this.maxWidth, width));
    this.updateSidebarWidth();
    this.emitStateChange();
    this.saveSidebarState();
  }

  /**
   * Get selected template for preview
   */
  getSelectedTemplateForPreview(): TemplateSection | null {
    if (!this.selectedTemplateId) return null;
    return this.templates.find(t => t.id === this.selectedTemplateId) || null;
  }

  /**
   * Get template preview HTML for display
   */
  getTemplatePreviewHtml(template: TemplateSection): string {
    // Return a safe preview of the template HTML
    return template.html || '<p>No preview available</p>';
  }

  /**
   * Get template preview CSS for display
   */
  getTemplatePreviewCss(template: TemplateSection): string {
    // Return the template CSS
    return template.css || '';
  }

  /**
   * Check if template has preview content
   */
  hasTemplatePreviewContent(template: TemplateSection): boolean {
    return !!(template.html && template.html.trim());
  }

  /**
   * Get template type display name
   */
  getTemplateTypeDisplayName(): string {
    switch (this.activeTemplateType) {
      case SectionType.HERO:
        return 'Hero Section';
      case SectionType.FEATURES:
        return 'Features Section';
      case SectionType.TESTIMONIALS:
        return 'Testimonials Section';
      case SectionType.PRICING:
        return 'Pricing Section';
      case SectionType.CONTACT:
        return 'Contact Section';
      default:
        return 'Template';
    }
  }

  /**
   * TrackBy function for template list performance
   */
  trackByTemplateId(index: number, template: TemplateSection): string {
    return template.id;
  }
}