import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.interface';

@Component({
  selector: 'app-project-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-manager.component.html',
  styleUrls: ['./project-manager.component.css']
})
export class ProjectManagerComponent implements OnInit, OnDestroy {
  @Output() projectSelected = new EventEmitter<Project>();
  @Output() closeManager = new EventEmitter<void>();

  // Component state
  projects: Project[] = [];
  filteredProjects: Project[] = [];
  isLoading = false;
  error: string | null = null;

  // Search and filter
  searchQuery = '';
  sortBy: 'name' | 'createdAt' | 'updatedAt' = 'updatedAt';
  sortOrder: 'asc' | 'desc' = 'desc';
  private searchSubject = new Subject<string>();

  // Modal states
  showCreateModal = false;
  showDeleteModal = false;
  showDuplicateModal = false;
  selectedProject: Project | null = null;

  // Create project form
  newProject = {
    name: '',
    description: ''
  };

  // Duplicate project form
  duplicateProjectName = '';

  private destroy$ = new Subject<void>();

  constructor(private projectService: ProjectService) {}

  ngOnInit(): void {
    this.loadProjects();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all projects from the service
   */
  async loadProjects(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      this.projects = await this.projectService.getProjects();
      this.applyFiltersAndSort();
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.error = 'Failed to load projects. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Setup search functionality with debouncing
   */
  private setupSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.searchQuery = query;
        this.applyFiltersAndSort();
      });
  }

  /**
   * Handle search input changes
   */
  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }

  /**
   * Apply search filters and sorting
   */
  private applyFiltersAndSort(): void {
    let filtered = [...this.projects];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updatedAt':
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
      }

      return this.sortOrder === 'desc' ? -comparison : comparison;
    });

    this.filteredProjects = filtered;
  }

  /**
   * Change sorting criteria
   */
  changeSorting(sortBy: 'name' | 'createdAt' | 'updatedAt'): void {
    if (this.sortBy === sortBy) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'desc';
    }
    this.applyFiltersAndSort();
  }

  /**
   * Open create project modal
   */
  openCreateModal(): void {
    this.newProject = { name: '', description: '' };
    this.showCreateModal = true;
  }

  /**
   * Close create project modal
   */
  closeCreateModal(): void {
    this.showCreateModal = false;
    this.newProject = { name: '', description: '' };
  }

  /**
   * Create a new project
   */
  async createProject(): Promise<void> {
    if (!this.newProject.name.trim()) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const project = await this.projectService.createProject({
        name: this.newProject.name.trim(),
        description: this.newProject.description.trim()
      });

      await this.loadProjects();
      this.closeCreateModal();
      
      // Emit the newly created project
      this.projectSelected.emit(project);
    } catch (error) {
      console.error('Failed to create project:', error);
      this.error = 'Failed to create project. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Select a project
   */
  selectProject(project: Project): void {
    this.projectSelected.emit(project);
  }

  /**
   * Open delete confirmation modal
   */
  openDeleteModal(project: Project, event: Event): void {
    event.stopPropagation();
    this.selectedProject = project;
    this.showDeleteModal = true;
  }

  /**
   * Close delete confirmation modal
   */
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedProject = null;
  }

  /**
   * Delete a project
   */
  async deleteProject(): Promise<void> {
    if (!this.selectedProject) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      await this.projectService.deleteProject(this.selectedProject.id);
      await this.loadProjects();
      this.closeDeleteModal();
    } catch (error) {
      console.error('Failed to delete project:', error);
      this.error = 'Failed to delete project. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Open duplicate project modal
   */
  openDuplicateModal(project: Project, event: Event): void {
    event.stopPropagation();
    this.selectedProject = project;
    this.duplicateProjectName = `${project.name} (Copy)`;
    this.showDuplicateModal = true;
  }

  /**
   * Close duplicate project modal
   */
  closeDuplicateModal(): void {
    this.showDuplicateModal = false;
    this.selectedProject = null;
    this.duplicateProjectName = '';
  }

  /**
   * Duplicate a project
   */
  async duplicateProject(): Promise<void> {
    if (!this.selectedProject || !this.duplicateProjectName.trim()) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const duplicatedProject = await this.projectService.duplicateProject(
        this.selectedProject.id,
        this.duplicateProjectName.trim()
      );

      await this.loadProjects();
      this.closeDuplicateModal();
      
      // Emit the duplicated project
      this.projectSelected.emit(duplicatedProject);
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      this.error = 'Failed to duplicate project. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Close the project manager
   */
  close(): void {
    this.closeManager.emit();
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  /**
   * Get project stats text
   */
  getProjectStats(project: Project): string {
    const sectionCount = project.sections.length;
    const sectionText = sectionCount === 1 ? 'section' : 'sections';
    return `${sectionCount} ${sectionText}`;
  }

  /**
   * Handle keyboard shortcuts
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.showCreateModal) {
        this.closeCreateModal();
      } else if (this.showDeleteModal) {
        this.closeDeleteModal();
      } else if (this.showDuplicateModal) {
        this.closeDuplicateModal();
      } else {
        this.close();
      }
    }
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.error = null;
  }

  /**
   * Track by function for project list
   */
  trackByProjectId(index: number, project: Project): string {
    return project.id;
  }
}