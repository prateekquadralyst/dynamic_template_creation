import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  focusIndicators: boolean;
  screenReaderOptimized: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private settingsSubject = new BehaviorSubject<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    focusIndicators: true,
    screenReaderOptimized: false
  });

  settings$: Observable<AccessibilitySettings> = this.settingsSubject.asObservable();

  constructor() {
    this.loadSettings();
    this.detectSystemPreferences();
    this.applySettings();
  }

  updateSettings(settings: Partial<AccessibilitySettings>): void {
    const currentSettings = this.settingsSubject.value;
    const newSettings = { ...currentSettings, ...settings };
    
    this.settingsSubject.next(newSettings);
    this.saveSettings(newSettings);
    this.applySettings();
  }

  getSettings(): AccessibilitySettings {
    return this.settingsSubject.value;
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('accessibility_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.settingsSubject.next({ ...this.settingsSubject.value, ...settings });
      }
    } catch (error) {
      console.warn('Failed to load accessibility settings:', error);
    }
  }

  private saveSettings(settings: AccessibilitySettings): void {
    try {
      localStorage.setItem('accessibility_settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save accessibility settings:', error);
    }
  }

  private detectSystemPreferences(): void {
    // Detect system preferences for reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.updateSettings({ reducedMotion: true });
    }

    // Detect system preferences for high contrast
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      this.updateSettings({ highContrast: true });
    }
  }

  private applySettings(): void {
    const settings = this.settingsSubject.value;
    const body = document.body;

    // Apply CSS classes based on settings
    body.classList.toggle('high-contrast', settings.highContrast);
    body.classList.toggle('reduced-motion', settings.reducedMotion);
    body.classList.toggle('large-text', settings.largeText);
    body.classList.toggle('focus-indicators', settings.focusIndicators);
    body.classList.toggle('screen-reader-optimized', settings.screenReaderOptimized);
  }

  // Utility methods for common accessibility tasks
  announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  setFocusToElement(selector: string): boolean {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && element.focus) {
      element.focus();
      return true;
    }
    return false;
  }

  addSkipLink(targetSelector: string, linkText: string): void {
    const skipLink = document.createElement('a');
    skipLink.href = '#';
    skipLink.textContent = linkText;
    skipLink.className = 'skip-link';
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.setFocusToElement(targetSelector);
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  // Check if element is visible to screen readers
  isElementAccessible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return !(
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      element.hasAttribute('aria-hidden') ||
      element.getAttribute('aria-hidden') === 'true'
    );
  }

  // Generate unique IDs for form labels and inputs
  generateAccessibleId(prefix: string = 'accessible'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}