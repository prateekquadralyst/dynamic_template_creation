import { TestBed } from '@angular/core/testing';
import { ProjectService } from './project.service';
import { DatabaseService } from './database.service';
import { Project } from '../models/project.interface';
import { SectionType } from '../models/section.interface';
import { ExportFormat } from '../models/export.interface';
import { ValidationResult } from './interfaces/project-service.interface';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockDatabaseService: jasmine.SpyObj<DatabaseService>;

  const mockProject: Project = {
    id: 'test-project-1',
    name: 'Test Project',
    description: 'A test project',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    sections: [
      {
        id: 'section-1',
        type: SectionType.HERO,
        templateId: 'hero-template-1',
        content: { title: 'Test Hero' },
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
          h1: '2.5rem',
          h2: '2rem',
          h3: '1.75rem',
          h4: '1.5rem',
          h5: '1.25rem',
          h6: '1rem',
          body: '1rem',
          small: '0.875rem'
        },
        lineHeights: {
          heading: 1.2,
          body: 1.6
        }
      },
      colors: {
        primary: '#4361ee',
        secondary: '#3a0ca3',
        accent: '#4cc9f0',
        text: '#333333',
        background: '#ffffff',
        surface: '#f8f9fa'
      },
      spacing: {
        baseUnit: 8,
        sectionPadding: '4rem 0',
        elementMargin: '1rem'
      },
      effects: {
        shadows: true,
        animations: true,
        transitions: true
      }
    },
    settings: {
      responsive: {
        breakpoints: [
          { name: 'mobile', minWidth: 0, maxWidth: 767 },
          { name: 'tablet', minWidth: 768, maxWidth: 1023 },
          { name: 'desktop', minWidth: 1024 }
        ],
        deviceSpecificStyles: {
          mobile: {},
          tablet: {},
          desktop: {}
        }
      },
      seo: {
        title: 'Test Project',
        description: 'A test project',
        keywords: ['test']
      },
      performance: {
        lazyLoading: true,
        imageOptimization: true,
        codeMinification: true
      },
      integrations: []
    },
    collaborators: [],
    version: 1
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('DatabaseService', [
      'getAllProjects',
      'getProject',
      'saveProject',
      'deleteProject'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: DatabaseService, useValue: spy }
      ]
    });

    service = TestBed.inject(ProjectService);
    mockDatabaseService = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createProject', () => {
    it('should create a new project with default values', async () => {
      mockDatabaseService.saveProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([mockProject]));

      const projectData = {
        name: 'New Project',
        description: 'A new project'
      };

      const result = await service.createProject(projectData);

      expect(result.name).toBe('New Project');
      expect(result.description).toBe('A new project');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.version).toBe(1);
      expect(result.sections).toEqual([]);
      expect(result.globalStyles).toBeDefined();
      expect(result.settings).toBeDefined();
      expect(mockDatabaseService.saveProject).toHaveBeenCalled();
    });

    it('should create a project with default name when name is not provided', async () => {
      mockDatabaseService.saveProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([mockProject]));

      const result = await service.createProject({});

      expect(result.name).toBe('Untitled Project');
      expect(result.description).toBe('');
    });

    it('should throw error when database save fails', async () => {
      mockDatabaseService.saveProject.and.returnValue(Promise.reject(new Error('Database error')));

      await expectAsync(service.createProject({ name: 'Test' }))
        .toBeRejectedWithError('Failed to create project');
    });
  });

  describe('getProjects', () => {
    it('should return all projects from database', async () => {
      const projects = [mockProject];
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve(projects));

      const result = await service.getProjects();

      expect(result).toEqual(projects);
      expect(mockDatabaseService.getAllProjects).toHaveBeenCalled();
    });
  });

  describe('getProject', () => {
    it('should return a specific project by ID', async () => {
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(mockProject));

      const result = await service.getProject('test-project-1');

      expect(result).toEqual(mockProject);
      expect(mockDatabaseService.getProject).toHaveBeenCalledWith('test-project-1');
    });

    it('should throw error when project is not found', async () => {
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(null));

      await expectAsync(service.getProject('non-existent'))
        .toBeRejectedWithError('Project with ID non-existent not found');
    });
  });

  describe('updateProject', () => {
    it('should update a project and increment version', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Project', version: 2 };
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.saveProject.and.returnValue(Promise.resolve(updatedProject));
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([updatedProject]));

      const updates = { name: 'Updated Project' };
      const result = await service.updateProject('test-project-1', updates);

      expect(result.name).toBe('Updated Project');
      expect(result.version).toBe(2);
      expect(result.updatedAt).toBeDefined();
      expect(result.id).toBe('test-project-1'); // ID should not change
      expect(mockDatabaseService.saveProject).toHaveBeenCalled();
    });

    it('should throw error when project to update is not found', async () => {
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(null));

      await expectAsync(service.updateProject('non-existent', { name: 'Updated' }))
        .toBeRejectedWithError('Project with ID non-existent not found');
    });

    it('should throw error when database save fails', async () => {
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.saveProject.and.returnValue(Promise.reject(new Error('Database error')));

      await expectAsync(service.updateProject('test-project-1', { name: 'Updated' }))
        .toBeRejectedWithError('Failed to update project');
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      mockDatabaseService.deleteProject.and.returnValue(Promise.resolve());
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([]));

      await service.deleteProject('test-project-1');

      expect(mockDatabaseService.deleteProject).toHaveBeenCalledWith('test-project-1');
    });

    it('should throw error when database delete fails', async () => {
      mockDatabaseService.deleteProject.and.returnValue(Promise.reject(new Error('Database error')));

      await expectAsync(service.deleteProject('test-project-1'))
        .toBeRejectedWithError('Failed to delete project');
    });
  });

  describe('duplicateProject', () => {
    it('should duplicate a project with new name', async () => {
      const duplicatedProject = { ...mockProject, id: 'duplicated-project', name: 'Duplicated Project' };
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.saveProject.and.returnValue(Promise.resolve(duplicatedProject));
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([mockProject, duplicatedProject]));

      const result = await service.duplicateProject('test-project-1', 'Duplicated Project');

      expect(result.name).toBe('Duplicated Project');
      expect(result.description).toBe('Copy of A test project');
      expect(result.id).not.toBe(mockProject.id);
      expect(result.collaborators).toEqual([]); // Collaborators should not be copied
    });

    it('should duplicate a project with default copy name', async () => {
      const duplicatedProject = { ...mockProject, id: 'duplicated-project', name: 'Test Project (Copy)' };
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.saveProject.and.returnValue(Promise.resolve(duplicatedProject));
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([mockProject, duplicatedProject]));

      const result = await service.duplicateProject('test-project-1');

      expect(result.name).toBe('Test Project (Copy)');
    });
  });

  describe('searchProjects', () => {
    it('should search projects by name', async () => {
      const projects = [
        mockProject,
        { ...mockProject, id: 'project-2', name: 'Another Project', description: 'Different description' }
      ];
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve(projects));

      const result = await service.searchProjects('Test');

      expect(result).toEqual([mockProject]);
    });

    it('should search projects by description', async () => {
      const projects = [
        mockProject,
        { ...mockProject, id: 'project-2', name: 'Another Project', description: 'Different description' }
      ];
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve(projects));

      const result = await service.searchProjects('test project');

      expect(result).toEqual([mockProject]);
    });

    it('should return empty array when no matches found', async () => {
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([mockProject]));

      const result = await service.searchProjects('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getRecentProjects', () => {
    it('should return projects sorted by updatedAt in descending order', async () => {
      const project1 = { ...mockProject, id: 'project-1', updatedAt: new Date('2024-01-01') };
      const project2 = { ...mockProject, id: 'project-2', updatedAt: new Date('2024-01-02') };
      const project3 = { ...mockProject, id: 'project-3', updatedAt: new Date('2024-01-03') };
      const projects = [project1, project2, project3];
      
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve(projects));

      const result = await service.getRecentProjects(2);

      expect(result).toEqual([project3, project2]);
      expect(result.length).toBe(2);
    });

    it('should return all projects when limit is greater than total projects', async () => {
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([mockProject]));

      const result = await service.getRecentProjects(10);

      expect(result).toEqual([mockProject]);
    });
  });

  describe('validateProject', () => {
    it('should return valid result for a valid project', () => {
      const result: ValidationResult = service.validateProject(mockProject);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings.length).toBe(0);
    });

    it('should return error when project name is missing', () => {
      const invalidProject = { ...mockProject, name: '' };
      const result: ValidationResult = service.validateProject(invalidProject);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(jasmine.objectContaining({
        field: 'name',
        message: 'Project name is required',
        code: 'REQUIRED_FIELD'
      }));
    });

    it('should return error when project name is too long', () => {
      const invalidProject = { ...mockProject, name: 'a'.repeat(101) };
      const result: ValidationResult = service.validateProject(invalidProject);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(jasmine.objectContaining({
        field: 'name',
        message: 'Project name must be 100 characters or less',
        code: 'MAX_LENGTH_EXCEEDED'
      }));
    });

    it('should return error when description is too long', () => {
      const invalidProject = { ...mockProject, description: 'a'.repeat(501) };
      const result: ValidationResult = service.validateProject(invalidProject);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(jasmine.objectContaining({
        field: 'description',
        message: 'Project description must be 500 characters or less',
        code: 'MAX_LENGTH_EXCEEDED'
      }));
    });

    it('should return error when project ID is missing', () => {
      const invalidProject = { ...mockProject, id: '' };
      const result: ValidationResult = service.validateProject(invalidProject);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(jasmine.objectContaining({
        field: 'id',
        message: 'Project ID is required',
        code: 'REQUIRED_FIELD'
      }));
    });

    it('should return error when version is less than 1', () => {
      const invalidProject = { ...mockProject, version: 0 };
      const result: ValidationResult = service.validateProject(invalidProject);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(jasmine.objectContaining({
        field: 'version',
        message: 'Project version must be at least 1',
        code: 'INVALID_VALUE'
      }));
    });

    it('should return warning when project has no sections', () => {
      const projectWithoutSections = { ...mockProject, sections: [] };
      const result: ValidationResult = service.validateProject(projectWithoutSections);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(jasmine.objectContaining({
        field: 'sections',
        message: 'Project has no sections',
        suggestion: 'Add at least one section to make the project useful'
      }));
    });

    it('should return warning when project has no description', () => {
      const projectWithoutDescription = { ...mockProject, description: '' };
      const result: ValidationResult = service.validateProject(projectWithoutDescription);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(jasmine.objectContaining({
        field: 'description',
        message: 'Project has no description',
        suggestion: 'Add a description to help identify the project purpose'
      }));
    });
  });

  describe('exportProject', () => {
    it('should export a project with specified format', async () => {
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(mockProject));

      const result = await service.exportProject('test-project-1', ExportFormat.HTML_CSS);

      expect(result.format).toBe(ExportFormat.HTML_CSS);
      expect(result.metadata.projectId).toBe('test-project-1');
      expect(result.metadata.projectName).toBe('Test Project');
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should throw error when project to export is not found', async () => {
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(null));

      await expectAsync(service.exportProject('non-existent', ExportFormat.HTML_CSS))
        .toBeRejectedWithError('Project with ID non-existent not found');
    });
  });

  describe('auto-save functionality', () => {
    it('should enable auto-save with default interval', () => {
      spyOn(window, 'setInterval').and.returnValue(123 as any);
      
      service.enableAutoSave('test-project-1');

      expect(window.setInterval).toHaveBeenCalledWith(jasmine.any(Function), 30000);
    });

    it('should enable auto-save with custom interval', () => {
      spyOn(window, 'setInterval').and.returnValue(123 as any);
      
      service.enableAutoSave('test-project-1', 60000);

      expect(window.setInterval).toHaveBeenCalledWith(jasmine.any(Function), 60000);
    });

    it('should disable auto-save', () => {
      spyOn(window, 'clearInterval');
      spyOn(window, 'setInterval').and.returnValue(123 as any);
      
      service.enableAutoSave('test-project-1');
      service.disableAutoSave('test-project-1');

      expect(window.clearInterval).toHaveBeenCalledWith(123);
    });
  });

  describe('observable streams', () => {
    it('should provide project updates observable', () => {
      const observable = service.getProjectUpdates('test-project-1');
      
      expect(observable).toBeDefined();
    });

    it('should provide all projects updates observable', () => {
      const observable = service.getAllProjectsUpdates();
      
      expect(observable).toBeDefined();
    });
  });

  describe('archive and restore functionality', () => {
    it('should archive a project', async () => {
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.saveProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([mockProject]));

      await service.archiveProject('test-project-1');

      expect(mockDatabaseService.saveProject).toHaveBeenCalled();
    });

    it('should restore a project', async () => {
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.saveProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([mockProject]));

      await service.restoreProject('test-project-1');

      expect(mockDatabaseService.saveProject).toHaveBeenCalled();
    });
  });

  describe('saveProjectChanges', () => {
    it('should save project changes', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Project', version: 2 };
      mockDatabaseService.getProject.and.returnValue(Promise.resolve(mockProject));
      mockDatabaseService.saveProject.and.returnValue(Promise.resolve(updatedProject));
      mockDatabaseService.getAllProjects.and.returnValue(Promise.resolve([updatedProject]));

      const changes = { name: 'Updated Project' };
      await service.saveProjectChanges('test-project-1', changes);

      expect(mockDatabaseService.saveProject).toHaveBeenCalled();
    });
  });
});