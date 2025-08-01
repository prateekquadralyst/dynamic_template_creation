import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TemplateSection } from '../models/template.interface';
import { 
  HeroTemplateVariables, 
  FeaturesTemplateVariables, 
  TestimonialsTemplateVariables,
  StyleTemplate 
} from './template.service';

export interface TemplatePreviewOptions {
  width?: number;
  height?: number;
  scale?: number;
  showInteractive?: boolean;
  includeStyles?: boolean;
}

export interface TemplatePreviewResult {
  html: SafeHtml;
  css: string;
  previewUrl?: string;
  errors?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TemplatePreviewService {

  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Generate a live preview of a template with sample data
   */
  generateTemplatePreview(
    template: TemplateSection, 
    options: TemplatePreviewOptions = {}
  ): TemplatePreviewResult {
    const defaultOptions: TemplatePreviewOptions = {
      width: 300,
      height: 200,
      scale: 0.5,
      showInteractive: false,
      includeStyles: true,
      ...options
    };

    try {
      // Generate sample data based on template type
      const sampleData = this.generateSampleData(template);
      
      // Process template HTML with sample data
      const processedHtml = this.processTemplateHtml(template.html, sampleData);
      
      // Create preview HTML with styles
      const previewHtml = this.createPreviewHtml(
        processedHtml, 
        template.css, 
        defaultOptions
      );

      return {
        html: this.sanitizer.bypassSecurityTrustHtml(previewHtml),
        css: template.css,
        errors: []
      };
    } catch (error) {
      console.error('Error generating template preview:', error);
      return {
        html: this.sanitizer.bypassSecurityTrustHtml(this.createErrorPreview()),
        css: '',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Generate sample data for different template types
   */
  private generateSampleData(template: TemplateSection): any {
    switch (template.type) {
      case 'hero':
        return {
          headerText: 'Sample Hero Title',
          heroSubheading: 'This is a sample subheading for the hero section',
          imageUrl: 'https://via.placeholder.com/600x400/4f46e5/ffffff?text=Hero+Image'
        } as HeroTemplateVariables;

      case 'features':
        return {
          featuresTitle: 'Our Features',
          featuresSubheading: 'Discover what makes us special',
          features: [
            { title: 'Feature One', message: 'Description of the first feature' },
            { title: 'Feature Two', message: 'Description of the second feature' },
            { title: 'Feature Three', message: 'Description of the third feature' }
          ]
        } as FeaturesTemplateVariables;

      case 'testimonials':
        return {
          testimonialsTitle: 'What Our Customers Say',
          testimonialsSubheading: 'Real feedback from real people',
          testimonials: [
            {
              name: 'John Doe',
              role: 'CEO, Company',
              message: 'This is an amazing service that exceeded our expectations.',
              image: 'https://via.placeholder.com/80x80/6366f1/ffffff?text=JD',
              rating: 5
            },
            {
              name: 'Jane Smith',
              role: 'Marketing Director',
              message: 'Highly recommend this to anyone looking for quality.',
              image: 'https://via.placeholder.com/80x80/8b5cf6/ffffff?text=JS',
              rating: 5
            }
          ]
        } as TestimonialsTemplateVariables;

      default:
        return {};
    }
  }

  /**
   * Process template HTML by replacing placeholders with sample data
   */
  private processTemplateHtml(html: string, data: any): string {
    let processedHtml = html;

    // Replace simple placeholders
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string' || typeof data[key] === 'number') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        processedHtml = processedHtml.replace(regex, String(data[key]));
      }
    });

    // Handle features array
    if (data.features && Array.isArray(data.features)) {
      processedHtml = this.processFeaturesList(processedHtml, data.features);
    }

    // Handle testimonials array
    if (data.testimonials && Array.isArray(data.testimonials)) {
      processedHtml = this.processTestimonialsList(processedHtml, data.testimonials);
    }

    return processedHtml;
  }

  /**
   * Process features list in template
   */
  private processFeaturesList(html: string, features: any[]): string {
    const startMarker = '<!-- FEATURE_ITEM_START -->';
    const endMarker = '<!-- FEATURE_ITEM_END -->';

    const startIndex = html.indexOf(startMarker);
    const endIndex = html.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return html;
    }

    const featureTemplate = html.substring(
      startIndex + startMarker.length,
      endIndex
    );

    let allFeaturesHtml = '';
    features.forEach(feature => {
      let featureHtml = featureTemplate;
      featureHtml = featureHtml.replace(/{{title}}/g, feature.title || '');
      featureHtml = featureHtml.replace(/{{message}}/g, feature.message || '');
      allFeaturesHtml += featureHtml;
    });

    const before = html.substring(0, startIndex);
    const after = html.substring(endIndex + endMarker.length);

    return before + allFeaturesHtml + after;
  }

  /**
   * Process testimonials list in template
   */
  private processTestimonialsList(html: string, testimonials: any[]): string {
    const startMarker = '<!-- TESTIMONIAL_ITEM_START -->';
    const endMarker = '<!-- TESTIMONIAL_ITEM_END -->';

    const startIndex = html.indexOf(startMarker);
    const endIndex = html.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return html;
    }

    const testimonialTemplate = html.substring(
      startIndex + startMarker.length,
      endIndex
    );

    let allTestimonialsHtml = '';
    testimonials.forEach(testimonial => {
      let testimonialHtml = testimonialTemplate;
      testimonialHtml = testimonialHtml.replace(/{{name}}/g, testimonial.name || '');
      testimonialHtml = testimonialHtml.replace(/{{role}}/g, testimonial.role || '');
      testimonialHtml = testimonialHtml.replace(/{{message}}/g, testimonial.message || '');
      testimonialHtml = testimonialHtml.replace(/{{image}}/g, testimonial.image || '');
      testimonialHtml = testimonialHtml.replace(/{{rating}}/g, testimonial.rating || '');
      allTestimonialsHtml += testimonialHtml;
    });

    const before = html.substring(0, startIndex);
    const after = html.substring(endIndex + endMarker.length);

    return before + allTestimonialsHtml + after;
  }

  /**
   * Create preview HTML with proper styling and scaling
   */
  private createPreviewHtml(
    html: string, 
    css: string, 
    options: TemplatePreviewOptions
  ): string {
    const { width, height, scale, includeStyles } = options;

    const previewStyles = `
      <style>
        .template-preview-container {
          width: ${width}px;
          height: ${height}px;
          overflow: hidden;
          transform: scale(${scale});
          transform-origin: top left;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          position: relative;
        }
        .template-preview-content {
          width: ${(width || 300) / (scale || 0.5)}px;
          height: ${(height || 200) / (scale || 0.5)}px;
          overflow: hidden;
        }
        ${includeStyles ? css : ''}
        
        /* Bootstrap CDN for preview */
        @import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css');
        @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css');
      </style>
    `;

    return `
      ${previewStyles}
      <div class="template-preview-container">
        <div class="template-preview-content">
          ${html}
        </div>
      </div>
    `;
  }

  /**
   * Create error preview HTML
   */
  private createErrorPreview(): string {
    return `
      <div style="
        width: 300px; 
        height: 200px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        background: #f3f4f6; 
        border: 1px solid #e5e7eb; 
        border-radius: 8px;
        color: #6b7280;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="text-align: center;">
          <i class="bi bi-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
          <div>Preview Error</div>
        </div>
      </div>
    `;
  }

  /**
   * Generate a data URL for template preview (for use as image src)
   */
  async generatePreviewDataUrl(
    template: TemplateSection, 
    options: TemplatePreviewOptions = {}
  ): Promise<string> {
    try {
      const preview = this.generateTemplatePreview(template, options);
      
      // Create a temporary canvas to render the HTML
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      canvas.width = options.width || 300;
      canvas.height = options.height || 200;

      // For now, return a placeholder data URL
      // In a real implementation, you might use html2canvas or similar
      return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="${options.width || 300}" height="${options.height || 200}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f8fafc"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="system-ui" font-size="14" fill="#64748b">
            ${template.name} Preview
          </text>
        </svg>
      `);
    } catch (error) {
      console.error('Error generating preview data URL:', error);
      return 'data:image/svg+xml;base64,' + btoa(`
        <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#fee2e2"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="system-ui" font-size="14" fill="#dc2626">
            Preview Error
          </text>
        </svg>
      `);
    }
  }

  /**
   * Create a preview modal content
   */
  createPreviewModal(template: TemplateSection): SafeHtml {
    const preview = this.generateTemplatePreview(template, {
      width: 800,
      height: 600,
      scale: 1,
      showInteractive: true,
      includeStyles: true
    });

    const modalHtml = `
      <div class="template-preview-modal">
        <div class="preview-modal-header">
          <h3>${template.name}</h3>
          <p>${template.description}</p>
        </div>
        <div class="preview-modal-content">
          ${preview.html}
        </div>
      </div>
    `;

    return this.sanitizer.bypassSecurityTrustHtml(modalHtml);
  }
}