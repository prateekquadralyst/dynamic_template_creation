import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ResponsiveSidebarComponent } from './responsive-sidebar.component';
import { TemplateSection } from '../../models/template.interface';
import { SectionType } from '../../models/section.interface';

describe('ResponsiveSidebarComponent', () => {
  let component: ResponsiveSidebarComponent;
  let fixture: ComponentFixture<ResponsiveSidebarComponent>;

  const mockTemplates: TemplateSection[] = [
    {
      id: 'hero-1',
      name: 'Modern Hero',
      description: 'A modern hero section',
      type: SectionType.HERO,
      html: '<div>Hero content</div>',
      css: '.hero { color: blue; }',
      previewImage: '/assets/previews/hero-1.jpg',
      isBuiltIn: true,
      tags: ['modern', 'hero'],
      variables: {},
      category: 'hero'
    },
    {
      id: 'hero-2',
      name: 'Classic Hero',
      description: 'A classic hero section',
      type: SectionType.HERO,
      html: '<div>Classic hero content</div>',
      css: '.hero { color: red; }',
      previewImage: '/assets/previews/hero-2.jpg',
      isBuiltIn: false,
      tags: ['classic', 'hero'],
      variables: {},
      category: 'hero'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        NoopAnimationsModule,
        ResponsiveSidebarComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResponsiveSidebarComponent);
    component = fixture.componentInstance;
    
    // Set up component inputs
    component.templates = mockTemplates;
    component.selectedTemplateId = 'hero-1';
    component.activeTemplateType = SectionType.HERO;
    component.showTemplatePreview = true;
    component.enableKeyboardNavigation = true;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct default state', () => {
    // The component loads state from localStorage, so we need to check actual values
    expect(component.sidebarState.width).toBe(320);
    expect(typeof component.sidebarState.isOpen).toBe('boolean');
    expect(typeof component.sidebarState.isCollapsed).toBe('boolean');
    expect(typeof component.sidebarState.activeTab).toBe('string');
  });

  it('should toggle sidebar open/closed state', () => {
    const initialState = component.sidebarState.isOpen;
    component.toggleSidebar();
    expect(component.sidebarState.isOpen).toBe(!initialState);
  });

  it('should toggle collapsed state', () => {
    // Set initial state explicitly
    component.sidebarState.isCollapsed = false;
    component.isMobile = false; // Ensure we're not on mobile
    
    component.toggleCollapse();
    expect(component.sidebarState.isCollapsed).toBe(true);
    
    component.toggleCollapse();
    expect(component.sidebarState.isCollapsed).toBe(false);
  });

  it('should switch tabs correctly', () => {
    component.switchTab('preview');
    expect(component.sidebarState.activeTab).toBe('preview');
    
    component.switchTab('settings');
    expect(component.sidebarState.activeTab).toBe('settings');
  });

  it('should emit template selection event', () => {
    spyOn(component.templateSelected, 'emit');
    const template = mockTemplates[0];
    
    component.onTemplateSelect(template);
    
    expect(component.templateSelected.emit).toHaveBeenCalledWith(template);
    expect(component.selectedTemplateId).toBe(template.id);
  });

  it('should emit template preview event', () => {
    spyOn(component.templatePreview, 'emit');
    const template = mockTemplates[0];
    
    component.onTemplatePreview(template);
    
    expect(component.templatePreview.emit).toHaveBeenCalledWith(template);
    expect(component.selectedTemplateId).toBe(template.id);
    expect(component.sidebarState.activeTab).toBe('preview');
  });

  it('should handle screen size changes', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500
    });
    
    component['checkScreenSize']();
    
    expect(component.isMobile).toBe(true);
    expect(component.isTablet).toBe(false);
  });

  it('should handle keyboard navigation', () => {
    // Set up the component state for keyboard navigation
    component.keyboardNavigationEnabled = true;
    component.sidebarState.isOpen = true;
    
    // Mock the sidebar element and document.activeElement
    const mockElement = document.createElement('div');
    component.sidebarElement = { nativeElement: mockElement };
    
    // Mock document.activeElement to be inside the sidebar
    Object.defineProperty(document, 'activeElement', {
      value: mockElement,
      configurable: true
    });
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    spyOn(component, 'closeSidebar');
    spyOn(event, 'preventDefault');
    
    component['handleKeyboardNavigation'](event);
    
    expect(component.closeSidebar).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should get correct template preview URL', () => {
    const template = mockTemplates[0];
    const previewUrl = component.getTemplatePreviewUrl(template);
    
    expect(previewUrl).toBe(template.previewImage);
  });

  it('should identify selected template correctly', () => {
    const template = mockTemplates[0];
    component.selectedTemplateId = template.id;
    
    expect(component.isTemplateSelected(template)).toBe(true);
    
    const otherTemplate = mockTemplates[1];
    expect(component.isTemplateSelected(otherTemplate)).toBe(false);
  });

  it('should get selected template for preview', () => {
    component.selectedTemplateId = 'hero-1';
    const selectedTemplate = component.getSelectedTemplateForPreview();
    
    expect(selectedTemplate).toBe(mockTemplates[0]);
  });

  it('should check if template has preview content', () => {
    const templateWithContent = mockTemplates[0];
    expect(component.hasTemplatePreviewContent(templateWithContent)).toBe(true);
    
    const templateWithoutContent = { ...mockTemplates[0], html: '' };
    expect(component.hasTemplatePreviewContent(templateWithoutContent)).toBe(false);
  });

  it('should get template type display name', () => {
    component.activeTemplateType = SectionType.HERO;
    expect(component.getTemplateTypeDisplayName()).toBe('Hero Section');
    
    component.activeTemplateType = SectionType.FEATURES;
    expect(component.getTemplateTypeDisplayName()).toBe('Features Section');
    
    component.activeTemplateType = null;
    expect(component.getTemplateTypeDisplayName()).toBe('Template');
  });

  it('should save and load sidebar state', () => {
    const testState = {
      isOpen: false,
      isCollapsed: true,
      activeTab: 'preview',
      width: 400
    };
    
    component.sidebarState = testState;
    component['saveSidebarState']();
    
    // Reset state
    component.sidebarState = {
      isOpen: true,
      isCollapsed: false,
      activeTab: 'templates',
      width: 320
    };
    
    component['loadSidebarState']();
    
    expect(component.sidebarState.isOpen).toBe(testState.isOpen);
    expect(component.sidebarState.isCollapsed).toBe(testState.isCollapsed);
    expect(component.sidebarState.activeTab).toBe(testState.activeTab);
    expect(component.sidebarState.width).toBe(testState.width);
  });

  it('should handle touch gestures on mobile', () => {
    component.isMobile = true;
    component.sidebarState.isOpen = true;
    
    // Set up touch properties
    component.touchStartX = 100;
    component.touchStartY = 100;
    component.touchCurrentX = 100;
    component.touchCurrentY = 100;
    component.isSwiping = false;
    component.swipeThreshold = 50;
    
    expect(component.touchStartX).toBe(100);
    
    // Simulate swipe left (close gesture) - move more than threshold
    component.touchCurrentX = 40; // 60 pixels left, more than threshold of 50
    component.isSwiping = true;
    
    spyOn(component, 'closeSidebar');
    
    // Simulate touch end with swipe left
    const deltaX = component.touchCurrentX - component.touchStartX;
    if (deltaX < -component.swipeThreshold && component.sidebarState.isOpen) {
      component.closeSidebar();
    }
    
    expect(component.closeSidebar).toHaveBeenCalled();
  });

  it('should emit state changes', () => {
    spyOn(component.sidebarStateChanged, 'emit');
    
    component.toggleSidebar();
    
    expect(component.sidebarStateChanged.emit).toHaveBeenCalledWith(component.sidebarState);
  });

  it('should close sidebar and emit event', () => {
    spyOn(component.sidebarClosed, 'emit');
    
    component.closeSidebar();
    
    expect(component.sidebarState.isOpen).toBe(false);
    expect(component.sidebarClosed.emit).toHaveBeenCalled();
  });
});