import { Observable } from 'rxjs';
import { Project } from '../../models/project.interface';
import { ExportFormat, ExportResult } from '../../models/export.interface';

// Project service interface for dependency injection and testing
export interface IProjectService {
  // CRUD operations
  createProject(project: Partial<Project>): Promise<Project>;
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  duplicateProject(id: string, newName?: string): Promise<Project>;

  // Project management
  searchProjects(query: string): Promise<Project[]>;
  getRecentProjects(limit?: number): Promise<Project[]>;
  archiveProject(id: string): Promise<void>;
  restoreProject(id: string): Promise<void>;
  
  // Auto-save functionality
  enableAutoSave(projectId: string, intervalMs?: number): void;
  disableAutoSave(projectId: string): void;
  saveProjectChanges(projectId: string, changes: Partial<Project>): Promise<void>;
  
  // Export functionality
  exportProject(id: string, format: ExportFormat): Promise<ExportResult>;
  getExportHistory(projectId: string): Promise<ExportResult[]>;
  
  // Validation
  validateProject(project: Project): ValidationResult;
  
  // Observable streams for reactive updates
  getProjectUpdates(projectId: string): Observable<Project>;
  getAllProjectsUpdates(): Observable<Project[]>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}