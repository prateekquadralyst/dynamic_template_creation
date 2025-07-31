import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface Feature {
  title: string;
  message: string;
}

interface SectionEnabled {
  hero: boolean;
  features: boolean;
}

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.css']
})
export class PreviewComponent implements OnChanges {
  @Input() headerText: string = '';
  @Input() heroSubheading: string = '';
  @Input() imageUrl: string = '';
  @Input() heroHtml: string = '';
  @Input() heroCss: string = '';
  @Input() featuresHtml: string = '';
  @Input() featuresCss: string = '';
  @Input() featuresTitle: string = '';
  @Input() featuresSubheading: string = '';
  @Input() features: Feature[] = [];
  @Input() previewMode: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  @Input() sectionEnabled: SectionEnabled = { hero: true, features: true };
  @Input() styleCss: string = ''; // New input for style CSS

  @Input() testimonialsHtml: string = '';
  @Input() testimonialsCss: string = '';
  
  safeHtml: SafeHtml = '';
  
  constructor(private sanitizer: DomSanitizer) {}
  
  ngOnChanges(changes: SimpleChanges): void {
    // Immediately update the content when any input changes
    this.updateContent();
  }
  
  updateContent(): void {
    try {
      // Process the hero section (only if it's enabled)
      const processedHeroHtml = this.sectionEnabled?.hero ? this.processHeroSection() : '';
      
      // Process the features section (only if it's enabled)
      const processedFeaturesHtml = this.sectionEnabled?.features ? this.processFeaturesSection() : '';
      
      // Create a unique ID for the style tag
      const styleId = 'style-' + Math.random().toString(36).substring(2, 11);
      
      // Add Bootstrap CSS link
      const bootstrapCSS = `<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">`;
      
      // Add Bootstrap Icons
      const bootstrapIcons = `<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">`;
      
      // Add meta viewport tag for proper mobile rendering
      const viewportMeta = `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;
      
      // Add mobile-specific styles
      const mobileStyles = `
        /* Mobile-specific enhancements */
        @media (max-width: 768px) {
          body {
            font-size: 16px;
          }
          
          input, button, textarea, select {
            font-size: 16px; /* Prevents iOS zoom on focus */
          }
          
          .hero-content h1 {
            font-size: 2rem;
          }
          
          .hero-content p {
            font-size: 1rem;
          }
          
          .features-title {
            font-size: 1.75rem;
          }
          
          .feature-card {
            padding: 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .hero-section {
            padding: 1rem;
          }
          
          .hero-content h1 {
            font-size: 1.75rem;
          }
          
          .features-section {
            padding: 1rem;
          }
          
          .features-grid {
            gap: 1rem;
          }
        }
      `;
      
      // Special style for subheadings to ensure they're visible
      const subheadingStyles = `
        /* Ensure subheadings are visible */
        .hero-content p.lead {
          display: block !important;
          visibility: visible !important;
        }
        
        .features-section .lead {
          display: block !important;
          visibility: visible !important;
        }
      `;
      
      // Include only the CSS for the enabled sections
      const heroCssContent = this.sectionEnabled?.hero ? this.heroCss || '' : '';
      const featuresCssContent = this.sectionEnabled?.features ? this.featuresCss || '' : '';
      
      // Combine HTML and CSS for the complete page, including style CSS
      const htmlWithStyle = `
        ${bootstrapCSS}
        ${bootstrapIcons}
        <style id="${styleId}">
          ${this.styleCss || ''} /* Apply style CSS first for proper cascading */
          ${heroCssContent}
          ${featuresCssContent}
          ${mobileStyles}
          ${subheadingStyles}
        </style>
        ${viewportMeta}
        ${processedHeroHtml || ''}
        ${processedFeaturesHtml || ''}
      `;
      
      // Make the HTML safe for insertion
      this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(htmlWithStyle);
    } catch (error) {
      console.error('Error processing HTML/CSS:', error);
    }
  }
  
  /**
   * Process the hero section template
   */
  private processHeroSection(): string {
    if (!this.heroHtml) {
      return '';
    }
    
    // Make sure to explicitly check for null or undefined
    const headerText = this.headerText || '';
    const heroSubheading = this.heroSubheading || '';
    const imageUrl = this.imageUrl || '';
    
    // Replace placeholders in the hero HTML using string split/join for exact replacement
    let result = this.heroHtml;
    result = result.replace(/{{headerText}}/g, headerText);
    result = result.replace(/{{heroSubheading}}/g, heroSubheading);
    result = result.replace(/{{imageUrl}}/g, imageUrl);
    
    return result;
  }
  
  /**
   * Process the features section, extracting and applying the feature template
   */
  private processFeaturesSection(): string {
    // Early return if features HTML is empty
    if (!this.featuresHtml) {
      return '';
    }
    
    // Make sure to explicitly check for null or undefined
    const featuresTitle = this.featuresTitle || '';
    const featuresSubheading = this.featuresSubheading || '';
    
    // Replace the features title placeholder using global regex replacement
    let processedHtml = this.featuresHtml;
    processedHtml = processedHtml.replace(/{{featuresTitle}}/g, featuresTitle);
    processedHtml = processedHtml.replace(/{{featuresSubheading}}/g, featuresSubheading);
    
    // Extract and process feature template
    const startMarker = '<!-- FEATURE_ITEM_START -->';
    const endMarker = '<!-- FEATURE_ITEM_END -->';
    
    const startIndex = processedHtml.indexOf(startMarker);
    const endIndex = processedHtml.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      return processedHtml; // Cannot find markers
    }
    
    // Extract the template including its whitespace context
    const featureTemplate = processedHtml.substring(
      startIndex + startMarker.length,
      endIndex
    );
    
    // Generate all features HTML from template
    let allFeaturesHtml = '';
    
    // Process each feature using regex replacement for guaranteed replacement
    for (const feature of this.features) {
      // Create a copy of the template for this feature
      let featureHtml = featureTemplate;
      
      // Replace placeholders with feature data
      featureHtml = featureHtml.replace(/{{title}}/g, feature.title || '');
      featureHtml = featureHtml.replace(/{{message}}/g, feature.message || '');
      
      // Add to the collection
      allFeaturesHtml += featureHtml;
    }
    
    // Replace the entire template section with the generated features
    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);
    
    return before + allFeaturesHtml + after;
  }
}