import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../../services/onboarding.service';
import { KeyboardShortcutsHelpComponent } from '../keyboard-shortcuts-help/keyboard-shortcuts-help.component';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-help-system',
  standalone: true,
  imports: [CommonModule, KeyboardShortcutsHelpComponent, ClickOutsideDirective],
  template: `
    <div class="help-system">
      <button 
        class="help-btn"
        (click)="toggleHelpMenu()"
        [class.active]="showHelpMenu"
        title="Help & Support"
        aria-label="Open help menu">
        <i class="bi bi-question-circle"></i>
        <span class="btn-text">Help</span>
      </button>
      
      <div class="help-menu" *ngIf="showHelpMenu" (clickOutside)="closeHelpMenu()">
        <div class="help-menu-header">
          <h4>Help & Support</h4>
          <button class="close-btn" (click)="closeHelpMenu()" aria-label="Close help menu">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div class="help-menu-content">
          <div class="help-section">
            <h5>Getting Started</h5>
            <div class="help-items">
              <button class="help-item" (click)="startBasicTour()">
                <i class="bi bi-play-circle"></i>
                <div class="help-item-content">
                  <span class="help-item-title">Take the Tour</span>
                  <span class="help-item-description">Learn the basics of using the Website Builder</span>
                </div>
              </button>
              
              <button class="help-item" (click)="startAdvancedTour()">
                <i class="bi bi-gear"></i>
                <div class="help-item-content">
                  <span class="help-item-title">Advanced Features</span>
                  <span class="help-item-description">Discover advanced tools and shortcuts</span>
                </div>
              </button>
            </div>
          </div>
          
          <div class="help-section">
            <h5>Quick Reference</h5>
            <div class="help-items">
              <button class="help-item" (click)="showKeyboardShortcuts()">
                <i class="bi bi-keyboard"></i>
                <div class="help-item-content">
                  <span class="help-item-title">Keyboard Shortcuts</span>
                  <span class="help-item-description">View all available keyboard shortcuts</span>
                </div>
              </button>
              
              <button class="help-item" (click)="showTips()">
                <i class="bi bi-lightbulb"></i>
                <div class="help-item-content">
                  <span class="help-item-title">Tips & Tricks</span>
                  <span class="help-item-description">Learn helpful tips for better productivity</span>
                </div>
              </button>
            </div>
          </div>
          
          <div class="help-section">
            <h5>Support</h5>
            <div class="help-items">
              <button class="help-item" (click)="showDocumentation()">
                <i class="bi bi-book"></i>
                <div class="help-item-content">
                  <span class="help-item-title">Documentation</span>
                  <span class="help-item-description">Read the complete user guide</span>
                </div>
              </button>
              
              <button class="help-item" (click)="reportIssue()">
                <i class="bi bi-bug"></i>
                <div class="help-item-content">
                  <span class="help-item-title">Report an Issue</span>
                  <span class="help-item-description">Let us know about problems or bugs</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tips Modal -->
      <div class="tips-modal-overlay" *ngIf="showTipsModal" (click)="closeTipsModal()">
        <div class="tips-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Tips & Tricks</h3>
            <button class="close-btn" (click)="closeTipsModal()" aria-label="Close tips">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          
          <div class="modal-content">
            <div class="tip-item" *ngFor="let tip of tips">
              <div class="tip-icon">
                <i [class]="tip.icon"></i>
              </div>
              <div class="tip-content">
                <h4>{{ tip.title }}</h4>
                <p>{{ tip.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Keyboard Shortcuts Help Component -->
    <app-keyboard-shortcuts-help #keyboardShortcutsHelp></app-keyboard-shortcuts-help>
  `,
  styles: [`
    .help-system {
      position: relative;
    }

    .help-btn {
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

    .help-btn:hover {
      background: #e9ecef;
      color: #212529;
    }

    .help-btn.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .help-btn i {
      font-size: 1rem;
    }

    .btn-text {
      font-size: 0.875rem;
    }

    .help-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 350px;
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

    .help-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e9ecef;
    }

    .help-menu-header h4 {
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

    .help-menu-content {
      max-height: 400px;
      overflow-y: auto;
    }

    .help-section {
      padding: 16px;
    }

    .help-section:not(:last-child) {
      border-bottom: 1px solid #f1f3f4;
    }

    .help-section h5 {
      margin: 0 0 12px 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .help-items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .help-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      width: 100%;
    }

    .help-item:hover {
      background: #f8f9fa;
    }

    .help-item i {
      font-size: 1.25rem;
      color: #007bff;
      width: 20px;
      text-align: center;
    }

    .help-item-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .help-item-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #212529;
    }

    .help-item-description {
      font-size: 0.75rem;
      color: #6c757d;
      line-height: 1.3;
    }

    /* Tips Modal */
    .tips-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .tips-modal {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      max-height: 80vh;
      width: 90vw;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 24px 0;
      border-bottom: 1px solid #eee;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1a1a1a;
    }

    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: 0 24px 24px;
    }

    .tip-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      background: #f8f9fa;
    }

    .tip-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      background: #007bff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .tip-icon i {
      font-size: 1.25rem;
    }

    .tip-content h4 {
      margin: 0 0 8px 0;
      font-size: 1rem;
      font-weight: 600;
      color: #212529;
    }

    .tip-content p {
      margin: 0;
      font-size: 0.875rem;
      color: #6c757d;
      line-height: 1.5;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .btn-text {
        display: none;
      }

      .help-btn {
        padding: 8px;
      }

      .help-menu {
        right: -50px;
        min-width: 320px;
      }

      .tips-modal {
        width: 95vw;
        max-height: 90vh;
      }

      .modal-header,
      .modal-content {
        padding-left: 16px;
        padding-right: 16px;
      }
    }

    @media (max-width: 480px) {
      .help-menu {
        position: fixed;
        top: 50%;
        left: 50%;
        right: auto;
        transform: translate(-50%, -50%);
        margin-top: 0;
        min-width: 300px;
        max-width: 90vw;
      }

      .tip-item {
        flex-direction: column;
        text-align: center;
      }

      .tip-icon {
        align-self: center;
      }
    }
  `]
})
export class HelpSystemComponent implements OnInit {
  showHelpMenu = false;
  showTipsModal = false;

  @ViewChild('keyboardShortcutsHelp') keyboardShortcutsHelp!: KeyboardShortcutsHelpComponent;

  tips = [
    {
      icon: 'bi bi-lightning',
      title: 'Use Keyboard Shortcuts',
      description: 'Speed up your workflow with keyboard shortcuts. Press Ctrl+Z to undo, Ctrl+Y to redo, and Ctrl+S to save your project.'
    },
    {
      icon: 'bi bi-mouse',
      title: 'Drag and Drop',
      description: 'Reorder sections and features by dragging them. Look for drag handles (⋮⋮) next to items you can move.'
    },
    {
      icon: 'bi bi-eye',
      title: 'Live Preview',
      description: 'See your changes instantly in the preview panel. Switch between desktop, tablet, and mobile views to test responsiveness.'
    },
    {
      icon: 'bi bi-palette',
      title: 'Global Styling',
      description: 'Use the Global Styling section to apply consistent colors, fonts, and spacing across your entire website.'
    },
    {
      icon: 'bi bi-grid-3x3',
      title: 'Browse Layouts',
      description: 'Click "Browse Layouts" in any section to see different design options. You can also create custom templates.'
    },
    {
      icon: 'bi bi-save',
      title: 'Auto-Save',
      description: 'Your work is automatically saved as you make changes. You can also manually save with Ctrl+S.'
    },
    {
      icon: 'bi bi-phone',
      title: 'Mobile-First Design',
      description: 'Start designing for mobile devices first, then enhance for larger screens. This ensures better mobile experience.'
    },
    {
      icon: 'bi bi-code-slash',
      title: 'Custom Code',
      description: 'Advanced users can edit HTML and CSS directly in the code editors for complete customization.'
    }
  ];

  constructor(private onboardingService: OnboardingService) {}

  ngOnInit(): void {
    // Component initialization
  }

  toggleHelpMenu(): void {
    this.showHelpMenu = !this.showHelpMenu;
  }

  closeHelpMenu(): void {
    this.showHelpMenu = false;
  }

  startBasicTour(): void {
    this.closeHelpMenu();
    this.onboardingService.startTour('basic-tour');
  }

  startAdvancedTour(): void {
    this.closeHelpMenu();
    this.onboardingService.startTour('advanced-tour');
  }

  showKeyboardShortcuts(): void {
    this.closeHelpMenu();
    this.keyboardShortcutsHelp.show();
  }

  showTips(): void {
    this.closeHelpMenu();
    this.showTipsModal = true;
  }

  closeTipsModal(): void {
    this.showTipsModal = false;
  }

  showDocumentation(): void {
    this.closeHelpMenu();
    // In a real app, this would open documentation
    window.open('https://docs.example.com', '_blank');
  }

  reportIssue(): void {
    this.closeHelpMenu();
    // In a real app, this would open a bug report form
    window.open('https://github.com/example/issues/new', '_blank');
  }
}