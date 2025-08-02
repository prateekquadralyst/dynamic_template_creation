import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardShortcutsService, KeyboardShortcut } from '../../services/keyboard-shortcuts.service';

@Component({
  selector: 'app-keyboard-shortcuts-help',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="shortcuts-help-overlay" *ngIf="isVisible" (click)="close()">
      <div class="shortcuts-help-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="close-btn" (click)="close()" aria-label="Close shortcuts help">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div class="modal-content">
          <div class="shortcuts-categories">
            <div class="category" *ngFor="let category of categories">
              <h3 class="category-title">{{ category }}</h3>
              <div class="shortcuts-list">
                <div class="shortcut-item" *ngFor="let shortcut of getShortcutsByCategory(category)">
                  <div class="shortcut-keys">
                    <kbd *ngFor="let key of getKeyParts(shortcut); let last = last">
                      {{ key }}
                      <span *ngIf="!last" class="key-separator">+</span>
                    </kbd>
                  </div>
                  <div class="shortcut-description">
                    {{ shortcut.description }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <p class="help-text">
            <i class="bi bi-info-circle"></i>
            Press <kbd>?</kbd> or <kbd>F1</kbd> to toggle this help panel
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shortcuts-help-overlay {
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

    .shortcuts-help-modal {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      max-width: 800px;
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

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #1a1a1a;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.2rem;
      color: #666;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: #f5f5f5;
      color: #333;
    }

    .modal-content {
      flex: 1;
      overflow-y: auto;
      padding: 0 24px;
    }

    .shortcuts-categories {
      display: grid;
      gap: 32px;
    }

    .category-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #333;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #007bff;
    }

    .shortcuts-list {
      display: grid;
      gap: 12px;
    }

    .shortcut-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 16px;
      background: #f8f9fa;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .shortcut-item:hover {
      background: #e9ecef;
    }

    .shortcut-keys {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 120px;
    }

    kbd {
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      color: #333;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 4px 8px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .key-separator {
      color: #666;
      font-weight: normal;
      margin: 0 2px;
    }

    .shortcut-description {
      flex: 1;
      color: #555;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .modal-footer {
      padding: 16px 24px 24px;
      border-top: 1px solid #eee;
      margin-top: 24px;
    }

    .help-text {
      margin: 0;
      font-size: 0.875rem;
      color: #666;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .help-text i {
      color: #007bff;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .shortcuts-help-modal {
        width: 95vw;
        max-height: 90vh;
      }

      .modal-header,
      .modal-content,
      .modal-footer {
        padding-left: 16px;
        padding-right: 16px;
      }

      .shortcut-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .shortcut-keys {
        min-width: auto;
      }

      .shortcuts-categories {
        gap: 24px;
      }
    }

    @media (max-width: 480px) {
      .shortcut-keys {
        flex-wrap: wrap;
      }

      kbd {
        font-size: 0.75rem;
        padding: 3px 6px;
      }
    }
  `]
})
export class KeyboardShortcutsHelpComponent implements OnInit {
  isVisible = false;
  shortcuts: KeyboardShortcut[] = [];
  categories: string[] = [];

  constructor(private keyboardShortcutsService: KeyboardShortcutsService) {}

  ngOnInit(): void {
    this.loadShortcuts();
  }

  show(): void {
    this.isVisible = true;
    this.loadShortcuts();
  }

  close(): void {
    this.isVisible = false;
  }

  toggle(): void {
    if (this.isVisible) {
      this.close();
    } else {
      this.show();
    }
  }

  private loadShortcuts(): void {
    this.shortcuts = this.keyboardShortcutsService.getAllShortcuts();
    this.categories = [...new Set(this.shortcuts.map(s => s.category))].sort();
  }

  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return this.keyboardShortcutsService.getShortcutsByCategory(category);
  }

  getKeyParts(shortcut: KeyboardShortcut): string[] {
    const parts = [];
    
    if (shortcut.ctrlKey || shortcut.metaKey) {
      parts.push(navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl');
    }
    if (shortcut.altKey) {
      parts.push('Alt');
    }
    if (shortcut.shiftKey) {
      parts.push('Shift');
    }
    
    // Format the key name
    let keyName = shortcut.key;
    if (keyName === ' ') keyName = 'Space';
    else if (keyName === 'ArrowUp') keyName = '↑';
    else if (keyName === 'ArrowDown') keyName = '↓';
    else if (keyName === 'ArrowLeft') keyName = '←';
    else if (keyName === 'ArrowRight') keyName = '→';
    else if (keyName === 'Enter') keyName = 'Enter';
    else if (keyName === 'Escape') keyName = 'Esc';
    else if (keyName === 'Delete') keyName = 'Del';
    else if (keyName === 'Backspace') keyName = 'Backspace';
    else keyName = keyName.toUpperCase();
    
    parts.push(keyName);
    
    return parts;
  }
}