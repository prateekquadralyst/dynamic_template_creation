import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { IProjectService, ValidationResult, ValidationError, ValidationWarning } from './interfaces/project-service.interface';
import { Project } from '../models/project.interface';
import { ExportFormat, ExportResult } from '../models/export.interface';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectService implements IProjectService {
  private projectsSubject = new BehaviorSubject<Project[]>([]);
  private projectUpdateSubjects = new Map<string, BehaviorSubject<Project>>();
  private autoSaveIntervals = new Map<string, number>();

  constructor(private databaseService: DatabaseService) {
    this.loadProjects();
  }

  /**
   * Load all projects from database
   */
  private async loadProjects(): Promise<void> {
    try {
      const projects = await this.databaseService.getAllProjects();
      this.projectsSubject.next(projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.projectsSubject.next([]);
    }
  }

  /**
   * Generate a unique ID for new projects
   */
  private generateId(): string {
    return 'project_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Create a new project
   */
  async createProject(projectData: Partial<Project>): Promise<Project> {
    const now = new Date();
    const project: Project = {
      id: this.generateId(),
      name: projectData.name || 'Untitled Project',
      description: projectData.description || '',
      createdAt: now,
      updatedAt: now,
      sections: projectData.sections || [],
      globalStyles: projectData.globalStyles || this.getDefaultGlobalStyles(),
      settings: projectData.settings || this.getDefaultProjectSettings(),
      collaborators: projectData.collaborators || [],
      version: 1
    };

    try {
      await this.databaseService.saveProject(project);
      await this.loadProjects(); // Refresh the projects list
      
      // Create subject for this project
      this.projectUpdateSubjects.set(project.id, new BehaviorSubject(project));
      
      return project;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw new Error('Failed to create project');
    }
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<Project[]> {
    return this.databaseService.getAllProjects();
  }

  /**
   * Get a specific project by ID
   */
  async getProject(id: string): Promise<Project> {
    const project = await this.databaseService.getProject(id);
    if (!project) {
      throw new Error(`Project with ID ${id} not found`);
    }
    return project;
  }

  /**
   * Update a project
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const existingProject = await this.getProject(id);
    
    const updatedProject: Project = {
      ...existingProject,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
      version: existingProject.version + 1
    };

    try {
      await this.databaseService.saveProject(updatedProject);
      await this.loadProjects(); // Refresh the projects list
      
      // Update the project subject
      const projectSubject = this.projectUpdateSubjects.get(id);
      if (projectSubject) {
        projectSubject.next(updatedProject);
      }
      
      return updatedProject;
    } catch (error) {
      console.error('Failed to update project:', error);
      throw new Error('Failed to update project');
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    try {
      await this.databaseService.deleteProject(id);
      await this.loadProjects(); // Refresh the projects list
      
      // Clean up subjects and auto-save
      this.projectUpdateSubjects.delete(id);
      this.disableAutoSave(id);
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw new Error('Failed to delete project');
    }
  }

  /**
   * Duplicate a project
   */
  async duplicateProject(id: string, newName?: string): Promise<Project> {
    const originalProject = await this.getProject(id);
    
    const duplicatedProject: Partial<Project> = {
      ...originalProject,
      name: newName || `${originalProject.name} (Copy)`,
      description: `Copy of ${originalProject.description}`,
      collaborators: [] // Don't copy collaborators
    };
    
    // Remove the ID so a new one is generated
    delete duplicatedProject.id;
    delete duplicatedProject.createdAt;
    delete duplicatedProject.updatedAt;
    
    return this.createProject(duplicatedProject);
  }

  /**
   * Search projects by name or description
   */
  async searchProjects(query: string): Promise<Project[]> {
    const allProjects = await this.getProjects();
    const lowercaseQuery = query.toLowerCase();
    
    return allProjects.filter(project => 
      project.name.toLowerCase().includes(lowercaseQuery) ||
      project.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(limit: number = 10): Promise<Project[]> {
    const allProjects = await this.getProjects();
    return allProjects
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Archive a project (soft delete)
   */
  async archiveProject(id: string): Promise<void> {
    // For now, we'll implement this as adding an archived flag
    // In a full implementation, this might move to a separate store
    const project = await this.getProject(id);
    await this.updateProject(id, { 
      ...project,
      settings: {
        ...project.settings,
        // Add archived flag to settings
        archived: true
      } as any
    });
  }

  /**
   * Restore an archived project
   */
  async restoreProject(id: string): Promise<void> {
    const project = await this.getProject(id);
    await this.updateProject(id, { 
      ...project,
      settings: {
        ...project.settings,
        // Remove archived flag from settings
        archived: false
      } as any
    });
  }

  /**
   * Enable auto-save for a project
   */
  enableAutoSave(projectId: string, intervalMs: number = 30000): void {
    // Clear existing interval if any
    this.disableAutoSave(projectId);
    
    const intervalId = window.setInterval(async () => {
      try {
        // In a real implementation, you'd track pending changes
        // For now, we'll just update the updatedAt timestamp
        const project = await this.getProject(projectId);
        await this.updateProject(projectId, { updatedAt: new Date() });
      } catch (error) {
        console.error('Auto-save failed for project:', projectId, error);
      }
    }, intervalMs);
    
    this.autoSaveIntervals.set(projectId, intervalId);
  }

  /**
   * Disable auto-save for a project
   */
  disableAutoSave(projectId: string): void {
    const intervalId = this.autoSaveIntervals.get(projectId);
    if (intervalId) {
      window.clearInterval(intervalId);
      this.autoSaveIntervals.delete(projectId);
    }
  }

  /**
   * Save project changes (used by auto-save)
   */
  async saveProjectChanges(projectId: string, changes: Partial<Project>): Promise<void> {
    await this.updateProject(projectId, changes);
  }

  /**
   * Export a project (placeholder implementation)
   */
  async exportProject(id: string, format: ExportFormat): Promise<ExportResult> {
    const project = await this.getProject(id);
    
    // This is a placeholder implementation
    // In a real implementation, this would generate actual export files
    const exportResult: ExportResult = {
      id: 'export_' + Date.now(),
      format,
      files: [],
      assets: [],
      metadata: {
        projectId: id,
        projectName: project.name,
        exportedBy: 'current_user', // Would come from auth service
        exportedAt: new Date(),
        version: '1.0.0',
        options: {} as any,
        stats: {
          totalFiles: 0,
          totalAssets: 0,
          totalSize: 0,
          buildTime: 0
        }
      },
      createdAt: new Date()
    };
    
    return exportResult;
  }

  /**
   * Get export history for a project (placeholder)
   */
  async getExportHistory(projectId: string): Promise<ExportResult[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Validate a project
   */
  validateProject(project: Project): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation
    if (!project.name || project.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Project name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (project.name && project.name.length > 100) {
      errors.push({
        field: 'name',
        message: 'Project name must be 100 characters or less',
        code: 'MAX_LENGTH_EXCEEDED'
      });
    }

    if (project.description && project.description.length > 500) {
      errors.push({
        field: 'description',
        message: 'Project description must be 500 characters or less',
        code: 'MAX_LENGTH_EXCEEDED'
      });
    }

    if (!project.id || project.id.trim().length === 0) {
      errors.push({
        field: 'id',
        message: 'Project ID is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!project.createdAt) {
      errors.push({
        field: 'createdAt',
        message: 'Project creation date is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!project.updatedAt) {
      errors.push({
        field: 'updatedAt',
        message: 'Project update date is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (project.version < 1) {
      errors.push({
        field: 'version',
        message: 'Project version must be at least 1',
        code: 'INVALID_VALUE'
      });
    }

    // Warnings
    if (project.sections.length === 0) {
      warnings.push({
        field: 'sections',
        message: 'Project has no sections',
        suggestion: 'Add at least one section to make the project useful'
      });
    }

    if (!project.description || project.description.trim().length === 0) {
      warnings.push({
        field: 'description',
        message: 'Project has no description',
        suggestion: 'Add a description to help identify the project purpose'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get observable stream of project updates
   */
  getProjectUpdates(projectId: string): Observable<Project> {
    if (!this.projectUpdateSubjects.has(projectId)) {
      this.projectUpdateSubjects.set(projectId, new BehaviorSubject<Project>({} as Project));
    }
    return this.projectUpdateSubjects.get(projectId)!.asObservable();
  }

  /**
   * Get observable stream of all projects updates
   */
  getAllProjectsUpdates(): Observable<Project[]> {
    return this.projectsSubject.asObservable();
  }

  /**
   * Get default global styles
   */
  private getDefaultGlobalStyles(): any {
    return {
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
    };
  }

  /**
   * Get default project settings
   */
  private getDefaultProjectSettings(): any {
    return {
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
        title: '',
        description: '',
        keywords: []
      },
      performance: {
        lazyLoading: true,
        imageOptimization: true,
        codeMinification: true
      },
      integrations: []
    };
  }
}