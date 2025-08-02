import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UndoRedoService, UndoRedoAction } from '../../services/undo-redo.service';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-undo-redo-toolbar',
  standalone: true,
  imports: [CommonModule, ClickOutsideDirective],
  template: `
    <div class="undo-redo-toolbar">
      <div class="toolbar-group">
        <button 
          class="toolbar-btn undo-btn"
          [disabled]="!canUndo"
          (click)="undo()"
          [title]="undoTooltip"
          aria-label="Undo last action">
          <i class="bi bi-arrow-counterclockwise"></i>
          <span class="btn-text">Undo</span>
        </button>
        
        <button 
          class="toolbar-btn redo-btn"
          [disabled]="!canRedo"
          (click)="redo()"
          [title]="redoTooltip"
          aria-label="Redo last undone action">
          <i class="bi bi-arrow-clockwise"></i>
          <span class="btn-text">Redo</span>
        </button>
      </div>
      
      <div class="history-dropdown" *ngIf="showHistory">
        <button 
          class="toolbar-btn history-btn"
          (click)="toggleHistoryPanel()"
          [class.active]="showHistoryPanel"
          title="Show action history"
          aria-label="Show action history">
          <i class="bi bi-clock-history"></i>
          <span class="btn-text">History</span>
        </button>
        
        <div class="history-panel" *ngIf="showHistoryPanel" (clickOutside)="closeHistoryPanel()">
          <div class="history-header">
            <h4>Action History</h4>
            <button class="clear-btn" (click)="clearHistory()" title="Clear all history">
              <i class="bi bi-trash"></i>
            </button>
          </div>
          
          <div class="history-content">
            <div class="history-section" *ngIf="undoHistory.length > 0">
              <h5>Undo Stack</h5>
              <div class="history-list">
                <div 
                  class="history-item"
                  *ngFor="let action of undoHistory; let i = index"
                  [class.current]="i === 0"
                  (click)="undoToAction(action)">
                  <div class="action-info">
                    <span class="action-description">{{ action.description }}</span>
                    <span class="action-time">{{ formatTime(action.timestamp) }}</span>
                  </div>
                  <i class="bi bi-arrow-counterclockwise action-icon"></i>
                </div>
              </div>
            </div>
            
            <div class="history-section" *ngIf="redoHistory.length > 0">
              <h5>Redo Stack</h5>
              <div class="history-list">
                <div 
                  class="history-item redo-item"
                  *ngFor="let action of redoHistory; let i = index"
                  (click)="redoToAction(action)">
                  <div class="action-info">
                    <span class="action-description">{{ action.description }}</span>
                    <span class="action-time">{{ formatTime(action.timestamp) }}</span>
                  </div>
                  <i class="bi bi-arrow-clockwise action-icon"></i>
                </div>
              </div>
            </div>
            
            <div class="empty-state" *ngIf="undoHistory.length === 0 && redoHistory.length === 0">
              <i class="bi bi-clock"></i>
              <p>No actions in history</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .undo-redo-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      position: relative;
    }

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 2px;
      background: #f8f9fa;
      border-radius: 6px;
      padding: 2px;
      border: 1px solid #e9ecef;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: #495057;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .toolbar-btn:hover:not(:disabled) {
      background: #e9ecef;
      color: #212529;
    }

    .toolbar-btn:active:not(:disabled) {
      background: #dee2e6;
    }

    .toolbar-btn:disabled {
      color: #adb5bd;
      cursor: not-allowed;
    }

    .toolbar-btn i {
      font-size: 1rem;
    }

    .btn-text {
      font-size: 0.875rem;
    }

    .history-dropdown {
      position: relative;
    }

    .history-btn.active {
      background: #007bff;
      color: white;
    }

    .history-panel {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 300px;
      max-width: 400px;
      max-height: 400px;
      z-index: 1000;
      animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e9ecef;
    }

    .history-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #212529;
    }

    .clear-btn {
      background: none;
      border: none;
      color: #dc3545;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .clear-btn:hover {
      background: #f8d7da;
    }

    .history-content {
      max-height: 300px;
      overflow-y: auto;
    }

    .history-section {
      padding: 16px;
    }

    .history-section:not(:last-child) {
      border-bottom: 1px solid #f1f3f4;
    }

    .history-section h5 {
      margin: 0 0 12px 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .history-item:hover {
      background: #f8f9fa;
    }

    .history-item.current {
      background: #e3f2fd;
      border: 1px solid #2196f3;
    }

    .history-item.redo-item {
      opacity: 0.7;
    }

    .history-item.redo-item:hover {
      opacity: 1;
      background: #fff3e0;
    }

    .action-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .action-description {
      font-size: 0.875rem;
      color: #212529;
      font-weight: 500;
    }

    .action-time {
      font-size: 0.75rem;
      color: #6c757d;
    }

    .action-icon {
      color: #6c757d;
      font-size: 0.875rem;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px 16px;
      color: #6c757d;
    }

    .empty-state i {
      font-size: 2rem;
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
      font-size: 0.875rem;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .btn-text {
        display: none;
      }

      .toolbar-btn {
        padding: 8px;
      }

      .history-panel {
        right: -50px;
        min-width: 280px;
      }
    }

    @media (max-width: 480px) {
      .history-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        right: auto;
        transform: translate(-50%, -50%);
        margin-top: 0;
        min-width: 300px;
        max-width: 90vw;
      }
    }
  `]
})
export class UndoRedoToolbarComponent implements OnInit, OnDestroy {
  canUndo = false;
  canRedo = false;
  lastAction = '';
  showHistory = true;
  showHistoryPanel = false;
  
  undoHistory: UndoRedoAction[] = [];
  redoHistory: UndoRedoAction[] = [];

  private destroy$ = new Subject<void>();

  constructor(private undoRedoService: UndoRedoService) {}

  ngOnInit(): void {
    // Subscribe to undo/redo state changes
    this.undoRedoService.canUndo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(canUndo => {
        this.canUndo = canUndo;
        this.updateHistory();
      });

    this.undoRedoService.canRedo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(canRedo => {
        this.canRedo = canRedo;
        this.updateHistory();
      });

    this.undoRedoService.lastAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe(lastAction => {
        this.lastAction = lastAction;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get undoTooltip(): string {
    if (!this.canUndo) {
      return 'Nothing to undo';
    }
    return this.lastAction ? `Undo: ${this.lastAction}` : 'Undo last action';
  }

  get redoTooltip(): string {
    if (!this.canRedo) {
      return 'Nothing to redo';
    }
    return 'Redo last undone action';
  }

  undo(): void {
    this.undoRedoService.undo();
  }

  redo(): void {
    this.undoRedoService.redo();
  }

  toggleHistoryPanel(): void {
    this.showHistoryPanel = !this.showHistoryPanel;
  }

  closeHistoryPanel(): void {
    this.showHistoryPanel = false;
  }

  clearHistory(): void {
    if (confirm('Are you sure you want to clear all action history? This cannot be undone.')) {
      this.undoRedoService.clear();
      this.closeHistoryPanel();
    }
  }

  undoToAction(targetAction: UndoRedoAction): void {
    // Undo actions until we reach the target action
    let currentAction = this.undoRedoService.getUndoHistory()[0];
    while (currentAction && currentAction.id !== targetAction.id) {
      if (!this.undoRedoService.undo()) {
        break;
      }
      currentAction = this.undoRedoService.getUndoHistory()[0];
    }
    this.closeHistoryPanel();
  }

  redoToAction(targetAction: UndoRedoAction): void {
    // Redo actions until we reach the target action
    let currentAction = this.undoRedoService.getRedoHistory()[0];
    while (currentAction && currentAction.id !== targetAction.id) {
      if (!this.undoRedoService.redo()) {
        break;
      }
      currentAction = this.undoRedoService.getRedoHistory()[0];
    }
    // Redo the target action as well
    this.undoRedoService.redo();
    this.closeHistoryPanel();
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  }

  private updateHistory(): void {
    this.undoHistory = this.undoRedoService.getUndoHistory();
    this.redoHistory = this.undoRedoService.getRedoHistory();
  }
}