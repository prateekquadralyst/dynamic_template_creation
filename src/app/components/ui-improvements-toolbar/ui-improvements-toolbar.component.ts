import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardShortcutsService } from '../../services/keyboard-shortcuts.service';
import { UndoRedoService } from '../../services/undo-redo.service';
import { AccessibilityService } from '../../services/accessibility.service';
import { OnboardingService } from '../../services/onboarding.service';
import { UndoRedoToolbarComponent } from '../undo-redo-toolbar/undo-redo-toolbar.component';
import { AccessibilityToolbarComponent } from '../accessibility-toolbar/accessibility-toolbar.component';
import { HelpSystemComponent } from '../help-system/help-system.component';
import { KeyboardShortcutsHelpComponent } from '../keyboard-shortcuts-help/keyboard-shortcuts-help.component';
import { OnboardingOverlayComponent } from '../onboarding-overlay/onboarding-overlay.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-ui-improvements-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    UndoRedoToolbarComponent,
    AccessibilityToolbarComponent,
    HelpSystemComponent,
    KeyboardShortcutsHelpComponent,
    OnboardingOverlayComponent
  ],
  template: `
    <div class="ui-improvements-toolbar">
      <div class="toolbar-section">
        <app-undo-redo-toolbar></app-undo-redo-toolbar>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="toolbar-section">
        <app-accessibility-toolbar></app-accessibility-toolbar>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="toolbar-section">
        <app-help-system></app-help-system>
      </div>
      
      <div class="toolbar-section" *ngIf="showQuickActions">
        <div class="quick-actions">
          <button 
            class="quick-action-btn"
            (click)="showKeyboardShortcuts()"
            title="Keyboard Shortcuts (F1)"
            aria-label="Show keyboard shortcuts">
            <i class="bi bi-keyboard"></i>
          </button>
          
          <button 
            class="quick-action-btn"
            (click)="startTour()"
            title="Take a Tour"
            aria-label="Start onboarding tour">
            <i class="bi bi-play-circle"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Global Components -->
    <app-keyboard-shortcuts-help #keyboardShortcutsHelp></app-keyboard-shortcuts-help>
    <app-onboarding-overlay></app-onboarding-overlay>
  `,
  styles: [`
    .ui-improvements-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #ffffff;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      margin-bottom: 16px;
    }

    .toolbar-section {
      display: flex;
      align-items: center;
    }

    .toolbar-divider {
      width: 1px;
      height: 24px;
      background: #dee2e6;
      margin: 0 4px;
    }

    .quick-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .quick-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: #6c757d;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quick-action-btn:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .quick-action-btn:active {
      background: #e9ecef;
    }

    .quick-action-btn i {
      font-size: 1rem;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .ui-improvements-toolbar {
        padding: 6px 8px;
        gap: 6px;
      }

      .toolbar-divider {
        height: 20px;
        margin: 0 2px;
      }

      .quick-action-btn {
        width: 28px;
        height: 28px;
      }

      .quick-action-btn i {
        font-size: 0.875rem;
      }
    }

    @media (max-width: 480px) {
      .ui-improvements-toolbar {
        flex-wrap: wrap;
        justify-content: center;
      }

      .toolbar-divider {
        display: none;
      }
    }

    /* High contrast mode */
    :host-context(.high-contrast) .ui-improvements-toolbar {
      border: 2px solid #000;
      background: #fff;
    }

    :host-context(.high-contrast) .toolbar-divider {
      background: #000;
    }

    :host-context(.high-contrast) .quick-action-btn {
      border: 1px solid #000;
    }

    /* Large text mode */
    :host-context(.large-text) .ui-improvements-toolbar {
      padding: 12px 16px;
    }

    :host-context(.large-text) .quick-action-btn {
      width: 36px;
      height: 36px;
    }

    :host-context(.large-text) .quick-action-btn i {
      font-size: 1.125rem;
    }

    /* Focus indicators */
    :host-context(.focus-indicators) .quick-action-btn:focus {
      outline: 3px solid #007bff;
      outline-offset: 2px;
    }

    /* Reduced motion */
    :host-context(.reduced-motion) * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  `]
})
export class UiImprovementsToolbarComponent implements OnInit, OnDestroy {
  showQuickActions = true;

  @ViewChild('keyboardShortcutsHelp') keyboardShortcutsHelp!: KeyboardShortcutsHelpComponent;

  private destroy$ = new Subject<void>();

  constructor(
    private keyboardShortcutsService: KeyboardShortcutsService,
    private undoRedoService: UndoRedoService,
    private accessibilityService: AccessibilityService,
    private onboardingService: OnboardingService
  ) {}

  ngOnInit(): void {
    this.registerGlobalKeyboardShortcuts();
    this.checkFirstTimeUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  showKeyboardShortcuts(): void {
    this.keyboardShortcutsHelp.show();
  }

  startTour(): void {
    this.onboardingService.startTour('basic-tour');
  }

  private registerGlobalKeyboardShortcuts(): void {
    // Register global keyboard shortcuts
    this.keyboardShortcutsService.registerShortcut({
      key: 'z',
      ctrlKey: true,
      action: () => this.undoRedoService.undo(),
      description: 'Undo last action',
      category: 'General'
    });

    this.keyboardShortcutsService.registerShortcut({
      key: 'y',
      ctrlKey: true,
      action: () => this.undoRedoService.redo(),
      description: 'Redo last undone action',
      category: 'General'
    });

    this.keyboardShortcutsService.registerShortcut({
      key: 'F1',
      action: () => this.showKeyboardShortcuts(),
      description: 'Show keyboard shortcuts help',
      category: 'Help'
    });

    this.keyboardShortcutsService.registerShortcut({
      key: '?',
      action: () => this.showKeyboardShortcuts(),
      description: 'Show keyboard shortcuts help',
      category: 'Help'
    });

    this.keyboardShortcutsService.registerShortcut({
      key: 'h',
      ctrlKey: true,
      action: () => this.startTour(),
      description: 'Start onboarding tour',
      category: 'Help'
    });

    // Accessibility shortcuts
    this.keyboardShortcutsService.registerShortcut({
      key: '1',
      ctrlKey: true,
      altKey: true,
      action: () => this.accessibilityService.updateSettings({ 
        highContrast: !this.accessibilityService.getSettings().highContrast 
      }),
      description: 'Toggle high contrast mode',
      category: 'Accessibility'
    });

    this.keyboardShortcutsService.registerShortcut({
      key: '2',
      ctrlKey: true,
      altKey: true,
      action: () => this.accessibilityService.updateSettings({ 
        largeText: !this.accessibilityService.getSettings().largeText 
      }),
      description: 'Toggle large text mode',
      category: 'Accessibility'
    });

    this.keyboardShortcutsService.registerShortcut({
      key: '3',
      ctrlKey: true,
      altKey: true,
      action: () => this.accessibilityService.updateSettings({ 
        reducedMotion: !this.accessibilityService.getSettings().reducedMotion 
      }),
      description: 'Toggle reduced motion mode',
      category: 'Accessibility'
    });
  }

  private checkFirstTimeUser(): void {
    // Check if this is the user's first time
    const hasSeenTour = localStorage.getItem('has_seen_basic_tour');
    if (!hasSeenTour) {
      // Delay the tour start to allow the UI to fully load
      setTimeout(() => {
        this.onboardingService.startTour('basic-tour');
        localStorage.setItem('has_seen_basic_tour', 'true');
      }, 1000);
    }
  }
}