import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { FirebaseProjectService } from '../../services/firebase-project.service';
import { CollaborationService, CollaborationSession, CollaborationParticipant, CollaborationComment } from '../../services/collaboration.service';
import { Project } from '../../models/project.interface';

@Component({
  selector: 'app-firebase-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="firebase-demo">
      <h2>Firebase Project Management Demo</h2>
      
      <!-- Online Status -->
      <div class="status-bar">
        <div class="status-item" [class.online]="isOnline$ | async" [class.offline]="!(isOnline$ | async)">
          <span class="status-indicator"></span>
          {{ (isOnline$ | async) ? 'Online' : 'Offline' }}
        </div>
        <div class="status-item" [class.syncing]="isSyncing$ | async">
          <span class="sync-indicator"></span>
          {{ (isSyncing$ | async) ? 'Syncing...' : 'Synced' }}
        </div>
      </div>

      <!-- Project Management -->
      <div class="section">
        <h3>Project Management</h3>
        
        <!-- Create Project -->
        <div class="create-project">
          <input 
            [(ngModel)]="newProjectName" 
            placeholder="Project name"
            class="input-field">
          <input 
            [(ngModel)]="newProjectDescription" 
            placeholder="Project description"
            class="input-field">
          <button (click)="createProject()" class="btn btn-primary">
            Create Project
          </button>
        </div>

        <!-- Projects List -->
        <div class="projects-list">
          <h4>Your Projects</h4>
          <div *ngIf="(projects$ | async)?.length === 0" class="empty-state">
            No projects found. Create your first project above.
          </div>
          <div *ngFor="let project of projects$ | async" class="project-card">
            <div class="project-info">
              <h5>{{ project.name }}</h5>
              <p>{{ project.description }}</p>
              <small>Updated: {{ project.updatedAt | date:'short' }}</small>
            </div>
            <div class="project-actions">
              <button (click)="shareProject(project.id)" class="btn btn-secondary">
                Share
              </button>
              <button (click)="startCollaboration(project.id)" class="btn btn-primary">
                Collaborate
              </button>
              <button (click)="deleteProject(project.id)" class="btn btn-danger">
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Shared Projects -->
        <div class="shared-projects">
          <h4>Shared with You</h4>
          <div *ngIf="(sharedProjects$ | async)?.length === 0" class="empty-state">
            No shared projects.
          </div>
          <div *ngFor="let project of sharedProjects$ | async" class="project-card shared">
            <div class="project-info">
              <h5>{{ project.name }} <span class="shared-badge">Shared</span></h5>
              <p>{{ project.description }}</p>
              <small>Updated: {{ project.updatedAt | date:'short' }}</small>
            </div>
            <div class="project-actions">
              <button (click)="startCollaboration(project.id)" class="btn btn-primary">
                Open
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Collaboration -->
      <div class="section" *ngIf="activeSession$ | async">
        <h3>Collaboration Session</h3>
        
        <!-- Session Info -->
        <div class="session-info">
          <h4>Active Session</h4>
          <p>Project: {{ (activeSession$ | async)?.projectId }}</p>
          
          <!-- Participants -->
          <div class="participants">
            <h5>Participants ({{ (participants$ | async)?.length }})</h5>
            <div class="participant-list">
              <div *ngFor="let participant of participants$ | async" 
                   class="participant" 
                   [class.online]="participant.isOnline">
                <div class="participant-avatar" [style.background-color]="getParticipantColor(participant.userId)">
                  {{ participant.userName.charAt(0).toUpperCase() }}
                </div>
                <div class="participant-info">
                  <span class="participant-name">{{ participant.userName }}</span>
                  <span class="participant-role">{{ participant.role }}</span>
                </div>
                <div class="participant-status" [class.online]="participant.isOnline">
                  {{ participant.isOnline ? 'Online' : 'Offline' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div class="comments-section">
          <h5>Comments ({{ (comments$ | async)?.length }})</h5>
          
          <!-- Add Comment -->
          <div class="add-comment">
            <input 
              [(ngModel)]="newComment" 
              placeholder="Add a comment..."
              class="input-field"
              (keyup.enter)="addComment()">
            <button (click)="addComment()" class="btn btn-primary">
              Add Comment
            </button>
          </div>

          <!-- Comments List -->
          <div class="comments-list">
            <div *ngFor="let comment of comments$ | async" 
                 class="comment" 
                 [class.resolved]="comment.resolved">
              <div class="comment-header">
                <div class="comment-author">
                  <div class="author-avatar" [style.background-color]="getParticipantColor(comment.userId)">
                    {{ comment.userName.charAt(0).toUpperCase() }}
                  </div>
                  <span class="author-name">{{ comment.userName }}</span>
                </div>
                <div class="comment-meta">
                  <span class="comment-time">{{ comment.timestamp?.toDate() | date:'short' }}</span>
                  <button *ngIf="!comment.resolved" 
                          (click)="resolveComment(comment.id!)" 
                          class="btn btn-small">
                    Resolve
                  </button>
                </div>
              </div>
              <div class="comment-content">
                {{ comment.content }}
              </div>
              <div *ngIf="comment.resolved" class="resolved-badge">
                Resolved
              </div>
            </div>
          </div>
        </div>

        <!-- Leave Session -->
        <button (click)="leaveCollaboration()" class="btn btn-secondary">
          Leave Session
        </button>
      </div>

      <!-- Share Project Modal -->
      <div *ngIf="showShareModal" class="modal-overlay" (click)="closeShareModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h4>Share Project</h4>
          <div class="share-form">
            <input 
              [(ngModel)]="shareEmail" 
              placeholder="Enter email address"
              class="input-field">
            <select [(ngModel)]="sharePermission" class="input-field">
              <option value="read">Read Only</option>
              <option value="write">Can Edit</option>
            </select>
            <div class="modal-actions">
              <button (click)="confirmShare()" class="btn btn-primary">
                Share
              </button>
              <button (click)="closeShareModal()" class="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .firebase-demo {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .status-bar {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ccc;
    }

    .status-item.online .status-indicator {
      background: #4CAF50;
    }

    .status-item.offline .status-indicator {
      background: #f44336;
    }

    .sync-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #2196F3;
    }

    .status-item.syncing .sync-indicator {
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .section {
      margin-bottom: 40px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .create-project {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .input-field {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      flex: 1;
      min-width: 200px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }

    .btn-primary {
      background: #2196F3;
      color: white;
    }

    .btn-primary:hover {
      background: #1976D2;
    }

    .btn-secondary {
      background: #757575;
      color: white;
    }

    .btn-secondary:hover {
      background: #616161;
    }

    .btn-danger {
      background: #f44336;
      color: white;
    }

    .btn-danger:hover {
      background: #d32f2f;
    }

    .btn-small {
      padding: 4px 8px;
      font-size: 12px;
    }

    .projects-list, .shared-projects {
      margin-bottom: 30px;
    }

    .project-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin-bottom: 10px;
      background: white;
    }

    .project-card.shared {
      border-left: 4px solid #4CAF50;
    }

    .project-info h5 {
      margin: 0 0 5px 0;
      color: #333;
    }

    .project-info p {
      margin: 0 0 5px 0;
      color: #666;
      font-size: 14px;
    }

    .project-info small {
      color: #999;
      font-size: 12px;
    }

    .shared-badge {
      background: #4CAF50;
      color: white;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 10px;
      margin-left: 8px;
    }

    .project-actions {
      display: flex;
      gap: 8px;
    }

    .empty-state {
      text-align: center;
      color: #999;
      padding: 40px;
      font-style: italic;
    }

    .session-info {
      background: #f0f8ff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .participants {
      margin-top: 15px;
    }

    .participant-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .participant {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      background: white;
      border-radius: 6px;
    }

    .participant-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    .participant-info {
      flex: 1;
    }

    .participant-name {
      font-weight: 500;
      display: block;
    }

    .participant-role {
      font-size: 12px;
      color: #666;
      text-transform: capitalize;
    }

    .participant-status {
      font-size: 12px;
      color: #999;
    }

    .participant-status.online {
      color: #4CAF50;
    }

    .comments-section {
      margin-top: 20px;
    }

    .add-comment {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .comments-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .comment {
      padding: 12px;
      border: 1px solid #eee;
      border-radius: 6px;
      margin-bottom: 10px;
      background: white;
    }

    .comment.resolved {
      opacity: 0.7;
      background: #f9f9f9;
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .comment-author {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .author-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
    }

    .author-name {
      font-weight: 500;
      font-size: 14px;
    }

    .comment-meta {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .comment-time {
      font-size: 12px;
      color: #999;
    }

    .comment-content {
      font-size: 14px;
      line-height: 1.4;
    }

    .resolved-badge {
      margin-top: 8px;
      padding: 2px 6px;
      background: #4CAF50;
      color: white;
      border-radius: 12px;
      font-size: 10px;
      display: inline-block;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      padding: 20px;
      border-radius: 8px;
      min-width: 400px;
      max-width: 90vw;
    }

    .share-form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .firebase-demo {
        padding: 10px;
      }
      
      .create-project {
        flex-direction: column;
      }
      
      .project-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      
      .project-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `]
})
export class FirebaseDemoComponent implements OnInit, OnDestroy {
  projects$: Observable<Project[]>;
  sharedProjects$: Observable<Project[]>;
  isOnline$: Observable<boolean>;
  isSyncing$: Observable<boolean>;
  
  activeSession$: Observable<CollaborationSession | null>;
  participants$: Observable<CollaborationParticipant[]>;
  comments$: Observable<CollaborationComment[]>;

  newProjectName = '';
  newProjectDescription = '';
  newComment = '';
  
  showShareModal = false;
  shareProjectId = '';
  shareEmail = '';
  sharePermission: 'read' | 'write' = 'read';

  private subscriptions: Subscription[] = [];

  constructor(
    private firebaseProjectService: FirebaseProjectService,
    private collaborationService: CollaborationService
  ) {
    this.projects$ = this.firebaseProjectService.getAllProjectsUpdates();
    this.isOnline$ = this.firebaseProjectService.getOnlineStatus();
    this.isSyncing$ = this.firebaseProjectService.getSyncStatus();
    
    this.activeSession$ = this.collaborationService.getActiveSession();
    this.participants$ = this.collaborationService.getParticipants();
    this.comments$ = this.collaborationService.getComments();
    
    this.sharedProjects$ = new Observable(observer => {
      this.firebaseProjectService.getSharedProjects().then(projects => {
        observer.next(projects);
      }).catch(error => {
        console.error('Error loading shared projects:', error);
        observer.next([]);
      });
    });
  }

  ngOnInit(): void {
    // Load initial data
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async loadProjects(): Promise<void> {
    try {
      // This will trigger the observable updates
      await this.firebaseProjectService.getProjects();
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  async createProject(): Promise<void> {
    if (!this.newProjectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    try {
      await this.firebaseProjectService.createProject({
        name: this.newProjectName,
        description: this.newProjectDescription
      });
      
      this.newProjectName = '';
      this.newProjectDescription = '';
      
      console.log('Project created successfully');
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await this.firebaseProjectService.deleteProject(projectId);
      console.log('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  }

  shareProject(projectId: string): void {
    this.shareProjectId = projectId;
    this.showShareModal = true;
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.shareProjectId = '';
    this.shareEmail = '';
    this.sharePermission = 'read';
  }

  async confirmShare(): Promise<void> {
    if (!this.shareEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    try {
      await this.firebaseProjectService.shareProject(
        this.shareProjectId, 
        this.shareEmail, 
        this.sharePermission
      );
      
      console.log('Project shared successfully');
      this.closeShareModal();
    } catch (error) {
      console.error('Error sharing project:', error);
      alert('Failed to share project. Please try again.');
    }
  }

  async startCollaboration(projectId: string): Promise<void> {
    try {
      const subscription = this.collaborationService.startCollaborationSession(projectId).subscribe({
        next: (session) => {
          console.log('Collaboration session started:', session);
        },
        error: (error) => {
          console.error('Error starting collaboration:', error);
          alert('Failed to start collaboration session.');
        }
      });
      
      this.subscriptions.push(subscription);
    } catch (error) {
      console.error('Error starting collaboration:', error);
      alert('Failed to start collaboration session.');
    }
  }

  async leaveCollaboration(): Promise<void> {
    try {
      await this.collaborationService.leaveCollaborationSession();
      console.log('Left collaboration session');
    } catch (error) {
      console.error('Error leaving collaboration:', error);
    }
  }

  async addComment(): Promise<void> {
    if (!this.newComment.trim()) {
      return;
    }

    const session = await this.activeSession$.pipe().toPromise();
    if (!session) {
      alert('No active collaboration session');
      return;
    }

    try {
      await this.collaborationService.addComment(
        session.projectId,
        'project',
        session.projectId,
        this.newComment
      );
      
      this.newComment = '';
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment.');
    }
  }

  async resolveComment(commentId: string): Promise<void> {
    try {
      await this.collaborationService.resolveComment(commentId);
    } catch (error) {
      console.error('Error resolving comment:', error);
      alert('Failed to resolve comment.');
    }
  }

  getParticipantColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}