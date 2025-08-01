import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, fromEvent, merge } from 'rxjs';
import { map, startWith, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { FirebaseService } from './firebase.service';
import { Project } from '../models/project.interface';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  syncErrors: string[];
}

export interface PendingChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  projectId: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private syncStatus$ = new BehaviorSubject<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingChanges: 0,
    syncErrors: []
  });

  private pendingChanges: Map<string, PendingChange> = new Map();
  private syncInProgress = false;
  private maxRetries = 3;
  private syncInterval: number | null = null;

  constructor(
    private databaseService: DatabaseService,
    private firebaseService: FirebaseService
  ) {
    this.initializeOfflineSync();
  }

  /**
   * Initialize offline sync functionality
   */
  private initializeOfflineSync(): void {
    // Listen to online/offline events
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));
    
    merge(online$, offline$)
      .pipe(
        startWith(navigator.onLine),
        distinctUntilChanged()
      )
      .subscribe(isOnline => {
        this.updateSyncStatus({ isOnline });
        
        if (isOnline) {
          this.syncPendingChanges();
        }
      });

    // Load pending changes from storage
    this.loadPendingChanges();

    // Set up periodic sync when online
    this.setupPeriodicSync();
  }

  /**
   * Setup periodic sync every 30 seconds when online
   */
  private setupPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(() => {
      if (this.syncStatus$.value.isOnline && !this.syncInProgress) {
        this.syncPendingChanges();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Add a pending change to be synced later
   */
  async addPendingChange(
    type: 'create' | 'update' | 'delete',
    projectId: string,
    data: any
  ): Promise<void> {
    const changeId = `${type}_${projectId}_${Date.now()}`;
    const pendingChange: PendingChange = {
      id: changeId,
      type,
      projectId,
      data,
      timestamp: new Date(),
      retryCount: 0
    };

    this.pendingChanges.set(changeId, pendingChange);
    await this.savePendingChanges();
    
    this.updateSyncStatus({ 
      pendingChanges: this.pendingChanges.size 
    });

    // Try to sync immediately if online
    if (this.syncStatus$.value.isOnline) {
      this.syncPendingChanges();
    }
  }

  /**
   * Sync all pending changes with Firebase
   */
  async syncPendingChanges(): Promise<void> {
    if (this.syncInProgress || !this.syncStatus$.value.isOnline) {
      return;
    }

    this.syncInProgress = true;
    this.updateSyncStatus({ isSyncing: true, syncErrors: [] });

    const errors: string[] = [];
    const completedChanges: string[] = [];

    try {
      for (const [changeId, change] of this.pendingChanges.entries()) {
        try {
          await this.syncSingleChange(change);
          completedChanges.push(changeId);
        } catch (error) {
          console.error(`Failed to sync change ${changeId}:`, error);
          
          // Increment retry count
          change.retryCount++;
          
          if (change.retryCount >= this.maxRetries) {
            errors.push(`Failed to sync ${change.type} for project ${change.projectId} after ${this.maxRetries} attempts`);
            completedChanges.push(changeId); // Remove from pending after max retries
          }
        }
      }

      // Remove completed changes
      completedChanges.forEach(changeId => {
        this.pendingChanges.delete(changeId);
      });

      await this.savePendingChanges();

      this.updateSyncStatus({
        isSyncing: false,
        lastSyncTime: new Date(),
        pendingChanges: this.pendingChanges.size,
        syncErrors: errors
      });

    } catch (error) {
      console.error('Sync process failed:', error);
      this.updateSyncStatus({
        isSyncing: false,
        syncErrors: ['Sync process failed: ' + (error as Error).message]
      });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a single change with Firebase
   */
  private async syncSingleChange(change: PendingChange): Promise<void> {
    switch (change.type) {
      case 'create':
        await this.firebaseService.createProject(change.data).toPromise();
        break;
      
      case 'update':
        await this.firebaseService.updateProject(change.projectId, change.data).toPromise();
        break;
      
      case 'delete':
        await this.firebaseService.deleteProject(change.projectId).toPromise();
        break;
      
      default:
        throw new Error(`Unknown change type: ${change.type}`);
    }
  }

  /**
   * Save pending changes to local storage
   */
  private async savePendingChanges(): Promise<void> {
    try {
      const changesArray = Array.from(this.pendingChanges.values());
      localStorage.setItem('pendingChanges', JSON.stringify(changesArray));
    } catch (error) {
      console.error('Failed to save pending changes:', error);
    }
  }

  /**
   * Load pending changes from local storage
   */
  private async loadPendingChanges(): Promise<void> {
    try {
      const stored = localStorage.getItem('pendingChanges');
      if (stored) {
        const changesArray: PendingChange[] = JSON.parse(stored);
        this.pendingChanges.clear();
        
        changesArray.forEach(change => {
          // Convert timestamp back to Date object
          change.timestamp = new Date(change.timestamp);
          this.pendingChanges.set(change.id, change);
        });

        this.updateSyncStatus({ 
          pendingChanges: this.pendingChanges.size 
        });
      }
    } catch (error) {
      console.error('Failed to load pending changes:', error);
    }
  }

  /**
   * Update sync status
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    const currentStatus = this.syncStatus$.value;
    this.syncStatus$.next({ ...currentStatus, ...updates });
  }

  /**
   * Get sync status observable
   */
  getSyncStatus(): Observable<SyncStatus> {
    return this.syncStatus$.asObservable();
  }

  /**
   * Get online status
   */
  getOnlineStatus(): Observable<boolean> {
    return this.syncStatus$.pipe(
      map(status => status.isOnline),
      distinctUntilChanged()
    );
  }

  /**
   * Get syncing status
   */
  getSyncingStatus(): Observable<boolean> {
    return this.syncStatus$.pipe(
      map(status => status.isSyncing),
      distinctUntilChanged()
    );
  }

  /**
   * Force sync now
   */
  async forcSync(): Promise<void> {
    if (this.syncStatus$.value.isOnline) {
      await this.syncPendingChanges();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  /**
   * Clear all pending changes (use with caution)
   */
  async clearPendingChanges(): Promise<void> {
    this.pendingChanges.clear();
    await this.savePendingChanges();
    this.updateSyncStatus({ pendingChanges: 0, syncErrors: [] });
  }

  /**
   * Get pending changes count
   */
  getPendingChangesCount(): number {
    return this.pendingChanges.size;
  }

  /**
   * Get pending changes for a specific project
   */
  getPendingChangesForProject(projectId: string): PendingChange[] {
    return Array.from(this.pendingChanges.values())
      .filter(change => change.projectId === projectId);
  }

  /**
   * Cache project data locally
   */
  async cacheProject(project: Project): Promise<void> {
    try {
      await this.databaseService.saveProject(project);
    } catch (error) {
      console.error('Failed to cache project locally:', error);
    }
  }

  /**
   * Get cached project data
   */
  async getCachedProject(projectId: string): Promise<Project | null> {
    try {
      return await this.databaseService.getProject(projectId);
    } catch (error) {
      console.error('Failed to get cached project:', error);
      return null;
    }
  }

  /**
   * Get all cached projects
   */
  async getAllCachedProjects(): Promise<Project[]> {
    try {
      return await this.databaseService.getAllProjects();
    } catch (error) {
      console.error('Failed to get cached projects:', error);
      return [];
    }
  }

  /**
   * Sync project from Firebase to local cache
   */
  async syncProjectToCache(projectId: string): Promise<void> {
    if (!this.syncStatus$.value.isOnline) {
      throw new Error('Cannot sync from Firebase while offline');
    }

    try {
      const project = await this.firebaseService.getProject(projectId).toPromise();
      if (project) {
        await this.cacheProject(project);
      }
    } catch (error) {
      console.error('Failed to sync project to cache:', error);
      throw error;
    }
  }

  /**
   * Sync all user projects from Firebase to local cache
   */
  async syncAllProjectsToCache(): Promise<void> {
    if (!this.syncStatus$.value.isOnline) {
      throw new Error('Cannot sync from Firebase while offline');
    }

    try {
      const projects = await this.firebaseService.getUserProjects().toPromise();
      if (projects) {
        for (const project of projects) {
          await this.cacheProject(project);
        }
      }
    } catch (error) {
      console.error('Failed to sync all projects to cache:', error);
      throw error;
    }
  }

  /**
   * Enable offline mode (disable network requests)
   */
  enableOfflineMode(): void {
    this.updateSyncStatus({ isOnline: false });
  }

  /**
   * Enable online mode (enable network requests)
   */
  enableOnlineMode(): void {
    this.updateSyncStatus({ isOnline: true });
    this.syncPendingChanges();
  }

  /**
   * Check if there are conflicts between local and remote data
   */
  async checkForConflicts(projectId: string): Promise<boolean> {
    if (!this.syncStatus$.value.isOnline) {
      return false;
    }

    try {
      const [localProject, remoteProject] = await Promise.all([
        this.getCachedProject(projectId),
        this.firebaseService.getProject(projectId).toPromise()
      ]);

      if (!localProject || !remoteProject) {
        return false;
      }

      // Simple conflict detection based on version and update time
      return localProject.version !== remoteProject.version ||
             localProject.updatedAt.getTime() !== remoteProject.updatedAt.getTime();
    } catch (error) {
      console.error('Failed to check for conflicts:', error);
      return false;
    }
  }

  /**
   * Resolve conflicts by choosing remote version
   */
  async resolveConflictWithRemote(projectId: string): Promise<void> {
    await this.syncProjectToCache(projectId);
  }

  /**
   * Resolve conflicts by keeping local version
   */
  async resolveConflictWithLocal(projectId: string): Promise<void> {
    const localProject = await this.getCachedProject(projectId);
    if (localProject) {
      await this.addPendingChange('update', projectId, localProject);
    }
  }

  /**
   * Cleanup service when destroyed
   */
  ngOnDestroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}