import { Injectable } from "@angular/core";
import { Observable, of, BehaviorSubject } from "rxjs";
import { map } from "rxjs/operators";
import {
  ITemplateService,
  TemplateUsageStats,
} from "./interfaces/template-service.interface";
import {
  CustomTemplate,
  TemplateSection,
  TemplateProcessingResult,
  TemplateExportData,
  TemplateError,
  TemplateWarning,
  ErrorType,
} from "../models/template.interface";
import { SectionType } from "../models/section.interface";
import { DatabaseService } from "./database.service";
import { validateTemplate } from "../utils/template-validation.util";

export interface Template {
  heroHtml: string;
  heroCss: string;
  aboutHtml: string;
  aboutCss: string;
  servicesHtml: string;
  servicesCss: string;
  featuresHtml: string;
  featuresCss: string;
  testimonialsHtml: string;
  testimonialsCss: string;
  contactHtml: string;
  contactCss: string;
  footerHtml: string;
  footerCss: string;
  heroData?: HeroTemplateVariables;
  aboutData?: AboutTemplateVariables;
  servicesData?: ServicesTemplateVariables;
  featuresData?: FeaturesTemplateVariables;
  testimonialsData?: TestimonialsTemplateVariables;
  contactData?: ContactTemplateVariables;
  footerData?: FooterTemplateVariables;
}

export interface HeroTemplateVariables {
  headerText: string;
  heroSubheading: string;
  imageUrl: string;
}

export interface FeaturesTemplateVariables {
  featuresTitle: string;
  featuresSubheading: string;
  features: Array<{
    title: string;
    message: string;
  }>;
}

export interface AboutTemplateVariables {
  aboutTitle: string;
  aboutDescription: string;
  aboutImageUrl: string;
}

export interface ServicesTemplateVariables {
  servicesTitle: string;
  servicesSubheading: string;
  services: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export interface TestimonialsTemplateVariables {
  testimonialsTitle: string;
  testimonialsSubheading: string;
  testimonials: Array<{
    name: string;
    role: string;
    message: string;
    image: string;
    rating: number;
    company?: string; // Optional company field
  }>;
}

export interface FooterTemplateVariables {
  footerCompanyName: string;
  footerDescription: string;
  footerCopyright: string;
  socialLinks: Array<{
    platform: string;
    url: string;
  }>;
}

export interface PricingTemplateVariables {
  pricingTitle: string;
  pricingSubheading: string;
  plans: Array<{
    name: string;
    price: string;
    interval: string;
    features: string[];
    isPopular: boolean;
  }>;
}

export interface ContactTemplateVariables {
  contactTitle: string;
  contactSubheading: string;
  address: string;
  email: string;
  phone: string;
  mapUrl: string;
}

// Generic template variables type for when we don't know which specific type we're dealing with
export interface TemplateVariables {
  [key: string]: any;
}

// Internal template structure used by the service
interface InternalTemplateSection {
  id: string;
  type: SectionType;
  name: string;
  previewImage: string;
  description: string;
  html: string;
  css: string;
  variables:
    | HeroTemplateVariables
    | AboutTemplateVariables
    | ServicesTemplateVariables
    | FeaturesTemplateVariables
    | TestimonialsTemplateVariables
    | PricingTemplateVariables
    | ContactTemplateVariables
    | FooterTemplateVariables;
}

// New interface for style templates
export interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  headingFont: string;
  bodyFont: string;
  buttonStyle: "rounded" | "square" | "pill";
  fontCssUrl: string; // Google Fonts URL
}

const templateTypes = [
  "hero",
  "about",
  "services",
  "features",
  "testimonials",
  "pricing",
  "contact",
  "footer",
] as const;
type TemplateType = (typeof templateTypes)[number];

@Injectable({
  providedIn: "root",
})
export class TemplateService implements ITemplateService {
  // Enhanced template service properties
  private customTemplatesSubject = new BehaviorSubject<CustomTemplate[]>([]);
  private templateUpdateSubjects = new Map<
    string,
    BehaviorSubject<CustomTemplate>
  >();

  constructor(private databaseService: DatabaseService) {
    this.loadCustomTemplates();

    // Initialize template registry
    this.templates.forEach((template) => {
      this.templateRegistry.set(template.id, {
        id: template.id,
        type: template.type,
        name: template.name,
        previewImage: template.previewImage,
        description: template.description,
        html: template.html,
        css: template.css,
        variables: template.variables as any,
        isBuiltIn: true,
        category: "built-in",
        tags: [],
      });
    });
  }

  /**
   * Load custom templates from database
   */
  private async loadCustomTemplates(): Promise<void> {
    try {
      const templates = await this.databaseService.getAllTemplates();
      this.customTemplatesSubject.next(templates);
    } catch (error) {
      console.error("Failed to load custom templates:", error);
      this.customTemplatesSubject.next([]);
    }
  }

  /**
   * Generate a unique ID for new templates
   */
  private generateTemplateId(): string {
    return (
      "template_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  /**
   * Create a new custom template
   */
  async createCustomTemplate(
    template: Partial<CustomTemplate>
  ): Promise<CustomTemplate> {
    const newTemplate: CustomTemplate = {
      id: this.generateTemplateId(),
      name: template.name || "Untitled Template",
      description: template.description || "",
      type: template.type || SectionType.HERO,
      html: template.html || "",
      css: template.css || "",
      variables: template.variables || [],
      previewImage: template.previewImage || "",
      isCustom: true,
      createdBy: template.createdBy || "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      rating: template.rating,
      tags: template.tags || [],
      dependencies: template.dependencies || [],
    };

    try {
      await this.databaseService.saveTemplate(newTemplate);

      // Update the local cache
      const currentTemplates = this.customTemplatesSubject.value;
      this.customTemplatesSubject.next([...currentTemplates, newTemplate]);

      return newTemplate;
    } catch (error) {
      console.error("Failed to create custom template:", error);
      throw new Error("Failed to create template");
    }
  }

  /**
   * Update an existing custom template
   */
  async updateCustomTemplate(
    id: string,
    updates: Partial<CustomTemplate>
  ): Promise<CustomTemplate> {
    try {
      const existingTemplate = await this.databaseService.getTemplate(id);
      if (!existingTemplate) {
        throw new Error("Template not found");
      }

      const updatedTemplate: CustomTemplate = {
        ...existingTemplate,
        ...updates,
        id: existingTemplate.id, // Ensure ID doesn't change
        updatedAt: new Date(),
      };

      await this.databaseService.saveTemplate(updatedTemplate);

      // Update the local cache
      const currentTemplates = this.customTemplatesSubject.value;
      const updatedTemplates = currentTemplates.map((t) =>
        t.id === id ? updatedTemplate : t
      );
      this.customTemplatesSubject.next(updatedTemplates);

      // Update individual template subject if it exists
      const templateSubject = this.templateUpdateSubjects.get(id);
      if (templateSubject) {
        templateSubject.next(updatedTemplate);
      }

      return updatedTemplate;
    } catch (error) {
      console.error("Failed to update custom template:", error);
      throw new Error("Failed to update template");
    }
  }

  /**
   * Delete a custom template
   */
  async deleteCustomTemplate(id: string): Promise<void> {
    try {
      await this.databaseService.deleteTemplate(id);

      // Update the local cache
      const currentTemplates = this.customTemplatesSubject.value;
      const filteredTemplates = currentTemplates.filter((t) => t.id !== id);
      this.customTemplatesSubject.next(filteredTemplates);

      // Clean up individual template subject
      const templateSubject = this.templateUpdateSubjects.get(id);
      if (templateSubject) {
        templateSubject.complete();
        this.templateUpdateSubjects.delete(id);
      }
    } catch (error) {
      console.error("Failed to delete custom template:", error);
      throw new Error("Failed to delete template");
    }
  }

  /**
   * Get all custom templates
   */
  async getCustomTemplates(): Promise<CustomTemplate[]> {
    return this.customTemplatesSubject.value;
  }

  /**
   * Get a specific custom template by ID
   */
  async getCustomTemplate(id: string): Promise<CustomTemplate | null> {
    const templates = this.customTemplatesSubject.value;
    return templates.find((t) => t.id === id) || null;
  }

  /**
   * Get custom templates updates as observable
   */
  getCustomTemplatesUpdates(): Observable<CustomTemplate[]> {
    return this.customTemplatesSubject.asObservable();
  }

  /**
   * Get updates for a specific template
   */
  getTemplateUpdates(templateId: string): Observable<CustomTemplate> {
    if (!this.templateUpdateSubjects.has(templateId)) {
      this.templateUpdateSubjects.set(
        templateId,
        new BehaviorSubject<CustomTemplate>({} as CustomTemplate)
      );
    }
    return this.templateUpdateSubjects.get(templateId)!.asObservable();
  }

  /**
   * Import a template from export data
   */
  async importTemplate(
    templateData: TemplateExportData
  ): Promise<CustomTemplate> {
    try {
      // Validate the template data
      if (!templateData.template || !templateData.template.name) {
        throw new Error("Invalid template data");
      }

      // Create a new template with a new ID to avoid conflicts
      const importedTemplate: CustomTemplate = {
        ...templateData.template,
        id: this.generateTemplateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        isCustom: true,
      };

      // Save the imported template
      await this.databaseService.saveTemplate(importedTemplate);

      // Update the local cache
      const currentTemplates = this.customTemplatesSubject.value;
      this.customTemplatesSubject.next([...currentTemplates, importedTemplate]);

      return importedTemplate;
    } catch (error) {
      console.error("Failed to import template:", error);
      throw new Error("Failed to import template");
    }
  }

  /**
   * Export a template with its dependencies
   */
  async exportTemplate(templateId: string): Promise<TemplateExportData> {
    try {
      const template = await this.getCustomTemplate(templateId);
      if (!template) {
        throw new Error("Template not found");
      }

      const exportData: TemplateExportData = {
        template: template,
        dependencies: template.dependencies.map((dep) => ({
          type: dep as any,
          name: dep,
          version: "1.0.0",
        })),
        metadata: {
          exportedAt: new Date(),
          exportedBy: "user",
          version: "1.0.0",
          compatibility: ["1.0.0"],
        },
      };

      return exportData;
    } catch (error) {
      console.error("Failed to export template:", error);
      throw new Error("Failed to export template");
    }
  }

  /**
   * Get all templates (built-in + custom) for a specific type
   */
  async getAllTemplatesByType(type: SectionType): Promise<TemplateSection[]> {
    const builtInTemplates = this.getTemplatesByType(type);
    const customTemplates = await this.getCustomTemplates();

    // Convert custom templates to TemplateSection format
    const customTemplateSections: TemplateSection[] = customTemplates
      .filter((template) => template.type === type)
      .map((template) => this.convertCustomTemplateToSection(template));

    return [...builtInTemplates, ...customTemplateSections];
  }

  /**
   * Convert CustomTemplate to TemplateSection format
   */
  private convertCustomTemplateToSection(
    customTemplate: CustomTemplate
  ): TemplateSection {
    return {
      id: customTemplate.id,
      type: customTemplate.type,
      name: customTemplate.name,
      previewImage:
        customTemplate.previewImage || "assets/previews/custom-template.jpg",
      description: customTemplate.description,
      html: customTemplate.html,
      css: customTemplate.css,
      variables: this.convertVariablesToTemplateVariables(
        customTemplate.variables
      ),
      isBuiltIn: false,
      category: "custom",
      tags: customTemplate.tags,
    };
  }

  /**
   * Convert template variables to the format expected by TemplateSection
   */
  private convertVariablesToTemplateVariables(
    variables: any[]
  ): TemplateVariables {
    const result: TemplateVariables = {};

    variables.forEach((variable) => {
      result[variable.name] = variable.defaultValue;
    });

    return result;
  }

  /**
   * Map SectionType enum to string
   */
  private mapSectionTypeToString(type: SectionType): string {
    switch (type) {
      case SectionType.HERO:
        return "hero";
      case SectionType.FEATURES:
        return "features";
      case SectionType.TESTIMONIALS:
        return "testimonials";
      case SectionType.PRICING:
        return "pricing";
      case SectionType.CONTACT:
        return "contact";
      default:
        return "hero";
    }
  }

  /**
   * Map string to SectionType enum
   */
  private mapStringToSectionType(type: string): SectionType {
    switch (type) {
      case "hero":
        return SectionType.HERO;
      case "features":
        return SectionType.FEATURES;
      case "testimonials":
        return SectionType.TESTIMONIALS;
      case "pricing":
        return SectionType.PRICING;
      case "contact":
        return SectionType.CONTACT;
      default:
        return SectionType.HERO;
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(templateId: string): Promise<TemplateUsageStats> {
    const template = await this.getCustomTemplate(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    return {
      templateId: templateId,
      usageCount: template.usageCount,
      lastUsed: template.updatedAt,
      averageRating: template.rating || 0,
      totalRatings: 1, // Simplified for now
    };
  }

  /**
   * Increment template usage count
   */
  async incrementTemplateUsage(templateId: string): Promise<void> {
    const template = await this.getCustomTemplate(templateId);
    if (template) {
      await this.updateCustomTemplate(templateId, {
        usageCount: template.usageCount + 1,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Get built-in templates
   */
  getBuiltInTemplates(): TemplateSection[] {
    return this.templates.map((template) => ({
      id: template.id,
      type: template.type,
      name: template.name,
      previewImage: template.previewImage,
      description: template.description,
      html: template.html,
      css: template.css,
      variables: template.variables as any,
      isBuiltIn: true,
      category: "built-in",
      tags: [],
    }));
  }

  /**
   * Get built-in template by ID
   */
  getBuiltInTemplate(id: string): TemplateSection | null {
    const template = this.templates.find((t) => t.id === id);
    if (!template) return null;

    return {
      id: template.id,
      type: template.type,
      name: template.name,
      previewImage: template.previewImage,
      description: template.description,
      html: template.html,
      css: template.css,
      variables: template.variables as any,
      isBuiltIn: true,
      category: "built-in",
      tags: [],
    };
  }

  /**
   * Duplicate a custom template
   */
  async duplicateCustomTemplate(
    id: string,
    newName?: string
  ): Promise<CustomTemplate> {
    const originalTemplate = await this.getCustomTemplate(id);
    if (!originalTemplate) {
      throw new Error("Template not found");
    }

    const duplicatedTemplate: CustomTemplate = {
      ...originalTemplate,
      id: this.generateTemplateId(),
      name: newName || `${originalTemplate.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
    };

    return this.createCustomTemplate(duplicatedTemplate);
  }

  /**
   * Process template with variables
   */
  async processTemplate(
    templateId: string,
    variables: any
  ): Promise<TemplateProcessingResult> {
    const template = await this.getCustomTemplate(templateId);
    if (!template) {
      return {
        html: "",
        css: "",
        errors: [
          { type: ErrorType.MISSING_VARIABLE, message: "Template not found" },
        ],
        warnings: [],
      };
    }

    return this.processTemplateContent(template, variables);
  }

  /**
   * Validate a template
   */
  async validateTemplate(
    template: CustomTemplate
  ): Promise<TemplateProcessingResult> {
    // Use the validation utility
    return validateTemplate(template);
  }

  /**
   * Preview template with variables
   */
  async previewTemplate(
    template: CustomTemplate,
    variables: any
  ): Promise<string> {
    const result = await this.processTemplateContent(template, variables);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Template Preview</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
        <style>${result.css}</style>
      </head>
      <body>
        ${result.html}
      </body>
      </html>
    `;
  }

  /**
   * Search templates by query
   */
  async searchTemplates(
    query: string,
    type?: SectionType
  ): Promise<TemplateSection[]> {
    const allTemplates = await this.getAllTemplatesByType(
      type || SectionType.HERO
    );
    const lowerQuery = query.toLowerCase();

    return allTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        (template.tags &&
          template.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)))
    );
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<TemplateSection[]> {
    const customTemplates = await this.getCustomTemplates();
    const builtInTemplates = this.getBuiltInTemplates();

    const allTemplates = [
      ...builtInTemplates.map((t) => ({ ...t, category: "built-in" })),
      ...customTemplates.map((t) => this.convertCustomTemplateToSection(t)),
    ];

    return allTemplates.filter((template) => template.category === category);
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<TemplateSection[]> {
    const customTemplates = await this.getCustomTemplates();
    const popularCustom = customTemplates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
      .map((t) => this.convertCustomTemplateToSection(t));

    const builtInTemplates = this.getBuiltInTemplates().slice(
      0,
      limit - popularCustom.length
    );

    return [...popularCustom, ...builtInTemplates];
  }

  /**
   * Process template content with variables
   */
  private async processTemplateContent(
    template: CustomTemplate,
    variables: any
  ): Promise<TemplateProcessingResult> {
    let html = template.html;
    let css = template.css;
    const errors: TemplateError[] = [];
    const warnings: TemplateWarning[] = [];

    try {
      // Replace variables in HTML
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        html = html.replace(regex, String(value));
        css = css.replace(regex, String(value));
      }

      // Check for unreplaced variables
      const unreplacedMatches = html.match(/{{[^}]+}}/g) || [];
      unreplacedMatches.forEach((match) => {
        const variableName = match.replace(/[{}]/g, "");
        errors.push({
          type: ErrorType.MISSING_VARIABLE,
          message: `Variable "${variableName}" not provided`,
          variable: variableName,
        });
      });

      return { html, css, errors, warnings };
    } catch (error) {
      errors.push({
        type: ErrorType.COMPILATION_ERROR,
        message: `Template processing failed: ${error}`,
      });

      return { html: "", css: "", errors, warnings };
    }
  }

  // Hardcoded style templates
  private readonly styles: StyleTemplate[] = [
    {
      id: "modern-blue",
      name: "Modern Blue",
      description: "A clean, professional style with blue accents",
      previewImage: "assets/previews/style-modern-blue.jpg",
      primaryColor: "#4361ee",
      secondaryColor: "#3a0ca3",
      accentColor: "#4cc9f0",
      textColor: "#333333",
      backgroundColor: "#ffffff",
      headingFont: "Poppins",
      bodyFont: "Inter",
      buttonStyle: "rounded",
      fontCssUrl:
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Poppins:wght@500;600;700&display=swap",
    },
    {
      id: "warm-organic",
      name: "Warm Organic",
      description: "Earthy tones with a warm, inviting feel",
      previewImage: "assets/previews/style-warm-organic.jpg",
      primaryColor: "#e07a5f",
      secondaryColor: "#81b29a",
      accentColor: "#f2cc8f",
      textColor: "#3d405b",
      backgroundColor: "#f4f1de",
      headingFont: "Merriweather",
      bodyFont: "Source Sans Pro",
      buttonStyle: "square",
      fontCssUrl:
        "https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+Pro:wght@400;600&display=swap",
    },
    {
      id: "dark-tech",
      name: "Dark Tech",
      description: "Modern dark theme for tech-focused sites",
      previewImage: "assets/previews/style-dark-tech.jpg",
      primaryColor: "#7209b7",
      secondaryColor: "#3a0ca3",
      accentColor: "#4cc9f0",
      textColor: "#f8f9fa",
      backgroundColor: "#121212",
      headingFont: "Roboto",
      bodyFont: "Roboto",
      buttonStyle: "pill",
      fontCssUrl:
        "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
    },
    {
      id: "minimal-light",
      name: "Minimal Light",
      description: "Clean, minimalist design with subtle accents",
      previewImage: "assets/previews/style-minimal-light.jpg",
      primaryColor: "#2b2d42",
      secondaryColor: "#8d99ae",
      accentColor: "#ef233c",
      textColor: "#2b2d42",
      backgroundColor: "#edf2f4",
      headingFont: "Montserrat",
      bodyFont: "Open Sans",
      buttonStyle: "rounded",
      fontCssUrl:
        "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Open+Sans:wght@400;600&display=swap",
    },
    {
      id: "vibrant-creative",
      name: "Vibrant Creative",
      description: "Bold, colorful style for creative businesses",
      previewImage: "assets/previews/style-vibrant-creative.jpg",
      primaryColor: "#ff6b6b",
      secondaryColor: "#4ecdc4",
      accentColor: "#ffd166",
      textColor: "#1a535c",
      backgroundColor: "#f7fff7",
      headingFont: "Playfair Display",
      bodyFont: "Work Sans",
      buttonStyle: "rounded",
      fontCssUrl:
        "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Work+Sans:wght@400;500&display=swap",
    },
  ];

  // Hardcoded template definitions with HTML and CSS content included
  private readonly templates: InternalTemplateSection[] = [
    {
      id: "hero-modern",
      type: SectionType.HERO,
      name: "Modern Hero",
      previewImage: "assets/previews/hero-modern.jpg",
      description: "A clean, modern hero section with a gradient background",
      variables: {
        headerText: "Welcome to Our Amazing Website",
        heroSubheading: "The fastest way to build modern websites",
        imageUrl:
          "https://images.unsplash.com/photo-1734784547207-7ad9f04c1f0a",
      } as HeroTemplateVariables,
      html: `<div class="container-fluid py-5 hero-section">
  <div class="row align-items-center">
    <div class="col-md-6 hero-content">
      <h1 class="display-4 fw-bold mb-2">{{headerText}}</h1>
      <p class="lead text-secondary mb-4">{{heroSubheading}}</p>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-primary px-4">Get Started</button>
        <button class="btn btn-outline-secondary px-4">Learn More</button>
      </div>
    </div>
    <div class="col-md-6 mt-4 mt-md-0 text-center">
      <img src="{{imageUrl}}" class="img-fluid rounded shadow hero-image" alt="Hero image">
    </div>
  </div>
</div>`,
      css: `/* Hero Section Styles */
.hero-section {
  background-color: #f8f9fa;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 30%;
  height: 100%;
  background-color: rgba(13, 110, 253, 0.05);
  z-index: 0;
  transform: skewX(-15deg) translateX(10%);
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-content h1 {
  color: #212529;
}

.hero-content p {
  color: #6c757d;
  font-size: 1.2rem;
}

.hero-image {
  transition: transform 0.3s ease;
  max-height: 400px;
  object-fit: cover;
}

.hero-image:hover {
  transform: translateY(-5px);
}

@media (max-width: 768px) {
  .hero-section::before {
    width: 100%;
    transform: skewY(-5deg) translateY(-30%);
    height: 50%;
  }
  
  .hero-content {
    text-align: center;
  }
  
  .hero-content h1 {
    font-size: 2.5rem;
  }
}`,
    },
    {
      id: "hero-gradient",
      type: SectionType.HERO,
      name: "Gradient Hero",
      previewImage: "assets/previews/hero-gradient.jpg",
      description: "Hero section with a vibrant gradient background",
      variables: {
        headerText: "Transform Your Digital Experience",
        heroSubheading: "Powerful solutions for your business needs",
        imageUrl:
          "https://images.unsplash.com/photo-1734784547207-7ad9f04c1f0a",
      } as HeroTemplateVariables,
      html: `<div class="gradient-hero py-5">
  <div class="container">
    <div class="row align-items-center">
      <div class="col-md-6 hero-content text-light">
        <h1 class="fw-bold mb-3">{{headerText}}</h1>
        <p class="lead mb-4">{{heroSubheading}}</p>
        <div class="d-flex flex-wrap gap-3">
          <button class="btn btn-light px-4 py-2">Start Now</button>
          <button class="btn btn-outline-light px-4 py-2">Learn More</button>
        </div>
      </div>
      <div class="col-md-6 mt-5 mt-md-0 d-flex justify-content-center">
        <img src="{{imageUrl}}" class="img-fluid rounded hero-image" alt="Hero image">
      </div>
    </div>
  </div>
</div>`,
      css: `/* Gradient Hero Section Styles */
.gradient-hero {
  background: linear-gradient(135deg, #4361ee, #4cc9f0);
  position: relative;
  overflow: hidden;
}

.gradient-hero::before {
  content: '';
  position: absolute;
  top: -10%;
  right: -10%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.gradient-hero::after {
  content: '';
  position: absolute;
  bottom: -10%;
  left: -10%;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-image {
  position: relative;
  z-index: 2;
  max-height: 400px;
  filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2));
  transition: transform 0.3s ease;
}

.hero-image:hover {
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .hero-content {
    text-align: center;
  }
  
  .hero-content h1 {
    font-size: 2.25rem;
  }
}`,
    },
    {
      id: "hero-image-right",
      type: SectionType.HERO,
      name: "Image Right Hero",
      previewImage: "assets/previews/hero-image-right.jpg",
      description: "Hero section with an image on the right side",
      variables: {
        headerText: "Create Beautiful Landing Pages",
        heroSubheading:
          "Easy to customize, fast to implement, and designed to convert",
        imageUrl:
          "https://images.unsplash.com/photo-1734784547207-7ad9f04c1f0a",
      } as HeroTemplateVariables,
      html: `<div class="image-right-hero py-5">
  <div class="container">
    <div class="row align-items-center">
      <div class="col-lg-6 hero-content">
        <span class="badge bg-primary text-white px-3 py-2 mb-3">Welcome</span>
        <h1 class="display-5 fw-bold mb-3">{{headerText}}</h1>
        <p class="lead text-muted mb-4">{{heroSubheading}}</p>
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-primary btn-lg px-4">Get Started</button>
          <button class="btn btn-link btn-lg text-decoration-none">Learn More →</button>
        </div>
      </div>
      <div class="col-lg-6 mt-5 mt-lg-0">
        <div class="image-container">
          <img src="{{imageUrl}}" class="img-fluid rounded-lg hero-image" alt="Hero image">
          <div class="shape-1"></div>
          <div class="shape-2"></div>
        </div>
      </div>
    </div>
  </div>
</div>`,
      css: `/* Image Right Hero Section Styles */
.image-right-hero {
  background-color: #ffffff;
  position: relative;
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.image-container {
  position: relative;
  z-index: 1;
}

.hero-image {
  border-radius: 12px;
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.1);
  transition: transform 0.4s ease;
}

.shape-1 {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 140px;
  height: 140px;
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  background-color: rgba(13, 110, 253, 0.1);
  z-index: -1;
}

.shape-2 {
  position: absolute;
  bottom: -30px;
  left: -30px;
  width: 180px;
  height: 180px;
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
  background-color: rgba(111, 66, 193, 0.08);
  z-index: -1;
}

.hero-image:hover {
  transform: translateY(-10px);
}

.lead {
  font-size: 1.1rem;
  line-height: 1.6;
}

@media (max-width: 992px) {
  .hero-content {
    text-align: center;
  }
  
  .hero-content .d-flex {
    justify-content: center;
  }
  
  .shape-1, .shape-2 {
    display: none;
  }
}`,
    },
    {
      id: "features-cards",
      type: SectionType.FEATURES,
      name: "Feature Cards",
      previewImage: "assets/previews/features-cards.jpg",
      description: "Features displayed as cards with icons",
      variables: {
        featuresTitle: "Our Key Features",
        featuresSubheading: "Everything you need to succeed",
        features: [
          {
            title: "Easy to Use",
            message:
              "Our platform is designed to be intuitive and user-friendly.",
          },
          {
            title: "Powerful Tools",
            message: "Access advanced features to boost your productivity.",
          },
          {
            title: "Responsive Design",
            message: "Works perfectly on all devices, from desktop to mobile.",
          },
        ],
      } as FeaturesTemplateVariables,
      html: `<div class="container py-5 features-section">
  <div class="text-center mb-5">
    <h2 class="features-title mb-2">{{featuresTitle}}</h2>
    <p class="lead text-muted">{{featuresSubheading}}</p>
  </div>
  <div class="row g-4 features-grid">
    <!-- FEATURE_ITEM_START -->
    <div class="col-md-4 mb-4">
      <div class="card h-100 shadow-sm feature-card">
        <div class="card-body text-center p-4">
          <div class="feature-icon-wrapper mb-3">
            <i class="bi bi-star-fill feature-icon"></i>
          </div>
          <h3 class="h5 card-title">{{title}}</h3>
          <p class="card-text">{{message}}</p>
        </div>
      </div>
    </div>
    <!-- FEATURE_ITEM_END -->
  </div>
</div>`,
      css: `/* Features Section Styles */
.features-section {
  background-color: #ffffff;
}

.features-title {
  font-weight: 700;
  position: relative;
  padding-bottom: 15px;
}

.features-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 3px;
  background-color: #0d6efd;
}

.feature-card {
  border: none;
  transition: transform 0.3s, box-shadow 0.3s;
  border-radius: 10px;
  overflow: hidden;
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
}

.feature-icon-wrapper {
  width: 70px;
  height: 70px;
  background-color: rgba(13, 110, 253, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  transition: all 0.3s;
}

.feature-card:hover .feature-icon-wrapper {
  background-color: #0d6efd;
}

.feature-icon {
  font-size: 1.75rem;
  color: #0d6efd;
  transition: all 0.3s;
}

.feature-card:hover .feature-icon {
  color: white;
}

@media (max-width: 768px) {
  .feature-card {
    margin-bottom: 1.5rem;
  }
}`,
    },
    {
      id: "features-grid",
      type: SectionType.FEATURES,
      name: "Features Grid",
      previewImage: "assets/previews/features-grid.jpg",
      description: "Features in a responsive grid layout",
      variables: {
        featuresTitle: "What We Offer",
        featuresSubheading: "Explore our suite of powerful features",
        features: [
          {
            title: "Lightning Fast",
            message: "Optimized performance for quick loading times.",
          },
          {
            title: "User-Friendly",
            message: "Intuitive interface designed with users in mind.",
          },
          {
            title: "Fully Customizable",
            message: "Tailor the platform to fit your specific needs.",
          },
          {
            title: "Secure & Reliable",
            message: "Enterprise-grade security and 99.9% uptime.",
          },
        ],
      } as FeaturesTemplateVariables,
      html: `<div class="container py-5 features-grid-section">
  <div class="text-center mb-5">
    <h2 class="section-title">{{featuresTitle}}</h2>
    <p class="section-subtitle">{{featuresSubheading}}</p>
  </div>
  <div class="row g-4">
    <!-- FEATURE_ITEM_START -->
    <div class="col-md-6 col-lg-4">
      <div class="feature-item">
        <div class="feature-icon">
          <i class="bi bi-lightning-charge"></i>
        </div>
        <div class="feature-content">
          <h3>{{title}}</h3>
          <p>{{message}}</p>
        </div>
      </div>
    </div>
    <!-- FEATURE_ITEM_END -->
  </div>
</div>`,
      css: `/* Features Grid Section Styles */
.features-grid-section {
  background-color: #ffffff;
}

.section-title {
  font-weight: 700;
  color: #212529;
  margin-bottom: 1rem;
}

.section-subtitle {
  color: #6c757d;
  font-size: 1.25rem;
  max-width: 700px;
  margin: 0 auto;
}

.feature-item {
  display: flex;
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  height: 100%;
  transition: all 0.3s ease;
}

.feature-item:hover {
  background-color: #ffffff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  transform: translateY(-5px);
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background-color: #e9ecef;
  border-radius: 12px;
  margin-right: 1.25rem;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.feature-item:hover .feature-icon {
  background-color: #0d6efd;
}

.feature-icon i {
  font-size: 1.5rem;
  color: #0d6efd;
  transition: all 0.3s ease;
}

.feature-item:hover .feature-icon i {
  color: #ffffff;
}

.feature-content {
  flex: 1;
}

.feature-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #212529;
}

.feature-content p {
  color: #6c757d;
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .feature-item {
    padding: 1.25rem;
  }
  
  .feature-icon {
    width: 50px;
    height: 50px;
  }
}`,
    },
    {
      id: "features-icon-list",
      type: SectionType.FEATURES,
      name: "Icon List Features",
      previewImage: "assets/previews/features-icon-list.jpg",
      description: "Features displayed as a list with icons",
      variables: {
        featuresTitle: "Why Choose Us",
        featuresSubheading: "See how we stand out from the competition",
        features: [
          {
            title: "Premium Support",
            message: "24/7 customer support to help you whenever you need it.",
          },
          {
            title: "Seamless Integration",
            message: "Works with all your favorite tools and platforms.",
          },
          {
            title: "Regular Updates",
            message: "Continuous improvements and new features.",
          },
          {
            title: "Data Analytics",
            message: "Powerful insights to help you make informed decisions.",
          },
        ],
      } as FeaturesTemplateVariables,
      html: `<div class="container py-5 features-list-section">
  <div class="text-center mb-5">
    <h2 class="section-heading">{{featuresTitle}}</h2>
    <p class="section-subheading">{{featuresSubheading}}</p>
  </div>
  <div class="row justify-content-center">
    <div class="col-lg-10">
      <div class="features-list">
        <!-- FEATURE_ITEM_START -->
        <div class="feature-list-item">
          <div class="feature-list-icon">
            <i class="bi bi-check-circle"></i>
          </div>
          <div class="feature-list-content">
            <h3>{{title}}</h3>
            <p>{{message}}</p>
          </div>
        </div>
        <!-- FEATURE_ITEM_END -->
      </div>
    </div>
  </div>
</div>`,
      css: `/* Features List Section Styles */
.features-list-section {
  background-color: #ffffff;
}

.section-heading {
  font-weight: 700;
  color: #212529;
  margin-bottom: 1rem;
}

.section-subheading {
  color: #6c757d;
  font-size: 1.2rem;
  max-width: 700px;
  margin: 0 auto;
}

.features-list {
  border-radius: 12px;
  background-color: #f8f9fa;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.feature-list-item {
  display: flex;
  padding: 1.5rem;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.feature-list-item:last-child {
  border-bottom: none;
}

.feature-list-item:hover {
  background-color: #ffffff;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

.feature-list-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: rgba(13, 110, 253, 0.1);
  border-radius: 50%;
  margin-right: 1.5rem;
  flex-shrink: 0;
}

.feature-list-icon i {
  font-size: 1.25rem;
  color: #0d6efd;
}

.feature-list-content {
  flex: 1;
}

.feature-list-content h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #212529;
}

.feature-list-content p {
  color: #6c757d;
  margin-bottom: 0;
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .feature-list-item {
    padding: 1.25rem;
  }
}`,
    },

    // Additional Feature Section Templates
    {
      id: "features-timeline",
      type: SectionType.FEATURES,
      name: "Timeline Features",
      previewImage: "assets/previews/features-timeline.jpg",
      description: "Features displayed in a timeline format",
      variables: {
        featuresTitle: "Our Journey",
        featuresSubheading:
          "Key milestones and features that define our success",
        features: [
          {
            title: "Planning & Strategy",
            message:
              "Comprehensive planning and strategic approach to every project",
          },
          {
            title: "Design & Development",
            message:
              "Creative design combined with robust development practices",
          },
          {
            title: "Testing & Launch",
            message: "Thorough testing and seamless launch process",
          },
          {
            title: "Support & Growth",
            message: "Ongoing support and continuous improvement",
          },
        ],
      } as FeaturesTemplateVariables,
      html: `<div class="features-timeline-section py-5">
  <div class="container">
    <div class="text-center mb-5">
      <h2 class="display-5 fw-bold mb-3">{{featuresTitle}}</h2>
      <p class="lead text-muted">{{featuresSubheading}}</p>
    </div>
    
    <div class="timeline-container">
      <!-- FEATURE_ITEM_START -->
      <div class="timeline-item">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <h4>{{title}}</h4>
          <p>{{message}}</p>
        </div>
      </div>
      <!-- FEATURE_ITEM_END -->
    </div>
  </div>
</div>`,
      css: `/* Timeline Features Section */
.features-timeline-section {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.timeline-container {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}

.timeline-container::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(to bottom, #667eea, #764ba2);
  transform: translateX(-50%);
}

.timeline-item {
  position: relative;
  margin-bottom: 3rem;
  display: flex;
  align-items: center;
}

.timeline-item:nth-child(odd) {
  flex-direction: row;
}

.timeline-item:nth-child(even) {
  flex-direction: row-reverse;
}

.timeline-marker {
  width: 20px;
  height: 20px;
  background: #667eea;
  border-radius: 50%;
  border: 4px solid white;
  box-shadow: 0 0 0 4px #667eea;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.timeline-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: calc(50% - 40px);
  position: relative;
}

.timeline-item:nth-child(odd) .timeline-content {
  margin-right: auto;
  margin-left: 40px;
}

.timeline-item:nth-child(even) .timeline-content {
  margin-left: auto;
  margin-right: 40px;
}

.timeline-content::before {
  content: '';
  position: absolute;
  top: 50%;
  width: 0;
  height: 0;
  border: 15px solid transparent;
  transform: translateY(-50%);
}

.timeline-item:nth-child(odd) .timeline-content::before {
  left: -30px;
  border-right-color: white;
}

.timeline-item:nth-child(even) .timeline-content::before {
  right: -30px;
  border-left-color: white;
}

.timeline-content h4 {
  color: #212529;
  font-weight: 600;
  margin-bottom: 1rem;
}

.timeline-content p {
  color: #6c757d;
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .timeline-container::before {
    left: 30px;
  }
  
  .timeline-item {
    flex-direction: row !important;
  }
  
  .timeline-marker {
    left: 30px;
  }
  
  .timeline-content {
    width: calc(100% - 80px);
    margin-left: 80px !important;
    margin-right: 0 !important;
  }
  
  .timeline-content::before {
    left: -30px !important;
    right: auto !important;
    border-right-color: white !important;
    border-left-color: transparent !important;
  }
}`,
    },

    {
      id: "features-comparison",
      type: SectionType.FEATURES,
      name: "Feature Comparison",
      previewImage: "assets/previews/features-comparison.jpg",
      description: "Features displayed in a comparison table format",
      variables: {
        featuresTitle: "Why Choose Us",
        featuresSubheading: "Compare our features with the competition",
        features: [
          {
            title: "24/7 Support",
            message: "Round-the-clock customer support for all your needs",
          },
          {
            title: "Advanced Analytics",
            message: "Detailed insights and reporting for better decisions",
          },
          {
            title: "Scalable Solution",
            message: "Grows with your business, no matter the size",
          },
          {
            title: "Secure & Reliable",
            message: "Enterprise-grade security and 99.9% uptime guarantee",
          },
        ],
      } as FeaturesTemplateVariables,
      html: `<div class="features-comparison-section py-5">
  <div class="container">
    <div class="text-center mb-5">
      <h2 class="display-5 fw-bold mb-3">{{featuresTitle}}</h2>
      <p class="lead text-muted">{{featuresSubheading}}</p>
    </div>
    
    <div class="comparison-table">
      <div class="table-header">
        <div class="header-item">Features</div>
        <div class="header-item">Us</div>
        <div class="header-item">Others</div>
      </div>
      
      <!-- FEATURE_ITEM_START -->
      <div class="comparison-row">
        <div class="feature-name">
          <h5>{{title}}</h5>
          <p>{{message}}</p>
        </div>
        <div class="feature-status us">
          <i class="bi bi-check-circle-fill"></i>
          <span>Included</span>
        </div>
        <div class="feature-status others">
          <i class="bi bi-x-circle-fill"></i>
          <span>Limited</span>
        </div>
      </div>
      <!-- FEATURE_ITEM_END -->
    </div>
  </div>
</div>`,
      css: `/* Feature Comparison Section */
.features-comparison-section {
  background-color: #f8f9fa;
}

.comparison-table {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 900px;
  margin: 0 auto;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.header-item {
  padding: 1.5rem;
  font-weight: 600;
  font-size: 1.1rem;
  text-align: center;
}

.header-item:first-child {
  text-align: left;
}

.comparison-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  border-bottom: 1px solid #e9ecef;
  transition: background-color 0.3s ease;
}

.comparison-row:hover {
  background-color: #f8f9fa;
}

.comparison-row:last-child {
  border-bottom: none;
}

.feature-name {
  padding: 2rem;
}

.feature-name h5 {
  color: #212529;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.feature-name p {
  color: #6c757d;
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.feature-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
}

.feature-status i {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.feature-status.us i {
  color: #28a745;
}

.feature-status.others i {
  color: #dc3545;
}

.feature-status span {
  font-weight: 500;
  font-size: 0.9rem;
}

.feature-status.us span {
  color: #28a745;
}

.feature-status.others span {
  color: #dc3545;
}

@media (max-width: 768px) {
  .table-header,
  .comparison-row {
    grid-template-columns: 1fr;
  }
  
  .header-item,
  .feature-name,
  .feature-status {
    padding: 1rem;
  }
  
  .header-item:first-child {
    text-align: center;
  }
  
  .feature-status {
    flex-direction: row;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .feature-status i {
    font-size: 1.5rem;
    margin-bottom: 0;
  }
}`,
    },

    {
      id: "testimonials-grid",
      type: SectionType.TESTIMONIALS,
      name: "Testimonials Grid",
      previewImage: "assets/previews/testimonials-grid.jpg",
      description: "A grid layout of customer testimonials with ratings",
      variables: {
        testimonialsTitle: "What Our Customers Say",
        testimonialsSubheading:
          "Read success stories from our satisfied clients",
        testimonials: [
          {
            name: "John Smith",
            role: "CEO, TechCorp",
            message:
              "This platform has transformed how we do business. The results have been incredible.",
            image: "https://randomuser.me/api/portraits/men/1.jpg",
            rating: 5,
          },
          {
            name: "Sarah Johnson",
            role: "Marketing Director",
            message:
              "Exceptional service and outstanding results. Highly recommended!",
            image: "https://randomuser.me/api/portraits/women/2.jpg",
            rating: 5,
          },
          {
            name: "Michael Brown",
            role: "Startup Founder",
            message: "The best investment we've made for our online presence.",
            image: "https://randomuser.me/api/portraits/men/3.jpg",
            rating: 4,
          },
        ],
      } as TestimonialsTemplateVariables,
      html: `<section class="testimonials-section py-5">
  <div class="container">
    <div class="text-center mb-5">
      <h2 class="section-title">{{testimonialsTitle}}</h2>
      <p class="section-subtitle">{{testimonialsSubheading}}</p>
    </div>
    <div class="row g-4">
      <!-- TESTIMONIAL_ITEM_START -->
      <div class="col-md-4">
        <div class="testimonial-card">
          <div class="testimonial-rating mb-3">
            <i class="bi bi-star-fill" *ngFor="let star of [].constructor(rating)"></i>
          </div>
          <p class="testimonial-text">{{message}}</p>
          <div class="testimonial-author">
            <img src="{{image}}" alt="{{name}}" class="testimonial-avatar">
            <div class="testimonial-info">
              <h5 class="testimonial-name">{{name}}</h5>
              <p class="testimonial-role">{{role}}</p>
            </div>
          </div>
        </div>
      </div>
      <!-- TESTIMONIAL_ITEM_END -->
    </div>
  </div>
</section>`,
      css: `.testimonials-section {
  background-color: #ffffff;
}

.testimonial-card {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 2rem;
  height: 100%;
  transition: all 0.3s ease;
}

.testimonial-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.testimonial-rating {
  color: #ffc107;
  font-size: 1.2rem;
}

.testimonial-text {
  font-size: 1rem;
  line-height: 1.6;
  color: #6c757d;
  margin-bottom: 1.5rem;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.testimonial-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.testimonial-info {
  flex: 1;
}

.testimonial-name {
  margin: 0;
  font-size: 1.1rem;
  color: #212529;
}

.testimonial-role {
  margin: 0;
  font-size: 0.9rem;
  color: #6c757d;
}`,
    },

    // Additional Testimonial Section Templates
    {
      id: "testimonials-carousel",
      type: SectionType.TESTIMONIALS,
      name: "Testimonials Carousel",
      previewImage: "assets/previews/testimonials-carousel.jpg",
      description: "Rotating testimonials in a carousel format",
      variables: {
        testimonialsTitle: "Client Success Stories",
        testimonialsSubheading: "Hear from our satisfied customers",
        testimonials: [
          {
            name: "Emily Davis",
            role: "Product Manager",
            company: "InnovateCorp",
            message:
              "Outstanding service and exceptional results. The team exceeded our expectations in every way.",
            image: "https://randomuser.me/api/portraits/women/3.jpg",
            rating: 5,
          },
          {
            name: "David Wilson",
            role: "CTO",
            company: "TechStart",
            message:
              "Professional, reliable, and innovative. They delivered exactly what we needed on time and within budget.",
            image: "https://randomuser.me/api/portraits/men/4.jpg",
            rating: 5,
          },
          {
            name: "Lisa Chen",
            role: "Marketing Lead",
            company: "GrowthCo",
            message:
              "The results speak for themselves. Our conversion rates improved by 300% after working with them.",
            image: "https://randomuser.me/api/portraits/women/5.jpg",
            rating: 5,
          },
        ],
      } as TestimonialsTemplateVariables,
      html: `<div class="testimonials-carousel-section py-5">
  <div class="container">
    <div class="text-center mb-5">
      <h2 class="display-5 fw-bold mb-3">{{testimonialsTitle}}</h2>
      <p class="lead text-muted">{{testimonialsSubheading}}</p>
    </div>
    
    <div class="testimonials-carousel">
      <div class="carousel-container">
        <!-- TESTIMONIAL_ITEM_START -->
        <div class="testimonial-slide">
          <div class="testimonial-content">
            <div class="quote-icon">
              <i class="bi bi-quote"></i>
            </div>
            <blockquote>{{message}}</blockquote>
            <div class="testimonial-rating">
              <div class="stars">
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
                <i class="bi bi-star-fill"></i>
              </div>
            </div>
            <div class="testimonial-author">
              <img src="{{image}}" alt="{{name}}" class="author-avatar">
              <div class="author-info">
                <h5>{{name}}</h5>
                <p>{{role}}, {{company}}</p>
              </div>
            </div>
          </div>
        </div>
        <!-- TESTIMONIAL_ITEM_END -->
      </div>
      
      <div class="carousel-controls">
        <button class="carousel-btn prev-btn">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="carousel-btn next-btn">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  </div>
</div>`,
      css: `/* Testimonials Carousel Section */
.testimonials-carousel-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.testimonials-carousel-section .display-5 {
  color: white;
}

.testimonials-carousel-section .text-muted {
  color: rgba(255, 255, 255, 0.8) !important;
}

.testimonials-carousel {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
}

.carousel-container {
  overflow: hidden;
  border-radius: 16px;
}

.testimonial-slide {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 3rem;
  text-align: center;
}

.quote-icon {
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 1.5rem;
}

.testimonial-content blockquote {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  color: white;
  font-style: italic;
}

.testimonial-rating {
  margin-bottom: 2rem;
}

.stars i {
  color: #ffd700;
  font-size: 1.2rem;
  margin: 0 0.1rem;
}

.testimonial-author {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.author-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.author-info {
  text-align: left;
}

.author-info h5 {
  color: white;
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.author-info p {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-size: 0.9rem;
}

.carousel-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.carousel-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.carousel-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .testimonial-slide {
    padding: 2rem;
  }
  
  .testimonial-author {
    flex-direction: column;
    text-align: center;
  }
  
  .author-info {
    text-align: center;
  }
}`,
    },

    {
      id: "testimonials-minimal",
      type: SectionType.TESTIMONIALS,
      name: "Minimal Testimonials",
      previewImage: "assets/previews/testimonials-minimal.jpg",
      description: "Clean, minimal testimonial layout with focus on content",
      variables: {
        testimonialsTitle: "Testimonials",
        testimonialsSubheading: "What people are saying about us",
        testimonials: [
          {
            name: "Alex Rodriguez",
            role: "Entrepreneur",
            company: "StartupXYZ",
            message:
              "Simple, effective, and powerful. Everything we needed in one place.",
            image: "https://randomuser.me/api/portraits/men/6.jpg",
            rating: 5,
          },
          {
            name: "Maria Garcia",
            role: "Designer",
            company: "CreativeStudio",
            message:
              "Beautiful design and seamless functionality. Highly recommended.",
            image: "https://randomuser.me/api/portraits/women/7.jpg",
            rating: 5,
          },
        ],
      } as TestimonialsTemplateVariables,
      html: `<div class="testimonials-minimal-section py-5">
  <div class="container">
    <div class="row">
      <div class="col-lg-4 mb-5 mb-lg-0">
        <div class="testimonials-header">
          <h2 class="section-title">{{testimonialsTitle}}</h2>
          <p class="section-subtitle">{{testimonialsSubheading}}</p>
        </div>
      </div>
      
      <div class="col-lg-8">
        <div class="testimonials-list">
          <!-- TESTIMONIAL_ITEM_START -->
          <div class="testimonial-item-minimal">
            <div class="testimonial-text">
              <p>"{{message}}"</p>
            </div>
            <div class="testimonial-author-minimal">
              <img src="{{image}}" alt="{{name}}" class="author-photo">
              <div class="author-details">
                <h6>{{name}}</h6>
                <span>{{role}}, {{company}}</span>
              </div>
            </div>
          </div>
          <!-- TESTIMONIAL_ITEM_END -->
        </div>
      </div>
    </div>
  </div>
</div>`,
      css: `/* Minimal Testimonials Section */
.testimonials-minimal-section {
  background-color: #ffffff;
}

.testimonials-header {
  position: sticky;
  top: 2rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 300;
  color: #212529;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.section-subtitle {
  font-size: 1.125rem;
  color: #6c757d;
  line-height: 1.6;
}

.testimonials-list {
  space-y: 3rem;
}

.testimonial-item-minimal {
  padding: 2rem 0;
  border-bottom: 1px solid #e9ecef;
}

.testimonial-item-minimal:last-child {
  border-bottom: none;
}

.testimonial-text p {
  font-size: 1.25rem;
  line-height: 1.7;
  color: #212529;
  margin-bottom: 1.5rem;
  font-style: italic;
}

.testimonial-author-minimal {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.author-photo {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  filter: grayscale(100%);
  transition: filter 0.3s ease;
}

.testimonial-item-minimal:hover .author-photo {
  filter: grayscale(0%);
}

.author-details h6 {
  margin: 0;
  font-weight: 600;
  color: #212529;
  font-size: 1rem;
}

.author-details span {
  color: #6c757d;
  font-size: 0.875rem;
}

@media (max-width: 992px) {
  .testimonials-header {
    position: static;
    text-align: center;
    margin-bottom: 3rem;
  }
  
  .section-title {
    font-size: 2rem;
  }
}`,
    },

    {
      id: "pricing-cards",
      type: SectionType.PRICING,
      name: "Pricing Cards",
      previewImage: "assets/previews/pricing-cards.jpg",
      description: "Clean pricing cards with popular plan highlight",
      variables: {
        pricingTitle: "Simple, Transparent Pricing",
        pricingSubheading: "Choose the plan that works best for you",
        plans: [
          {
            name: "Starter",
            price: "$29",
            interval: "per month",
            features: [
              "Up to 5 users",
              "Basic support",
              "1GB storage",
              "Email notifications",
            ],
            isPopular: false,
          },
          {
            name: "Professional",
            price: "$99",
            interval: "per month",
            features: [
              "Up to 50 users",
              "Priority support",
              "10GB storage",
              "Advanced analytics",
              "Custom domain",
            ],
            isPopular: true,
          },
          {
            name: "Enterprise",
            price: "$299",
            interval: "per month",
            features: [
              "Unlimited users",
              "24/7 support",
              "100GB storage",
              "Advanced analytics",
              "Custom domain",
              "API access",
            ],
            isPopular: false,
          },
        ],
      } as PricingTemplateVariables,
      html: `<section class="pricing-section py-5">
  <div class="container">
    <div class="text-center mb-5">
      <h2 class="section-title">{{pricingTitle}}</h2>
      <p class="section-subtitle">{{pricingSubheading}}</p>
    </div>
    <div class="row g-4 justify-content-center">
      <!-- PRICING_ITEM_START -->
      <div class="col-md-4">
        <div class="pricing-card" [class.popular]="isPopular">
          <div class="pricing-header">
            <h3 class="pricing-name">{{name}}</h3>
            <div class="pricing-price">
              <span class="amount">{{price}}</span>
              <span class="interval">{{interval}}</span>
            </div>
          </div>
          <div class="pricing-features">
            <ul class="list-unstyled">
              <li *ngFor="let feature of features">
                <i class="bi bi-check-circle-fill"></i>
                {{feature}}
              </li>
            </ul>
          </div>
          <div class="pricing-action">
            <button class="btn btn-primary btn-lg w-100">Get Started</button>
          </div>
        </div>
      </div>
      <!-- PRICING_ITEM_END -->
    </div>
  </div>
</section>`,
      css: `.pricing-section {
  background-color: #ffffff;
}

.pricing-card {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 2rem;
  height: 100%;
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid #e9ecef;
}

.pricing-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.pricing-card.popular {
  background-color: #ffffff;
  border: 2px solid #0d6efd;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.pricing-card.popular::before {
  content: 'Most Popular';
  position: absolute;
  top: 1rem;
  right: 1rem;
  background-color: #0d6efd;
  color: white;
  padding: 0.25rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.pricing-header {
  text-align: center;
  margin-bottom: 2rem;
}

.pricing-name {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #212529;
}

.pricing-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
}

.pricing-price .amount {
  font-size: 2.5rem;
  font-weight: 700;
  color: #212529;
}

.pricing-price .interval {
  color: #6c757d;
}

.pricing-features {
  margin-bottom: 2rem;
}

.pricing-features ul {
  margin: 0;
  padding: 0;
}

.pricing-features li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: #495057;
}

.pricing-features i {
  color: #0d6efd;
  font-size: 1.1rem;
}

.pricing-action {
  margin-top: auto;
}`,
    },
    {
      id: "contact-split",
      type: SectionType.CONTACT,
      name: "Split Contact",
      previewImage: "assets/previews/contact-split.jpg",
      description: "Contact form with split information section",
      variables: {
        contactTitle: "Get in Touch",
        contactSubheading: "We'd love to hear from you",
        address: "123 Business Street, Suite 100, City, State 12345",
        email: "contact@example.com",
        phone: "+1 (555) 123-4567",
        mapUrl:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d387193.30596834!2d-74.25986548248684!3d40.69714941932609!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c24fa5d33f083b%3A0xc80b8f06e177fe62!2sNew%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2s!4v1645564944351!5m2!1sen!2s",
      } as ContactTemplateVariables,
      html: `<section class="contact-section py-5">
  <div class="container">
    <div class="text-center mb-5">
      <h2 class="section-title">{{contactTitle}}</h2>
      <p class="section-subtitle">{{contactSubheading}}</p>
    </div>
    <div class="row g-4">
      <div class="col-lg-6">
        <div class="contact-form">
          <form>
            <div class="mb-3">
              <label for="name" class="form-label">Your Name</label>
              <input type="text" class="form-control" id="name" placeholder="John Doe">
            </div>
            <div class="mb-3">
              <label for="email" class="form-label">Email Address</label>
              <input type="email" class="form-control" id="email" placeholder="john@example.com">
            </div>
            <div class="mb-3">
              <label for="message" class="form-label">Message</label>
              <textarea class="form-control" id="message" rows="5" placeholder="Your message here..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-lg">Send Message</button>
          </form>
        </div>
      </div>
      <div class="col-lg-6">
        <div class="contact-info">
          <div class="info-card mb-4">
            <div class="info-icon">
              <i class="bi bi-geo-alt"></i>
            </div>
            <div class="info-content">
              <h5>Address</h5>
              <p>{{address}}</p>
            </div>
          </div>
          <div class="info-card mb-4">
            <div class="info-icon">
              <i class="bi bi-envelope"></i>
            </div>
            <div class="info-content">
              <h5>Email</h5>
              <p>{{email}}</p>
            </div>
          </div>
          <div class="info-card mb-4">
            <div class="info-icon">
              <i class="bi bi-telephone"></i>
            </div>
            <div class="info-content">
              <h5>Phone</h5>
              <p>{{phone}}</p>
            </div>
          </div>
          <div class="map-container">
            <iframe
              src="{{mapUrl}}"
              width="100%"
              height="300"
              style="border:0;"
              allowfullscreen=""
              loading="lazy">
            </iframe>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`,
      css: `.contact-section {
  background-color: #ffffff;
}

.contact-form {
  background-color: #f8f9fa;
  padding: 2rem;
  border-radius: 12px;
  height: 100%;
}

.form-control {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: all 0.3s ease;
}

.form-control:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.info-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.info-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.info-icon {
  width: 48px;
  height: 48px;
  background-color: rgba(13, 110, 253, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #0d6efd;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-content h5 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #212529;
}

.info-content p {
  margin: 0;
  color: #6c757d;
}

.map-container {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}`,
    },

    // About Section Template
    {
      id: "about-modern",
      type: SectionType.ABOUT,
      name: "Modern About",
      previewImage: "assets/previews/about-modern.jpg",
      description: "A clean about section with image and text",
      variables: {
        aboutTitle: "About Us",
        aboutDescription:
          "We are a team of passionate professionals dedicated to creating amazing experiences.",
        aboutImageUrl:
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c",
      } as AboutTemplateVariables,
      html: `<div class="container py-5 about-section">
  <div class="row align-items-center">
    <div class="col-md-6 mb-4 mb-md-0">
      <img src="{{aboutImageUrl}}" class="img-fluid rounded shadow about-image" alt="About us">
    </div>
    <div class="col-md-6">
      <h2 class="display-5 fw-bold mb-4">{{aboutTitle}}</h2>
      <p class="lead text-muted">{{aboutDescription}}</p>
      <div class="d-flex gap-2 mt-4">
        <button class="btn btn-primary">Learn More</button>
        <button class="btn btn-outline-secondary">Contact Us</button>
      </div>
    </div>
  </div>
</div>`,
      css: `/* About Section Styles */
.about-section {
  background-color: #ffffff;
}

.about-image {
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.about-image:hover {
  transform: scale(1.02);
}

.about-section h2 {
  color: #212529;
}

.about-section .lead {
  font-size: 1.1rem;
  line-height: 1.6;
}`,
    },

    // Additional About Section Templates
    {
      id: "about-team-focused",
      type: SectionType.ABOUT,
      name: "Team Focused About",
      previewImage: "assets/previews/about-team-focused.jpg",
      description: "About section highlighting team and company culture",
      variables: {
        aboutTitle: "Meet Our Team",
        aboutDescription:
          "We're a diverse group of passionate individuals working together to create exceptional digital experiences. Our team combines creativity, technical expertise, and strategic thinking to deliver results that exceed expectations.",
        aboutImageUrl:
          "https://images.unsplash.com/photo-1522071820081-009f0129c71c",
      } as AboutTemplateVariables,
      html: `<div class="about-team-section py-5">
  <div class="container">
    <div class="row">
      <div class="col-lg-6 mb-5 mb-lg-0">
        <div class="about-content">
          <h2 class="about-title">{{aboutTitle}}</h2>
          <p class="about-description">{{aboutDescription}}</p>
          
          <div class="team-stats">
            <div class="stat-item">
              <h3>50+</h3>
              <p>Team Members</p>
            </div>
            <div class="stat-item">
              <h3>5+</h3>
              <p>Years Experience</p>
            </div>
            <div class="stat-item">
              <h3>200+</h3>
              <p>Projects Completed</p>
            </div>
          </div>
          
          <div class="about-actions">
            <button class="btn btn-primary">Join Our Team</button>
            <button class="btn btn-outline-primary">View Portfolio</button>
          </div>
        </div>
      </div>
      
      <div class="col-lg-6">
        <div class="team-image-container">
          <img src="{{aboutImageUrl}}" alt="Our Team" class="team-image">
          <div class="image-overlay">
            <div class="overlay-content">
              <i class="bi bi-people-fill"></i>
              <h4>Collaborative Culture</h4>
              <p>Working together to achieve greatness</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
      css: `/* Team Focused About Section */
.about-team-section {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.about-title {
  font-size: 2.75rem;
  font-weight: 700;
  color: #212529;
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

.about-description {
  font-size: 1.125rem;
  color: #6c757d;
  line-height: 1.7;
  margin-bottom: 2.5rem;
}

.team-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.stat-item {
  text-align: center;
}

.stat-item h3 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #0d6efd;
  margin-bottom: 0.5rem;
}

.stat-item p {
  color: #6c757d;
  font-weight: 500;
  margin: 0;
}

.about-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.team-image-container {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.team-image {
  width: 100%;
  height: 500px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(13, 110, 253, 0.8), rgba(102, 16, 242, 0.8));
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.team-image-container:hover .image-overlay {
  opacity: 1;
}

.team-image-container:hover .team-image {
  transform: scale(1.05);
}

.overlay-content {
  text-align: center;
  color: white;
}

.overlay-content i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.overlay-content h4 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.overlay-content p {
  font-size: 1rem;
  margin: 0;
}

@media (max-width: 768px) {
  .about-title {
    font-size: 2.25rem;
  }
  
  .team-stats {
    justify-content: space-around;
    gap: 1rem;
  }
  
  .stat-item h3 {
    font-size: 2rem;
  }
  
  .about-actions {
    justify-content: center;
  }
  
  .team-image {
    height: 300px;
  }
}`,
    },

    {
      id: "about-story",
      type: SectionType.ABOUT,
      name: "Our Story",
      previewImage: "assets/previews/about-story.jpg",
      description: "About section focused on company story and mission",
      variables: {
        aboutTitle: "Our Story",
        aboutDescription:
          "Founded in 2019, we started with a simple mission: to help businesses thrive in the digital world. What began as a small team of passionate developers has grown into a full-service digital agency, but our core values remain the same - quality, innovation, and client success.",
        aboutImageUrl:
          "https://images.unsplash.com/photo-1497366216548-37526070297c",
      } as AboutTemplateVariables,
      html: `<div class="about-story-section py-5">
  <div class="container">
    <div class="text-center mb-5">
      <h2 class="story-title">{{aboutTitle}}</h2>
    </div>
    
    <div class="row align-items-center">
      <div class="col-lg-6 mb-4 mb-lg-0">
        <div class="story-content">
          <p class="story-text">{{aboutDescription}}</p>
          
          <div class="mission-values">
            <div class="value-item">
              <div class="value-icon">
                <i class="bi bi-lightbulb"></i>
              </div>
              <div class="value-content">
                <h5>Innovation</h5>
                <p>Pushing boundaries with creative solutions</p>
              </div>
            </div>
            
            <div class="value-item">
              <div class="value-icon">
                <i class="bi bi-award"></i>
              </div>
              <div class="value-content">
                <h5>Quality</h5>
                <p>Excellence in every project we deliver</p>
              </div>
            </div>
            
            <div class="value-item">
              <div class="value-icon">
                <i class="bi bi-heart"></i>
              </div>
              <div class="value-content">
                <h5>Passion</h5>
                <p>Love for what we do drives our success</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-lg-6">
        <div class="story-image-wrapper">
          <img src="{{aboutImageUrl}}" alt="Our Story" class="story-image">
          <div class="image-decoration"></div>
        </div>
      </div>
    </div>
  </div>
</div>`,
      css: `/* Our Story About Section */
.about-story-section {
  background-color: #ffffff;
  position: relative;
}

.story-title {
  font-size: 3rem;
  font-weight: 300;
  color: #212529;
  margin-bottom: 3rem;
  position: relative;
}

.story-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #0d6efd, #6610f2);
}

.story-text {
  font-size: 1.2rem;
  line-height: 1.8;
  color: #495057;
  margin-bottom: 3rem;
  text-align: justify;
}

.mission-values {
  space-y: 1.5rem;
}

.value-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.value-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #0d6efd, #6610f2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.value-icon i {
  font-size: 1.5rem;
  color: white;
}

.value-content h5 {
  color: #212529;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.value-content p {
  color: #6c757d;
  margin: 0;
  font-size: 0.95rem;
}

.story-image-wrapper {
  position: relative;
}

.story-image {
  width: 100%;
  height: 400px;
  object-fit: cover;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.image-decoration {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #0d6efd, #6610f2);
  border-radius: 50%;
  opacity: 0.1;
  z-index: -1;
}

@media (max-width: 768px) {
  .story-title {
    font-size: 2.5rem;
  }
  
  .story-text {
    font-size: 1.1rem;
    text-align: left;
  }
  
  .story-image {
    height: 300px;
  }
  
  .image-decoration {
    width: 60px;
    height: 60px;
    top: -10px;
    right: -10px;
  }
}`,
    },

    // Services Section Template
    {
      id: "services-cards",
      type: SectionType.SERVICES,
      name: "Services Cards",
      previewImage: "assets/previews/services-cards.jpg",
      description: "Service cards with icons and descriptions",
      variables: {
        servicesTitle: "Our Services",
        servicesSubheading: "We offer a wide range of professional services",
        services: [
          {
            title: "Web Development",
            description: "Custom web applications",
            icon: "bi-code-slash",
          },
          {
            title: "Design",
            description: "Beautiful user interfaces",
            icon: "bi-palette",
          },
          {
            title: "Consulting",
            description: "Expert technical advice",
            icon: "bi-chat-dots",
          },
        ],
      } as ServicesTemplateVariables,
      html: `<div class="container py-5 services-section">
  <div class="text-center mb-5">
    <h2 class="display-5 fw-bold mb-3">{{servicesTitle}}</h2>
    <p class="lead text-muted">{{servicesSubheading}}</p>
  </div>
  <div class="row g-4">
    <!-- SERVICE_ITEM_START -->
    <div class="col-md-4">
      <div class="service-card h-100">
        <div class="service-icon">
          <i class="{{icon}}"></i>
        </div>
        <h4>{{title}}</h4>
        <p class="text-muted">{{description}}</p>
      </div>
    </div>
    <!-- SERVICE_ITEM_END -->
  </div>
</div>`,
      css: `/* Services Section Styles */
.services-section {
  background-color: #f8f9fa;
}

.service-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.service-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.service-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #0d6efd, #6610f2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  font-size: 2rem;
  color: white;
}

.service-card h4 {
  color: #212529;
  margin-bottom: 1rem;
}`,
    },

    // Contact Section Template
    {
      id: "contact-modern",
      type: SectionType.CONTACT,
      name: "Modern Contact",
      previewImage: "assets/previews/contact-modern.jpg",
      description: "Contact form with contact information",
      variables: {
        contactTitle: "Get In Touch",
        contactSubheading: "We'd love to hear from you",
        address: "123 Main Street, City, State 12345",
        email: "hello@example.com",
        phone: "+1 (555) 123-4567",
        mapUrl: "",
      } as ContactTemplateVariables,
      html: `<div class="container py-5 contact-section">
  <div class="text-center mb-5">
    <h2 class="display-5 fw-bold mb-3">{{contactTitle}}</h2>
    <p class="lead text-muted">{{contactSubheading}}</p>
  </div>
  <div class="row g-5">
    <div class="col-md-6">
      <div class="contact-info">
        <div class="info-item">
          <i class="bi bi-geo-alt"></i>
          <div>
            <h5>Address</h5>
            <p>{{address}}</p>
          </div>
        </div>
        <div class="info-item">
          <i class="bi bi-envelope"></i>
          <div>
            <h5>Email</h5>
            <p>{{email}}</p>
          </div>
        </div>
        <div class="info-item">
          <i class="bi bi-phone"></i>
          <div>
            <h5>Phone</h5>
            <p>{{phone}}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <form class="contact-form">
        <div class="mb-3">
          <input type="text" class="form-control" placeholder="Your Name" required>
        </div>
        <div class="mb-3">
          <input type="email" class="form-control" placeholder="Your Email" required>
        </div>
        <div class="mb-3">
          <textarea class="form-control" rows="5" placeholder="Your Message" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary w-100">Send Message</button>
      </form>
    </div>
  </div>
</div>`,
      css: `/* Contact Section Styles */
.contact-section {
  background-color: #ffffff;
}

.contact-info .info-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}

.contact-info .info-item i {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #0d6efd, #6610f2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: white;
  flex-shrink: 0;
}

.contact-info .info-item h5 {
  margin: 0 0 0.5rem 0;
  color: #212529;
}

.contact-info .info-item p {
  margin: 0;
  color: #6c757d;
}

.contact-form .form-control {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: all 0.3s ease;
}

.contact-form .form-control:focus {
  border-color: #0d6efd;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}`,
    },

    // Additional Contact Section Templates
    {
      id: "contact-centered",
      type: SectionType.CONTACT,
      name: "Centered Contact",
      previewImage: "assets/previews/contact-centered.jpg",
      description:
        "A centered contact layout with prominent contact information",
      variables: {
        contactTitle: "Contact Us",
        contactSubheading: "Ready to start your project? Get in touch today",
        address: "456 Innovation Drive, Tech City, TC 67890",
        email: "contact@yourcompany.com",
        phone: "+1 (555) 987-6543",
        mapUrl: "",
      } as ContactTemplateVariables,
      html: `<div class="contact-centered-section py-5">
  <div class="container">
    <div class="text-center mb-5">
      <h2 class="display-4 fw-bold mb-3">{{contactTitle}}</h2>
      <p class="lead text-muted mb-5">{{contactSubheading}}</p>
    </div>
    
    <div class="row justify-content-center">
      <div class="col-lg-10">
        <div class="row">
          <div class="col-md-4 mb-4">
            <div class="contact-card text-center">
              <div class="contact-icon">
                <i class="bi bi-geo-alt"></i>
              </div>
              <h4>Visit Us</h4>
              <p>{{address}}</p>
            </div>
          </div>
          <div class="col-md-4 mb-4">
            <div class="contact-card text-center">
              <div class="contact-icon">
                <i class="bi bi-envelope"></i>
              </div>
              <h4>Email Us</h4>
              <p>{{email}}</p>
            </div>
          </div>
          <div class="col-md-4 mb-4">
            <div class="contact-card text-center">
              <div class="contact-icon">
                <i class="bi bi-telephone"></i>
              </div>
              <h4>Call Us</h4>
              <p>{{phone}}</p>
            </div>
          </div>
        </div>
        
        <div class="row justify-content-center mt-5">
          <div class="col-lg-8">
            <div class="contact-form-wrapper">
              <form class="contact-form">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <input type="text" class="form-control" placeholder="Full Name" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <input type="email" class="form-control" placeholder="Email Address" required>
                  </div>
                </div>
                <div class="mb-3">
                  <input type="text" class="form-control" placeholder="Subject" required>
                </div>
                <div class="mb-4">
                  <textarea class="form-control" rows="6" placeholder="Your Message" required></textarea>
                </div>
                <div class="text-center">
                  <button type="submit" class="btn btn-primary btn-lg px-5">Send Message</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
      css: `/* Centered Contact Section */
.contact-centered-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.contact-centered-section .display-4 {
  color: white;
}

.contact-centered-section .text-muted {
  color: rgba(255, 255, 255, 0.8) !important;
}

.contact-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 2rem;
  height: 100%;
  transition: transform 0.3s ease, background 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.contact-card:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.15);
}

.contact-icon {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
}

.contact-icon i {
  font-size: 2rem;
  color: white;
}

.contact-card h4 {
  color: white;
  font-weight: 600;
  margin-bottom: 1rem;
}

.contact-card p {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.contact-form-wrapper {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.contact-form .form-control {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 1rem;
}

.contact-form .form-control::placeholder {
  color: #6c757d;
}

.contact-form .form-control:focus {
  background: white;
  box-shadow: 0 0 0 0.2rem rgba(255, 255, 255, 0.25);
}

@media (max-width: 768px) {
  .contact-card {
    padding: 1.5rem;
  }
  
  .contact-form-wrapper {
    padding: 2rem;
  }
}`,
    },

    {
      id: "contact-minimal",
      type: SectionType.CONTACT,
      name: "Minimal Contact",
      previewImage: "assets/previews/contact-minimal.jpg",
      description:
        "A clean, minimal contact section with essential information",
      variables: {
        contactTitle: "Let's Connect",
        contactSubheading: "Have a question or want to work together?",
        address: "789 Creative Ave, Design District, DD 13579",
        email: "hello@creative.studio",
        phone: "+1 (555) 246-8135",
        mapUrl: "",
      } as ContactTemplateVariables,
      html: `<div class="contact-minimal-section py-5">
  <div class="container">
    <div class="row align-items-center">
      <div class="col-lg-6 mb-5 mb-lg-0">
        <div class="contact-content">
          <h2 class="contact-title">{{contactTitle}}</h2>
          <p class="contact-subtitle">{{contactSubheading}}</p>
          
          <div class="contact-details">
            <div class="contact-detail-item">
              <span class="detail-label">Address</span>
              <span class="detail-value">{{address}}</span>
            </div>
            <div class="contact-detail-item">
              <span class="detail-label">Email</span>
              <span class="detail-value">{{email}}</span>
            </div>
            <div class="contact-detail-item">
              <span class="detail-label">Phone</span>
              <span class="detail-value">{{phone}}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-lg-6">
        <div class="contact-form-minimal">
          <form>
            <div class="form-group">
              <input type="text" class="form-control" placeholder="Name" required>
            </div>
            <div class="form-group">
              <input type="email" class="form-control" placeholder="Email" required>
            </div>
            <div class="form-group">
              <textarea class="form-control" rows="4" placeholder="Message" required></textarea>
            </div>
            <button type="submit" class="btn btn-dark">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>`,
      css: `/* Minimal Contact Section */
.contact-minimal-section {
  background-color: #ffffff;
  border-top: 1px solid #e9ecef;
}

.contact-title {
  font-size: 3rem;
  font-weight: 300;
  color: #212529;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.contact-subtitle {
  font-size: 1.25rem;
  color: #6c757d;
  margin-bottom: 3rem;
  line-height: 1.6;
}

.contact-details {
  space-y: 2rem;
}

.contact-detail-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 2rem;
}

.detail-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.5rem;
}

.detail-value {
  font-size: 1.125rem;
  color: #212529;
  font-weight: 400;
}

.contact-form-minimal {
  background: #f8f9fa;
  padding: 2.5rem;
  border-radius: 0;
}

.contact-form-minimal .form-group {
  margin-bottom: 1.5rem;
}

.contact-form-minimal .form-control {
  background: transparent;
  border: none;
  border-bottom: 2px solid #dee2e6;
  border-radius: 0;
  padding: 0.75rem 0;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.contact-form-minimal .form-control:focus {
  background: transparent;
  border-color: #212529;
  box-shadow: none;
}

.contact-form-minimal .form-control::placeholder {
  color: #6c757d;
  font-weight: 300;
}

.contact-form-minimal .btn {
  background-color: #212529;
  border: 2px solid #212529;
  padding: 0.75rem 2rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.contact-form-minimal .btn:hover {
  background-color: transparent;
  color: #212529;
}

@media (max-width: 768px) {
  .contact-title {
    font-size: 2.5rem;
  }
  
  .contact-form-minimal {
    padding: 2rem;
  }
}`,
    },

    {
      id: "contact-with-map",
      type: SectionType.CONTACT,
      name: "Contact with Map",
      previewImage: "assets/previews/contact-with-map.jpg",
      description: "Contact section with integrated map and contact form",
      variables: {
        contactTitle: "Find Us",
        contactSubheading: "Visit our office or get in touch online",
        address: "321 Business Plaza, Suite 100, Metro City, MC 24680",
        email: "info@business.com",
        phone: "+1 (555) 369-2580",
        mapUrl:
          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d387193.30596834!2d-74.25986548248684!3d40.69714941932609!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c24fa5d33f083b%3A0xc80b8f06e177fe62!2sNew%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2s!4v1645564944351!5m2!1sen!2s",
      } as ContactTemplateVariables,
      html: `<div class="contact-map-section">
  <div class="container-fluid p-0">
    <div class="row g-0">
      <div class="col-lg-6">
        <div class="map-container">
          <iframe 
            src="{{mapUrl}}" 
            width="100%" 
            height="100%" 
            style="border:0;" 
            allowfullscreen="" 
            loading="lazy" 
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>
      </div>
      
      <div class="col-lg-6">
        <div class="contact-content-wrapper">
          <div class="contact-header">
            <h2>{{contactTitle}}</h2>
            <p>{{contactSubheading}}</p>
          </div>
          
          <div class="contact-info-grid">
            <div class="info-item">
              <div class="info-icon">
                <i class="bi bi-geo-alt-fill"></i>
              </div>
              <div class="info-content">
                <h5>Address</h5>
                <p>{{address}}</p>
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-icon">
                <i class="bi bi-envelope-fill"></i>
              </div>
              <div class="info-content">
                <h5>Email</h5>
                <p>{{email}}</p>
              </div>
            </div>
            
            <div class="info-item">
              <div class="info-icon">
                <i class="bi bi-telephone-fill"></i>
              </div>
              <div class="info-content">
                <h5>Phone</h5>
                <p>{{phone}}</p>
              </div>
            </div>
          </div>
          
          <div class="contact-form-section">
            <h4>Send us a message</h4>
            <form class="quick-contact-form">
              <div class="form-row">
                <input type="text" class="form-control" placeholder="Your Name" required>
                <input type="email" class="form-control" placeholder="Your Email" required>
              </div>
              <textarea class="form-control" rows="4" placeholder="Your Message" required></textarea>
              <button type="submit" class="btn btn-primary">Send Message</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
      css: `/* Contact with Map Section */
.contact-map-section {
  min-height: 600px;
}

.map-container {
  height: 600px;
  position: relative;
}

.map-container iframe {
  filter: grayscale(30%);
  transition: filter 0.3s ease;
}

.map-container:hover iframe {
  filter: grayscale(0%);
}

.contact-content-wrapper {
  padding: 3rem;
  height: 600px;
  overflow-y: auto;
  background: #ffffff;
}

.contact-header h2 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #212529;
  margin-bottom: 1rem;
}

.contact-header p {
  font-size: 1.125rem;
  color: #6c757d;
  margin-bottom: 2rem;
}

.contact-info-grid {
  margin-bottom: 2.5rem;
}

.info-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.info-icon {
  width: 50px;
  height: 50px;
  background: #e3f2fd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  flex-shrink: 0;
}

.info-icon i {
  font-size: 1.25rem;
  color: #1976d2;
}

.info-content h5 {
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.25rem;
}

.info-content p {
  color: #6c757d;
  margin: 0;
  font-size: 0.95rem;
}

.contact-form-section h4 {
  font-weight: 600;
  color: #212529;
  margin-bottom: 1.5rem;
}

.quick-contact-form .form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.quick-contact-form .form-control {
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.95rem;
  margin-bottom: 1rem;
}

.quick-contact-form .form-control:focus {
  border-color: #1976d2;
  box-shadow: 0 0 0 0.2rem rgba(25, 118, 210, 0.25);
}

.quick-contact-form .btn {
  background-color: #1976d2;
  border-color: #1976d2;
  padding: 0.75rem 2rem;
  font-weight: 500;
}

@media (max-width: 992px) {
  .map-container {
    height: 400px;
  }
  
  .contact-content-wrapper {
    height: auto;
    padding: 2rem;
  }
  
  .quick-contact-form .form-row {
    flex-direction: column;
    gap: 0;
  }
}`,
    },

    // Footer Section Template
    {
      id: "footer-modern",
      type: SectionType.FOOTER,
      name: "Modern Footer",
      previewImage: "assets/previews/footer-modern.jpg",
      description: "Footer with company info and social links",
      variables: {
        footerCompanyName: "Your Company",
        footerDescription: "Building amazing digital experiences since 2020.",
        footerCopyright: "© 2024 Your Company. All rights reserved.",
        socialLinks: [
          { platform: "Facebook", url: "https://facebook.com" },
          { platform: "Twitter", url: "https://twitter.com" },
          { platform: "LinkedIn", url: "https://linkedin.com" },
        ],
      } as FooterTemplateVariables,
      html: `<footer class="footer-section py-5">
  <div class="container">
    <div class="row g-4">
      <div class="col-md-6">
        <h5 class="fw-bold mb-3">{{footerCompanyName}}</h5>
        <p class="text-muted mb-4">{{footerDescription}}</p>
        <div class="social-links">
          <!-- SOCIAL_LINK_START -->
          <a href="{{url}}" class="social-link" target="_blank" rel="noopener">
            <i class="bi bi-{{platformLower}}"></i>
          </a>
          <!-- SOCIAL_LINK_END -->
        </div>
      </div>
      <div class="col-md-6">
        <div class="row">
          <div class="col-6">
            <h6 class="fw-bold mb-3">Quick Links</h6>
            <ul class="list-unstyled">
              <li><a href="#" class="footer-link">Home</a></li>
              <li><a href="#" class="footer-link">About</a></li>
              <li><a href="#" class="footer-link">Services</a></li>
              <li><a href="#" class="footer-link">Contact</a></li>
            </ul>
          </div>
          <div class="col-6">
            <h6 class="fw-bold mb-3">Support</h6>
            <ul class="list-unstyled">
              <li><a href="#" class="footer-link">Help Center</a></li>
              <li><a href="#" class="footer-link">Privacy Policy</a></li>
              <li><a href="#" class="footer-link">Terms of Service</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <hr class="my-4">
    <div class="text-center">
      <p class="text-muted mb-0">{{footerCopyright}}</p>
    </div>
  </div>
</footer>`,
      css: `/* Footer Section Styles */
.footer-section {
  background-color: #212529;
  color: white;
}

.footer-section h5,
.footer-section h6 {
  color: white;
}

.social-links {
  display: flex;
  gap: 1rem;
}

.social-link {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  text-decoration: none;
  transition: all 0.3s ease;
}

.social-link:hover {
  background: #0d6efd;
  color: white;
  transform: translateY(-2px);
}

.footer-link {
  color: #adb5bd;
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-link:hover {
  color: white;
}

.footer-section hr {
  border-color: rgba(255, 255, 255, 0.1);
}`,
    },
  ];

  // Template registry for dynamic template management
  private templateRegistry: Map<string, TemplateSection> = new Map();

  // Selected templates state
  private selectedTemplates: Record<TemplateType, string> = {
    hero: "hero-modern",
    about: "about-modern",
    services: "services-cards",
    features: "features-cards",
    testimonials: "testimonials-grid",
    pricing: "pricing-cards",
    contact: "contact-split",
    footer: "footer-modern",
  };

  // Selected style state
  private selectedStyle = "modern-blue";

  // Default templates
  private selectedHeroTemplate = "hero-modern";
  private selectedFeaturesTemplate = "features-cards";
  private selectedTestimonialsTemplate = "testimonials-grid";
  private selectedPricingTemplate = "pricing-cards";
  private selectedContactTemplate = "contact-modern";

  /**
   * Gets all available template types
   */
  getTemplateTypes(): string[] {
    return templateTypes.slice();
  }

  /**
   * Gets the list of available template sections by type
   */
  getTemplatesByType(type: SectionType): TemplateSection[] {
    const typeString = this.mapSectionTypeToString(type);
    return this.templates
      .filter((section) => section.type === typeString)
      .map((section) => ({
        id: section.id,
        type: type,
        name: section.name,
        previewImage: section.previewImage,
        description: section.description,
        html: section.html,
        css: section.css,
        variables: section.variables as any,
        isBuiltIn: true,
        category: "built-in",
        tags: [],
      }));
  }

  /**
   * Gets a template by its ID
   */
  getTemplateById(id: string): TemplateSection | undefined {
    return this.templateRegistry.get(id);
  }

  /**
   * Gets the list of available style templates
   */
  getStyleTemplates(): StyleTemplate[] {
    return this.styles.map((style) => ({ ...style }));
  }

  /**
   * Gets the current selected style
   */
  getSelectedStyle(): string {
    return this.selectedStyle;
  }

  /**
   * Gets the style template by ID
   */
  getStyleById(styleId: string): StyleTemplate | undefined {
    return this.styles.find((style) => style.id === styleId);
  }

  /**
   * Sets the selected style
   */
  setSelectedStyle(styleId: string): void {
    if (this.styles.some((style) => style.id === styleId)) {
      this.selectedStyle = styleId;
    }
  }

  /**
   * Sets the selected template for a specific section type
   */
  setSelectedTemplate(type: string, templateId: string): void {
    if (
      templateTypes.includes(type as TemplateType) &&
      this.templateRegistry.has(templateId)
    ) {
      this.selectedTemplates[type as TemplateType] = templateId;
    }
  }

  /**
   * Gets the currently selected template ID for a section type
   */
  getSelectedTemplate(type: string): string {
    if (templateTypes.includes(type as TemplateType)) {
      return this.selectedTemplates[type as TemplateType];
    }
    return "";
  }

  /**
   * Gets the complete template with the currently selected sections
   */
  getCurrentTemplate(): Observable<Template> {
    const selectedTemplates = Object.entries(this.selectedTemplates)
      .map(([type, id]) => ({
        type,
        template: this.templateRegistry.get(id),
      }))
      .filter((entry) => entry.template) as {
      type: string;
      template: TemplateSection;
    }[];

    const selectedStyle =
      this.getStyleById(this.selectedStyle) || this.styles[0];

    const template: any = {
      heroHtml: "",
      heroCss: "",
      aboutHtml: "",
      aboutCss: "",
      servicesHtml: "",
      servicesCss: "",
      featuresHtml: "",
      featuresCss: "",
      testimonialsHtml: "",
      testimonialsCss: "",
      pricingHtml: "",
      pricingCss: "",
      contactHtml: "",
      contactCss: "",
      footerHtml: "",
      footerCss: "",
    };

    // Populate template with selected sections
    selectedTemplates.forEach(({ type, template: section }) => {
      const htmlKey = `${type}Html` as keyof Template;
      const cssKey = `${type}Css` as keyof Template;
      const dataKey = `${type}Data` as keyof Template;

      template[htmlKey] = section.html;
      template[cssKey] = section.css;
      template[dataKey] = { ...section.variables };
    });

    return of(this.applyStyleToTemplate(template, selectedStyle));
  }

  /**
   * Gets the default template
   */
  getDefaultTemplate(): Template {
    // Create a synchronous version by directly building the template
    const selectedTemplates = Object.entries(this.selectedTemplates)
      .map(([type, id]) => ({
        type,
        template: this.templateRegistry.get(id),
      }))
      .filter((entry) => entry.template) as {
      type: string;
      template: TemplateSection;
    }[];

    const selectedStyle =
      this.getStyleById(this.selectedStyle) || this.styles[0];

    const template: any = {
      heroHtml: "",
      heroCss: "",
      aboutHtml: "",
      aboutCss: "",
      servicesHtml: "",
      servicesCss: "",
      featuresHtml: "",
      featuresCss: "",
      testimonialsHtml: "",
      testimonialsCss: "",
      pricingHtml: "",
      pricingCss: "",
      contactHtml: "",
      contactCss: "",
      footerHtml: "",
      footerCss: "",
    };

    // Populate template with selected sections
    selectedTemplates.forEach(({ type, template: section }) => {
      const htmlKey = `${type}Html` as keyof Template;
      const cssKey = `${type}Css` as keyof Template;
      const dataKey = `${type}Data` as keyof Template;

      template[htmlKey] = section.html;
      template[cssKey] = section.css;
      template[dataKey] = { ...section.variables };
    });

    return this.applyStyleToTemplate(template, selectedStyle);
  }

  /**
   * Apply selected style to template HTML and CSS
   */
  private applyStyleToTemplate(
    template: Template,
    style: StyleTemplate
  ): Template {
    const styledTemplate: any = { ...template };
    const cssKeys = Object.keys(template).filter((key) => key.endsWith("Css"));

    cssKeys.forEach((key) => {
      if (template[key as keyof Template]) {
        styledTemplate[key as keyof Template] = this.modifyCSS(
          template[key as keyof Template] as string,
          style
        );
      }
    });

    return styledTemplate;
  }

  /**
   * Modify CSS to apply the selected style
   */
  private modifyCSS(css: string, style: StyleTemplate): string {
    if (!css) return css;

    let modifiedCss = css;

    // Color replacements
    const colorMappings = {
      "#0d6efd": style.primaryColor,
      "#6c757d": style.secondaryColor,
      "#212529": style.textColor,
      "#f8f9fa": this.lightenColor(style.backgroundColor, 5),
      "#ffffff": style.backgroundColor,
    };

    Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
      modifiedCss = this.replaceColorInCSS(
        modifiedCss,
        oldColor,
        newColor as string
      );
    });

    // Add style-specific CSS
    modifiedCss += this.generateStyleSpecificCSS(style);

    return modifiedCss;
  }

  /**
   * Generate style-specific CSS
   */
  private generateStyleSpecificCSS(style: StyleTemplate): string {
    return `
    /* Applied Style: ${style.name} */
    h1, h2, h3, h4, h5, h6, .h1, .h2, .h3, .h4, .h5, .h6, 
    .section-title, .features-title, .section-heading {
      font-family: '${style.headingFont}', sans-serif !important;
    }
    
    body, p, .lead, .card-text, .feature-content p, .feature-list-content p {
      font-family: '${style.bodyFont}', sans-serif !important;
    }
    
    .btn {
      border-radius: ${
        style.buttonStyle === "pill"
          ? "50rem"
          : style.buttonStyle === "square"
          ? "0"
          : "0.375rem"
      } !important;
    }
    
    /* Component-specific styles */
    .gradient-hero {
      background: linear-gradient(135deg, ${style.primaryColor}, ${
      style.accentColor
    }) !important;
    }
    
    .feature-icon-wrapper, .feature-icon, .feature-list-icon {
      background-color: ${this.hexToRgba(style.primaryColor, 0.1)} !important;
    }
    
    .feature-icon, .feature-list-icon i {
      color: ${style.primaryColor} !important;
    }
    `;
  }

  generateStyleCss(): string {
    const style =
      this.styles.find((s) => s.id === this.selectedStyle) || this.styles[0];

    // Generate button radius based on button style
    let buttonRadius = "0.375rem"; // default bootstrap radius
    if (style.buttonStyle === "pill") {
      buttonRadius = "50rem";
    } else if (style.buttonStyle === "square") {
      buttonRadius = "0";
    }

    return `
    /* Generated Style CSS for ${style.name} */
    :root {
      --primary-color: ${style.primaryColor};
      --secondary-color: ${style.secondaryColor};
      --accent-color: ${style.accentColor};
      --text-color: ${style.textColor};
      --bg-color: ${style.backgroundColor};
      --heading-font: '${style.headingFont}', sans-serif;
      --body-font: '${style.bodyFont}', sans-serif;
      --btn-radius: ${buttonRadius};
    }

    body {
      font-family: var(--body-font);
      color: var(--text-color);
      background-color: var(--bg-color);
    }

    h1, h2, h3, h4, h5, h6, .h1, .h2, .h3, .h4, .h5, .h6 {
      font-family: var(--heading-font);
    }

    /* Override Bootstrap colors with our custom palette */
    .btn-primary {
      background-color: var(--primary-color);
      border-color: var(--primary-color);
    }

    .btn-primary:hover {
      background-color: ${this.adjustColor(style.primaryColor, -10)};
      border-color: ${this.adjustColor(style.primaryColor, -10)};
    }

    .btn-secondary {
      background-color: var(--secondary-color);
      border-color: var(--secondary-color);
    }

    .btn-secondary:hover {
      background-color: ${this.adjustColor(style.secondaryColor, -10)};
      border-color: ${this.adjustColor(style.secondaryColor, -10)};
    }

    .text-primary {
      color: var(--primary-color) !important;
    }

    .text-secondary {
      color: var(--secondary-color) !important;
    }

    .bg-primary {
      background-color: var(--primary-color) !important;
    }

    .bg-secondary {
      background-color: var(--secondary-color) !important;
    }

    /* Apply border radius to buttons based on style */
    .btn {
      border-radius: var(--btn-radius);
    }

    /* Custom styles for various sections */
    .gradient-hero {
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color)) !important;
    }

    .feature-icon-wrapper, .feature-icon, .feature-list-icon {
      background-color: rgba(var(--primary-color-rgb), 0.1);
    }

    .feature-icon, .feature-list-icon i {
      color: var(--primary-color);
    }

    .feature-card:hover .feature-icon-wrapper,
    .feature-item:hover .feature-icon {
      background-color: var(--primary-color);
    }

    /* Convert hex to rgb for primary color for transparency usage */
    :root {
      --primary-color-rgb: ${this.hexToRgb(style.primaryColor)};
    }

    /* Override Bootstrap link colors */
    a {
      color: var(--primary-color);
    }

    a:hover {
      color: ${this.adjustColor(style.primaryColor, -15)};
    }

    /* Immediately apply hover effects without requiring hover */
    .feature-card {
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
      transform: translateY(-5px);
    }

    .feature-icon-wrapper {
      background-color: var(--primary-color) !important;
    }

    .feature-icon {
      color: white !important;
    }

    .feature-item {
      background-color: white;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      transform: translateY(-5px);
    }

    .feature-item .feature-icon {
      background-color: var(--primary-color) !important;
    }

    .feature-item .feature-icon i {
      color: white !important;
    }

    .feature-list-item {
      background-color: white;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
    }
    `;
  }

  private adjustColor(hex: string, percent: number): string {
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);

    r = Math.floor((r * (100 + percent)) / 100);
    g = Math.floor((g * (100 + percent)) / 100);
    b = Math.floor((b * (100 + percent)) / 100);

    r = r < 255 ? r : 255;
    g = g < 255 ? g : 255;
    b = b < 255 ? b : 255;

    r = r > 0 ? r : 0;
    g = g > 0 ? g : 0;
    b = b > 0 ? b : 0;

    const rr =
      r.toString(16).length === 1 ? "0" + r.toString(16) : r.toString(16);
    const gg =
      g.toString(16).length === 1 ? "0" + g.toString(16) : g.toString(16);
    const bb =
      b.toString(16).length === 1 ? "0" + b.toString(16) : b.toString(16);

    return `#${rr}${gg}${bb}`;
  }

  /**
   * Replace a color in CSS with another color
   */
  private replaceColorInCSS(
    css: string,
    oldColor: string,
    newColor: string
  ): string {
    const colorRegex = new RegExp(
      oldColor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi"
    );
    return css.replace(colorRegex, newColor);
  }

  /**
   * Convert hex color to RGBA
   */
  private hexToRgba(hex: string, alpha: number): string {
    const [r, g, b] = this.hexToRgb(hex)
      .split(",")
      .map((n) => parseInt(n.trim()));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): string {
    const cleanHex = hex.replace("#", "");
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  /**
   * Lighten a color by a percentage
   */
  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;

    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }
}
