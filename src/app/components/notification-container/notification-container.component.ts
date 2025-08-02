import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      <div 
        class="notification"
        *ngFor="let notification of notifications; trackBy: trackByNotification"
        [class]="'notification-' + notification.type"
        [attr.role]="notification.type === 'error' ? 'alert' : 'status'"
        [attr.aria-live]="notification.type === 'error' ? 'assertive' : 'polite'">
        
        <div class="notification-icon">
          <i class="bi" [ngClass]="{
            'bi-check-circle-fill': notification.type === 'success',
            'bi-exclamation-triangle-fill': notification.type === 'warning',
            'bi-x-circle-fill': notification.type === 'error',
            'bi-info-circle-fill': notification.type === 'info'
          }"></i>
        </div>
        
        <div class="notification-content">
          <div class="notification-title">{{ notification.title }}</div>
          <div class="notification-message">{{ notification.message }}</div>
          
          <div class="notification-actions" *ngIf="notification.actions && notification.actions.length > 0">
            <button 
              *ngFor="let action of notification.actions"
              class="notification-action"
              [class.primary]="action.primary"
              (click)="executeAction(action, notification.id)">
              {{ action.label }}
            </button>
          </div>
        </div>
        
        <button 
          class="notification-close"
          (click)="close(notification.id)"
          aria-label="Close notification">
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
      pointer-events: none;
    }

    .notification {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-left: 4px solid;
      pointer-events: auto;
      animation: slideIn 0.3s ease;
      position: relative;
      min-width: 300px;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .notification-success {
      border-left-color: #28a745;
    }

    .notification-error {
      border-left-color: #dc3545;
    }

    .notification-warning {
      border-left-color: #ffc107;
    }

    .notification-info {
      border-left-color: #17a2b8;
    }

    .notification-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .notification-success .notification-icon {
      color: #28a745;
    }

    .notification-error .notification-icon {
      color: #dc3545;
    }

    .notification-warning .notification-icon {
      color: #ffc107;
    }

    .notification-info .notification-icon {
      color: #17a2b8;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-weight: 600;
      font-size: 0.875rem;
      color: #212529;
      margin-bottom: 4px;
    }

    .notification-message {
      font-size: 0.875rem;
      color: #6c757d;
      line-height: 1.4;
    }

    .notification-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .notification-action {
      padding: 6px 12px;
      border: 1px solid #dee2e6;
      background: white;
      color: #495057;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .notification-action:hover {
      background: #f8f9fa;
      border-color: #adb5bd;
    }

    .notification-action.primary {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .notification-action.primary:hover {
      background: #0056b3;
      border-color: #0056b3;
    }

    .notification-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #6c757d;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .notification-close:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .notification-close i {
      font-size: 1rem;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .notification-container {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }

      .notification {
        min-width: auto;
      }
    }

    /* High contrast mode */
    :host-context(.high-contrast) .notification {
      border: 2px solid #000;
      background: #fff;
    }

    :host-context(.high-contrast) .notification-title,
    :host-context(.high-contrast) .notification-message {
      color: #000;
    }

    :host-context(.high-contrast) .notification-action {
      border: 2px solid #000;
      background: #fff;
      color: #000;
    }

    :host-context(.high-contrast) .notification-action:hover {
      background: #000;
      color: #fff;
    }

    /* Large text mode */
    :host-context(.large-text) .notification-title,
    :host-context(.large-text) .notification-message {
      font-size: 1rem;
    }

    :host-context(.large-text) .notification-action {
      font-size: 0.875rem;
      padding: 8px 16px;
    }

    /* Reduced motion */
    :host-context(.reduced-motion) .notification {
      animation: none;
    }

    /* Focus indicators */
    :host-context(.focus-indicators) .notification-action:focus,
    :host-context(.focus-indicators) .notification-close:focus {
      outline: 3px solid #007bff;
      outline-offset: 2px;
    }
  `]
})
export class NotificationContainerComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private destroy$ = new Subject<void>();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.notificationService.getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  close(id: string): void {
    this.notificationService.remove(id);
  }

  executeAction(action: any, notificationId: string): void {
    action.action();
    this.close(notificationId);
  }

  trackByNotification(index: number, notification: Notification): string {
    return notification.id;
  }
}