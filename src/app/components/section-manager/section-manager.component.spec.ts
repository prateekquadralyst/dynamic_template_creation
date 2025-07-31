import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SectionManagerComponent } from './section-manager.component';
import { TemplateService } from '../../services/template.service';
import { ProjectService } from '../../services/project.service';
import { DatabaseService } from '../../services/database.service';
import { Section, SectionType, SectionCategory } from '../../models/section.interface';

describe('SectionManagerComponent', () => {
  let component: SectionManagerComponent;
  let fixture: ComponentFixture<SectionManagerComponent>;
  let mockTemplateService: jasmine.SpyObj<TemplateService>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;
  let mockDatabaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(async () => {
    const templateServiceSpy = jasmine.createSpyObj('TemplateService', [
      'getAllTemplatesByType',
      'getTemplatesByType',
      'getStyleTemplates',
      'getSelectedTemplate',
      'getSelectedStyle',
      'getCurrentTemplate',
      'generateStyleCss',
      'getDefaultTemplate'
    ]);

    const projectServiceSpy = jasmine.createSpyObj('ProjectService', [
      'createProject',
      'getProject',
      'updateProject',
      'deleteProject',
      'enableAutoSave',
      'disableAutoSave'
    ]);

    const databaseServiceSpy = jasmine.createSpyObj('DatabaseService', [
      'getAllTemplates',
      'saveTemplate',
      'getTemplate',
      'deleteTemplate'
    ]);

    await TestBed.configureTestingModule({
      imports: [SectionManagerComponent, NoopAnimationsModule],
      providers: [
        { provide: TemplateService, useValue: templateServiceSpy },
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: DatabaseService, useValue: databaseServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionManagerComponent);
    component = fixture.componentInstance;
    mockTemplateService = TestBed.inject(TemplateService) as jasmine.SpyObj<TemplateService>;
    mockProjectService = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
    mockDatabaseService = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load section library on init', () => {
    component.ngOnInit();
    expect(component.sectionLibrary.length).toBeGreaterThan(0);
    expect(component.filteredLibrary.length).toBeGreaterThan(0);
  });

  it('should toggle library visibility', () => {
    expect(component.showLibrary).toBeFalse();
    component.toggleLibrary();
    expect(component.showLibrary).toBeTrue();
    component.toggleLibrary();
    expect(component.showLibrary).toBeFalse();
  });

  it('should add a new section', () => {
    const initialSectionCount = component.sections.length;
    const libraryItem = component.sectionLibrary[0];
    
    spyOn(component.sectionsChange, 'emit');
    
    component.addSection(libraryItem);
    
    expect(component.sections.length).toBe(initialSectionCount + 1);
    expect(component.sectionsChange.emit).toHaveBeenCalled();
    expect(component.showLibrary).toBeFalse();
  });

  it('should duplicate a section', () => {
    const mockSection: Section = {
      id: 'test-section',
      type: SectionType.HERO,
      templateId: 'hero-modern',
      content: { headerText: 'Test' },
      styles: { customCss: '' },
      order: 0,
      isVisible: true,
      responsiveSettings: {
        breakpoints: [],
        deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} }
      },
      metadata: {
        name: 'Test Section',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDuplicate: false,
        customizations: []
      }
    };

    component.sections = [mockSection];
    spyOn(component.sectionsChange, 'emit');
    
    component.duplicateSection(mockSection);
    
    expect(component.sections.length).toBe(2);
    expect(component.sections[1].metadata.isDuplicate).toBeTrue();
    expect(component.sections[1].metadata.name).toContain('(Copy)');
    expect(component.sectionsChange.emit).toHaveBeenCalled();
  });

  it('should delete a section with confirmation', () => {
    const mockSection: Section = {
      id: 'test-section',
      type: SectionType.HERO,
      templateId: 'hero-modern',
      content: { headerText: 'Test' },
      styles: { customCss: '' },
      order: 0,
      isVisible: true,
      responsiveSettings: {
        breakpoints: [],
        deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} }
      },
      metadata: {
        name: 'Test Section',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDuplicate: false,
        customizations: []
      }
    };

    component.sections = [mockSection];
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(component.sectionsChange, 'emit');
    
    component.deleteSection(mockSection);
    
    expect(component.sections.length).toBe(0);
    expect(component.sectionsChange.emit).toHaveBeenCalled();
  });

  it('should toggle section visibility', () => {
    const mockSection: Section = {
      id: 'test-section',
      type: SectionType.HERO,
      templateId: 'hero-modern',
      content: { headerText: 'Test' },
      styles: { customCss: '' },
      order: 0,
      isVisible: true,
      responsiveSettings: {
        breakpoints: [],
        deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} }
      },
      metadata: {
        name: 'Test Section',
        description: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDuplicate: false,
        customizations: []
      }
    };

    component.sections = [mockSection];
    spyOn(component.sectionsChange, 'emit');
    spyOn(component.sectionVisibilityChanged, 'emit');
    
    component.toggleSectionVisibility(mockSection);
    
    expect(component.sections[0].isVisible).toBeFalse();
    expect(component.sectionsChange.emit).toHaveBeenCalled();
    expect(component.sectionVisibilityChanged.emit).toHaveBeenCalled();
  });

  it('should filter sections by category', () => {
    component.ngOnInit();
    const initialCount = component.filteredLibrary.length;
    
    component.filterByCategory(SectionCategory.HERO);
    
    expect(component.selectedCategory).toBe(SectionCategory.HERO);
    expect(component.filteredLibrary.length).toBeLessThanOrEqual(initialCount);
    expect(component.filteredLibrary.every(item => item.category === SectionCategory.HERO)).toBeTrue();
  });

  it('should search sections', () => {
    component.ngOnInit();
    
    component.searchQuery = 'hero';
    component.onSearchChange();
    
    expect(component.filteredLibrary.every(item => 
      item.name.toLowerCase().includes('hero') ||
      item.description.toLowerCase().includes('hero') ||
      item.tags.some(tag => tag.toLowerCase().includes('hero'))
    )).toBeTrue();
  });

  it('should move section up', () => {
    const section1: Section = {
      id: 'section-1',
      type: SectionType.HERO,
      templateId: 'hero-modern',
      content: {},
      styles: { customCss: '' },
      order: 0,
      isVisible: true,
      responsiveSettings: {
        breakpoints: [],
        deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} }
      },
      metadata: {
        name: 'Section 1',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDuplicate: false,
        customizations: []
      }
    };

    const section2: Section = {
      ...section1,
      id: 'section-2',
      order: 1,
      metadata: { ...section1.metadata, name: 'Section 2' }
    };

    component.sections = [section1, section2];
    spyOn(component.sectionsChange, 'emit');
    
    component.moveSectionUp(section2);
    
    expect(component.sections[0].id).toBe('section-2');
    expect(component.sections[1].id).toBe('section-1');
    expect(component.sectionsChange.emit).toHaveBeenCalled();
  });

  it('should generate section type display names', () => {
    expect(component.getSectionTypeDisplayName(SectionType.HERO)).toBe('Hero');
    expect(component.getSectionTypeDisplayName(SectionType.TESTIMONIALS)).toBe('Testimonials');
    expect(component.getSectionTypeDisplayName(SectionType.PRICING)).toBe('Pricing');
  });

  it('should generate category display names', () => {
    expect(component.getCategoryDisplayName(SectionCategory.HERO)).toBe('Hero');
    expect(component.getCategoryDisplayName(SectionCategory.SOCIAL_PROOF)).toBe('Social Proof');
    expect(component.getCategoryDisplayName(SectionCategory.CONVERSION)).toBe('Conversion');
  });

  it('should check if section can move up or down', () => {
    const section1: Section = {
      id: 'section-1',
      type: SectionType.HERO,
      templateId: 'hero-modern',
      content: {},
      styles: { customCss: '' },
      order: 0,
      isVisible: true,
      responsiveSettings: {
        breakpoints: [],
        deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} }
      },
      metadata: {
        name: 'Section 1',
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        isDuplicate: false,
        customizations: []
      }
    };

    const section2: Section = {
      ...section1,
      id: 'section-2',
      order: 1,
      metadata: { ...section1.metadata, name: 'Section 2' }
    };

    component.sections = [section1, section2];
    
    expect(component.canMoveUp(section1)).toBeFalse();
    expect(component.canMoveUp(section2)).toBeTrue();
    expect(component.canMoveDown(section1)).toBeTrue();
    expect(component.canMoveDown(section2)).toBeFalse();
  });
});