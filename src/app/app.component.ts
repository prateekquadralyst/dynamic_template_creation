import {
  Component,
  OnInit,
  HostListener,
  OnDestroy,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PreviewComponent } from "./preview/preview.component";
import { FilterPipe } from "./pipes/filter.pipe";
import { ProjectManagerComponent } from "./components/project-manager/project-manager.component";
import { TemplateBuilderComponent } from "./components/template-builder/template-builder.component";
import { GlobalStylingControlsComponent } from "./components/global-styling-controls/global-styling-controls.component";
import { CssInjectorComponent } from "./components/global-styling-controls/css-injector.component";
import { CssEditorDemoComponent } from "./components/css-editor-demo/css-editor-demo.component";
import {
  TemplateService,
  HeroTemplateVariables,
  FeaturesTemplateVariables,
  TestimonialsTemplateVariables,
  StyleTemplate,
} from "./services/template.service";
import { TemplateSection } from "./models/template.interface";
import { ProjectService } from "./services/project.service";
import { Project } from "./models/project.interface";
import { SectionType } from "./models/section.interface";
import { DomSanitizer } from "@angular/platform-browser";
import { Subject, takeUntil, debounceTime } from "rxjs";

interface Feature {
  title: string;
  message: string;
}

interface SectionEnabled {
  hero: boolean;
  features: boolean;
  testimonial: boolean;
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PreviewComponent,
    FilterPipe,
    ProjectManagerComponent,
    TemplateBuilderComponent,
    GlobalStylingControlsComponent,
    CssInjectorComponent,
    CssEditorDemoComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild("templateBuilder") templateBuilder!: TemplateBuilderComponent;

  // Panel collapse states
  isEditorCollapsed = false;

  // Section collapse states
  sections = {
    hero: true,
    features: true,
    testimonials: true,
    style: true, // Added new style section
    cssEditor: false, // Added CSS editor demo section
  };

  // CSS Editor Demo state
  showCSSEditorDemo = false;

  // Section visibility toggle (enabled/disabled in preview)
  sectionEnabled: SectionEnabled = {
    hero: true,
    features: true,
    testimonial: true,
  };

  // Code editor visibility states
  codeEditors = {
    hero: false,
    features: false,
    testimonials: false,
  };

  // Template panel state
  isTemplatePanelActive = false;
  activeTemplateType: "hero" | "features" | "testimonials" | "style" | null =
    null;

  // Active tabs for code editors
  heroActiveTab: "html" | "css" = "html";
  featuresActiveTab: "html" | "css" = "html";

  // Hero section properties - will be populated from template
  headerText = "";
  heroSubheading = "";
  imageUrl = "";

  // Features section properties - will be populated from template
  featuresTitle = "";
  featuresSubheading = "";
  features: Feature[] = [];

  // Style section properties - will be populated from template
  availableStyles: StyleTemplate[] = [];
  selectedStyle = "";

  // Preview control
  previewMode: "desktop" | "tablet" | "mobile" = "desktop";

  // HTML and CSS for Hero section
  heroHtml = "";
  heroCss = "";

  // HTML and CSS for Features section
  featuresHtml = "";
  featuresCss = "";

  testimonialsHtml = "";
  testimonialsCss = "";
  // testimonial section properties - will be populated from template
  testimonialsTitle = "";
  testimonialsSubheading = "";
  testimonials: any;

  // Available templates for each section
  availableHeroTemplates: TemplateSection[] = [];
  availableFeaturesTemplates: TemplateSection[] = [];

  // Currently selected template IDs
  selectedHeroTemplate = "";
  selectedFeaturesTemplate = "";

  // Loading state
  isLoading = true;

  // Flag to indicate initial load vs user-initiated template change
  private isInitialLoad = true;

  // Style specific CSS
  styleCss = "";

  // Project management
  currentProject: Project | null = null;
  showProjectManager = false;
  hasUnsavedChanges = false;
  private destroy$ = new Subject<void>();
  private autoSaveSubject = new Subject<void>();

  constructor(
    private templateService: TemplateService,
    private projectService: ProjectService,
    private sanitizer: DomSanitizer
  ) {}

  async ngOnInit(): Promise<void> {
    // Set loading state
    this.isLoading = true;

    // Setup auto-save functionality
    this.setupAutoSave();

    // Load available templates and styles first
    await this.loadAvailableTemplates();
    this.loadAvailableStyles();

    // Try to load the last opened project or create a default one
    await this.initializeProject();

    // Check screen size on initialization
    this.checkScreenSize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Disable auto-save for current project
    if (this.currentProject) {
      this.projectService.disableAutoSave(this.currentProject.id);
    }
  }

  /**
   * Load the list of available templates for each section
   */
  async loadAvailableTemplates(): Promise<void> {
    try {
      // Load both built-in and custom templates
      this.availableHeroTemplates =
        await this.templateService.getAllTemplatesByType(SectionType.HERO);
      this.availableFeaturesTemplates =
        await this.templateService.getAllTemplatesByType(SectionType.FEATURES);

      // Set initial selection if not already set
      if (
        !this.selectedHeroTemplate &&
        this.availableHeroTemplates.length > 0
      ) {
        this.selectedHeroTemplate =
          this.templateService.getSelectedTemplate("hero");
      }

      if (
        !this.selectedFeaturesTemplate &&
        this.availableFeaturesTemplates.length > 0
      ) {
        this.selectedFeaturesTemplate =
          this.templateService.getSelectedTemplate("features");
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      // Fallback to built-in templates only
      this.availableHeroTemplates = this.templateService.getTemplatesByType(
        SectionType.HERO
      );
      this.availableFeaturesTemplates = this.templateService.getTemplatesByType(
        SectionType.FEATURES
      );
    }
  }

  /**
   * Load the list of available style templates
   */
  loadAvailableStyles(): void {
    this.availableStyles = this.templateService.getStyleTemplates();

    // Set initial selected style
    this.selectedStyle = this.templateService.getSelectedStyle();
  }

  /**
   * Load the currently selected templates from the service
   */
  loadSelectedTemplates(): void {
    this.templateService.getCurrentTemplate().subscribe({
      next: (template) => {
        // Save current feature content before updating templates
        const currentFeatures = [...this.features];
        const currentFeaturesTitle = this.featuresTitle;
        const currentFeaturesSubheading = this.featuresSubheading;

        // Save current hero content before updating templates
        const currentHeaderText = this.headerText;
        const currentHeroSubheading = this.heroSubheading;
        const currentImageUrl = this.imageUrl;

        // Load template HTML/CSS
        this.heroHtml = template.heroHtml;
        this.heroCss = template.heroCss;
        this.featuresHtml = template.featuresHtml;
        this.featuresCss = template.featuresCss;

        // Only update content with template defaults during initial load
        if (this.isInitialLoad) {
          // Load template variables for hero section
          if (template.heroData) {
            const heroData = template.heroData as HeroTemplateVariables;
            this.headerText = heroData.headerText || "";
            this.heroSubheading = heroData.heroSubheading || "";
            this.imageUrl = heroData.imageUrl || "";
          }

          // Load template variables for features section
          if (template.featuresData) {
            const featuresData =
              template.featuresData as FeaturesTemplateVariables;
            this.featuresTitle = featuresData.featuresTitle || "";
            this.featuresSubheading = featuresData.featuresSubheading || "";
            this.features = [...(featuresData.features || [])];
          }
        } else {
          // For user-initiated template changes, restore the user's content
          this.headerText = currentHeaderText;
          this.heroSubheading = currentHeroSubheading;
          this.imageUrl = currentImageUrl;

          this.featuresTitle = currentFeaturesTitle;
          this.featuresSubheading = currentFeaturesSubheading;
          this.features = currentFeatures;
        }

        this.updateTemplate();
      },
      error: (error) => {
        console.error("Error loading templates:", error);
      },
    });
  }

  /**
   * Update style CSS when the selected style changes
   */
  updateStyleCss(): void {
    this.styleCss = this.templateService.generateStyleCss();
    this.updateTemplate();
  }

  /**
   * Select a style template
   * @param styleId The ID of the selected style template
   */
  selectStyleTemplate(styleId: string): void {
    if (this.selectedStyle !== styleId) {
      this.selectedStyle = styleId;
      this.templateService.setSelectedStyle(styleId);

      // Update the style CSS
      this.updateStyleCss();

      // Reload templates with the new style applied
      this.loadSelectedTemplates();

      // Close the template panel
      this.closeTemplatePanel();
    }
  }

  /**
   * Toggle the visibility of the template selector for a specific section
   */
  toggleTemplateSelector(
    section: "hero" | "features" | "testimonials" | "style"
  ): void {
    // If the panel is already active for this section, close it
    if (this.isTemplatePanelActive && this.activeTemplateType === section) {
      this.closeTemplatePanel();
      return;
    }

    // Set the active template type
    this.activeTemplateType = section;

    // Open the template panel
    this.isTemplatePanelActive = true;
  }

  /**
   * Close the template selection panel
   */
  closeTemplatePanel(): void {
    this.isTemplatePanelActive = false;
    this.activeTemplateType = null;
  }

  /**
   * Change the selected template for a section
   * @param type The section type ('hero' or 'features')
   * @param templateId The ID of the selected template
   */
  selectTemplate(
    type: "hero" | "features" | "testimonials",
    templateId: string
  ): void {
    if (!type) return; // Safety check

    if (type === "hero") {
      this.selectedHeroTemplate = templateId;
    } else if (type === "features") {
      this.selectedFeaturesTemplate = templateId;
    }

    // Update the selection in the service
    this.templateService.setSelectedTemplate(type, templateId);

    // Reload the selected templates
    this.loadSelectedTemplates();

    // Close the template panel after selection
    this.closeTemplatePanel();
  }

  // Check if the screen size is mobile and set responsive behavior accordingly
  @HostListener("window:resize", ["$event"])
  checkScreenSize(): void {
    const isMobile = window.innerWidth < 768;

    // If on mobile, auto-collapse editor panel when switching to mobile view
    if (isMobile && !this.isEditorCollapsed) {
      this.isEditorCollapsed = true;
    }
  }

  /**
   * Listen for Escape key press to close the template panel
   */
  @HostListener("document:keydown.escape", ["$event"])
  handleEscapeKey(event: KeyboardEvent): void {
    if (this.isTemplatePanelActive) {
      this.closeTemplatePanel();
    }
  }

  // Toggle the editor panel visibility
  toggleEditorPanel(): void {
    this.isEditorCollapsed = !this.isEditorCollapsed;

    // Close any open template panel when collapsing the editor
    if (this.isEditorCollapsed) {
      this.closeTemplatePanel();
    }
  }

  // Toggle section visibility
  toggleSection(section: "hero" | "features" | "testimonials" | "style" | "cssEditor"): void {
    this.sections[section] = !this.sections[section];
  }

  // Toggle code editor visibility
  toggleCodeEditor(editor: "hero" | "testimonials" | "features"): void {
    this.codeEditors[editor] = !this.codeEditors[editor];
  }

  // Add a new feature
  addFeature(): void {
    this.features.push({
      title: "New Feature",
      message: "Description of the new feature",
    });
    this.updateTemplate();

    // Scroll to the newly added feature (with a small delay to ensure DOM update)
    setTimeout(() => {
      const featureItems = document.querySelectorAll(".feature-item");
      if (featureItems.length > 0) {
        const lastFeature = featureItems[featureItems.length - 1];
        lastFeature.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  }

  // Remove a feature
  removeFeature(index: number): void {
    this.features.splice(index, 1);
    this.updateTemplate();
  }

  // Set preview mode (desktop, tablet, mobile)
  setPreviewMode(mode: "desktop" | "tablet" | "mobile"): void {
    this.previewMode = mode;
  }

  // Open preview in a new window
  openPreviewInNewWindow(): void {
    // Create a new window - setting fullscreen parameters
    const previewWindow = window.open(
      "",
      "_blank",
      "width=" +
        screen.availWidth +
        ",height=" +
        screen.availHeight +
        ",top=0,left=0"
    );

    if (previewWindow) {
      // Get the selected style for font url
      const selectedStyleTemplate = this.availableStyles.find(
        (style) => style.id === this.selectedStyle
      );
      const fontUrl = selectedStyleTemplate
        ? selectedStyleTemplate.fontCssUrl
        : "";

      // Generate the HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.headerText} - Preview</title>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
          <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
          ${fontUrl ? `<link href="${fontUrl}" rel="stylesheet">` : ""}
          <style>
            ${this.styleCss}
            ${this.sectionEnabled.hero ? this.heroCss : ""}
            ${this.sectionEnabled.features ? this.featuresCss : ""}
            ${this.sectionEnabled.testimonial ? this.testimonialsCss : ""}
            /* Additional styles for the preview */
            body {
              padding: 20px;
            }
            .preview-container {
              max-width: 1200px;
              margin: 0 auto;
              background-color: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
          </style>
        </head>
        <body>
          <div class="preview-container">
            ${this.sectionEnabled.hero ? this.processHeroSection() : ""}
            ${this.sectionEnabled.features ? this.processFeaturesSection() : ""}
            ${
              this.sectionEnabled.testimonial
                ? this.processTestimonialSection()
                : ""
            }
          </div>
        </body>
        </html>
      `;

      // Write to the new window
      previewWindow.document.open();
      previewWindow.document.write(htmlContent);
      previewWindow.document.close();
    }
  }

  // Process the hero section template for the external preview
  private processHeroSection(): string {
    if (!this.heroHtml) {
      return "";
    }

    // Replace placeholders in the hero HTML
    let result = this.heroHtml;
    result = result.replace(/{{headerText}}/g, this.headerText || "");
    result = result.replace(/{{heroSubheading}}/g, this.heroSubheading || "");
    result = result.replace(/{{imageUrl}}/g, this.imageUrl || "");

    return result;
  }

  // Process the features section for the external preview
  private processFeaturesSection(): string {
    if (!this.featuresHtml) {
      return "";
    }

    // Replace the section title and subheading
    let processedHtml = this.featuresHtml;
    processedHtml = processedHtml.replace(
      /{{featuresTitle}}/g,
      this.featuresTitle || ""
    );
    processedHtml = processedHtml.replace(
      /{{featuresSubheading}}/g,
      this.featuresSubheading || ""
    );

    // Extract and process feature template
    const startMarker = "<!-- FEATURE_ITEM_START -->";
    const endMarker = "<!-- FEATURE_ITEM_END -->";

    const startIndex = processedHtml.indexOf(startMarker);
    const endIndex = processedHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return processedHtml;
    }

    // Extract the template
    const featureTemplate = processedHtml.substring(
      startIndex + startMarker.length,
      endIndex
    );

    // Generate features HTML
    let allFeaturesHtml = "";

    for (const feature of this.features) {
      let featureHtml = featureTemplate;
      featureHtml = featureHtml.replace(/{{title}}/g, feature.title || "");
      featureHtml = featureHtml.replace(/{{message}}/g, feature.message || "");
      allFeaturesHtml += featureHtml;
    }

    // Replace the template section with generated features
    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);

    return before + allFeaturesHtml + after;
  }

  private processTestimonialSection(): string {
    if (!this.testimonials) {
      return "";
    }

    // Replace the section title and subheading
    let processedHtml = this.testimonialsHtml;
    processedHtml = processedHtml.replace(
      /{{testimonialsTitle}}/g,
      this.testimonialsTitle || ""
    );
    processedHtml = processedHtml.replace(
      /{{testimonialsSubheading}}/g,
      this.testimonialsSubheading || ""
    );

    // Extract and process feature template
    const startMarker = "<!-- TESTIMONIAL_ITEM_START -->";
    const endMarker = "<!-- TESTIMONIAL_ITEM_END -->";

    const startIndex = processedHtml.indexOf(startMarker);
    const endIndex = processedHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      return processedHtml;
    }

    // Extract the template
    const featureTemplate = processedHtml.substring(
      startIndex + startMarker.length,
      endIndex
    );

    // Generate features HTML
    let allFeaturesHtml = "";

    for (const testimonial of this.testimonials) {
      let featureHtml = featureTemplate;
      featureHtml = featureHtml.replace(/{{name}}/g, testimonial.name || "");
      featureHtml = featureHtml.replace(/{{role}}/g, testimonial.role || "");
      featureHtml = featureHtml.replace(
        /{{message}}/g,
        testimonial.message || ""
      );
      featureHtml = featureHtml.replace(/{{image}}/g, testimonial.image || "");
      featureHtml = featureHtml.replace(
        /{{rating}}/g,
        testimonial.rating || ""
      );
      allFeaturesHtml += featureHtml;
    }

    // Replace the template section with generated features
    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);

    return before + allFeaturesHtml + after;
  }

  // Update template (trigger change detection)
  updateTemplate(): void {
    // Force change detection by creating a new reference
    this.features = [...this.features];

    // Mark as having unsaved changes and trigger auto-save
    this.hasUnsavedChanges = true;
    this.autoSaveSubject.next();
  }

  /**
   * Initialize project - load existing or create new
   */
  private async initializeProject(): Promise<void> {
    try {
      // Try to get the last opened project from localStorage
      const lastProjectId = localStorage.getItem("lastOpenedProject");

      if (lastProjectId) {
        try {
          this.currentProject = await this.projectService.getProject(
            lastProjectId
          );
          this.loadProjectData();
        } catch (error) {
          console.warn("Could not load last project, creating new one:", error);
          await this.createDefaultProject();
        }
      } else {
        await this.createDefaultProject();
      }
    } catch (error) {
      console.error("Failed to initialize project:", error);
      await this.createDefaultProject();
    }

    this.isLoading = false;
    this.isInitialLoad = false;
  }

  /**
   * Create a default project
   */
  private async createDefaultProject(): Promise<void> {
    try {
      this.currentProject = await this.projectService.createProject({
        name: "Untitled Project",
        description: "A new website project",
      });

      // Load default template data
      this.loadDefaultTemplateData();

      // Save the project data
      await this.saveCurrentProject();

      // Store as last opened project
      localStorage.setItem("lastOpenedProject", this.currentProject.id);

      // Enable auto-save
      this.projectService.enableAutoSave(this.currentProject.id);
    } catch (error) {
      console.error("Failed to create default project:", error);
      // Load default template data anyway
      this.loadDefaultTemplateData();
    }
  }

  /**
   * Load default template data
   */
  private loadDefaultTemplateData(): void {
    // Load default templates from service
    const defaultTemplate = this.templateService.getDefaultTemplate();

    this.heroHtml = defaultTemplate.heroHtml;
    this.heroCss = defaultTemplate.heroCss;
    this.featuresHtml = defaultTemplate.featuresHtml;
    this.featuresCss = defaultTemplate.featuresCss;
    this.testimonialsHtml = defaultTemplate.testimonialsHtml;
    this.testimonialsCss = defaultTemplate.testimonialsCss;

    // Apply default template variables
    if (defaultTemplate.heroData) {
      const heroData = defaultTemplate.heroData as HeroTemplateVariables;
      this.headerText = heroData.headerText || "";
      this.heroSubheading = heroData.heroSubheading || "";
      this.imageUrl = heroData.imageUrl || "";
    }

    if (defaultTemplate.featuresData) {
      const featuresData =
        defaultTemplate.featuresData as FeaturesTemplateVariables;
      this.featuresTitle = featuresData.featuresTitle || "";
      this.featuresSubheading = featuresData.featuresSubheading || "";
      this.features = [...(featuresData.features || [])];
    }

    if (defaultTemplate.testimonialsData) {
      const testimonialsData =
        defaultTemplate.testimonialsData as TestimonialsTemplateVariables;
      this.testimonialsTitle = testimonialsData.testimonialsTitle || "";
      this.testimonialsSubheading =
        testimonialsData.testimonialsSubheading || "";
      this.testimonials = [...(testimonialsData.testimonials || [])];
    }

    // Generate initial style CSS
    this.updateStyleCss();

    // Load current templates from service
    this.loadSelectedTemplates();
  }

  /**
   * Load project data into the editor
   */
  private loadProjectData(): void {
    if (!this.currentProject) return;

    // Load project sections data
    const heroSection = this.currentProject.sections.find(
      (s) => s.type === SectionType.HERO
    );
    const featuresSection = this.currentProject.sections.find(
      (s) => s.type === SectionType.FEATURES
    );
    const testimonialsSection = this.currentProject.sections.find(
      (s) => s.type === SectionType.TESTIMONIALS
    );

    // Load hero section data
    if (heroSection) {
      this.headerText = heroSection.content["headerText"] || "";
      this.heroSubheading = heroSection.content["heroSubheading"] || "";
      this.imageUrl = heroSection.content["imageUrl"] || "";
      this.sectionEnabled.hero = heroSection.isVisible;
    }

    // Load features section data
    if (featuresSection) {
      this.featuresTitle = featuresSection.content["featuresTitle"] || "";
      this.featuresSubheading =
        featuresSection.content["featuresSubheading"] || "";
      this.features = featuresSection.content["features"] || [];
      this.sectionEnabled.features = featuresSection.isVisible;
    }

    // Load testimonials section data
    if (testimonialsSection) {
      this.testimonialsTitle =
        testimonialsSection.content["testimonialsTitle"] || "";
      this.testimonialsSubheading =
        testimonialsSection.content["testimonialsSubheading"] || "";
      this.testimonials = testimonialsSection.content["testimonials"] || [];
      this.sectionEnabled.testimonial = testimonialsSection.isVisible;
    }

    // Load templates and styles
    this.loadSelectedTemplates();
    this.updateStyleCss();

    // Enable auto-save for this project
    this.projectService.enableAutoSave(this.currentProject.id);

    // Mark as no unsaved changes initially
    this.hasUnsavedChanges = false;
  }

  /**
   * Setup auto-save functionality
   */
  private setupAutoSave(): void {
    this.autoSaveSubject
      .pipe(
        debounceTime(2000), // Wait 2 seconds after last change
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.currentProject && this.hasUnsavedChanges) {
          this.saveCurrentProject();
        }
      });
  }

  /**
   * Save current project data
   */
  private async saveCurrentProject(): Promise<void> {
    if (!this.currentProject) return;

    try {
      // Update project sections
      const sections = [];

      // Hero section
      sections.push({
        id: "hero-section",
        type: SectionType.HERO,
        templateId: this.selectedHeroTemplate,
        content: {
          headerText: this.headerText,
          heroSubheading: this.heroSubheading,
          imageUrl: this.imageUrl,
        },
        styles: {
          customCss: this.heroCss,
        },
        order: 0,
        isVisible: this.sectionEnabled.hero,
        responsiveSettings: {
          breakpoints: [],
          deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} },
        },
      });

      // Features section
      sections.push({
        id: "features-section",
        type: SectionType.FEATURES,
        templateId: this.selectedFeaturesTemplate,
        content: {
          featuresTitle: this.featuresTitle,
          featuresSubheading: this.featuresSubheading,
          features: this.features,
        },
        styles: {
          customCss: this.featuresCss,
        },
        order: 1,
        isVisible: this.sectionEnabled.features,
        responsiveSettings: {
          breakpoints: [],
          deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} },
        },
      });

      // Testimonials section
      sections.push({
        id: "testimonials-section",
        type: SectionType.TESTIMONIALS,
        templateId: "testimonials-default",
        content: {
          testimonialsTitle: this.testimonialsTitle,
          testimonialsSubheading: this.testimonialsSubheading,
          testimonials: this.testimonials,
        },
        styles: {
          customCss: this.testimonialsCss,
        },
        order: 2,
        isVisible: this.sectionEnabled.testimonial,
        responsiveSettings: {
          breakpoints: [],
          deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} },
        },
      });

      // Update the project
      await this.projectService.updateProject(this.currentProject.id, {
        sections: sections as any,
        updatedAt: new Date(),
      });

      this.hasUnsavedChanges = false;
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  }

  /**
   * Open project manager
   */
  openProjectManager(): void {
    this.showProjectManager = true;
  }

  /**
   * Close project manager
   */
  closeProjectManager(): void {
    this.showProjectManager = false;
  }

  /**
   * Handle project selection from project manager
   */
  async onProjectSelected(project: Project): Promise<void> {
    // Disable auto-save for current project
    if (this.currentProject) {
      this.projectService.disableAutoSave(this.currentProject.id);
    }

    // Set new current project
    this.currentProject = project;

    // Store as last opened project
    localStorage.setItem("lastOpenedProject", project.id);

    // Load project data
    this.loadProjectData();

    // Close project manager
    this.closeProjectManager();
  }

  /**
   * Get current project name for display
   */
  getCurrentProjectName(): string {
    return this.currentProject?.name || "Untitled Project";
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedProjectChanges(): boolean {
    return this.hasUnsavedChanges;
  }

  /**
   * Open the template builder
   */
  openTemplateBuilder(): void {
    if (this.templateBuilder) {
      this.templateBuilder.show();
      this.closeTemplatePanel();
    }
  }

  /**
   * Import a template from file
   */
  async importTemplate(): Promise<void> {
    try {
      // Create a file input element
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
      fileInput.style.display = "none";

      fileInput.onchange = async (event: any) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
          const fileContent = await this.readFileAsText(file);
          const templateData = JSON.parse(fileContent);

          // Import the template
          const importedTemplate = await this.templateService.importTemplate(
            templateData
          );

          // Refresh the template list
          await this.loadAvailableTemplates();

          alert(`Template "${importedTemplate.name}" imported successfully!`);
        } catch (error) {
          console.error("Failed to import template:", error);
          alert("Failed to import template. Please check the file format.");
        }
      };

      // Trigger file selection
      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
    } catch (error) {
      console.error("Failed to import template:", error);
      alert("Failed to import template.");
    }
  }

  /**
   * Export a custom template
   */
  async exportTemplate(templateId: string): Promise<void> {
    try {
      const exportData = await this.templateService.exportTemplate(templateId);

      // Create and download the file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${exportData.template.name.replace(
        /\s+/g,
        "_"
      )}_template.json`;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      alert(`Template "${exportData.template.name}" exported successfully!`);
    } catch (error) {
      console.error("Failed to export template:", error);
      alert("Failed to export template.");
    }
  }

  /**
   * Edit a custom template
   */
  async editCustomTemplate(templateId: string): Promise<void> {
    try {
      const template = await this.templateService.getCustomTemplate(templateId);
      if (template && this.templateBuilder) {
        this.templateBuilder.loadTemplate(template);
        this.closeTemplatePanel();
      }
    } catch (error) {
      console.error("Failed to load template for editing:", error);
      alert("Failed to load template for editing.");
    }
  }

  /**
   * Delete a custom template
   */
  async deleteCustomTemplate(templateId: string): Promise<void> {
    try {
      const template = await this.templateService.getCustomTemplate(templateId);
      if (!template) return;

      const confirmed = confirm(
        `Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`
      );
      if (!confirmed) return;

      await this.templateService.deleteCustomTemplate(templateId);

      // Refresh the template list
      await this.loadAvailableTemplates();

      // If the deleted template was currently selected, switch to a default template
      if (this.selectedHeroTemplate === templateId) {
        const defaultTemplate = this.availableHeroTemplates.find(
          (t) => t.isBuiltIn
        );
        if (defaultTemplate) {
          this.selectTemplate("hero", defaultTemplate.id);
        }
      }

      if (this.selectedFeaturesTemplate === templateId) {
        const defaultTemplate = this.availableFeaturesTemplates.find(
          (t) => t.isBuiltIn
        );
        if (defaultTemplate) {
          this.selectTemplate("features", defaultTemplate.id);
        }
      }

      alert(`Template "${template.name}" deleted successfully.`);
    } catch (error) {
      console.error("Failed to delete template:", error);
      alert("Failed to delete template.");
    }
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}
