import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccessibilityService, AccessibilitySettings } from '../../services/accessibility.service';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-accessibility-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, ClickOutsideDirective],
  template: `
    <div class="accessibility-toolbar">
      <button 
        class="toolbar-btn accessibility-toggle"
        (click)="togglePanel()"
        [class.active]="showPanel"
        title="Accessibility Settings"
        aria-label="Toggle accessibility settings">
        <i class="bi bi-universal-access"></i>
        <span class="btn-text">Accessibility</span>
      </button>
      
      <div class="accessibility-panel" *ngIf="showPanel" (clickOutside)="closePanel()">
        <div class="panel-header">
          <h4>Accessibility Settings</h4>
          <button class="close-btn" (click)="closePanel()" aria-label="Close accessibility settings">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div class="panel-content">
          <div class="setting-group">
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="settings.highContrast"
                  (ngModelChange)="updateSetting('highContrast', $event)"
                  class="setting-checkbox">
                <span class="setting-text">
                  <strong>High Contrast</strong>
                  <small>Increase contrast for better visibility</small>
                </span>
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="settings.reducedMotion"
                  (ngModelChange)="updateSetting('reducedMotion', $event)"
                  class="setting-checkbox">
                <span class="setting-text">
                  <strong>Reduced Motion</strong>
                  <small>Minimize animations and transitions</small>
                </span>
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="settings.largeText"
                  (ngModelChange)="updateSetting('largeText', $event)"
                  class="setting-checkbox">
                <span class="setting-text">
                  <strong>Large Text</strong>
                  <small>Increase text size for better readability</small>
                </span>
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="settings.focusIndicators"
                  (ngModelChange)="updateSetting('focusIndicators', $event)"
                  class="setting-checkbox">
                <span class="setting-text">
                  <strong>Enhanced Focus</strong>
                  <small>Show clear focus indicators</small>
                </span>
              </label>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">
                <input 
                  type="checkbox" 
                  [(ngModel)]="settings.screenReaderOptimized"
                  (ngModelChange)="updateSetting('screenReaderOptimized', $event)"
                  class="setting-checkbox">
                <span class="setting-text">
                  <strong>Screen Reader Mode</strong>
                  <small>Optimize for screen reader users</small>
                </span>
              </label>
            </div>
          </div>
          
          <div class="panel-actions">
            <button class="btn btn-secondary" (click)="resetToDefaults()">
              Reset to Defaults
            </button>
            <button class="btn btn-primary" (click)="closePanel()">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .accessibility-toolbar {
      position: relative;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      color: #495057;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .toolbar-btn:hover {
      background: #e9ecef;
      color: #212529;
    }

    .toolbar-btn.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .toolbar-btn i {
      font-size: 1rem;
    }

    .btn-text {
      font-size: 0.875rem;
    }

    .accessibility-panel {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 320px;
      max-width: 400px;
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

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e9ecef;
    }

    .panel-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #212529;
    }

    .close-btn {
      background: none;
      border: none;
      color: #6c757d;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .panel-content {
      padding: 16px;
    }

    .setting-group {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }

    .setting-item {
      display: flex;
      align-items: flex-start;
    }

    .setting-label {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      cursor: pointer;
      width: 100%;
    }

    .setting-checkbox {
      margin: 0;
      width: 18px;
      height: 18px;
      accent-color: #007bff;
      cursor: pointer;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .setting-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .setting-text strong {
      font-size: 0.875rem;
      color: #212529;
      font-weight: 600;
    }

    .setting-text small {
      font-size: 0.75rem;
      color: #6c757d;
      line-height: 1.3;
    }

    .panel-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid #f1f3f4;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    /* High contrast mode styles */
    :host-context(.high-contrast) .accessibility-panel {
      border: 2px solid #000;
      background: #fff;
    }

    :host-context(.high-contrast) .setting-text strong {
      color: #000;
    }

    :host-context(.high-contrast) .setting-text small {
      color: #333;
    }

    /* Large text mode styles */
    :host-context(.large-text) .btn-text,
    :host-context(.large-text) .setting-text strong,
    :host-context(.large-text) .panel-header h4 {
      font-size: 1rem;
    }

    :host-context(.large-text) .setting-text small {
      font-size: 0.875rem;
    }

    /* Focus indicators */
    :host-context(.focus-indicators) .setting-checkbox:focus,
    :host-context(.focus-indicators) .toolbar-btn:focus,
    :host-context(.focus-indicators) .btn:focus,
    :host-context(.focus-indicators) .close-btn:focus {
      outline: 3px solid #007bff;
      outline-offset: 2px;
    }

    /* Reduced motion */
    :host-context(.reduced-motion) * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .btn-text {
        display: none;
      }

      .toolbar-btn {
        padding: 8px;
      }

      .accessibility-panel {
        right: -50px;
        min-width: 300px;
      }
    }

    @media (max-width: 480px) {
      .accessibility-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        right: auto;
        transform: translate(-50%, -50%);
        margin-top: 0;
        min-width: 280px;
        max-width: 90vw;
      }
    }
  `]
})
export class AccessibilityToolbarComponent implements OnInit, OnDestroy {
  showPanel = false;
  settings: AccessibilitySettings = {
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    focusIndicators: true,
    screenReaderOptimized: false
  };

  private destroy$ = new Subject<void>();

  constructor(private accessibilityService: AccessibilityService) {}

  ngOnInit(): void {
    // Subscribe to accessibility settings changes
    this.accessibilityService.settings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        this.settings = { ...settings };
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePanel(): void {
    this.showPanel = !this.showPanel;
  }

  closePanel(): void {
    this.showPanel = false;
  }

  updateSetting(key: keyof AccessibilitySettings, value: boolean): void {
    this.accessibilityService.updateSettings({ [key]: value });
    
    // Announce changes to screen readers
    const settingNames = {
      highContrast: 'High contrast',
      reducedMotion: 'Reduced motion',
      largeText: 'Large text',
      focusIndicators: 'Enhanced focus indicators',
      screenReaderOptimized: 'Screen reader optimization'
    };
    
    const settingName = settingNames[key];
    const status = value ? 'enabled' : 'disabled';
    this.accessibilityService.announceToScreenReader(`${settingName} ${status}`);
  }

  resetToDefaults(): void {
    const defaultSettings: AccessibilitySettings = {
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      focusIndicators: true,
      screenReaderOptimized: false
    };
    
    this.accessibilityService.updateSettings(defaultSettings);
    this.accessibilityService.announceToScreenReader('Accessibility settings reset to defaults');
  }
}