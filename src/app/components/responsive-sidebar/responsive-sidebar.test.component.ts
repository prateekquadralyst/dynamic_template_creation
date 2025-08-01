import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResponsiveSidebarComponent, SidebarState } from './responsive-sidebar.component';
import { TemplateSection } from '../../models/template.interface';
import { SectionType } from '../../models/section.interface';

@Component({
  selector: 'app-responsive-sidebar-test',
  standalone: true,
  imports: [CommonModule, ResponsiveSidebarComponent],
  template: `
    <div class="test-container">
      <h2>Responsive Sidebar Test</h2>
      
      <div class="controls">
        <button (click)="toggleSidebar()">
          {{ sidebarState.isOpen ? 'Close' : 'Open' }} Sidebar
        </button>
        <button (click)="addTestTemplate()">Add Test Template</button>
        <button (click)="clearTemplates()">Clear Templates</button>
      </div>
      
      <div class="sidebar-info">
        <p>Sidebar State: {{ sidebarState.isOpen ? 'Open' : 'Closed' }}</p>
        <p>Width: {{ sidebarState.width }}px</p>
        <p>Active Tab: {{ sidebarState.activeTab }}</p>
        <p>Templates: {{ testTemplates.length }}</p>
        <p>Selected: {{ selectedTemplateId || 'None' }}</p>
      </div>

      <app-responsive-sidebar
        [templates]="testTemplates"
        [selectedTemplateId]="selectedTemplateId"
        [activeTemplateType]="activeTemplateType"
        [showTemplatePreview]="true"
        [enableKeyboardNavigation]="true"
        (templateSelected)="onTemplateSelected($event)"
        (templatePreview)="onTemplatePreview($event)"
        (sidebarStateChanged)="onSidebarStateChanged($event)"
        (sidebarClosed)="onSidebarClosed()"
      ></app-responsive-sidebar>
    </div>
  `,
  styles: [`
    .test-container {
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    .controls {
      margin: 20px 0;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .controls button {
      padding: 8px 16px;
      background: #4361ee;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .controls button:hover {
      background: #3a56d4;
    }
    
    .sidebar-info {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      margin: 20px 0;
    }
    
    .sidebar-info p {
      margin: 4px 0;
      font-size: 14px;
    }
  `]
})
export class ResponsiveSidebarTestComponent {
  testTemplates: TemplateSection[] = [];
  selectedTemplateId: string | null = null;
  activeTemplateType: SectionType = SectionType.HERO;
  
  sidebarState: SidebarState = {
    isOpen: true,
    isCollapsed: false,
    activeTab: 'templates',
    width: 320
  };

  constructor() {
    this.initializeTestTemplates();
  }

  private initializeTestTemplates(): void {
    this.testTemplates = [
      {
        id: 'hero-1',
        name: 'Modern Hero',
        description: 'A modern hero section with clean design',
        type: SectionType.HERO,
        html: '<div class="hero">Hero Content</div>',
        css: '.hero { padding: 60px 0; }',
        variables: {},
        isBuiltIn: true,
        previewImage: '/assets/previews/placeholder.svg',
        tags: ['modern', 'clean'],
        category: 'hero'
      },
      {
        id: 'hero-2',
        name: 'Creative Hero',
        description: 'A creative hero section with animations',
        type: SectionType.HERO,
        html: '<div class="hero-creative">Creative Hero</div>',
        css: '.hero-creative { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); }',
        variables: {},
        isBuiltIn: false,
        previewImage: '/assets/previews/placeholder.svg',
        tags: ['creative', 'animated'],
        category: 'hero'
      },
      {
        id: 'features-1',
        name: 'Feature Grid',
        description: 'A grid layout for features',
        type: SectionType.FEATURES,
        html: '<div class="features-grid">Features</div>',
        css: '.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); }',
        variables: {},
        isBuiltIn: true,
        previewImage: '/assets/previews/placeholder.svg',
        tags: ['grid', 'features'],
        category: 'features'
      }
    ];
  }

  toggleSidebar(): void {
    this.sidebarState = {
      ...this.sidebarState,
      isOpen: !this.sidebarState.isOpen
    };
  }

  addTestTemplate(): void {
    const newTemplate: TemplateSection = {
      id: `template-${Date.now()}`,
      name: `Test Template ${this.testTemplates.length + 1}`,
      description: 'A dynamically added test template',
      type: SectionType.HERO,
      html: '<div>Test Template</div>',
      css: 'div { color: blue; }',
      variables: {},
      isBuiltIn: false,
      previewImage: '/assets/previews/placeholder.svg',
      tags: ['test', 'dynamic'],
      category: 'hero'
    };
    
    this.testTemplates = [...this.testTemplates, newTemplate];
  }

  clearTemplates(): void {
    this.testTemplates = [];
    this.selectedTemplateId = null;
  }

  onTemplateSelected(template: TemplateSection): void {
    this.selectedTemplateId = template.id;
    console.log('Template selected:', template.name);
  }

  onTemplatePreview(template: TemplateSection): void {
    console.log('Template preview:', template.name);
    alert(`Previewing: ${template.name}`);
  }

  onSidebarStateChanged(state: SidebarState): void {
    this.sidebarState = { ...state };
    console.log('Sidebar state changed:', state);
  }

  onSidebarClosed(): void {
    this.sidebarState = {
      ...this.sidebarState,
      isOpen: false
    };
    console.log('Sidebar closed');
  }
}