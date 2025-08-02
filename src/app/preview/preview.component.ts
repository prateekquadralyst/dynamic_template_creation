import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { Section, SectionType, ResponsiveSettings, DeviceType } from "../models/section.interface";
import { TemplateService } from "../services/template.service";
import { ResponsiveDesignEditorComponent, DevicePreset } from "../components/responsive-design-editor/responsive-design-editor.component";
import { Subject, takeUntil } from "rxjs";

interface Feature {
  title: string;
  message: string;
}

interface SectionEnabled {
  hero: boolean;
  about: boolean;
  services: boolean;
  features: boolean;
  testimonials: boolean;
  contact: boolean;
  footer: boolean;
}

@Component({
  selector: "app-preview",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./preview.component.html",
  styleUrls: ["./preview.component.css"],
})
export class PreviewComponent implements OnChanges, OnInit, OnDestroy {
  // Legacy inputs for backward compatibility
  @Input() headerText: string = "";
  @Input() heroSubheading: string = "";
  @Input() imageUrl: string = "";
  @Input() heroHtml: string = "";
  @Input() heroCss: string = "";
  @Input() featuresHtml: string = "";
  @Input() featuresCss: string = "";
  @Input() featuresTitle: string = "";
  @Input() featuresSubheading: string = "";
  @Input() features: Feature[] = [];
  @Input() previewMode: "desktop" | "tablet" | "mobile" = "desktop";
  @Input() sectionEnabled: SectionEnabled = { 
    hero: true, 
    about: true, 
    services: true, 
    features: true, 
    testimonials: true, 
    contact: true, 
    footer: true 
  };
  @Input() styleCss: string = "";
  @Input() testimonialsHtml: string = "";
  @Input() testimonialsCss: string = "";
  
  // New section inputs
  @Input() aboutHtml: string = "";
  @Input() aboutCss: string = "";
  @Input() aboutTitle: string = "";
  @Input() aboutDescription: string = "";
  @Input() aboutImageUrl: string = "";
  
  @Input() servicesHtml: string = "";
  @Input() servicesCss: string = "";
  @Input() servicesTitle: string = "";
  @Input() servicesSubheading: string = "";
  @Input() services: any[] = [];
  
  @Input() contactHtml: string = "";
  @Input() contactCss: string = "";
  @Input() contactTitle: string = "";
  @Input() contactSubheading: string = "";
  @Input() contactEmail: string = "";
  @Input() contactPhone: string = "";
  @Input() contactAddress: string = "";
  
  @Input() footerHtml: string = "";
  @Input() footerCss: string = "";
  @Input() footerCompanyName: string = "";
  @Input() footerDescription: string = "";
  @Input() footerCopyright: string = "";
  @Input() socialLinks: any[] = [];
  
  @Input() testimonialsTitle: string = "";
  @Input() testimonialsSubheading: string = "";
  @Input() testimonials: any[] = [];

  // New multi-section inputs
  @Input() sections: Section[] = [];
  @Input() globalStyles: string = "";
  @Input() enableTransitions: boolean = true;

  // Responsive design inputs
  @Input() currentDevice: DevicePreset | null = null;
  @Input() responsiveSettings: ResponsiveSettings | null = null;
  @Input() enableDeviceSimulation: boolean = false;

  @ViewChild('previewContainer', { static: false }) previewContainer!: ElementRef<HTMLDivElement>;

  safeHtml: SafeHtml = "";
  private destroy$ = new Subject<void>();

  constructor(
    private sanitizer: DomSanitizer,
    private templateService: TemplateService
  ) {}

  ngOnInit(): void {
    // Initialize responsive settings if device simulation is enabled
    if (this.enableDeviceSimulation && this.currentDevice) {
      this.setupDeviceSimulation();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle device changes for responsive simulation
    if (changes['currentDevice'] && this.enableDeviceSimulation) {
      this.setupDeviceSimulation();
    }

    // Handle responsive settings changes
    if (changes['responsiveSettings']) {
      this.updateResponsiveStyles();
    }

    // Immediately update the content when any input changes
    this.updateContent();
  }

  updateContent(): void {
    try {
      // Check if we should use multi-section rendering or legacy mode
      if (this.sections && this.sections.length > 0) {
        this.renderMultiSectionContent();
      } else {
        this.renderLegacyContent();
      }
    } catch (error) {
      console.error("Error processing HTML/CSS:", error);
    }
  }

  /**
   * Render content using the new multi-section approach
   */
  private renderMultiSectionContent(): void {
    // Get visible sections sorted by order
    const visibleSections = this.sections
      .filter((section) => section.isVisible)
      .sort((a, b) => a.order - b.order);

    // Process each section
    const processedSections = visibleSections.map((section) =>
      this.processSectionContent(section)
    );

    // Combine all section HTML
    const sectionsHtml = processedSections.join("");

    // Collect all section CSS
    const sectionsCss = visibleSections
      .map((section) => section.styles?.customCss || "")
      .join("\n");

    // Create the complete HTML with styles and transitions
    const htmlWithStyle = this.buildCompleteHtml(sectionsHtml, sectionsCss);

    // Make the HTML safe for insertion
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(htmlWithStyle);
  }

  /**
   * Render content using the legacy approach for backward compatibility
   */
  private renderLegacyContent(): void {
    // Process all sections (only if they're enabled)
    const processedHeroHtml = this.sectionEnabled?.hero
      ? this.processHeroSection()
      : "";

    const processedAboutHtml = this.sectionEnabled?.about
      ? this.processAboutSection()
      : "";

    const processedServicesHtml = this.sectionEnabled?.services
      ? this.processServicesSection()
      : "";

    const processedFeaturesHtml = this.sectionEnabled?.features
      ? this.processFeaturesSection()
      : "";

    const processedTestimonialsHtml = this.sectionEnabled?.testimonials
      ? this.processTestimonialsSection()
      : "";

    const processedContactHtml = this.sectionEnabled?.contact
      ? this.processContactSection()
      : "";

    const processedFooterHtml = this.sectionEnabled?.footer
      ? this.processFooterSection()
      : "";

    // Include only the CSS for the enabled sections
    const heroCssContent = this.sectionEnabled?.hero ? this.heroCss || "" : "";
    const aboutCssContent = this.sectionEnabled?.about ? this.aboutCss || "" : "";
    const servicesCssContent = this.sectionEnabled?.services ? this.servicesCss || "" : "";
    const featuresCssContent = this.sectionEnabled?.features ? this.featuresCss || "" : "";
    const testimonialsCssContent = this.sectionEnabled?.testimonials ? this.testimonialsCss || "" : "";
    const contactCssContent = this.sectionEnabled?.contact ? this.contactCss || "" : "";
    const footerCssContent = this.sectionEnabled?.footer ? this.footerCss || "" : "";

    const sectionsCss = [
      heroCssContent,
      aboutCssContent,
      servicesCssContent,
      featuresCssContent,
      testimonialsCssContent,
      contactCssContent,
      footerCssContent
    ].join("\n");

    // Combine sections HTML in logical order
    const sectionsHtml = [
      processedHeroHtml,
      processedAboutHtml,
      processedServicesHtml,
      processedFeaturesHtml,
      processedTestimonialsHtml,
      processedContactHtml,
      processedFooterHtml
    ].join("");

    // Create the complete HTML
    const htmlWithStyle = this.buildCompleteHtml(sectionsHtml, sectionsCss);

    // Make the HTML safe for insertion
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(htmlWithStyle);
  }

  /**
   * Build the complete HTML with all necessary styles and meta tags
   */
  private buildCompleteHtml(sectionsHtml: string, sectionsCss: string): string {
    // Create a unique ID for the style tag
    const styleId = "style-" + Math.random().toString(36).substring(2, 11);

    // Add Bootstrap CSS link
    const bootstrapCSS = `<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">`;

    // Add Bootstrap Icons
    const bootstrapIcons = `<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">`;

    // Add meta viewport tag for proper mobile rendering
    const viewportMeta = `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;

    // Apply responsive image handling if device simulation is enabled
    let processedSectionsHtml = sectionsHtml;
    if (this.enableDeviceSimulation && this.currentDevice) {
      processedSectionsHtml = this.applyResponsiveImageHandling(sectionsHtml);
    }

    // Get responsive and transition styles
    const responsiveStyles = this.getResponsiveStyles();
    const transitionStyles = this.enableTransitions
      ? this.getTransitionStyles()
      : "";

    // Get device-specific styles if responsive settings are available
    const deviceSpecificStyles = this.responsiveSettings && this.currentDevice
      ? this.generateDeviceSpecificStyles()
      : "";

    // Combine HTML and CSS for the complete page
    return `
      ${bootstrapCSS}
      ${bootstrapIcons}
      <style id="${styleId}">
        ${
          this.globalStyles || this.styleCss || ""
        } /* Apply global/style CSS first for proper cascading */
        ${sectionsCss}
        ${responsiveStyles}
        ${deviceSpecificStyles}
        ${transitionStyles}
      </style>
      ${viewportMeta}
      ${processedSectionsHtml}
    `;
  }

  /**
   * Process the hero section template
   */
  private processHeroSection(): string {
    if (!this.heroHtml) {
      return "";
    }

    // Make sure to explicitly check for null or undefined
    const headerText = this.headerText || "";
    const heroSubheading = this.heroSubheading || "";
    const imageUrl = this.imageUrl || "";

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
      return "";
    }

    // Make sure to explicitly check for null or undefined
    const featuresTitle = this.featuresTitle || "";
    const featuresSubheading = this.featuresSubheading || "";

    // Replace the features title placeholder using global regex replacement
    let processedHtml = this.featuresHtml;
    processedHtml = processedHtml.replace(/{{featuresTitle}}/g, featuresTitle);
    processedHtml = processedHtml.replace(
      /{{featuresSubheading}}/g,
      featuresSubheading
    );

    // Extract and process feature template
    const startMarker = "<!-- FEATURE_ITEM_START -->";
    const endMarker = "<!-- FEATURE_ITEM_END -->";

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
    let allFeaturesHtml = "";

    // Process each feature using regex replacement for guaranteed replacement
    for (const feature of this.features) {
      // Create a copy of the template for this feature
      let featureHtml = featureTemplate;

      // Replace placeholders with feature data
      featureHtml = featureHtml.replace(/{{title}}/g, feature.title || "");
      featureHtml = featureHtml.replace(/{{message}}/g, feature.message || "");

      // Add to the collection
      allFeaturesHtml += featureHtml;
    }

    // Replace the entire template section with the generated features
    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);

    return before + allFeaturesHtml + after;
  }

  /**
   * Process the about section
   */
  private processAboutSection(): string {
    if (!this.aboutHtml) {
      return "";
    }

    let result = this.aboutHtml;
    result = result.replace(/{{aboutTitle}}/g, this.aboutTitle || "");
    result = result.replace(/{{aboutDescription}}/g, this.aboutDescription || "");
    result = result.replace(/{{aboutImageUrl}}/g, this.aboutImageUrl || "");

    return result;
  }

  /**
   * Process the services section
   */
  private processServicesSection(): string {
    if (!this.servicesHtml) {
      return "";
    }

    let processedHtml = this.servicesHtml;
    processedHtml = processedHtml.replace(/{{servicesTitle}}/g, this.servicesTitle || "");
    processedHtml = processedHtml.replace(/{{servicesSubheading}}/g, this.servicesSubheading || "");

    // Process service items
    const startMarker = "<!-- SERVICE_ITEM_START -->";
    const endMarker = "<!-- SERVICE_ITEM_END -->";
    const startIndex = processedHtml.indexOf(startMarker);
    const endIndex = processedHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return processedHtml;
    }

    const serviceTemplate = processedHtml.substring(
      startIndex + startMarker.length,
      endIndex
    );
    let allServicesHtml = "";

    for (const service of this.services) {
      let serviceHtml = serviceTemplate;
      serviceHtml = serviceHtml.replace(/{{title}}/g, service.title || "");
      serviceHtml = serviceHtml.replace(/{{description}}/g, service.description || "");
      serviceHtml = serviceHtml.replace(/{{icon}}/g, service.icon || "");
      allServicesHtml += serviceHtml;
    }

    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);
    return before + allServicesHtml + after;
  }

  /**
   * Process the testimonials section
   */
  private processTestimonialsSection(): string {
    if (!this.testimonialsHtml) {
      return "";
    }

    let processedHtml = this.testimonialsHtml;
    processedHtml = processedHtml.replace(/{{testimonialsTitle}}/g, this.testimonialsTitle || "");
    processedHtml = processedHtml.replace(/{{testimonialsSubheading}}/g, this.testimonialsSubheading || "");

    // Process testimonial items
    const startMarker = "<!-- TESTIMONIAL_ITEM_START -->";
    const endMarker = "<!-- TESTIMONIAL_ITEM_END -->";
    const startIndex = processedHtml.indexOf(startMarker);
    const endIndex = processedHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return processedHtml;
    }

    const testimonialTemplate = processedHtml.substring(
      startIndex + startMarker.length,
      endIndex
    );
    let allTestimonialsHtml = "";

    for (const testimonial of this.testimonials) {
      let testimonialHtml = testimonialTemplate;
      testimonialHtml = testimonialHtml.replace(/{{name}}/g, testimonial.name || "");
      testimonialHtml = testimonialHtml.replace(/{{role}}/g, testimonial.role || "");
      testimonialHtml = testimonialHtml.replace(/{{message}}/g, testimonial.message || "");
      testimonialHtml = testimonialHtml.replace(/{{image}}/g, testimonial.image || "");
      testimonialHtml = testimonialHtml.replace(/{{rating}}/g, testimonial.rating || "5");
      allTestimonialsHtml += testimonialHtml;
    }

    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);
    return before + allTestimonialsHtml + after;
  }

  /**
   * Process the contact section
   */
  private processContactSection(): string {
    if (!this.contactHtml) {
      return "";
    }

    let result = this.contactHtml;
    result = result.replace(/{{contactTitle}}/g, this.contactTitle || "");
    result = result.replace(/{{contactSubheading}}/g, this.contactSubheading || "");
    result = result.replace(/{{contactEmail}}/g, this.contactEmail || "");
    result = result.replace(/{{contactPhone}}/g, this.contactPhone || "");
    result = result.replace(/{{contactAddress}}/g, this.contactAddress || "");

    return result;
  }

  /**
   * Process the footer section
   */
  private processFooterSection(): string {
    if (!this.footerHtml) {
      return "";
    }

    let processedHtml = this.footerHtml;
    processedHtml = processedHtml.replace(/{{footerCompanyName}}/g, this.footerCompanyName || "");
    processedHtml = processedHtml.replace(/{{footerDescription}}/g, this.footerDescription || "");
    processedHtml = processedHtml.replace(/{{footerCopyright}}/g, this.footerCopyright || "");

    // Process social links
    const startMarker = "<!-- SOCIAL_LINK_START -->";
    const endMarker = "<!-- SOCIAL_LINK_END -->";
    const startIndex = processedHtml.indexOf(startMarker);
    const endIndex = processedHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return processedHtml;
    }

    const socialTemplate = processedHtml.substring(
      startIndex + startMarker.length,
      endIndex
    );
    let allSocialLinksHtml = "";

    for (const link of this.socialLinks) {
      let socialHtml = socialTemplate;
      socialHtml = socialHtml.replace(/{{platform}}/g, link.platform || "");
      socialHtml = socialHtml.replace(/{{url}}/g, link.url || "");
      socialHtml = socialHtml.replace(/{{platformLower}}/g, (link.platform || "").toLowerCase());
      allSocialLinksHtml += socialHtml;
    }

    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);
    return before + allSocialLinksHtml + after;
  }

  /**
   * Process individual section content based on section type
   */
  private processSectionContent(section: Section): string {
    try {
      // Get the template for this section
      const template = this.templateService.getTemplateById(section.templateId);
      if (!template) {
        console.warn(
          `Template not found for section ${section.id}: ${section.templateId}`
        );
        return "";
      }

      // Get the HTML template
      let html = template.html || "";

      // Apply responsive classes based on current preview mode
      html = this.applyResponsiveClasses(html, section);

      // Apply section-specific content processing
      switch (section.type) {
        case SectionType.HERO:
          return this.processHeroSectionContent(html, section);
        case SectionType.FEATURES:
          return this.processFeaturesSectionContent(html, section);
        case SectionType.TESTIMONIALS:
          return this.processTestimonialsSectionContent(html, section);
        case SectionType.PRICING:
          return this.processPricingSectionContent(html, section);
        case SectionType.CONTACT:
          return this.processContactSectionContent(html, section);
        case SectionType.ABOUT:
          return this.processAboutSectionContent(html, section);
        case SectionType.CTA:
          return this.processCtaSectionContent(html, section);
        default:
          return this.processGenericSectionContent(html, section);
      }
    } catch (error) {
      console.error(`Error processing section ${section.id}:`, error);
      return "";
    }
  }

  /**
   * Apply responsive classes to section HTML based on preview mode
   */
  private applyResponsiveClasses(html: string, section: Section): string {
    // Add section wrapper with responsive and transition classes
    const sectionId = `section-${section.id}`;
    const transitionClass = this.enableTransitions ? "section-transition" : "";
    const responsiveClass = `preview-${this.previewMode}`;
    const visibilityClass = section.isVisible
      ? "section-visible"
      : "section-hidden";

    return `<div id="${sectionId}" class="section-wrapper ${transitionClass} ${responsiveClass} ${visibilityClass}" data-section-type="${section.type}" data-section-order="${section.order}">
      ${html}
    </div>`;
  }

  /**
   * Process hero section content
   */
  private processHeroSectionContent(html: string, section: Section): string {
    const content = section.content;
    let processedHtml = html;

    // Replace common hero placeholders
    processedHtml = processedHtml.replace(
      /{{headerText}}/g,
      content["headerText"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{heroSubheading}}/g,
      content["heroSubheading"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{imageUrl}}/g,
      content["imageUrl"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{buttonText}}/g,
      content["buttonText"] || "Get Started"
    );
    processedHtml = processedHtml.replace(
      /{{buttonUrl}}/g,
      content["buttonUrl"] || "#"
    );

    return processedHtml;
  }

  /**
   * Process features section content
   */
  private processFeaturesSectionContent(
    html: string,
    section: Section
  ): string {
    const content = section.content;
    let processedHtml = html;

    // Replace section title and subheading
    processedHtml = processedHtml.replace(
      /{{featuresTitle}}/g,
      content["featuresTitle"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{featuresSubheading}}/g,
      content["featuresSubheading"] || ""
    );

    // Process feature items if they exist
    if (content["features"] && Array.isArray(content["features"])) {
      processedHtml = this.processRepeatingItems(
        processedHtml,
        "FEATURE_ITEM",
        content["features"],
        (feature: any) => ({
          title: feature.title || "",
          message: feature.message || "",
          icon: feature.icon || "",
          image: feature.image || "",
        })
      );
    }

    return processedHtml;
  }

  /**
   * Process testimonials section content
   */
  private processTestimonialsSectionContent(
    html: string,
    section: Section
  ): string {
    const content = section.content;
    let processedHtml = html;

    // Replace section title and subheading
    processedHtml = processedHtml.replace(
      /{{testimonialsTitle}}/g,
      content["testimonialsTitle"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{testimonialsSubheading}}/g,
      content["testimonialsSubheading"] || ""
    );

    // Process testimonial items if they exist
    if (content["testimonials"] && Array.isArray(content["testimonials"])) {
      processedHtml = this.processRepeatingItems(
        processedHtml,
        "TESTIMONIAL_ITEM",
        content["testimonials"],
        (testimonial: any) => ({
          name: testimonial.name || "",
          role: testimonial.role || "",
          message: testimonial.message || "",
          image: testimonial.image || "",
          rating: testimonial.rating || 5,
          company: testimonial.company || "",
        })
      );
    }

    return processedHtml;
  }

  /**
   * Process pricing section content
   */
  private processPricingSectionContent(html: string, section: Section): string {
    const content = section.content;
    let processedHtml = html;

    // Replace section title and subheading
    processedHtml = processedHtml.replace(
      /{{pricingTitle}}/g,
      content["pricingTitle"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{pricingSubheading}}/g,
      content["pricingSubheading"] || ""
    );

    // Process pricing plans if they exist
    if (content["plans"] && Array.isArray(content["plans"])) {
      processedHtml = this.processRepeatingItems(
        processedHtml,
        "PRICING_PLAN",
        content["plans"],
        (plan: any) => ({
          name: plan.name || "",
          price: plan.price || "",
          interval: plan.interval || "month",
          features: Array.isArray(plan.features)
            ? plan.features.join("</li><li>")
            : "",
          buttonText: plan.buttonText || "Choose Plan",
          buttonUrl: plan.buttonUrl || "#",
          isPopular: plan.isPopular ? "popular" : "",
        })
      );
    }

    return processedHtml;
  }

  /**
   * Process contact section content
   */
  private processContactSectionContent(html: string, section: Section): string {
    const content = section.content;
    let processedHtml = html;

    // Replace contact information with both old and new placeholder formats for compatibility
    processedHtml = processedHtml.replace(
      /{{contactTitle}}/g,
      content["contactTitle"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{contactSubheading}}/g,
      content["contactSubheading"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{address}}/g,
      content["address"] || ""
    );
    processedHtml = processedHtml.replace(/{{email}}/g, content["email"] || "");
    processedHtml = processedHtml.replace(/{{phone}}/g, content["phone"] || "");
    processedHtml = processedHtml.replace(
      /{{mapUrl}}/g,
      content["mapUrl"] || ""
    );

    // Also handle legacy placeholder formats for backward compatibility
    processedHtml = processedHtml.replace(
      /{{contactAddress}}/g,
      content["address"] || content["contactAddress"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{contactEmail}}/g,
      content["email"] || content["contactEmail"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{contactPhone}}/g,
      content["phone"] || content["contactPhone"] || ""
    );

    return processedHtml;
  }

  /**
   * Process about section content
   */
  private processAboutSectionContent(html: string, section: Section): string {
    const content = section.content;
    let processedHtml = html;

    // Replace about information
    processedHtml = processedHtml.replace(
      /{{aboutTitle}}/g,
      content["aboutTitle"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{aboutSubheading}}/g,
      content["aboutSubheading"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{content}}/g,
      content["content"] || ""
    );
    processedHtml = processedHtml.replace(/{{image}}/g, content["image"] || "");

    // Process team members if they exist
    if (content["team"] && Array.isArray(content["team"])) {
      processedHtml = this.processRepeatingItems(
        processedHtml,
        "TEAM_MEMBER",
        content["team"],
        (member: any) => ({
          name: member.name || "",
          role: member.role || "",
          bio: member.bio || "",
          image: member.image || "",
          social: member.social || {},
        })
      );
    }

    return processedHtml;
  }

  /**
   * Process CTA section content
   */
  private processCtaSectionContent(html: string, section: Section): string {
    const content = section.content;
    let processedHtml = html;

    // Replace CTA information
    processedHtml = processedHtml.replace(
      /{{ctaTitle}}/g,
      content["ctaTitle"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{ctaSubheading}}/g,
      content["ctaSubheading"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{buttonText}}/g,
      content["buttonText"] || "Get Started"
    );
    processedHtml = processedHtml.replace(
      /{{buttonUrl}}/g,
      content["buttonUrl"] || "#"
    );
    processedHtml = processedHtml.replace(
      /{{secondaryButtonText}}/g,
      content["secondaryButtonText"] || ""
    );
    processedHtml = processedHtml.replace(
      /{{secondaryButtonUrl}}/g,
      content["secondaryButtonUrl"] || "#"
    );

    return processedHtml;
  }

  /**
   * Process generic section content (fallback for custom sections)
   */
  private processGenericSectionContent(html: string, section: Section): string {
    let processedHtml = html;

    // Replace any content properties that match placeholders
    Object.keys(section.content).forEach((key) => {
      const placeholder = new RegExp(`{{${key}}}`, "g");
      const value = section.content[key];

      if (typeof value === "string") {
        processedHtml = processedHtml.replace(placeholder, value);
      } else if (typeof value === "number") {
        processedHtml = processedHtml.replace(placeholder, value.toString());
      }
    });

    return processedHtml;
  }

  /**
   * Process repeating items in templates (features, testimonials, etc.)
   */
  private processRepeatingItems(
    html: string,
    itemType: string,
    items: any[],
    mapFunction: (item: any) => Record<string, any>
  ): string {
    const startMarker = `<!-- ${itemType}_START -->`;
    const endMarker = `<!-- ${itemType}_END -->`;

    const startIndex = html.indexOf(startMarker);
    const endIndex = html.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return html; // Cannot find markers
    }

    // Extract the template
    const itemTemplate = html.substring(
      startIndex + startMarker.length,
      endIndex
    );

    // Generate all items HTML from template
    let allItemsHtml = "";

    for (const item of items) {
      let itemHtml = itemTemplate;
      const mappedData = mapFunction(item);

      // Replace placeholders with item data
      Object.keys(mappedData).forEach((key) => {
        const placeholder = new RegExp(`{{${key}}}`, "g");
        itemHtml = itemHtml.replace(placeholder, mappedData[key] || "");
      });

      allItemsHtml += itemHtml;
    }

    // Replace the entire template section with the generated items
    const before = html.substring(0, startIndex);
    const after = html.substring(endIndex + endMarker.length);

    return before + allItemsHtml + after;
  }

  /**
   * Get responsive styles for different screen sizes
   */
  private getResponsiveStyles(): string {
    return `
      /* Base responsive styles */
      .section-wrapper {
        width: 100%;
        position: relative;
      }

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
        
        .features-title, .testimonials-title, .pricing-title, .contact-title, .about-title, .cta-title {
          font-size: 1.75rem;
        }
        
        .feature-card, .testimonial-card, .pricing-card {
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .section-wrapper {
          padding: 1rem 0;
        }
      }
      
      @media (max-width: 480px) {
        .hero-section, .features-section, .testimonials-section, .pricing-section, .contact-section, .about-section, .cta-section {
          padding: 1rem;
        }
        
        .hero-content h1 {
          font-size: 1.75rem;
        }
        
        .features-grid, .testimonials-grid, .pricing-grid {
          gap: 1rem;
        }

        .section-wrapper {
          padding: 0.5rem 0;
        }
      }

      /* Tablet styles */
      @media (min-width: 769px) and (max-width: 1024px) {
        .section-wrapper {
          padding: 1.5rem 0;
        }
        
        .hero-content h1 {
          font-size: 2.5rem;
        }
        
        .features-grid, .testimonials-grid, .pricing-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      /* Desktop styles */
      @media (min-width: 1025px) {
        .section-wrapper {
          padding: 2rem 0;
        }
        
        .hero-content h1 {
          font-size: 3rem;
        }
        
        .features-grid {
          grid-template-columns: repeat(3, 1fr);
        }
        
        .testimonials-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .pricing-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }

      /* Preview mode specific styles */
      .preview-mobile .section-wrapper {
        max-width: 375px;
        margin: 0 auto;
      }
      
      .preview-tablet .section-wrapper {
        max-width: 768px;
        margin: 0 auto;
      }
      
      .preview-desktop .section-wrapper {
        max-width: 100%;
      }

      /* Section visibility */
      .section-hidden {
        display: none;
      }
      
      .section-visible {
        display: block;
      }

      /* Ensure subheadings are visible */
      .hero-content p.lead,
      .features-section .lead,
      .testimonials-section .lead,
      .pricing-section .lead,
      .contact-section .lead,
      .about-section .lead,
      .cta-section .lead {
        display: block !important;
        visibility: visible !important;
      }
    `;
  }

  /**
   * Setup device simulation for responsive preview
   */
  private setupDeviceSimulation(): void {
    if (!this.currentDevice || !this.previewContainer) {
      return;
    }

    const container = this.previewContainer.nativeElement;
    
    // Apply device dimensions and styling
    container.style.width = `${this.currentDevice.width}px`;
    container.style.height = `${this.currentDevice.height}px`;
    container.style.maxWidth = `${this.currentDevice.width}px`;
    container.style.maxHeight = `${this.currentDevice.height}px`;
    container.style.overflow = 'auto';
    container.style.border = '1px solid #ccc';
    container.style.borderRadius = '8px';
    container.style.margin = '0 auto';
    
    // Add device-specific classes
    container.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
    container.classList.add(`device-${this.currentDevice.type}`);
    
    // Update preview mode based on device type
    switch (this.currentDevice.type) {
      case DeviceType.MOBILE:
        this.previewMode = 'mobile';
        break;
      case DeviceType.TABLET:
        this.previewMode = 'tablet';
        break;
      case DeviceType.DESKTOP:
        this.previewMode = 'desktop';
        break;
    }
  }

  /**
   * Update responsive styles based on current responsive settings
   */
  private updateResponsiveStyles(): void {
    if (!this.responsiveSettings) {
      return;
    }

    // Apply device-specific styles from responsive settings
    const deviceStyles = this.generateDeviceSpecificStyles();
    this.injectResponsiveStyles(deviceStyles);
  }

  /**
   * Generate device-specific CSS styles
   */
  private generateDeviceSpecificStyles(): string {
    if (!this.responsiveSettings || !this.currentDevice) {
      return '';
    }

    const deviceType = this.currentDevice.type;
    const deviceStyles = this.responsiveSettings.deviceSpecificStyles[deviceType];
    
    if (!deviceStyles || Object.keys(deviceStyles).length === 0) {
      return '';
    }

    // Convert device styles to CSS
    let css = `/* Device-specific styles for ${deviceType} */\n`;
    
    Object.entries(deviceStyles).forEach(([property, value]) => {
      css += `.device-${deviceType} { ${property}: ${value}; }\n`;
    });

    // Add breakpoint-specific styles
    if (this.responsiveSettings.breakpoints.length > 0) {
      const currentBreakpoint = this.getCurrentBreakpoint();
      if (currentBreakpoint) {
        css += `/* Breakpoint styles for ${currentBreakpoint.name} */\n`;
        css += `@media (min-width: ${currentBreakpoint.minWidth}px)`;
        if (currentBreakpoint.maxWidth) {
          css += ` and (max-width: ${currentBreakpoint.maxWidth}px)`;
        }
        css += ` {\n`;
        css += `  .section-wrapper { /* Breakpoint-specific section styles */ }\n`;
        css += `}\n`;
      }
    }

    return css;
  }

  /**
   * Get current breakpoint based on device width
   */
  private getCurrentBreakpoint() {
    if (!this.responsiveSettings || !this.currentDevice) {
      return null;
    }

    return this.responsiveSettings.breakpoints.find(bp =>
      this.currentDevice!.width >= bp.minWidth && 
      (bp.maxWidth === undefined || this.currentDevice!.width <= bp.maxWidth)
    );
  }

  /**
   * Inject responsive styles into the document
   */
  private injectResponsiveStyles(styles: string): void {
    // Remove existing responsive styles
    const existingStyle = document.getElementById('responsive-preview-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new responsive styles
    if (styles.trim()) {
      const styleElement = document.createElement('style');
      styleElement.id = 'responsive-preview-styles';
      styleElement.textContent = styles;
      document.head.appendChild(styleElement);
    }
  }

  /**
   * Apply responsive image handling
   */
  private applyResponsiveImageHandling(html: string): string {
    if (!this.currentDevice) {
      return html;
    }

    // Replace image tags with responsive versions
    return html.replace(/<img([^>]*?)src="([^"]*?)"([^>]*?)>/gi, (match, beforeSrc, src, afterSrc) => {
      // Generate responsive image attributes
      const responsiveAttrs = this.generateResponsiveImageAttributes(src);
      return `<img${beforeSrc}src="${src}"${afterSrc} ${responsiveAttrs}>`;
    });
  }

  /**
   * Generate responsive image attributes based on current device
   */
  private generateResponsiveImageAttributes(src: string): string {
    if (!this.currentDevice) {
      return '';
    }

    const deviceType = this.currentDevice.type;
    const deviceWidth = this.currentDevice.width;
    const pixelRatio = this.currentDevice.pixelRatio;

    let attributes = [];

    // Add loading attribute for performance
    attributes.push('loading="lazy"');

    // Add responsive sizing
    if (deviceType === DeviceType.MOBILE) {
      attributes.push('style="max-width: 100%; height: auto;"');
    } else if (deviceType === DeviceType.TABLET) {
      attributes.push('style="max-width: 100%; height: auto;"');
    }

    // Add srcset for high DPI displays
    if (pixelRatio > 1) {
      // In a real implementation, you would generate different sized images
      attributes.push(`srcset="${src} 1x, ${src} ${pixelRatio}x"`);
    }

    // Add sizes attribute for responsive images
    if (deviceType === DeviceType.MOBILE) {
      attributes.push(`sizes="(max-width: ${deviceWidth}px) 100vw, ${deviceWidth}px"`);
    } else if (deviceType === DeviceType.TABLET) {
      attributes.push(`sizes="(max-width: ${deviceWidth}px) 100vw, ${deviceWidth}px"`);
    }

    return attributes.join(' ');
  }

  /**
   * Get transition and animation styles for sections
   */
  private getTransitionStyles(): string {
    return `
      /* Section transition animations */
      .section-transition {
        transition: all 0.3s ease-in-out;
        animation: fadeInUp 0.6s ease-out;
      }

      .section-transition:nth-child(even) {
        animation-delay: 0.1s;
      }

      .section-transition:nth-child(odd) {
        animation-delay: 0.2s;
      }

      /* Fade in up animation */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Hover effects for interactive elements */
      .section-wrapper:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      }

      /* Button transitions */
      .section-wrapper button,
      .section-wrapper .btn {
        transition: all 0.2s ease;
      }

      .section-wrapper button:hover,
      .section-wrapper .btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      /* Card transitions */
      .feature-card,
      .testimonial-card,
      .pricing-card {
        transition: all 0.3s ease;
      }

      .feature-card:hover,
      .testimonial-card:hover,
      .pricing-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      }

      /* Image transitions */
      .section-wrapper img {
        transition: all 0.3s ease;
      }

      .section-wrapper img:hover {
        transform: scale(1.05);
      }

      /* Smooth scrolling between sections */
      html {
        scroll-behavior: smooth;
      }

      /* Section entrance animations based on scroll position */
      .section-wrapper {
        opacity: 0;
        transform: translateY(50px);
        animation: sectionEnter 0.8s ease-out forwards;
      }

      @keyframes sectionEnter {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Staggered animation delays for multiple sections */
      .section-wrapper:nth-child(1) { animation-delay: 0.1s; }
      .section-wrapper:nth-child(2) { animation-delay: 0.2s; }
      .section-wrapper:nth-child(3) { animation-delay: 0.3s; }
      .section-wrapper:nth-child(4) { animation-delay: 0.4s; }
      .section-wrapper:nth-child(5) { animation-delay: 0.5s; }
      .section-wrapper:nth-child(n+6) { animation-delay: 0.6s; }

      /* Reduce motion for users who prefer it */
      @media (prefers-reduced-motion: reduce) {
        .section-transition,
        .section-wrapper,
        .section-wrapper *,
        .feature-card,
        .testimonial-card,
        .pricing-card {
          animation: none !important;
          transition: none !important;
        }
        
        html {
          scroll-behavior: auto;
        }
      }
    `;
  }
}
