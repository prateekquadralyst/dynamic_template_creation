import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Project } from '../models/project.interface';
import { ExportFormat, ExportResult } from '../models/export.interface';
import { IProjectService, ValidationResult } from './interfaces/project-service.interface';
import { FirebaseService } from './firebase.service';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseProjectService implements IProjectService {
  private projectsSubject = new BehaviorSubject<Project[]>([]);
  private projectUpdateSubjects = new Map<string, BehaviorSubject<Project>>();
  private autoSaveIntervals = new Map<string, number>();
  private pendingChanges = new Map<string, Partial<Project>>();
  private syncInProgress = new BehaviorSubject<boolean>(false);

  constructor(
    private firebaseService: FirebaseService,
    private databaseService: DatabaseService
  ) {
    this.initializeService();
  }

  /**
   * Initialize the service with offline/online sync
   */
  private initializeService(): void {
    // Listen to online status changes
    this.firebaseService.getOnlineStatus().subscribe(isOnline => {
      if (isOnline) {
        this.syncWithFirebase();
      }
    });

    // Load initial data
    this.loadProjects();
  }

  /**
   * Load projects from Firebase (online) or local storage (offline)
   */
  private async loadProjects(): Promise<void> {
    try {
      // Try to load from Firebase first
      this.firebaseService.listenToUserProjects().subscribe({
        next: (projects) => {
          this.projectsSubject.next(projects);
          // Cache projects locally
          this.cacheProjectsLocally(projects);
        },
        error: (error) => {
          console.warn('Failed to load from Firebase, loading from local cache:', error);
          this.loadFromLocalCache();
        }
      });
    } catch (error) {
      console.warn('Firebase unavailable, loading from local cache:', error);
      this.loadFromLocalCache();
    }
  }

  /**
   * Load projects from local cache
   */
  private async loadFromLocalCache(): Promise<void> {
    try {
      const projects = await this.databaseService.getAllProjects();
      this.projectsSubject.next(projects);
    } catch (error) {
      console.error('Failed to load from local cache:', error);
      this.projectsSubject.next([]);
    }
  }

  /**
   * Cache projects locally for offline access
   */
  private async cacheProjectsLocally(projects: Project[]): Promise<void> {
    try {
      for (const project of projects) {
        await this.databaseService.saveProject(project);
      }
    } catch (error) {
      console.error('Failed to cache projects locally:', error);
    }
  }

  /**
   * Sync pending changes with Firebase when online
   */
  private async syncWithFirebase(): Promise<void> {
    if (this.syncInProgress.value) {
      return;
    }

    this.syncInProgress.next(true);

    try {
      // Sync pending changes
      for (const [projectId, changes] of this.pendingChanges.entries()) {
        try {
          await this.firebaseService.updateProject(projectId, changes).toPromise();
          this.pendingChanges.delete(projectId);
        } catch (error) {
          console.error(`Failed to sync changes for project ${projectId}:`, error);
        }
      }

      // Sync offline changes
      await this.firebaseService.syncOfflineChanges().toPromise();
    } catch (error) {
      console.error('Failed to sync with Firebase:', error);
    } finally {
      this.syncInProgress.next(false);
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
    const project: Omit<Project, 'id'> = {
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
      // Try to create in Firebase first
      const createdProject = await this.firebaseService.createProject(project).toPromise();
      
      if (createdProject) {
        // Cache locally
        await this.databaseService.saveProject(createdProject);
        
        // Create subject for this project
        this.projectUpdateSubjects.set(createdProject.id, new BehaviorSubject(createdProject));
        
        return createdProject;
      }
      
      throw new Error('Failed to create project in Firebase');
    } catch (error) {
      console.warn('Failed to create in Firebase, creating locally:', error);
      
      // Fallback to local creation
      const localProject: Project = {
        ...project,
        id: this.generateId()
      };
      
      await this.databaseService.saveProject(localProject);
      
      // Mark for sync when online
      this.pendingChanges.set(localProject.id, localProject);
      
      // Create subject for this project
      this.projectUpdateSubjects.set(localProject.id, new BehaviorSubject(localProject));
      
      // Refresh projects list
      await this.loadFromLocalCache();
      
      return localProject;
    }
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<Project[]> {
    try {
      // Try Firebase first
      return await this.firebaseService.getUserProjects().toPromise() || [];
    } catch (error) {
      console.warn('Failed to get projects from Firebase, using local cache:', error);
      return await this.databaseService.getAllProjects();
    }
  }

  /**
   * Get a specific project by ID
   */
  async getProject(id: string): Promise<Project> {
    try {
      // Try Firebase first
      const project = await this.firebaseService.getProject(id).toPromise();
      return project!;
    } catch (error) {
      console.warn('Failed to get project from Firebase, using local cache:', error);
      const project = await this.databaseService.getProject(id);
      if (!project) {
        throw new Error(`Project with ID ${id} not found`);
      }
      return project;
    }
  }

  /**
   * Update a project
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
      version: (updates.version || 1) + 1
    };

    try {
      // Try Firebase first
      const updatedProject = await this.firebaseService.updateProject(id, updateData).toPromise();
      
      if (updatedProject) {
        // Cache locally
        await this.databaseService.saveProject(updatedProject);
        
        // Update the project subject
        const projectSubject = this.projectUpdateSubjects.get(id);
        if (projectSubject) {
          projectSubject.next(updatedProject);
        }
        
        return updatedProject;
      }
      
      throw new Error('Failed to update project in Firebase');
    } catch (error) {
      console.warn('Failed to update in Firebase, updating locally:', error);
      
      // Fallback to local update
      const existingProject = await this.databaseService.getProject(id);
      if (!existingProject) {
        throw new Error(`Project with ID ${id} not found`);
      }
      
      const updatedProject: Project = {
        ...existingProject,
        ...updateData,
        id // Ensure ID doesn't change
      };
      
      await this.databaseService.saveProject(updatedProject);
      
      // Mark for sync when online
      this.pendingChanges.set(id, updateData);
      
      // Update the project subject
      const projectSubject = this.projectUpdateSubjects.get(id);
      if (projectSubject) {
        projectSubject.next(updatedProject);
      }
      
      // Refresh projects list
      await this.loadFromLocalCache();
      
      return updatedProject;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    try {
      // Try Firebase first
      await this.firebaseService.deleteProject(id).toPromise();
      
      // Delete locally
      await this.databaseService.deleteProject(id);
    } catch (error) {
      console.warn('Failed to delete from Firebase, deleting locally:', error);
      
      // Delete locally
      await this.databaseService.deleteProject(id);
      
      // Mark for sync when online (deletion)
      this.pendingChanges.set(id, { id } as any);
    }
    
    // Clean up subjects and auto-save
    this.projectUpdateSubjects.delete(id);
    this.disableAutoSave(id);
    this.pendingChanges.delete(id);
    
    // Refresh projects list
    await this.loadFromLocalCache();
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
    try {
      // Try Firebase first
      return await this.firebaseService.searchProjects(query).toPromise() || [];
    } catch (error) {
      console.warn('Failed to search in Firebase, searching locally:', error);
      const allProjects = await this.databaseService.getAllProjects();
      const lowercaseQuery = query.toLowerCase();
      
      return allProjects.filter(project => 
        project.name.toLowerCase().includes(lowercaseQuery) ||
        project.description.toLowerCase().includes(lowercaseQuery)
      );
    }
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
   * Share a project with another user
   */
  async shareProject(projectId: string, userEmail: string, permission: 'read' | 'write' = 'read'): Promise<void> {
    try {
      await this.firebaseService.shareProject(projectId, userEmail, permission).toPromise();
    } catch (error) {
      console.error('Failed to share project:', error);
      throw new Error('Failed to share project. Please check your internet connection.');
    }
  }

  /**
   * Remove project sharing
   */
  async unshareProject(projectId: string, userEmail: string): Promise<void> {
    try {
      await this.firebaseService.unshareProject(projectId, userEmail).toPromise();
    } catch (error) {
      console.error('Failed to unshare project:', error);
      throw new Error('Failed to unshare project. Please check your internet connection.');
    }
  }

  /**
   * Get shared projects
   */
  async getSharedProjects(): Promise<Project[]> {
    try {
      return await this.firebaseService.getSharedProjects().toPromise() || [];
    } catch (error) {
      console.warn('Failed to get shared projects from Firebase:', error);
      return [];
    }
  }

  /**
   * Archive a project (soft delete)
   */
  async archiveProject(id: string): Promise<void> {
    const project = await this.getProject(id);
    await this.updateProject(id, { 
      ...project,
      settings: {
        ...project.settings,
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
        archived: false
      } as any
    });
  }

  /**
   * Enable auto-save for a project with debouncing
   */
  enableAutoSave(projectId: string, intervalMs: number = 30000): void {
    // Clear existing interval if any
    this.disableAutoSave(projectId);
    
    // Create a debounced save function
    const debouncedSave = debounceTime(5000); // 5 second debounce
    
    const intervalId = window.setInterval(async () => {
      try {
        const pendingChanges = this.pendingChanges.get(projectId);
        if (pendingChanges) {
          await this.updateProject(projectId, pendingChanges);
          this.pendingChanges.delete(projectId);
        }
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
    // Add to pending changes for batching
    const existingChanges = this.pendingChanges.get(projectId) || {};
    this.pendingChanges.set(projectId, { ...existingChanges, ...changes });
    
    // If online, try to save immediately
    const isOnline = await this.firebaseService.getOnlineStatus().pipe(map(status => status)).toPromise();
    if (isOnline) {
      await this.updateProject(projectId, changes);
    }
  }

  /**
   * Export a project (placeholder implementation)
   */
  async exportProject(id: string, format: ExportFormat): Promise<ExportResult> {
    const project = await this.getProject(id);
    
    // This is a placeholder implementation
    const exportResult: ExportResult = {
      id: 'export_' + Date.now(),
      format,
      files: [],
      assets: [],
      metadata: {
        projectId: id,
        projectName: project.name,
        exportedBy: 'current_user',
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
    return [];
  }

  /**
   * Validate a project
   */
  validateProject(project: Project): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

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

    // Warnings
    if (project.sections.length === 0) {
      warnings.push({
        field: 'sections',
        message: 'Project has no sections',
        suggestion: 'Add at least one section to make the project useful'
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
    // Try to get real-time updates from Firebase
    try {
      return this.firebaseService.listenToProject(projectId).pipe(
        tap(project => {
          // Cache locally
          this.databaseService.saveProject(project);
          
          // Update local subject
          if (!this.projectUpdateSubjects.has(projectId)) {
            this.projectUpdateSubjects.set(projectId, new BehaviorSubject<Project>(project));
          }
          this.projectUpdateSubjects.get(projectId)!.next(project);
        }),
        catchError(error => {
          console.warn('Failed to get real-time updates from Firebase, using local subject:', error);
          
          // Fallback to local subject
          if (!this.projectUpdateSubjects.has(projectId)) {
            this.projectUpdateSubjects.set(projectId, new BehaviorSubject<Project>({} as Project));
          }
          return this.projectUpdateSubjects.get(projectId)!.asObservable();
        })
      );
    } catch (error) {
      // Fallback to local subject
      if (!this.projectUpdateSubjects.has(projectId)) {
        this.projectUpdateSubjects.set(projectId, new BehaviorSubject<Project>({} as Project));
      }
      return this.projectUpdateSubjects.get(projectId)!.asObservable();
    }
  }

  /**
   * Get observable stream of all projects updates
   */
  getAllProjectsUpdates(): Observable<Project[]> {
    return this.projectsSubject.asObservable();
  }

  /**
   * Get sync status
   */
  getSyncStatus(): Observable<boolean> {
    return this.syncInProgress.asObservable();
  }

  /**
   * Get online status
   */
  getOnlineStatus(): Observable<boolean> {
    return this.firebaseService.getOnlineStatus();
  }

  /**
   * Force sync with Firebase
   */
  async forcSync(): Promise<void> {
    await this.syncWithFirebase();
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