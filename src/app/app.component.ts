import {
  Component,
  OnInit,
  HostListener,
  OnDestroy,
  ViewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { PreviewComponent } from "./preview/preview.component";
import { FilterPipe } from "./pipes/filter.pipe";
import { ProjectManagerComponent } from "./components/project-manager/project-manager.component";
import { TemplateBuilderComponent } from "./components/template-builder/template-builder.component";
import { TemplateGalleryComponent } from "./components/template-gallery/template-gallery.component";
import { GlobalStylingControlsComponent } from "./components/global-styling-controls/global-styling-controls.component";
import { CssInjectorComponent } from "./components/global-styling-controls/css-injector.component";
import { CssEditorDemoComponent } from "./components/css-editor-demo/css-editor-demo.component";
import {
  ResponsiveSidebarComponent,
  SidebarState,
} from "./components/responsive-sidebar/responsive-sidebar.component";
import { TemplatePreviewComponent } from "./components/template-preview/template-preview.component";
import { TemplatePreviewModalComponent } from "./components/template-preview-modal/template-preview-modal.component";
import { UiImprovementsToolbarComponent } from "./components/ui-improvements-toolbar/ui-improvements-toolbar.component";
import { NotificationContainerComponent } from "./components/notification-container/notification-container.component";
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
import { UndoRedoService } from "./services/undo-redo.service";
import { KeyboardShortcutsService } from "./services/keyboard-shortcuts.service";
import { DragDropService } from "./services/drag-drop.service";
import { DomSanitizer } from "@angular/platform-browser";
import { NotificationService } from "./services/notification.service";
import { Subject, takeUntil, debounceTime } from "rxjs";

interface Feature {
  title: string;
  message: string;
}

interface Service {
  title: string;
  description: string;
  icon: string;
}

interface Testimonial {
  name: string;
  role: string;
  message: string;
  image: string;
  rating: number;
}

interface SocialLink {
  platform: string;
  url: string;
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
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PreviewComponent,
    FilterPipe,
    ProjectManagerComponent,
    TemplateBuilderComponent,
    TemplateGalleryComponent,
    GlobalStylingControlsComponent,
    CssInjectorComponent,
    CssEditorDemoComponent,
    ResponsiveSidebarComponent,
    TemplatePreviewComponent,
    TemplatePreviewModalComponent,
    UiImprovementsToolbarComponent,
    NotificationContainerComponent,
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
    about: true,
    services: true,
    features: true,
    testimonials: true,
    contact: true,
    footer: true,
    style: true,
    cssEditor: false,
  };

  // CSS Editor Demo state
  showCSSEditorDemo = false;

  // Section visibility toggle (enabled/disabled in preview)
  sectionEnabled: SectionEnabled = {
    hero: true,
    about: true,
    services: true,
    features: true,
    testimonials: true,
    contact: true,
    footer: true,
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

  // Hero section properties
  headerText = "";
  heroSubheading = "";
  imageUrl = "";

  // About section properties
  aboutTitle = "";
  aboutDescription = "";
  aboutImageUrl = "";

  // Services section properties
  servicesTitle = "";
  servicesSubheading = "";
  services: Service[] = [];

  // Features section properties
  featuresTitle = "";
  featuresSubheading = "";
  features: Feature[] = [];

  // Contact section properties
  contactTitle = "";
  contactSubheading = "";
  contactEmail = "";
  contactPhone = "";
  contactAddress = "";

  // Footer section properties
  footerCompanyName = "";
  footerDescription = "";
  footerCopyright = "";
  socialLinks: SocialLink[] = [];

  // Style section properties
  availableStyles: StyleTemplate[] = [];
  selectedStyle = "";

  // Preview control
  previewMode: "desktop" | "tablet" | "mobile" = "desktop";

  // HTML and CSS for sections
  heroHtml = "";
  heroCss = "";
  aboutHtml = "";
  aboutCss = "";
  servicesHtml = "";
  servicesCss = "";
  featuresHtml = "";
  featuresCss = "";
  testimonialsHtml = "";
  testimonialsCss = "";
  contactHtml = "";
  contactCss = "";
  footerHtml = "";
  footerCss = "";

  // Testimonial section properties
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
  private isInitialLoad = true;

  // Style specific CSS
  styleCss = "";

  // Project management
  currentProject: Project | null = null;
  showProjectManager = false;
  hasUnsavedChanges = false;

  // Template gallery state
  showTemplateGallery = false;

  // Responsive sidebar state
  showResponsiveSidebar = false;
  sidebarState: SidebarState = {
    isOpen: false,
    isCollapsed: false,
    activeTab: "templates",
    width: 320,
  };

  // Template preview modal state
  showTemplatePreviewModal = false;
  previewModalTemplate: TemplateSection | null = null;

  private destroy$ = new Subject<void>();
  private autoSaveSubject = new Subject<void>();

  constructor(
    private templateService: TemplateService,
    private projectService: ProjectService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router,
    private undoRedoService: UndoRedoService,
    private keyboardShortcutsService: KeyboardShortcutsService,
    private dragDropService: DragDropService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    this.setupAutoSave();
    this.setupKeyboardEventListeners();
    await this.loadAvailableTemplates();
    this.loadAvailableStyles();

    this.route.paramMap.subscribe((params) => {
      const templateId = params.get("templateId");
      console.log("Route param templateId:", templateId);
      if (templateId) {
        this.initializeWithTemplate(templateId);
      }
    });

    // Listen for query parameter changes to handle wizard customization data
    this.route.queryParamMap.subscribe((queryParams) => {
      console.log("Query params received:", queryParams);
      const fromWizard = queryParams.get("fromWizard");
      console.log("fromWizard flag:", fromWizard);
      if (fromWizard === "true") {
        this.applyWizardCustomization(queryParams);
      }
    });

    await this.initializeProject();
    this.checkScreenSize();

    setTimeout(() => {
      this.initializeDragDrop();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.currentProject) {
      this.projectService.disableAutoSave(this.currentProject.id);
    }
  }

  async loadAvailableTemplates(): Promise<void> {
    try {
      this.availableHeroTemplates =
        await this.templateService.getAllTemplatesByType(SectionType.HERO);
      this.availableFeaturesTemplates =
        await this.templateService.getAllTemplatesByType(SectionType.FEATURES);

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
      this.availableHeroTemplates = this.templateService.getTemplatesByType(
        SectionType.HERO
      );
      this.availableFeaturesTemplates = this.templateService.getTemplatesByType(
        SectionType.FEATURES
      );
    }
  }

  loadAvailableStyles(): void {
    this.availableStyles = this.templateService.getStyleTemplates();
    this.selectedStyle = this.templateService.getSelectedStyle();
  }

  loadSelectedTemplates(): void {
    this.templateService.getCurrentTemplate().subscribe({
      next: (template) => {
        const currentFeatures = [...this.features];
        const currentFeaturesTitle = this.featuresTitle;
        const currentFeaturesSubheading = this.featuresSubheading;
        const currentHeaderText = this.headerText;
        const currentHeroSubheading = this.heroSubheading;
        const currentImageUrl = this.imageUrl;

        this.heroHtml = template.heroHtml;
        this.heroCss = template.heroCss;
        this.aboutHtml = template.aboutHtml;
        this.aboutCss = template.aboutCss;
        this.servicesHtml = template.servicesHtml;
        this.servicesCss = template.servicesCss;
        this.featuresHtml = template.featuresHtml;
        this.featuresCss = template.featuresCss;
        this.testimonialsHtml = template.testimonialsHtml;
        this.testimonialsCss = template.testimonialsCss;
        this.contactHtml = template.contactHtml;
        this.contactCss = template.contactCss;
        this.footerHtml = template.footerHtml;
        this.footerCss = template.footerCss;

        if (this.isInitialLoad) {
          if (template.heroData) {
            const heroData = template.heroData as HeroTemplateVariables;
            this.headerText = heroData.headerText || "";
            this.heroSubheading = heroData.heroSubheading || "";
            this.imageUrl = heroData.imageUrl || "";
          }

          if (template.aboutData) {
            const aboutData = template.aboutData as any;
            this.aboutTitle = aboutData.aboutTitle || "";
            this.aboutDescription = aboutData.aboutDescription || "";
            this.aboutImageUrl = aboutData.aboutImageUrl || "";
          }

          if (template.servicesData) {
            const servicesData = template.servicesData as any;
            this.servicesTitle = servicesData.servicesTitle || "";
            this.servicesSubheading = servicesData.servicesSubheading || "";
            this.services = [...(servicesData.services || [])];
          }

          if (template.featuresData) {
            const featuresData =
              template.featuresData as FeaturesTemplateVariables;
            this.featuresTitle = featuresData.featuresTitle || "";
            this.featuresSubheading = featuresData.featuresSubheading || "";
            this.features = [...(featuresData.features || [])];
          }

          if (template.testimonialsData) {
            const testimonialsData = template.testimonialsData as any;
            this.testimonialsTitle = testimonialsData.testimonialsTitle || "";
            this.testimonialsSubheading =
              testimonialsData.testimonialsSubheading || "";
            this.testimonials = [...(testimonialsData.testimonials || [])];
          }

          if (template.contactData) {
            const contactData = template.contactData as any;
            this.contactTitle = contactData.contactTitle || "";
            this.contactSubheading = contactData.contactSubheading || "";
            this.contactEmail = contactData.contactEmail || "";
            this.contactPhone = contactData.contactPhone || "";
            this.contactAddress = contactData.contactAddress || "";
          }

          if (template.footerData) {
            const footerData = template.footerData as any;
            this.footerCompanyName = footerData.footerCompanyName || "";
            this.footerDescription = footerData.footerDescription || "";
            this.footerCopyright = footerData.footerCopyright || "";
            this.socialLinks = [...(footerData.socialLinks || [])];
          }
        } else {
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

  updateStyleCss(): void {
    this.styleCss = this.templateService.generateStyleCss();
    this.updateTemplate();
  }

  selectStyleTemplate(styleId: string): void {
    if (this.selectedStyle !== styleId) {
      this.selectedStyle = styleId;
      this.templateService.setSelectedStyle(styleId);
      this.updateStyleCss();
      this.loadSelectedTemplates();
      this.closeTemplatePanel();
    }
  }

  toggleTemplateSelector(
    section: "hero" | "features" | "testimonials" | "style"
  ): void {
    if (this.isTemplatePanelActive && this.activeTemplateType === section) {
      this.closeTemplatePanel();
      return;
    }
    this.activeTemplateType = section;
    this.isTemplatePanelActive = true;
  }

  closeTemplatePanel(): void {
    this.isTemplatePanelActive = false;
    this.activeTemplateType = null;
  }

  selectTemplate(
    type: "hero" | "features" | "testimonials",
    templateId: string
  ): void {
    if (!type) return;

    if (type === "hero") {
      this.selectedHeroTemplate = templateId;
    } else if (type === "features") {
      this.selectedFeaturesTemplate = templateId;
    }

    this.templateService.setSelectedTemplate(type, templateId);
    this.loadSelectedTemplates();
    this.closeTemplatePanel();
  }

  @HostListener("window:resize", ["$event"])
  checkScreenSize(): void {
    const isMobile = window.innerWidth < 768;
    if (isMobile && !this.isEditorCollapsed) {
      this.isEditorCollapsed = true;
    }
  }

  @HostListener("document:keydown.escape", ["$event"])
  handleEscapeKey(event: KeyboardEvent): void {
    if (this.isTemplatePanelActive) {
      this.closeTemplatePanel();
    }
  }

  toggleEditorPanel(): void {
    this.isEditorCollapsed = !this.isEditorCollapsed;
    if (this.isEditorCollapsed) {
      this.closeTemplatePanel();
    }
  }

  toggleSection(
    section:
      | "hero"
      | "about"
      | "services"
      | "features"
      | "testimonials"
      | "contact"
      | "footer"
      | "style"
      | "cssEditor"
  ): void {
    this.sections[section] = !this.sections[section];
  }

  toggleCodeEditor(editor: "hero" | "testimonials" | "features"): void {
    this.codeEditors[editor] = !this.codeEditors[editor];
  }
  // Enhanced methods with undo/redo functionality
  addFeature(): void {
    const oldFeatures = [...this.features];
    const newFeature = {
      title: "New Feature",
      message: "Description of the new feature",
    };

    const newFeatures = [...this.features, newFeature];

    const action = this.undoRedoService.createArrayChangeAction(
      `add-feature-${Date.now()}`,
      "Add feature",
      oldFeatures,
      newFeatures,
      (features) => {
        this.features = features;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);

    setTimeout(() => {
      const featureItems = document.querySelectorAll(".feature-item");
      if (featureItems.length > 0) {
        const lastFeature = featureItems[featureItems.length - 1];
        lastFeature.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  }

  removeFeature(index: number): void {
    if (index < 0 || index >= this.features.length) return;

    const oldFeatures = [...this.features];
    const newFeatures = [...this.features];
    newFeatures.splice(index, 1);

    const action = this.undoRedoService.createArrayChangeAction(
      `remove-feature-${Date.now()}`,
      `Remove feature "${this.features[index].title}"`,
      oldFeatures,
      newFeatures,
      (features) => {
        this.features = features;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  setPreviewMode(mode: "desktop" | "tablet" | "mobile"): void {
    this.previewMode = mode;
  }

  openPreviewInNewWindow(): void {
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
      const selectedStyleTemplate = this.availableStyles.find(
        (style) => style.id === this.selectedStyle
      );
      const fontUrl = selectedStyleTemplate
        ? selectedStyleTemplate.fontCssUrl
        : "";

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
            ${this.sectionEnabled.about ? this.aboutCss : ""}
            ${this.sectionEnabled.services ? this.servicesCss : ""}
            ${this.sectionEnabled.features ? this.featuresCss : ""}
            ${this.sectionEnabled.testimonials ? this.testimonialsCss : ""}
            ${this.sectionEnabled.contact ? this.contactCss : ""}
            ${this.sectionEnabled.footer ? this.footerCss : ""}
            body { padding: 20px; }
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
            ${this.sectionEnabled.about ? this.processAboutSection() : ""}
            ${this.sectionEnabled.services ? this.processServicesSection() : ""}
            ${this.sectionEnabled.features ? this.processFeaturesSection() : ""}
            ${
              this.sectionEnabled.testimonials
                ? this.processTestimonialSection()
                : ""
            }
            ${this.sectionEnabled.contact ? this.processContactSection() : ""}
            ${this.sectionEnabled.footer ? this.processFooterSection() : ""}
          </div>
        </body>
        </html>
      `;

      previewWindow.document.open();
      previewWindow.document.write(htmlContent);
      previewWindow.document.close();
    }
  }
  private processHeroSection(): string {
    if (!this.heroHtml) return "";
    let result = this.heroHtml || "";
    result = result.replace(/{{heroSubheading}}/g, this.heroSubheading || "");
    result = result.replace(/{{imageUrl}}/g, this.imageUrl || "");
    result = result.replace(/{{headerText}}/g, this.headerText || "");
    return result;
  }

  private processFeaturesSection(): string {
    if (!this.featuresHtml) return "";
    let processedHtml = this.featuresHtml;
    processedHtml = processedHtml.replace(
      /{{featuresTitle}}/g,
      this.featuresTitle || ""
    );
    processedHtml = processedHtml.replace(
      /{{featuresSubheading}}/g,
      this.featuresSubheading || ""
    );

    const startMarker = "<!-- FEATURE_ITEM_START -->";
    const endMarker = "<!-- FEATURE_ITEM_END -->";
    const startIndex = processedHtml.indexOf(startMarker);
    const endIndex = processedHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) return processedHtml;

    const featureTemplate = processedHtml.substring(
      startIndex + startMarker.length,
      endIndex
    );
    let allFeaturesHtml = "";

    for (const feature of this.features) {
      let featureHtml = featureTemplate;
      featureHtml = featureHtml.replace(/{{title}}/g, feature.title || "");
      featureHtml = featureHtml.replace(/{{message}}/g, feature.message || "");
      allFeaturesHtml += featureHtml;
    }

    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);
    return before + allFeaturesHtml + after;
  }

  private processAboutSection(): string {
    if (!this.aboutHtml) return "";
    let result = this.aboutHtml;
    result = result.replace(/{{aboutTitle}}/g, this.aboutTitle || "");
    result = result.replace(
      /{{aboutDescription}}/g,
      this.aboutDescription || ""
    );
    result = result.replace(/{{aboutImageUrl}}/g, this.aboutImageUrl || "");
    return result;
  }

  private processServicesSection(): string {
    if (!this.servicesHtml) return "";
    let processedHtml = this.servicesHtml;
    processedHtml = processedHtml.replace(
      /{{servicesTitle}}/g,
      this.servicesTitle || ""
    );
    processedHtml = processedHtml.replace(
      /{{servicesSubheading}}/g,
      this.servicesSubheading || ""
    );

    const startMarker = "<!-- SERVICE_ITEM_START -->";
    const endMarker = "<!-- SERVICE_ITEM_END -->";
    const startIndex = processedHtml.indexOf(startMarker);
    const endIndex = processedHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) return processedHtml;

    const serviceTemplate = processedHtml.substring(
      startIndex + startMarker.length,
      endIndex
    );
    let allServicesHtml = "";

    for (const service of this.services) {
      let serviceHtml = serviceTemplate;
      serviceHtml = serviceHtml.replace(/{{title}}/g, service.title || "");
      serviceHtml = serviceHtml.replace(
        /{{description}}/g,
        service.description || ""
      );
      serviceHtml = serviceHtml.replace(/{{icon}}/g, service.icon || "");
      allServicesHtml += serviceHtml;
    }

    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);
    return before + allServicesHtml + after;
  }

  private processTestimonialSection(): string {
    if (!this.testimonials) return "";
    let processedHtml = this.testimonialsHtml;
    processedHtml = processedHtml.replace(
      /{{testimonialsTitle}}/g,
      this.testimonialsTitle || ""
    );
    processedHtml = processedHtml.replace(
      /{{testimonialsSubheading}}/g,
      this.testimonialsSubheading || ""
    );

    const startMarker = "<!-- TESTIMONIAL_ITEM_START -->";
    const endMarker = "<!-- TESTIMONIAL_ITEM_END -->";
    const startIndex = processedHtml.indexOf(startMarker);
    const endIndex = processedHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) return processedHtml;

    const testimonialTemplate = processedHtml.substring(
      startIndex + startMarker.length,
      endIndex
    );
    let allTestimonialsHtml = "";

    for (const testimonial of this.testimonials) {
      let testimonialHtml = testimonialTemplate;
      testimonialHtml = testimonialHtml.replace(
        /{{name}}/g,
        testimonial.name || ""
      );
      testimonialHtml = testimonialHtml.replace(
        /{{role}}/g,
        testimonial.role || ""
      );
      testimonialHtml = testimonialHtml.replace(
        /{{message}}/g,
        testimonial.message || ""
      );
      testimonialHtml = testimonialHtml.replace(
        /{{image}}/g,
        testimonial.image || ""
      );
      testimonialHtml = testimonialHtml.replace(
        /{{rating}}/g,
        testimonial.rating || ""
      );
      allTestimonialsHtml += testimonialHtml;
    }

    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);
    return before + allTestimonialsHtml + after;
  }

  private processContactSection(): string {
    if (!this.contactHtml) return "";
    let result = this.contactHtml;
    result = result.replace(/{{contactTitle}}/g, this.contactTitle || "");
    result = result.replace(
      /{{contactSubheading}}/g,
      this.contactSubheading || ""
    );
    result = result.replace(/{{email}}/g, this.contactEmail || "");
    result = result.replace(/{{phone}}/g, this.contactPhone || "");
    result = result.replace(/{{address}}/g, this.contactAddress || "");
    return result;
  }

  private processFooterSection(): string {
    if (!this.footerHtml) return "";
    let processedHtml = this.footerHtml;
    processedHtml = processedHtml.replace(
      /{{footerCompanyName}}/g,
      this.footerCompanyName || ""
    );
    processedHtml = processedHtml.replace(
      /{{footerDescription}}/g,
      this.footerDescription || ""
    );
    processedHtml = processedHtml.replace(
      /{{footerCopyright}}/g,
      this.footerCopyright || ""
    );

    const startMarker = "<!-- SOCIAL_LINK_START -->";
    const endMarker = "<!-- SOCIAL_LINK_END -->";
    const startIndex = processedHtml.indexOf(startMarker);
    const endIndex = processedHtml.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) return processedHtml;

    const socialTemplate = processedHtml.substring(
      startIndex + startMarker.length,
      endIndex
    );
    let allSocialLinksHtml = "";

    for (const link of this.socialLinks) {
      let socialHtml = socialTemplate;
      socialHtml = socialHtml.replace(/{{platform}}/g, link.platform || "");
      socialHtml = socialHtml.replace(/{{url}}/g, link.url || "");
      socialHtml = socialHtml.replace(
        /{{platformLower}}/g,
        (link.platform || "").toLowerCase()
      );
      allSocialLinksHtml += socialHtml;
    }

    const before = processedHtml.substring(0, startIndex);
    const after = processedHtml.substring(endIndex + endMarker.length);
    return before + allSocialLinksHtml + after;
  }

  updateTemplate(): void {
    this.features = [...this.features];
    this.hasUnsavedChanges = true;
    this.autoSaveSubject.next();
  }

  // Text change methods with undo/redo
  updateHeaderText(newValue: string): void {
    if (this.headerText === newValue) return;
    const oldValue = this.headerText;
    const action = this.undoRedoService.createTextChangeAction(
      `header-text-${Date.now()}`,
      "Change header text",
      oldValue,
      newValue,
      (value) => {
        this.headerText = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateHeroSubheading(newValue: string): void {
    if (this.heroSubheading === newValue) return;
    const oldValue = this.heroSubheading;
    const action = this.undoRedoService.createTextChangeAction(
      `hero-subheading-${Date.now()}`,
      "Change hero subheading",
      oldValue,
      newValue,
      (value) => {
        this.heroSubheading = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateImageUrl(newValue: string): void {
    if (this.imageUrl === newValue) return;
    const oldValue = this.imageUrl;
    const action = this.undoRedoService.createTextChangeAction(
      `image-url-${Date.now()}`,
      "Change image URL",
      oldValue,
      newValue,
      (value) => {
        this.imageUrl = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateFeaturesTitle(newValue: string): void {
    if (this.featuresTitle === newValue) return;
    const oldValue = this.featuresTitle;
    const action = this.undoRedoService.createTextChangeAction(
      `features-title-${Date.now()}`,
      "Change features title",
      oldValue,
      newValue,
      (value) => {
        this.featuresTitle = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateFeaturesSubheading(newValue: string): void {
    if (this.featuresSubheading === newValue) return;
    const oldValue = this.featuresSubheading;
    const action = this.undoRedoService.createTextChangeAction(
      `features-subheading-${Date.now()}`,
      "Change features subheading",
      oldValue,
      newValue,
      (value) => {
        this.featuresSubheading = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }
  updateFeatureTitle(index: number, newValue: string): void {
    if (index < 0 || index >= this.features.length) return;
    if (this.features[index].title === newValue) return;

    const oldFeatures = [...this.features];
    const newFeatures = [...this.features];
    newFeatures[index] = { ...newFeatures[index], title: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `feature-title-${index}-${Date.now()}`,
      `Change feature title`,
      oldFeatures,
      newFeatures,
      (features) => {
        this.features = features;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateFeatureMessage(index: number, newValue: string): void {
    if (index < 0 || index >= this.features.length) return;
    if (this.features[index].message === newValue) return;

    const oldFeatures = [...this.features];
    const newFeatures = [...this.features];
    newFeatures[index] = { ...newFeatures[index], message: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `feature-message-${index}-${Date.now()}`,
      `Change feature description`,
      oldFeatures,
      newFeatures,
      (features) => {
        this.features = features;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  // About section methods
  updateAboutTitle(newValue: string): void {
    if (this.aboutTitle === newValue) return;
    const oldValue = this.aboutTitle;
    const action = this.undoRedoService.createTextChangeAction(
      `about-title-${Date.now()}`,
      "Change about title",
      oldValue,
      newValue,
      (value) => {
        this.aboutTitle = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateAboutDescription(newValue: string): void {
    if (this.aboutDescription === newValue) return;
    const oldValue = this.aboutDescription;
    const action = this.undoRedoService.createTextChangeAction(
      `about-description-${Date.now()}`,
      "Change about description",
      oldValue,
      newValue,
      (value) => {
        this.aboutDescription = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateAboutImageUrl(newValue: string): void {
    if (this.aboutImageUrl === newValue) return;
    const oldValue = this.aboutImageUrl;
    const action = this.undoRedoService.createTextChangeAction(
      `about-image-url-${Date.now()}`,
      "Change about image URL",
      oldValue,
      newValue,
      (value) => {
        this.aboutImageUrl = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  // Services section methods
  updateServicesTitle(newValue: string): void {
    if (this.servicesTitle === newValue) return;
    const oldValue = this.servicesTitle;
    const action = this.undoRedoService.createTextChangeAction(
      `services-title-${Date.now()}`,
      "Change services title",
      oldValue,
      newValue,
      (value) => {
        this.servicesTitle = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateServicesSubheading(newValue: string): void {
    if (this.servicesSubheading === newValue) return;
    const oldValue = this.servicesSubheading;
    const action = this.undoRedoService.createTextChangeAction(
      `services-subheading-${Date.now()}`,
      "Change services subheading",
      oldValue,
      newValue,
      (value) => {
        this.servicesSubheading = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  addService(): void {
    const oldServices = [...this.services];
    const newService = {
      title: "New Service",
      description: "Description of the new service",
      icon: "bi-gear",
    };

    const newServices = [...this.services, newService];

    const action = this.undoRedoService.createArrayChangeAction(
      `add-service-${Date.now()}`,
      "Add service",
      oldServices,
      newServices,
      (services) => {
        this.services = services;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  removeService(index: number): void {
    if (index < 0 || index >= this.services.length) return;

    const oldServices = [...this.services];
    const newServices = [...this.services];
    newServices.splice(index, 1);

    const action = this.undoRedoService.createArrayChangeAction(
      `remove-service-${Date.now()}`,
      `Remove service "${this.services[index].title}"`,
      oldServices,
      newServices,
      (services) => {
        this.services = services;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateServiceTitle(index: number, newValue: string): void {
    if (index < 0 || index >= this.services.length) return;
    if (this.services[index].title === newValue) return;

    const oldServices = [...this.services];
    const newServices = [...this.services];
    newServices[index] = { ...newServices[index], title: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `service-title-${index}-${Date.now()}`,
      `Change service title`,
      oldServices,
      newServices,
      (services) => {
        this.services = services;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateServiceDescription(index: number, newValue: string): void {
    if (index < 0 || index >= this.services.length) return;
    if (this.services[index].description === newValue) return;

    const oldServices = [...this.services];
    const newServices = [...this.services];
    newServices[index] = { ...newServices[index], description: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `service-description-${index}-${Date.now()}`,
      `Change service description`,
      oldServices,
      newServices,
      (services) => {
        this.services = services;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateServiceIcon(index: number, newValue: string): void {
    if (index < 0 || index >= this.services.length) return;
    if (this.services[index].icon === newValue) return;

    const oldServices = [...this.services];
    const newServices = [...this.services];
    newServices[index] = { ...newServices[index], icon: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `service-icon-${index}-${Date.now()}`,
      `Change service icon`,
      oldServices,
      newServices,
      (services) => {
        this.services = services;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  // Testimonials section methods
  updateTestimonialsTitle(newValue: string): void {
    if (this.testimonialsTitle === newValue) return;
    const oldValue = this.testimonialsTitle;
    const action = this.undoRedoService.createTextChangeAction(
      `testimonials-title-${Date.now()}`,
      "Change testimonials title",
      oldValue,
      newValue,
      (value) => {
        this.testimonialsTitle = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateTestimonialsSubheading(newValue: string): void {
    if (this.testimonialsSubheading === newValue) return;
    const oldValue = this.testimonialsSubheading;
    const action = this.undoRedoService.createTextChangeAction(
      `testimonials-subheading-${Date.now()}`,
      "Change testimonials subheading",
      oldValue,
      newValue,
      (value) => {
        this.testimonialsSubheading = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  addTestimonial(): void {
    const oldTestimonials = [...(this.testimonials || [])];
    const newTestimonial = {
      name: "Customer Name",
      role: "Job Title",
      message: "This is a great testimonial message.",
      image: "",
      rating: 5,
    };

    const newTestimonials = [...oldTestimonials, newTestimonial];

    const action = this.undoRedoService.createArrayChangeAction(
      `add-testimonial-${Date.now()}`,
      "Add testimonial",
      oldTestimonials,
      newTestimonials,
      (testimonials) => {
        this.testimonials = testimonials;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  removeTestimonial(index: number): void {
    if (!this.testimonials || index < 0 || index >= this.testimonials.length)
      return;

    const oldTestimonials = [...this.testimonials];
    const newTestimonials = [...this.testimonials];
    newTestimonials.splice(index, 1);

    const action = this.undoRedoService.createArrayChangeAction(
      `remove-testimonial-${Date.now()}`,
      `Remove testimonial "${this.testimonials[index].name}"`,
      oldTestimonials,
      newTestimonials,
      (testimonials) => {
        this.testimonials = testimonials;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateTestimonialName(index: number, newValue: string): void {
    if (!this.testimonials || index < 0 || index >= this.testimonials.length)
      return;
    if (this.testimonials[index].name === newValue) return;

    const oldTestimonials = [...this.testimonials];
    const newTestimonials = [...this.testimonials];
    newTestimonials[index] = { ...newTestimonials[index], name: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `testimonial-name-${index}-${Date.now()}`,
      `Change testimonial name`,
      oldTestimonials,
      newTestimonials,
      (testimonials) => {
        this.testimonials = testimonials;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateTestimonialRole(index: number, newValue: string): void {
    if (!this.testimonials || index < 0 || index >= this.testimonials.length)
      return;
    if (this.testimonials[index].role === newValue) return;

    const oldTestimonials = [...this.testimonials];
    const newTestimonials = [...this.testimonials];
    newTestimonials[index] = { ...newTestimonials[index], role: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `testimonial-role-${index}-${Date.now()}`,
      `Change testimonial role`,
      oldTestimonials,
      newTestimonials,
      (testimonials) => {
        this.testimonials = testimonials;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateTestimonialMessage(index: number, newValue: string): void {
    if (!this.testimonials || index < 0 || index >= this.testimonials.length)
      return;
    if (this.testimonials[index].message === newValue) return;

    const oldTestimonials = [...this.testimonials];
    const newTestimonials = [...this.testimonials];
    newTestimonials[index] = { ...newTestimonials[index], message: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `testimonial-message-${index}-${Date.now()}`,
      `Change testimonial message`,
      oldTestimonials,
      newTestimonials,
      (testimonials) => {
        this.testimonials = testimonials;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateTestimonialImage(index: number, newValue: string): void {
    if (!this.testimonials || index < 0 || index >= this.testimonials.length)
      return;
    if (this.testimonials[index].image === newValue) return;

    const oldTestimonials = [...this.testimonials];
    const newTestimonials = [...this.testimonials];
    newTestimonials[index] = { ...newTestimonials[index], image: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `testimonial-image-${index}-${Date.now()}`,
      `Change testimonial image`,
      oldTestimonials,
      newTestimonials,
      (testimonials) => {
        this.testimonials = testimonials;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateTestimonialRating(index: number, newValue: number): void {
    if (!this.testimonials || index < 0 || index >= this.testimonials.length)
      return;
    if (this.testimonials[index].rating === newValue) return;

    const oldTestimonials = [...this.testimonials];
    const newTestimonials = [...this.testimonials];
    newTestimonials[index] = { ...newTestimonials[index], rating: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `testimonial-rating-${index}-${Date.now()}`,
      `Change testimonial rating`,
      oldTestimonials,
      newTestimonials,
      (testimonials) => {
        this.testimonials = testimonials;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  // Contact section methods
  updateContactTitle(newValue: string): void {
    if (this.contactTitle === newValue) return;
    const oldValue = this.contactTitle;
    const action = this.undoRedoService.createTextChangeAction(
      `contact-title-${Date.now()}`,
      "Change contact title",
      oldValue,
      newValue,
      (value) => {
        this.contactTitle = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateContactSubheading(newValue: string): void {
    if (this.contactSubheading === newValue) return;
    const oldValue = this.contactSubheading;
    const action = this.undoRedoService.createTextChangeAction(
      `contact-subheading-${Date.now()}`,
      "Change contact subheading",
      oldValue,
      newValue,
      (value) => {
        this.contactSubheading = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateContactEmail(newValue: string): void {
    if (this.contactEmail === newValue) return;
    const oldValue = this.contactEmail;
    const action = this.undoRedoService.createTextChangeAction(
      `contact-email-${Date.now()}`,
      "Change contact email",
      oldValue,
      newValue,
      (value) => {
        this.contactEmail = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateContactPhone(newValue: string): void {
    if (this.contactPhone === newValue) return;
    const oldValue = this.contactPhone;
    const action = this.undoRedoService.createTextChangeAction(
      `contact-phone-${Date.now()}`,
      "Change contact phone",
      oldValue,
      newValue,
      (value) => {
        this.contactPhone = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateContactAddress(newValue: string): void {
    if (this.contactAddress === newValue) return;
    const oldValue = this.contactAddress;
    const action = this.undoRedoService.createTextChangeAction(
      `contact-address-${Date.now()}`,
      "Change contact address",
      oldValue,
      newValue,
      (value) => {
        this.contactAddress = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  // Footer section methods
  updateFooterCompanyName(newValue: string): void {
    if (this.footerCompanyName === newValue) return;
    const oldValue = this.footerCompanyName;
    const action = this.undoRedoService.createTextChangeAction(
      `footer-company-name-${Date.now()}`,
      "Change footer company name",
      oldValue,
      newValue,
      (value) => {
        this.footerCompanyName = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateFooterDescription(newValue: string): void {
    if (this.footerDescription === newValue) return;
    const oldValue = this.footerDescription;
    const action = this.undoRedoService.createTextChangeAction(
      `footer-description-${Date.now()}`,
      "Change footer description",
      oldValue,
      newValue,
      (value) => {
        this.footerDescription = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  updateFooterCopyright(newValue: string): void {
    if (this.footerCopyright === newValue) return;
    const oldValue = this.footerCopyright;
    const action = this.undoRedoService.createTextChangeAction(
      `footer-copyright-${Date.now()}`,
      "Change footer copyright",
      oldValue,
      newValue,
      (value) => {
        this.footerCopyright = value;
        this.updateTemplate();
      }
    );
    this.undoRedoService.executeAction(action);
  }

  addSocialLink(): void {
    const oldSocialLinks = [...this.socialLinks];
    const newSocialLink = {
      platform: "Facebook",
      url: "https://facebook.com",
    };

    const newSocialLinks = [...this.socialLinks, newSocialLink];

    const action = this.undoRedoService.createArrayChangeAction(
      `add-social-link-${Date.now()}`,
      "Add social link",
      oldSocialLinks,
      newSocialLinks,
      (socialLinks) => {
        this.socialLinks = socialLinks;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  removeSocialLink(index: number): void {
    if (index < 0 || index >= this.socialLinks.length) return;

    const oldSocialLinks = [...this.socialLinks];
    const newSocialLinks = [...this.socialLinks];
    newSocialLinks.splice(index, 1);

    const action = this.undoRedoService.createArrayChangeAction(
      `remove-social-link-${Date.now()}`,
      `Remove social link "${this.socialLinks[index].platform}"`,
      oldSocialLinks,
      newSocialLinks,
      (socialLinks) => {
        this.socialLinks = socialLinks;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateSocialLinkPlatform(index: number, newValue: string): void {
    if (index < 0 || index >= this.socialLinks.length) return;
    if (this.socialLinks[index].platform === newValue) return;

    const oldSocialLinks = [...this.socialLinks];
    const newSocialLinks = [...this.socialLinks];
    newSocialLinks[index] = { ...newSocialLinks[index], platform: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `social-link-platform-${index}-${Date.now()}`,
      `Change social link platform`,
      oldSocialLinks,
      newSocialLinks,
      (socialLinks) => {
        this.socialLinks = socialLinks;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  updateSocialLinkUrl(index: number, newValue: string): void {
    if (index < 0 || index >= this.socialLinks.length) return;
    if (this.socialLinks[index].url === newValue) return;

    const oldSocialLinks = [...this.socialLinks];
    const newSocialLinks = [...this.socialLinks];
    newSocialLinks[index] = { ...newSocialLinks[index], url: newValue };

    const action = this.undoRedoService.createArrayChangeAction(
      `social-link-url-${index}-${Date.now()}`,
      `Change social link URL`,
      oldSocialLinks,
      newSocialLinks,
      (socialLinks) => {
        this.socialLinks = socialLinks;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }

  // Drag and drop functionality
  initializeDragDrop(): void {
    const featuresContainer = document.querySelector(".feature-items");
    if (featuresContainer) {
      this.dragDropService.registerDropZone({
        id: "features-list",
        accepts: ["feature"],
        element: featuresContainer as HTMLElement,
        onDrop: (item, zone) => this.handleFeatureDrop(item, zone),
        onDragOver: (item, zone) => this.handleFeatureDragOver(item, zone),
        onDragLeave: (item, zone) => this.handleFeatureDragLeave(item, zone),
      });
    }
  }

  private handleFeatureDrop(item: any, zone: any): void {
    const fromIndex = item.data.index;
    const toIndex = this.calculateDropIndex(item, zone);
    if (fromIndex !== toIndex) {
      this.moveFeature(fromIndex, toIndex);
    }
  }

  private handleFeatureDragOver(item: any, zone: any): boolean {
    return true;
  }

  private handleFeatureDragLeave(item: any, zone: any): void {
    // Hide drop indicator
  }

  private calculateDropIndex(item: any, zone: any): number {
    return Math.min(item.data.index + 1, this.features.length - 1);
  }

  moveFeature(fromIndex: number, toIndex: number): void {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= this.features.length ||
      toIndex >= this.features.length
    ) {
      return;
    }

    const oldFeatures = [...this.features];
    const newFeatures = [...this.features];
    const [movedFeature] = newFeatures.splice(fromIndex, 1);
    newFeatures.splice(toIndex, 0, movedFeature);

    const action = this.undoRedoService.createArrayChangeAction(
      `move-feature-${Date.now()}`,
      `Move feature from position ${fromIndex + 1} to ${toIndex + 1}`,
      oldFeatures,
      newFeatures,
      (features) => {
        this.features = features;
        this.updateTemplate();
      }
    );

    this.undoRedoService.executeAction(action);
  }
  // Drag and drop event handlers
  onFeatureDragStart(event: DragEvent, index: number): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData("text/plain", index.toString());
      event.dataTransfer.effectAllowed = "move";
    }
    const target = event.target as HTMLElement;
    target.classList.add("dragging");
  }

  onFeatureDragEnd(event: DragEvent): void {
    const target = event.target as HTMLElement;
    target.classList.remove("dragging");
  }

  onFeatureDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";
  }

  onFeatureDrop(event: DragEvent, dropIndex: number): void {
    event.preventDefault();
    const dragIndex = parseInt(event.dataTransfer!.getData("text/plain"));
    if (dragIndex !== dropIndex) {
      this.moveFeature(dragIndex, dropIndex);
    }
  }

  // Project management methods
  private async initializeProject(): Promise<void> {
    try {
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

  private async createDefaultProject(): Promise<void> {
    try {
      this.currentProject = await this.projectService.createProject({
        name: "Untitled Project",
        description: "A new website project",
      });
      this.loadDefaultTemplateData();
      await this.saveCurrentProject();
      localStorage.setItem("lastOpenedProject", this.currentProject.id);
      this.projectService.enableAutoSave(this.currentProject.id);
    } catch (error) {
      console.error("Failed to create default project:", error);
      this.loadDefaultTemplateData();
    }
  }

  private loadDefaultTemplateData(): void {
    const defaultTemplate = this.templateService.getDefaultTemplate();

    this.heroHtml = defaultTemplate.heroHtml;
    this.heroCss = defaultTemplate.heroCss;
    this.aboutHtml = defaultTemplate.aboutHtml;
    this.aboutCss = defaultTemplate.aboutCss;
    this.servicesHtml = defaultTemplate.servicesHtml;
    this.servicesCss = defaultTemplate.servicesCss;
    this.featuresHtml = defaultTemplate.featuresHtml;
    this.featuresCss = defaultTemplate.featuresCss;
    this.testimonialsHtml = defaultTemplate.testimonialsHtml;
    this.testimonialsCss = defaultTemplate.testimonialsCss;
    this.contactHtml = defaultTemplate.contactHtml;
    this.contactCss = defaultTemplate.contactCss;
    this.footerHtml = defaultTemplate.footerHtml;
    this.footerCss = defaultTemplate.footerCss;

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

    if (defaultTemplate.aboutData) {
      const aboutData = defaultTemplate.aboutData as any;
      this.aboutTitle = aboutData.aboutTitle || "About Us";
      this.aboutDescription =
        aboutData.aboutDescription ||
        "We are a team of passionate professionals.";
      this.aboutImageUrl =
        aboutData.aboutImageUrl ||
        "https://images.unsplash.com/photo-1522071820081-009f0129c71c";
    }

    if (defaultTemplate.servicesData) {
      const servicesData = defaultTemplate.servicesData as any;
      this.servicesTitle = servicesData.servicesTitle || "Our Services";
      this.servicesSubheading =
        servicesData.servicesSubheading || "We offer professional services";
      this.services = [
        ...(servicesData.services || [
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
        ]),
      ];
    }

    if (defaultTemplate.testimonialsData) {
      const testimonialsData =
        defaultTemplate.testimonialsData as TestimonialsTemplateVariables;
      this.testimonialsTitle =
        testimonialsData.testimonialsTitle || "What Our Clients Say";
      this.testimonialsSubheading =
        testimonialsData.testimonialsSubheading ||
        "Don't just take our word for it";
      this.testimonials = [
        ...(testimonialsData.testimonials || [
          {
            name: "John Doe",
            role: "CEO, Company",
            message: "Excellent service!",
            image: "",
            rating: 5,
          },
          {
            name: "Jane Smith",
            role: "Manager",
            message: "Highly recommended!",
            image: "",
            rating: 5,
          },
        ]),
      ];
    }

    if (defaultTemplate.contactData) {
      const contactData = defaultTemplate.contactData as any;
      this.contactTitle = contactData.contactTitle || "Get In Touch";
      this.contactSubheading =
        contactData.contactSubheading || "We'd love to hear from you";
      this.contactEmail = contactData.email || "hello@example.com";
      this.contactPhone = contactData.phone || "+1 (555) 123-4567";
      this.contactAddress =
        contactData.address || "123 Main Street, City, State 12345";
    }

    if (defaultTemplate.footerData) {
      const footerData = defaultTemplate.footerData as any;
      this.footerCompanyName = footerData.footerCompanyName || "Your Company";
      this.footerDescription =
        footerData.footerDescription || "Building amazing digital experiences.";
      this.footerCopyright =
        footerData.footerCopyright ||
        "© 2024 Your Company. All rights reserved.";
      this.socialLinks = [
        ...(footerData.socialLinks || [
          { platform: "Facebook", url: "https://facebook.com" },
          { platform: "Twitter", url: "https://twitter.com" },
          { platform: "LinkedIn", url: "https://linkedin.com" },
        ]),
      ];
    }

    this.updateStyleCss();
    this.loadSelectedTemplates();
  }

  private loadProjectData(): void {
    if (!this.currentProject) return;

    const heroSection = this.currentProject.sections.find(
      (s) => s.type === SectionType.HERO
    );
    const featuresSection = this.currentProject.sections.find(
      (s) => s.type === SectionType.FEATURES
    );
    const testimonialsSection = this.currentProject.sections.find(
      (s) => s.type === SectionType.TESTIMONIALS
    );

    if (heroSection) {
      this.headerText = heroSection.content["headerText"] || "";
      this.heroSubheading = heroSection.content["heroSubheading"] || "";
      this.imageUrl = heroSection.content["imageUrl"] || "";
      this.sectionEnabled.hero = heroSection.isVisible;
    }

    if (featuresSection) {
      this.featuresTitle = featuresSection.content["featuresTitle"] || "";
      this.featuresSubheading =
        featuresSection.content["featuresSubheading"] || "";
      this.features = featuresSection.content["features"] || [];
      this.sectionEnabled.features = featuresSection.isVisible;
    }

    if (testimonialsSection) {
      this.testimonialsTitle =
        testimonialsSection.content["testimonialsTitle"] || "";
      this.testimonialsSubheading =
        testimonialsSection.content["testimonialsSubheading"] || "";
      this.testimonials = testimonialsSection.content["testimonials"] || [];
      this.sectionEnabled.testimonials = testimonialsSection.isVisible;
    }

    this.loadSelectedTemplates();
    this.updateStyleCss();
    this.projectService.enableAutoSave(this.currentProject.id);
    this.hasUnsavedChanges = false;
  }

  private setupAutoSave(): void {
    this.autoSaveSubject
      .pipe(debounceTime(2000), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.currentProject && this.hasUnsavedChanges) {
          this.saveCurrentProject();
        }
      });
  }

  private setupKeyboardEventListeners(): void {
    // Listen for custom keyboard events
    document.addEventListener("keyboard-escape", () => {
      if (this.isTemplatePanelActive) {
        this.closeTemplatePanel();
      }
      if (this.showProjectManager) {
        this.closeProjectManager();
      }
      if (this.showTemplateGallery) {
        this.closeTemplateGallery();
      }
      if (this.showResponsiveSidebar) {
        this.toggleResponsiveSidebar();
      }
    });

    document.addEventListener("keyboard-save", () => {
      if (this.currentProject) {
        this.saveCurrentProject();
      }
    });

    document.addEventListener("keyboard-new-project", () => {
      this.createNewProject();
    });

    document.addEventListener("keyboard-open-project", () => {
      this.openProjectManager();
    });

    document.addEventListener("keyboard-preview", () => {
      this.openPreviewInNewWindow();
    });

    document.addEventListener("keyboard-desktop-view", () => {
      this.setPreviewMode("desktop");
    });

    document.addEventListener("keyboard-tablet-view", () => {
      this.setPreviewMode("tablet");
    });

    document.addEventListener("keyboard-mobile-view", () => {
      this.setPreviewMode("mobile");
    });

    document.addEventListener("keyboard-toggle-editor", () => {
      this.toggleEditorPanel();
    });

    document.addEventListener("keyboard-toggle-templates", () => {
      if (this.isTemplatePanelActive) {
        this.closeTemplatePanel();
      } else {
        this.toggleTemplateSelector("hero");
      }
    });
  }

  private async saveCurrentProject(): Promise<void> {
    if (!this.currentProject) return;

    try {
      const sections = [];

      sections.push({
        id: "hero-section",
        type: SectionType.HERO,
        templateId: this.selectedHeroTemplate,
        content: {
          headerText: this.headerText,
          heroSubheading: this.heroSubheading,
          imageUrl: this.imageUrl,
        },
        styles: { customCss: this.heroCss },
        order: 0,
        isVisible: this.sectionEnabled.hero,
        responsiveSettings: {
          breakpoints: [],
          deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} },
        },
      });

      sections.push({
        id: "features-section",
        type: SectionType.FEATURES,
        templateId: this.selectedFeaturesTemplate,
        content: {
          featuresTitle: this.featuresTitle,
          featuresSubheading: this.featuresSubheading,
          features: this.features,
        },
        styles: { customCss: this.featuresCss },
        order: 1,
        isVisible: this.sectionEnabled.features,
        responsiveSettings: {
          breakpoints: [],
          deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} },
        },
      });

      sections.push({
        id: "testimonials-section",
        type: SectionType.TESTIMONIALS,
        templateId: "testimonials-default",
        content: {
          testimonialsTitle: this.testimonialsTitle,
          testimonialsSubheading: this.testimonialsSubheading,
          testimonials: this.testimonials,
        },
        styles: { customCss: this.testimonialsCss },
        order: 2,
        isVisible: this.sectionEnabled.testimonials,
        responsiveSettings: {
          breakpoints: [],
          deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} },
        },
      });

      await this.projectService.updateProject(this.currentProject.id, {
        sections: sections as any,
        updatedAt: new Date(),
      });

      this.hasUnsavedChanges = false;
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  }
  // Additional helper methods for existing functionality
  openProjectManager(): void {
    this.showProjectManager = true;
  }

  closeProjectManager(): void {
    this.showProjectManager = false;
  }

  async createNewProject() {
    try {
      this.currentProject = await this.projectService.createProject({
        name: "New Project",
        description: "A new website project",
      });
      this.loadDefaultTemplateData();
      await this.saveCurrentProject();
      localStorage.setItem("lastOpenedProject", this.currentProject.id);
      this.projectService.enableAutoSave(this.currentProject.id);
      this.hasUnsavedChanges = false;

      this.notificationService.success(
        "Project Created",
        "New project has been created successfully!"
      );
    } catch (error) {
      console.error("Failed to create new project:", error);
      this.notificationService.error(
        "Project Creation Failed",
        "Unable to create new project. Please try again."
      );
    }
  }

  onProjectSelected(project: Project): void {
    this.currentProject = project;
    this.loadProjectData();
    this.closeProjectManager();
  }

  getCurrentProjectName(): string {
    return this.currentProject?.name || "Untitled Project";
  }

  hasUnsavedProjectChanges(): boolean {
    return this.hasUnsavedChanges;
  }

  openTemplateGallery(): void {
    this.showTemplateGallery = true;
  }

  closeTemplateGallery(): void {
    this.showTemplateGallery = false;
  }

  onTemplateGallerySelection(template: any): void {
    this.closeTemplateGallery();
  }

  openTemplateBuilder(): void {
    if (this.templateBuilder) {
      this.templateBuilder.show();
    }
  }

  importTemplate(): void {
    console.log("Import template functionality");
  }

  onTemplatePreview(template: TemplateSection): void {
    this.previewModalTemplate = template;
    this.showTemplatePreviewModal = true;
  }

  closeTemplatePreviewModal(): void {
    this.showTemplatePreviewModal = false;
    this.previewModalTemplate = null;
  }

  onTemplateSelectedFromModal(template: TemplateSection): void {
    this.closeTemplatePreviewModal();
  }

  toggleResponsiveSidebar(): void {
    this.showResponsiveSidebar = !this.showResponsiveSidebar;
  }

  onSidebarStateChanged(state: SidebarState): void {
    this.sidebarState = state;
  }

  onSidebarClosed(): void {
    this.showResponsiveSidebar = false;
  }

  onSidebarTemplateSelected(template: TemplateSection): void {
    // Handle template selection from sidebar
  }

  onSidebarTemplatePreview(template: TemplateSection): void {
    this.onTemplatePreview(template);
  }

  getTemplatesForActiveType(): TemplateSection[] {
    switch (this.getActiveTemplateTypeForSidebar()) {
      case SectionType.HERO:
        return this.availableHeroTemplates;
      case SectionType.FEATURES:
        return this.availableFeaturesTemplates;
      default:
        return [];
    }
  }

  getSelectedTemplateIdForActiveType(): string {
    switch (this.getActiveTemplateTypeForSidebar()) {
      case SectionType.HERO:
        return this.selectedHeroTemplate;
      case SectionType.FEATURES:
        return this.selectedFeaturesTemplate;
      default:
        return "";
    }
  }

  getActiveTemplateTypeForSidebar(): SectionType | null {
    switch (this.activeTemplateType) {
      case "hero":
        return SectionType.HERO;
      case "features":
        return SectionType.FEATURES;
      case "testimonials":
        return SectionType.TESTIMONIALS;
      default:
        return null;
    }
  }

  navigateToGallery(): void {
    this.router.navigate(["/gallery"]);
  }

  private initializeWithTemplate(templateId: string): void {
    console.log("Initialize with template:", templateId);
  }

  /**
   * Apply customization data from the wizard
   */
  private applyWizardCustomization(
    queryParams: import("@angular/router").ParamMap
  ): void {
    console.log("Applying wizard customization...", queryParams);

    // Apply hero section customization
    const headerText = queryParams.get("headerText");
    if (headerText) {
      console.log("Setting header text:", headerText);
      this.headerText = headerText;
    }

    const heroSubheading = queryParams.get("heroSubheading");
    if (heroSubheading) {
      console.log("Setting hero subheading:", heroSubheading);
      this.heroSubheading = heroSubheading;
    }

    const imageUrl = queryParams.get("imageUrl");
    if (imageUrl) {
      console.log("Setting image URL:", imageUrl);
      this.imageUrl = imageUrl;
    }

    // Check for hero image URL (from asset selection)
    const heroImageUrl = queryParams.get("heroImageUrl");
    if (heroImageUrl) {
      console.log("Setting hero image URL from asset:", heroImageUrl);
      this.imageUrl = heroImageUrl;
    }

    // Apply features section customization
    const featuresTitle = queryParams.get("featuresTitle");
    if (featuresTitle) {
      console.log("Setting features title:", featuresTitle);
      this.featuresTitle = featuresTitle;
    }

    const featuresSubheading = queryParams.get("featuresSubheading");
    if (featuresSubheading) {
      console.log("Setting features subheading:", featuresSubheading);
      this.featuresSubheading = featuresSubheading;
    }

    // Update the template with the new data
    this.updateTemplate();

    // Show success notification
    this.notificationService.success(
      "Template Customized",
      "Your template has been customized with your content!"
    );

    // Clean up the URL by removing the wizard parameters after a short delay
    setTimeout(() => {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }, 1000);
  }
}
