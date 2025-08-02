import { Injectable, OnDestroy } from '@angular/core';
import { Subject, fromEvent, takeUntil } from 'rxjs';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category: string;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService implements OnDestroy {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private destroy$ = new Subject<void>();
  private isEnabled = true;

  constructor() {
    this.initializeKeyboardListener();
    this.registerDefaultShortcuts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeKeyboardListener(): void {
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (!this.isEnabled) return;
        
        const shortcutKey = this.getShortcutKey(event);
        const shortcut = this.shortcuts.get(shortcutKey);
        
        if (shortcut) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
        }
      });
  }

  private getShortcutKey(event: KeyboardEvent): string {
    const parts = [];
    
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }

  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.buildShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  private buildShortcutKey(shortcut: KeyboardShortcut): string {
    const parts = [];
    
    if (shortcut.ctrlKey || shortcut.metaKey) parts.push('ctrl');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.shiftKey) parts.push('shift');
    
    parts.push(shortcut.key.toLowerCase());
    
    return parts.join('+');
  }

  unregisterShortcut(key: string): void {
    this.shortcuts.delete(key);
  }

  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  getShortcutsByCategory(category: string): KeyboardShortcut[] {
    return this.getAllShortcuts().filter(s => s.category === category);
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  private registerDefaultShortcuts(): void {
    // Global navigation shortcuts
    this.registerShortcut({
      key: 'Escape',
      action: () => this.handleEscapeKey(),
      description: 'Close modals and panels',
      category: 'Navigation'
    });

    // Focus management shortcuts
    this.registerShortcut({
      key: 'Tab',
      action: () => this.handleTabNavigation(),
      description: 'Navigate between focusable elements',
      category: 'Navigation'
    });

    // Quick actions
    this.registerShortcut({
      key: 's',
      ctrlKey: true,
      action: () => this.handleSave(),
      description: 'Save current project',
      category: 'General'
    });

    this.registerShortcut({
      key: 'n',
      ctrlKey: true,
      action: () => this.handleNewProject(),
      description: 'Create new project',
      category: 'General'
    });

    this.registerShortcut({
      key: 'o',
      ctrlKey: true,
      action: () => this.handleOpenProject(),
      description: 'Open project manager',
      category: 'General'
    });

    // Preview shortcuts
    this.registerShortcut({
      key: 'p',
      ctrlKey: true,
      action: () => this.handlePreview(),
      description: 'Open preview in new window',
      category: 'Preview'
    });

    this.registerShortcut({
      key: '1',
      ctrlKey: true,
      action: () => this.handleDesktopView(),
      description: 'Switch to desktop view',
      category: 'Preview'
    });

    this.registerShortcut({
      key: '2',
      ctrlKey: true,
      action: () => this.handleTabletView(),
      description: 'Switch to tablet view',
      category: 'Preview'
    });

    this.registerShortcut({
      key: '3',
      ctrlKey: true,
      action: () => this.handleMobileView(),
      description: 'Switch to mobile view',
      category: 'Preview'
    });

    // Editor shortcuts
    this.registerShortcut({
      key: 'e',
      ctrlKey: true,
      action: () => this.handleToggleEditor(),
      description: 'Toggle editor panel',
      category: 'Editor'
    });

    this.registerShortcut({
      key: 't',
      ctrlKey: true,
      action: () => this.handleToggleTemplates(),
      description: 'Toggle template panel',
      category: 'Editor'
    });
  }

  private handleEscapeKey(): void {
    // Emit escape event for components to handle
    document.dispatchEvent(new CustomEvent('keyboard-escape'));
  }

  private handleTabNavigation(): void {
    // Let browser handle tab navigation naturally
    return;
  }

  private handleSave(): void {
    document.dispatchEvent(new CustomEvent('keyboard-save'));
  }

  private handleNewProject(): void {
    document.dispatchEvent(new CustomEvent('keyboard-new-project'));
  }

  private handleOpenProject(): void {
    document.dispatchEvent(new CustomEvent('keyboard-open-project'));
  }

  private handlePreview(): void {
    document.dispatchEvent(new CustomEvent('keyboard-preview'));
  }

  private handleDesktopView(): void {
    document.dispatchEvent(new CustomEvent('keyboard-desktop-view'));
  }

  private handleTabletView(): void {
    document.dispatchEvent(new CustomEvent('keyboard-tablet-view'));
  }

  private handleMobileView(): void {
    document.dispatchEvent(new CustomEvent('keyboard-mobile-view'));
  }

  private handleToggleEditor(): void {
    document.dispatchEvent(new CustomEvent('keyboard-toggle-editor'));
  }

  private handleToggleTemplates(): void {
    document.dispatchEvent(new CustomEvent('keyboard-toggle-templates'));
  }
}