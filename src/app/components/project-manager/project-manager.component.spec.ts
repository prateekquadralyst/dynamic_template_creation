import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProjectManagerComponent } from './project-manager.component';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.interface';
import { SectionType } from '../../models/section.interface';

describe('ProjectManagerComponent', () => {
  let component: ProjectManagerComponent;
  let fixture: ComponentFixture<ProjectManagerComponent>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;

  const mockProjects: Project[] = [
    {
      id: 'project-1',
      name: 'Test Project 1',
      description: 'First test project',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      sections: [
        {
          id: 'section-1',
          type: SectionType.HERO,
          templateId: 'hero-1',
          content: {},
          styles: {},
          order: 0,
          isVisible: true,
          responsiveSettings: {
            breakpoints: [],
            deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} }
          },
          metadata: {
            name: 'Section 1',
            createdAt: new Date(),
            updatedAt: new Date(),
            customizations: []
          }
        }
      ],
      globalStyles: {
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Inter',
          fontSizes: {
            h1: '2.5rem', h2: '2rem', h3: '1.75rem', h4: '1.5rem',
            h5: '1.25rem', h6: '1rem', body: '1rem', small: '0.875rem'
          },
          lineHeights: { heading: 1.2, body: 1.6 }
        },
        colors: {
          primary: '#4361ee', secondary: '#3a0ca3', accent: '#4cc9f0',
          text: '#333333', background: '#ffffff', surface: '#f8f9fa'
        },
        spacing: { baseUnit: 8, sectionPadding: '4rem 0', elementMargin: '1rem' },
        effects: { shadows: true, animations: true, transitions: true }
      },
      settings: {
        responsive: {
          breakpoints: [
            { name: 'mobile', minWidth: 0, maxWidth: 767 },
            { name: 'tablet', minWidth: 768, maxWidth: 1023 },
            { name: 'desktop', minWidth: 1024 }
          ],
          deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} }
        },
        seo: { title: '', description: '', keywords: [] },
        performance: { lazyLoading: true, imageOptimization: true, codeMinification: true },
        integrations: []
      },
      collaborators: [],
      version: 1
    },
    {
      id: 'project-2',
      name: 'Another Project',
      description: 'Second test project',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-04'),
      sections: [],
      globalStyles: {
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Inter',
          fontSizes: {
            h1: '2.5rem', h2: '2rem', h3: '1.75rem', h4: '1.5rem',
            h5: '1.25rem', h6: '1rem', body: '1rem', small: '0.875rem'
          },
          lineHeights: { heading: 1.2, body: 1.6 }
        },
        colors: {
          primary: '#4361ee', secondary: '#3a0ca3', accent: '#4cc9f0',
          text: '#333333', background: '#ffffff', surface: '#f8f9fa'
        },
        spacing: { baseUnit: 8, sectionPadding: '4rem 0', elementMargin: '1rem' },
        effects: { shadows: true, animations: true, transitions: true }
      },
      settings: {
        responsive: {
          breakpoints: [
            { name: 'mobile', minWidth: 0, maxWidth: 767 },
            { name: 'tablet', minWidth: 768, maxWidth: 1023 },
            { name: 'desktop', minWidth: 1024 }
          ],
          deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} }
        },
        seo: { title: '', description: '', keywords: [] },
        performance: { lazyLoading: true, imageOptimization: true, codeMinification: true },
        integrations: []
      },
      collaborators: [],
      version: 2
    }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ProjectService', [
      'getProjects',
      'createProject',
      'deleteProject',
      'duplicateProject'
    ]);

    await TestBed.configureTestingModule({
      imports: [ProjectManagerComponent, CommonModule, FormsModule],
      providers: [
        { provide: ProjectService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectManagerComponent);
    component = fixture.componentInstance;
    mockProjectService = TestBed.inject(ProjectService) as jasmine.SpyObj<ProjectService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load projects on initialization', async () => {
      mockProjectService.getProjects.and.returnValue(Promise.resolve(mockProjects));

      component.ngOnInit();
      await fixture.whenStable();

      expect(mockProjectService.getProjects).toHaveBeenCalled();
      expect(component.projects).toEqual(mockProjects);
      // Projects should be sorted by updatedAt desc by default
      expect(component.filteredProjects[0].name).toBe('Another Project'); // More recent
      expect(component.filteredProjects[1].name).toBe('Test Project 1');
    });

    it('should handle error when loading projects fails', async () => {
      mockProjectService.getProjects.and.returnValue(Promise.reject(new Error('Load failed')));

      component.ngOnInit();
      await fixture.whenStable();

      expect(component.error).toBe('Failed to load projects. Please try again.');
      expect(component.isLoading).toBe(false);
    });
  });

  describe('search functionality', () => {
    beforeEach(async () => {
      mockProjectService.getProjects.and.returnValue(Promise.resolve(mockProjects));
      component.ngOnInit();
      await fixture.whenStable();
    });

    it('should filter projects by name', fakeAsync(() => {
      component.onSearchChange('Test Project 1');
      tick(300); // Wait for debounce

      expect(component.filteredProjects.length).toBe(1);
      expect(component.filteredProjects[0].name).toBe('Test Project 1');
    }));

    it('should filter projects by description', fakeAsync(() => {
      component.onSearchChange('Second test');
      tick(300); // Wait for debounce

      expect(component.filteredProjects.length).toBe(1);
      expect(component.filteredProjects[0].name).toBe('Another Project');
    }));

    it('should return all projects when search is cleared', fakeAsync(() => {
      component.onSearchChange('Test Project 1');
      tick(300);
      expect(component.filteredProjects.length).toBe(1);

      component.onSearchChange('');
      tick(300);
      expect(component.filteredProjects.length).toBe(2);
    }));

    it('should be case insensitive', fakeAsync(() => {
      component.onSearchChange('ANOTHER');
      tick(300);

      expect(component.filteredProjects.length).toBe(1);
      expect(component.filteredProjects[0].name).toBe('Another Project');
    }));
  });

  describe('sorting functionality', () => {
    beforeEach(async () => {
      mockProjectService.getProjects.and.returnValue(Promise.resolve(mockProjects));
      component.ngOnInit();
      await fixture.whenStable();
    });

    it('should sort by name ascending', () => {
      component.changeSorting('name');
      component.changeSorting('name'); // Second click to change to ascending

      expect(component.sortBy).toBe('name');
      expect(component.sortOrder).toBe('asc');
      expect(component.filteredProjects[0].name).toBe('Another Project');
      expect(component.filteredProjects[1].name).toBe('Test Project 1');
    });

    it('should sort by name descending', () => {
      component.changeSorting('name');

      expect(component.sortBy).toBe('name');
      expect(component.sortOrder).toBe('desc');
      expect(component.filteredProjects[0].name).toBe('Test Project 1');
      expect(component.filteredProjects[1].name).toBe('Another Project');
    });

    it('should sort by updated date', () => {
      // Since updatedAt is already the default sort, clicking it should toggle to ascending
      component.changeSorting('updatedAt');

      expect(component.sortBy).toBe('updatedAt');
      expect(component.sortOrder).toBe('asc');
      expect(component.filteredProjects[0].name).toBe('Test Project 1'); // Older date first
    });
  });

  describe('project creation', () => {
    beforeEach(async () => {
      mockProjectService.getProjects.and.returnValue(Promise.resolve(mockProjects));
      component.ngOnInit();
      await fixture.whenStable();
    });

    it('should open create modal', () => {
      component.openCreateModal();

      expect(component.showCreateModal).toBe(true);
      expect(component.newProject.name).toBe('');
      expect(component.newProject.description).toBe('');
    });

    it('should close create modal', () => {
      component.openCreateModal();
      component.newProject.name = 'Test';
      component.closeCreateModal();

      expect(component.showCreateModal).toBe(false);
      expect(component.newProject.name).toBe('');
    });

    it('should create a new project', async () => {
      const newProject = { ...mockProjects[0], id: 'new-project', name: 'New Project' };
      mockProjectService.createProject.and.returnValue(Promise.resolve(newProject));
      mockProjectService.getProjects.and.returnValue(Promise.resolve([...mockProjects, newProject]));

      spyOn(component.projectSelected, 'emit');

      component.newProject.name = 'New Project';
      component.newProject.description = 'New description';

      await component.createProject();

      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        name: 'New Project',
        description: 'New description'
      });
      expect(component.showCreateModal).toBe(false);
      expect(component.projectSelected.emit).toHaveBeenCalledWith(newProject);
    });

    it('should not create project with empty name', async () => {
      component.newProject.name = '   ';
      await component.createProject();

      expect(mockProjectService.createProject).not.toHaveBeenCalled();
    });

    it('should handle create project error', async () => {
      mockProjectService.createProject.and.returnValue(Promise.reject(new Error('Create failed')));

      component.newProject.name = 'Test Project';
      await component.createProject();

      expect(component.error).toBe('Failed to create project. Please try again.');
      expect(component.isLoading).toBe(false);
    });
  });

  describe('project selection', () => {
    it('should emit project when selected', () => {
      spyOn(component.projectSelected, 'emit');

      component.selectProject(mockProjects[0]);

      expect(component.projectSelected.emit).toHaveBeenCalledWith(mockProjects[0]);
    });
  });

  describe('project deletion', () => {
    beforeEach(async () => {
      mockProjectService.getProjects.and.returnValue(Promise.resolve(mockProjects));
      component.ngOnInit();
      await fixture.whenStable();
    });

    it('should open delete modal', () => {
      const event = new Event('click');
      spyOn(event, 'stopPropagation');

      component.openDeleteModal(mockProjects[0], event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showDeleteModal).toBe(true);
      expect(component.selectedProject).toBe(mockProjects[0]);
    });

    it('should close delete modal', () => {
      component.selectedProject = mockProjects[0];
      component.showDeleteModal = true;

      component.closeDeleteModal();

      expect(component.showDeleteModal).toBe(false);
      expect(component.selectedProject).toBeNull();
    });

    it('should delete a project', async () => {
      mockProjectService.deleteProject.and.returnValue(Promise.resolve());
      mockProjectService.getProjects.and.returnValue(Promise.resolve([mockProjects[1]]));

      component.selectedProject = mockProjects[0];
      component.showDeleteModal = true;

      await component.deleteProject();

      expect(mockProjectService.deleteProject).toHaveBeenCalledWith('project-1');
      expect(component.showDeleteModal).toBe(false);
      expect(component.selectedProject).toBeNull();
    });

    it('should handle delete project error', async () => {
      mockProjectService.deleteProject.and.returnValue(Promise.reject(new Error('Delete failed')));

      component.selectedProject = mockProjects[0];
      await component.deleteProject();

      expect(component.error).toBe('Failed to delete project. Please try again.');
      expect(component.isLoading).toBe(false);
    });

    it('should not delete when no project selected', async () => {
      component.selectedProject = null;
      await component.deleteProject();

      expect(mockProjectService.deleteProject).not.toHaveBeenCalled();
    });
  });

  describe('project duplication', () => {
    beforeEach(async () => {
      mockProjectService.getProjects.and.returnValue(Promise.resolve(mockProjects));
      component.ngOnInit();
      await fixture.whenStable();
    });

    it('should open duplicate modal', () => {
      const event = new Event('click');
      spyOn(event, 'stopPropagation');

      component.openDuplicateModal(mockProjects[0], event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showDuplicateModal).toBe(true);
      expect(component.selectedProject).toBe(mockProjects[0]);
      expect(component.duplicateProjectName).toBe('Test Project 1 (Copy)');
    });

    it('should close duplicate modal', () => {
      component.selectedProject = mockProjects[0];
      component.showDuplicateModal = true;
      component.duplicateProjectName = 'Test';

      component.closeDuplicateModal();

      expect(component.showDuplicateModal).toBe(false);
      expect(component.selectedProject).toBeNull();
      expect(component.duplicateProjectName).toBe('');
    });

    it('should duplicate a project', async () => {
      const duplicatedProject = { ...mockProjects[0], id: 'duplicated-project', name: 'Duplicated Project' };
      mockProjectService.duplicateProject.and.returnValue(Promise.resolve(duplicatedProject));
      mockProjectService.getProjects.and.returnValue(Promise.resolve([...mockProjects, duplicatedProject]));

      spyOn(component.projectSelected, 'emit');

      component.selectedProject = mockProjects[0];
      component.duplicateProjectName = 'Duplicated Project';

      await component.duplicateProject();

      expect(mockProjectService.duplicateProject).toHaveBeenCalledWith('project-1', 'Duplicated Project');
      expect(component.showDuplicateModal).toBe(false);
      expect(component.projectSelected.emit).toHaveBeenCalledWith(duplicatedProject);
    });

    it('should not duplicate with empty name', async () => {
      component.selectedProject = mockProjects[0];
      component.duplicateProjectName = '   ';

      await component.duplicateProject();

      expect(mockProjectService.duplicateProject).not.toHaveBeenCalled();
    });

    it('should handle duplicate project error', async () => {
      mockProjectService.duplicateProject.and.returnValue(Promise.reject(new Error('Duplicate failed')));

      component.selectedProject = mockProjects[0];
      component.duplicateProjectName = 'Test';

      await component.duplicateProject();

      expect(component.error).toBe('Failed to duplicate project. Please try again.');
      expect(component.isLoading).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      const formatted = component.formatDate(date);

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should get project stats correctly', () => {
      expect(component.getProjectStats(mockProjects[0])).toBe('1 section');
      expect(component.getProjectStats(mockProjects[1])).toBe('0 sections');
    });

    it('should track projects by ID', () => {
      const result = component.trackByProjectId(0, mockProjects[0]);
      expect(result).toBe('project-1');
    });
  });

  describe('keyboard shortcuts', () => {
    it('should close create modal on Escape', () => {
      component.showCreateModal = true;
      const event = new KeyboardEvent('keydown', { key: 'Escape' });

      component.onKeyDown(event);

      expect(component.showCreateModal).toBe(false);
    });

    it('should close delete modal on Escape', () => {
      component.showDeleteModal = true;
      const event = new KeyboardEvent('keydown', { key: 'Escape' });

      component.onKeyDown(event);

      expect(component.showDeleteModal).toBe(false);
    });

    it('should close duplicate modal on Escape', () => {
      component.showDuplicateModal = true;
      const event = new KeyboardEvent('keydown', { key: 'Escape' });

      component.onKeyDown(event);

      expect(component.showDuplicateModal).toBe(false);
    });

    it('should close manager on Escape when no modals open', () => {
      spyOn(component.closeManager, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Escape' });

      component.onKeyDown(event);

      expect(component.closeManager.emit).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should clear error message', () => {
      component.error = 'Test error';

      component.clearError();

      expect(component.error).toBeNull();
    });
  });

  describe('close functionality', () => {
    it('should emit close event', () => {
      spyOn(component.closeManager, 'emit');

      component.close();

      expect(component.closeManager.emit).toHaveBeenCalled();
    });
  });
});