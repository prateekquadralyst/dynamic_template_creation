import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  private autoRemoveTimeout = new Map<string, any>();

  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  show(notification: Omit<Notification, 'id'>): string {
    const id = this.generateId();
    const fullNotification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification
    };

    const current = this.notifications$.value;
    this.notifications$.next([...current, fullNotification]);

    // Auto-remove after duration
    if (fullNotification.duration && fullNotification.duration > 0) {
      const timeout = setTimeout(() => {
        this.remove(id);
      }, fullNotification.duration);
      this.autoRemoveTimeout.set(id, timeout);
    }

    return id;
  }

  success(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'success',
      title,
      message,
      duration
    });
  }

  error(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'error',
      title,
      message,
      duration: duration || 0 // Errors don't auto-dismiss by default
    });
  }

  warning(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  info(title: string, message: string, duration?: number): string {
    return this.show({
      type: 'info',
      title,
      message,
      duration
    });
  }

  remove(id: string): void {
    const current = this.notifications$.value;
    this.notifications$.next(current.filter(n => n.id !== id));

    // Clear timeout if exists
    const timeout = this.autoRemoveTimeout.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.autoRemoveTimeout.delete(id);
    }
  }

  clear(): void {
    // Clear all timeouts
    this.autoRemoveTimeout.forEach(timeout => clearTimeout(timeout));
    this.autoRemoveTimeout.clear();
    
    this.notifications$.next([]);
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}