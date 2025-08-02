import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResponsiveDesignEditorComponent, DevicePreset, ResponsiveIssue } from './responsive-design-editor.component';
import { ResponsiveSettings, Breakpoint } from '../../models/section.interface';

@Component({
  selector: 'app-responsive-design-editor-demo',
  standalone: true,
  imports: [CommonModule, ResponsiveDesignEditorComponent],
  template: `
    <div class="demo-container">
      <h2>Responsive Design Editor Demo</h2>
      
      <div class="demo-content">
        <div class="demo-controls">
          <h3>Current Settings</h3>
          <div class="settings-display">
            <h4>Selected Device: {{ selectedDevice?.name || 'None' }}</h4>
            <p>Dimensions: {{ selectedDevice?.width }}×{{ selectedDevice?.height }}</p>
            <p>Type: {{ selectedDevice?.type }}</p>
            
            <h4>Breakpoints ({{ responsiveSettings.breakpoints.length }})</h4>
            <ul>
              <li *ngFor="let bp of responsiveSettings.breakpoints">
                {{ bp.name }}: {{ bp.minWidth }}px
                <span *ngIf="bp.maxWidth"> - {{ bp.maxWidth }}px</span>
              </li>
            </ul>
            
            <h4>Issues Detected ({{ detectedIssues.length }})</h4>
            <ul>
              <li *ngFor="let issue of detectedIssues" [class]="'issue-' + issue.severity">
                {{ issue.type | titlecase }}: {{ issue.message }}
              </li>
            </ul>
          </div>
        </div>
        
        <div class="demo-editor">
          <app-responsive-design-editor
            [responsiveSettings]="responsiveSettings"
            [currentContent]="sampleContent"
            [isVisible]="true"
            (responsiveSettingsChange)="onResponsiveSettingsChange($event)"
            (devicePreviewChange)="onDevicePreviewChange($event)"
            (breakpointChange)="onBreakpointChange($event)"
            (issuesDetected)="onIssuesDetected($event)">
          </app-responsive-design-editor>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .demo-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .demo-content {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 20px;
      margin-top: 20px;
    }
    
    .demo-controls {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }
    
    .settings-display h4 {
      margin: 16px 0 8px 0;
      color: #495057;
    }
    
    .settings-display ul {
      margin: 8px 0;
      padding-left: 20px;
    }
    
    .settings-display li {
      margin: 4px 0;
    }
    
    .issue-low { color: #856404; }
    .issue-medium { color: #721c24; }
    .issue-high { color: #721c24; font-weight: bold; }
    
    .demo-editor {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      overflow: hidden;
      height: 800px;
    }
    
    @media (max-width: 768px) {
      .demo-content {
        grid-template-columns: 1fr;
      }
      
      .demo-editor {
        height: 600px;
      }
    }
  `]
})
export class ResponsiveDesignEditorDemoComponent implements OnInit {
  responsiveSettings: ResponsiveSettings = {
    breakpoints: [
      { name: 'mobile', minWidth: 0, maxWidth: 767 },
      { name: 'tablet', minWidth: 768, maxWidth: 1023 },
      { name: 'desktop', minWidth: 1024 }
    ],
    deviceSpecificStyles: {
      mobile: { fontSize: '14px', padding: '10px' },
      tablet: { fontSize: '16px', padding: '15px' },
      desktop: { fontSize: '18px', padding: '20px' }
    }
  };

  selectedDevice?: DevicePreset;
  detectedIssues: ResponsiveIssue[] = [];

  // Sample content with some responsive issues for demonstration
  sampleContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sample Page</title>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { width: 1200px; margin: 0 auto; }
        .sidebar { width: 300px; float: left; }
        .content { width: 900px; float: right; }
        .button { width: 30px; height: 30px; }
        .fixed-element { width: 500px; height: 200px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="sidebar">Sidebar content</div>
        <div class="content">
          <h1>Main Content</h1>
          <p>This is a sample page with some responsive issues.</p>
          <button class="button">Click</button>
          <div class="fixed-element">Fixed width element</div>
        </div>
      </div>
    </body>
    </html>
  `;

  ngOnInit(): void {
    console.log('Responsive Design Editor Demo initialized');
  }

  onResponsiveSettingsChange(settings: ResponsiveSettings): void {
    this.responsiveSettings = settings;
    console.log('Responsive settings changed:', settings);
  }

  onDevicePreviewChange(device: DevicePreset): void {
    this.selectedDevice = device;
    console.log('Device preview changed:', device);
  }

  onBreakpointChange(breakpoints: Breakpoint[]): void {
    this.responsiveSettings.breakpoints = breakpoints;
    console.log('Breakpoints changed:', breakpoints);
  }

  onIssuesDetected(issues: ResponsiveIssue[]): void {
    this.detectedIssues = issues;
    console.log('Issues detected:', issues);
  }
}