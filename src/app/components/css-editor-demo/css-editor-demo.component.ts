import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CssEditorComponent } from '../css-editor/css-editor.component';
import { CSSValidationError, CSSConflict } from '../../services/css-validation.service';

@Component({
  selector: 'app-css-editor-demo',
  standalone: true,
  imports: [CommonModule, CssEditorComponent],
  templateUrl: './css-editor-demo.component.html',
  styleUrls: ['./css-editor-demo.component.css']
})
export class CssEditorDemoComponent {
  
  // Sample CSS for demonstration
  sampleCSS = `/* Sample CSS for demonstration */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.button:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.card-content {
  color: #6b7280;
  line-height: 1.6;
}

/* Responsive design */
@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .title {
    font-size: 1.5rem;
  }
}`;

  currentCSS = this.sampleCSS;
  validationErrors: CSSValidationError[] = [];
  cssConflicts: CSSConflict[] = [];

  constructor() {}

  /**
   * Handle CSS value changes
   */
  onCSSChange(css: string): void {
    this.currentCSS = css;
    console.log('CSS changed:', css);
  }

  /**
   * Handle validation errors
   */
  onValidationErrors(errors: CSSValidationError[]): void {
    this.validationErrors = errors;
    console.log('Validation errors:', errors);
  }

  /**
   * Handle CSS conflicts
   */
  onCSSConflicts(conflicts: CSSConflict[]): void {
    this.cssConflicts = conflicts;
    console.log('CSS conflicts:', conflicts);
  }

  /**
   * Handle editor ready event
   */
  onEditorReady(editor: any): void {
    console.log('CSS Editor is ready:', editor);
  }

  /**
   * Load sample CSS with errors for testing
   */
  loadSampleWithErrors(): void {
    const cssWithErrors = `/* CSS with intentional errors for testing */
.test-class {
  color: invalid-color;
  background: #fff
  margin: 10px;
  margin: 20px; /* Duplicate property */
  unknown-property: value;
}

.another-class {
  display: flex;
  display: block; /* Conflict */
}

/* Missing closing brace
.broken-selector {
  color: red;

.valid-class {
  padding: 1rem;
}`;

    this.currentCSS = cssWithErrors;
  }

  /**
   * Load clean sample CSS
   */
  loadCleanSample(): void {
    this.currentCSS = this.sampleCSS;
  }

  /**
   * Clear CSS editor
   */
  clearCSS(): void {
    this.currentCSS = '';
  }
}