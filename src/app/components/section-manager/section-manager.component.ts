import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from "@angular/cdk/drag-drop";
import { Subject, takeUntil } from "rxjs";
import {
  Section,
  SectionType,
  SectionCategory,
  SectionLibraryItem,
  SectionFilter,
  SectionSortBy,
  SortDirection,
  ResponsiveSettings,
  DeviceType,
} from "../../models/section.interface";
import { TemplateService } from "../../services/template.service";
import { ProjectService } from "../../services/project.service";
import { DevicePreset } from "../responsive-design-editor/responsive-design-editor.component";

@Component({
  selector: "app-section-manager",
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: "./section-manager.component.html",
  styleUrls: ["./section-manager.component.css"],
})
export class SectionManagerComponent implements OnInit, OnDestroy {
  @Input() sections: Section[] = [];
  @Input() projectId: string | null = null;
  
  // Responsive design inputs
  @Input() currentDevice: DevicePreset | null = null;
  @Input() responsiveSettings: ResponsiveSettings | null = null;
  @Input() enableResponsiveControls: boolean = false;
  
  @Output() sectionsChange = new EventEmitter<Section[]>();
  @Output() sectionSelected = new EventEmitter<Section>();
  @Output() sectionVisibilityChanged = new EventEmitter<{
    section: Section;
    isVisible: boolean;
  }>();
  @Output() sectionResponsiveSettingsChanged = new EventEmitter<{
    section: Section;
    responsiveSettings: ResponsiveSettings;
  }>();

  // Section library
  sectionLibrary: SectionLibraryItem[] = [];
  filteredLibrary: SectionLibraryItem[] = [];

  // UI state
  showLibrary = false;
  selectedCategory: SectionCategory | "all" = "all";
  searchQuery = "";
  sortBy: SectionSortBy = "order";
  sortDirection: SortDirection = "asc";

  // Filters
  currentFilter: SectionFilter = {};

  // Loading state
  isLoading = false;

  // Drag and drop state
  isDragging = false;

  private destroy$ = new Subject<void>();

  // Expose enums to template
  SectionType = SectionType;
  SectionCategory = SectionCategory;

  constructor(
    private templateService: TemplateService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    this.loadSectionLibrary();
    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load the section library with all available section types
   */
  private loadSectionLibrary(): void {
    this.sectionLibrary = [
      // Hero sections
      {
        id: "hero-modern",
        type: SectionType.HERO,
        name: "Modern Hero",
        description: "Clean, modern hero section with gradient background",
        category: SectionCategory.HERO,
        previewImage: this.generatePlaceholderImage("#4361ee", "Modern Hero"),
        templateId: "hero-modern",
        isBuiltIn: true,
        tags: ["hero", "modern", "gradient"],
        difficulty: "beginner" as any,
        estimatedSetupTime: 5,
      },
      {
        id: "hero-video",
        type: SectionType.HERO,
        name: "Video Hero",
        description: "Hero section with background video",
        category: SectionCategory.HERO,
        previewImage: this.generatePlaceholderImage("#7209b7", "Video Hero"),
        templateId: "hero-video",
        isBuiltIn: true,
        tags: ["hero", "video", "dynamic"],
        difficulty: "intermediate" as any,
        estimatedSetupTime: 10,
      },

      // Testimonials sections
      {
        id: "testimonials-carousel",
        type: SectionType.TESTIMONIALS,
        name: "Testimonials Carousel",
        description: "Rotating testimonials with customer photos",
        category: SectionCategory.SOCIAL_PROOF,
        previewImage: this.generatePlaceholderImage("#4cc9f0", "Testimonials"),
        templateId: "testimonials-carousel",
        isBuiltIn: true,
        tags: ["testimonials", "carousel", "social-proof"],
        difficulty: "beginner" as any,
        estimatedSetupTime: 8,
      },
      {
        id: "testimonials-grid",
        type: SectionType.TESTIMONIALS,
        name: "Testimonials Grid",
        description: "Grid layout of customer testimonials",
        category: SectionCategory.SOCIAL_PROOF,
        previewImage: this.generatePlaceholderImage("#81b29a", "Reviews Grid"),
        templateId: "testimonials-grid",
        isBuiltIn: true,
        tags: ["testimonials", "grid", "reviews"],
        difficulty: "beginner" as any,
        estimatedSetupTime: 6,
      },

      // Pricing sections
      {
        id: "pricing-cards",
        type: SectionType.PRICING,
        name: "Pricing Cards",
        description: "Clean pricing cards with feature comparison",
        category: SectionCategory.CONVERSION,
        previewImage: this.generatePlaceholderImage("#e07a5f", "Pricing Cards"),
        templateId: "pricing-cards",
        isBuiltIn: true,
        tags: ["pricing", "cards", "comparison"],
        difficulty: "beginner" as any,
        estimatedSetupTime: 12,
      },
      {
        id: "pricing-table",
        type: SectionType.PRICING,
        name: "Pricing Table",
        description: "Detailed pricing table with feature breakdown",
        category: SectionCategory.CONVERSION,
        previewImage: this.generatePlaceholderImage("#f2cc8f", "Pricing Table"),
        templateId: "pricing-table",
        isBuiltIn: true,
        tags: ["pricing", "table", "detailed"],
        difficulty: "intermediate" as any,
        estimatedSetupTime: 15,
      },

      // Contact sections
      {
        id: "contact-form",
        type: SectionType.CONTACT,
        name: "Contact Form",
        description: "Simple contact form with validation",
        category: SectionCategory.CONVERSION,
        previewImage: this.generatePlaceholderImage("#ef233c", "Contact Form"),
        templateId: "contact-form",
        isBuiltIn: true,
        tags: ["contact", "form", "validation"],
        difficulty: "beginner" as any,
        estimatedSetupTime: 10,
      },
      {
        id: "contact-map",
        type: SectionType.CONTACT,
        name: "Contact with Map",
        description: "Contact information with embedded map",
        category: SectionCategory.INFORMATION,
        previewImage: this.generatePlaceholderImage("#2b2d42", "Contact Map"),
        templateId: "contact-map",
        isBuiltIn: true,
        tags: ["contact", "map", "location"],
        difficulty: "intermediate" as any,
        estimatedSetupTime: 12,
      },

      // About sections
      {
        id: "about-team",
        type: SectionType.ABOUT,
        name: "About with Team",
        description: "About section featuring team members",
        category: SectionCategory.INFORMATION,
        previewImage: this.generatePlaceholderImage("#ff6b6b", "About Team"),
        templateId: "about-team",
        isBuiltIn: true,
        tags: ["about", "team", "company"],
        difficulty: "beginner" as any,
        estimatedSetupTime: 8,
      },
      {
        id: "about-story",
        type: SectionType.ABOUT,
        name: "Company Story",
        description: "Timeline-based company story section",
        category: SectionCategory.INFORMATION,
        previewImage: this.generatePlaceholderImage("#4ecdc4", "Our Story"),
        templateId: "about-story",
        isBuiltIn: true,
        tags: ["about", "story", "timeline"],
        difficulty: "intermediate" as any,
        estimatedSetupTime: 15,
      },

      // CTA sections
      {
        id: "cta-simple",
        type: SectionType.CTA,
        name: "Simple CTA",
        description: "Clean call-to-action with button",
        category: SectionCategory.CONVERSION,
        previewImage: this.generatePlaceholderImage(
          "#ffd166",
          "Call to Action"
        ),
        templateId: "cta-simple",
        isBuiltIn: true,
        tags: ["cta", "simple", "conversion"],
        difficulty: "beginner" as any,
        estimatedSetupTime: 3,
      },
      {
        id: "cta-newsletter",
        type: SectionType.CTA,
        name: "Newsletter CTA",
        description: "Newsletter signup with email capture",
        category: SectionCategory.CONVERSION,
        previewImage: this.generatePlaceholderImage("#06ffa5", "Newsletter"),
        templateId: "cta-newsletter",
        isBuiltIn: true,
        tags: ["cta", "newsletter", "email"],
        difficulty: "beginner" as any,
        estimatedSetupTime: 5,
      },
    ];
  }

  /**
   * Toggle section library visibility
   */
  toggleLibrary(): void {
    this.showLibrary = !this.showLibrary;
    if (this.showLibrary) {
      this.applyFilters();
    }
  }

  /**
   * Add a new section from the library
   */
  addSection(libraryItem: SectionLibraryItem): void {
    const newSection: Section = {
      id: this.generateSectionId(),
      type: libraryItem.type,
      templateId: libraryItem.templateId,
      content: this.getDefaultContent(libraryItem.type),
      styles: {
        customCss: "",
        overrides: {},
        theme: {
          colorScheme: "light",
          spacing: "medium" as any,
          borderRadius: "medium" as any,
          shadow: "medium" as any,
        },
      },
      order: this.sections.length,
      isVisible: true,
      responsiveSettings: {
        breakpoints: [],
        deviceSpecificStyles: {
          mobile: {},
          tablet: {},
          desktop: {},
        },
      },
      metadata: {
        name: libraryItem.name,
        description: libraryItem.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDuplicate: false,
        customizations: [],
      },
    };

    const updatedSections = [...this.sections, newSection];
    this.updateSections(updatedSections);
    this.showLibrary = false;
  }

  /**
   * Duplicate an existing section
   */
  duplicateSection(section: Section): void {
    const duplicatedSection: Section = {
      ...section,
      id: this.generateSectionId(),
      order: this.sections.length,
      metadata: {
        ...section.metadata,
        name: `${section.metadata.name || "Section"} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDuplicate: true,
        originalId: section.id,
        customizations: [...section.metadata.customizations],
      },
    };

    const updatedSections = [...this.sections, duplicatedSection];
    this.updateSections(updatedSections);
  }

  /**
   * Delete a section
   */
  deleteSection(section: Section): void {
    if (
      confirm(
        `Are you sure you want to delete "${
          section.metadata.name || "this section"
        }"?`
      )
    ) {
      const updatedSections = this.sections.filter((s) => s.id !== section.id);
      // Reorder remaining sections
      updatedSections.forEach((s, index) => (s.order = index));
      this.updateSections(updatedSections);
    }
  }

  /**
   * Toggle section visibility
   */
  toggleSectionVisibility(section: Section): void {
    const updatedSection = { ...section, isVisible: !section.isVisible };
    const updatedSections = this.sections.map((s) =>
      s.id === section.id ? updatedSection : s
    );
    this.updateSections(updatedSections);
    this.sectionVisibilityChanged.emit({
      section: updatedSection,
      isVisible: updatedSection.isVisible,
    });
  }

  /**
   * Handle drag and drop reordering
   */
  onSectionDrop(event: CdkDragDrop<Section[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      const updatedSections = [...this.sections];
      moveItemInArray(updatedSections, event.previousIndex, event.currentIndex);

      // Update order property
      updatedSections.forEach((section, index) => {
        section.order = index;
        section.metadata.updatedAt = new Date();
      });

      this.updateSections(updatedSections);
    }
  }

  /**
   * Move section up in order
   */
  moveSectionUp(section: Section): void {
    const currentIndex = this.sections.findIndex((s) => s.id === section.id);
    if (currentIndex > 0) {
      const updatedSections = [...this.sections];
      [updatedSections[currentIndex - 1], updatedSections[currentIndex]] = [
        updatedSections[currentIndex],
        updatedSections[currentIndex - 1],
      ];

      // Update order properties
      updatedSections.forEach((s, index) => (s.order = index));
      this.updateSections(updatedSections);
    }
  }

  /**
   * Move section down in order
   */
  moveSectionDown(section: Section): void {
    const currentIndex = this.sections.findIndex((s) => s.id === section.id);
    if (currentIndex < this.sections.length - 1) {
      const updatedSections = [...this.sections];
      [updatedSections[currentIndex], updatedSections[currentIndex + 1]] = [
        updatedSections[currentIndex + 1],
        updatedSections[currentIndex],
      ];

      // Update order properties
      updatedSections.forEach((s, index) => (s.order = index));
      this.updateSections(updatedSections);
    }
  }

  /**
   * Select a section for editing
   */
  selectSection(section: Section): void {
    this.sectionSelected.emit(section);
  }

  /**
   * Filter sections by category
   */
  filterByCategory(category: SectionCategory | "all"): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  /**
   * Search sections
   */
  onSearchChange(): void {
    this.applyFilters();
  }

  /**
   * Apply current filters to the section library
   */
  public applyFilters(): void {
    let filtered = [...this.sectionLibrary];

    // Apply category filter
    if (this.selectedCategory !== "all") {
      filtered = filtered.filter(
        (item) => item.category === this.selectedCategory
      );
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        default:
          comparison = 0;
      }

      return this.sortDirection === "asc" ? comparison : -comparison;
    });

    this.filteredLibrary = filtered;
  }

  /**
   * Get section type display name
   */
  getSectionTypeDisplayName(type: SectionType): string {
    const typeNames: Record<SectionType, string> = {
      [SectionType.HERO]: "Hero",
      [SectionType.FEATURES]: "Features",
      [SectionType.TESTIMONIALS]: "Testimonials",
      [SectionType.PRICING]: "Pricing",
      [SectionType.CONTACT]: "Contact",
      [SectionType.ABOUT]: "About",
      [SectionType.CTA]: "Call to Action",
      [SectionType.GALLERY]: "Gallery",
      [SectionType.TEAM]: "Team",
      [SectionType.FAQ]: "FAQ",
      [SectionType.BLOG]: "Blog",
      [SectionType.NEWSLETTER]: "Newsletter",
      [SectionType.STATS]: "Statistics",
      [SectionType.TIMELINE]: "Timeline",
      [SectionType.PORTFOLIO]: "Portfolio",
      [SectionType.SERVICES]: "Services",
      [SectionType.FOOTER]: "Footer",
      [SectionType.HEADER]: "Header",
      [SectionType.CUSTOM]: "Custom",
    };

    return typeNames[type] || type;
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: SectionCategory): string {
    const categoryNames: Record<SectionCategory, string> = {
      [SectionCategory.HERO]: "Hero",
      [SectionCategory.CONTENT]: "Content",
      [SectionCategory.SOCIAL_PROOF]: "Social Proof",
      [SectionCategory.CONVERSION]: "Conversion",
      [SectionCategory.NAVIGATION]: "Navigation",
      [SectionCategory.MEDIA]: "Media",
      [SectionCategory.INFORMATION]: "Information",
      [SectionCategory.CUSTOM]: "Custom",
    };

    return categoryNames[category] || category;
  }

  /**
   * Get all available categories
   */
  getAvailableCategories(): SectionCategory[] {
    return Object.values(SectionCategory);
  }

  /**
   * Check if section can move up
   */
  canMoveUp(section: Section): boolean {
    return section.order > 0;
  }

  /**
   * Check if section can move down
   */
  canMoveDown(section: Section): boolean {
    return section.order < this.sections.length - 1;
  }

  /**
   * Get sorted sections for display
   */
  getSortedSections(): Section[] {
    return [...this.sections].sort((a, b) => a.order - b.order);
  }

  /**
   * Generate a unique section ID
   */
  private generateSectionId(): string {
    return (
      "section_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  /**
   * Get default content for a section type
   */
  private getDefaultContent(type: SectionType): any {
    const defaultContent: Record<SectionType, any> = {
      [SectionType.HERO]: {
        headerText: "Welcome to Our Website",
        heroSubheading: "Create amazing experiences with our platform",
        imageUrl:
          "https://images.unsplash.com/photo-1734784547207-7ad9f04c1f0a",
      },
      [SectionType.FEATURES]: {
        featuresTitle: "Our Features",
        featuresSubheading: "Everything you need to succeed",
        features: [
          { title: "Feature 1", message: "Description of feature 1" },
          { title: "Feature 2", message: "Description of feature 2" },
          { title: "Feature 3", message: "Description of feature 3" },
        ],
      },
      [SectionType.TESTIMONIALS]: {
        testimonialsTitle: "What Our Customers Say",
        testimonialsSubheading: "Real feedback from real customers",
        testimonials: [
          {
            name: "John Doe",
            role: "CEO, Company",
            message: "This product has transformed our business.",
            image:
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
            rating: 5,
          },
        ],
      },
      [SectionType.PRICING]: {
        pricingTitle: "Choose Your Plan",
        pricingSubheading: "Flexible pricing for every need",
        plans: [
          {
            name: "Basic",
            price: "$9",
            interval: "month",
            features: ["Feature 1", "Feature 2"],
            isPopular: false,
          },
        ],
      },
      [SectionType.CONTACT]: {
        contactTitle: "Get in Touch",
        contactSubheading: "We'd love to hear from you",
        address: "123 Main St, City, State 12345",
        email: "contact@example.com",
        phone: "+1 (555) 123-4567",
        mapUrl: "",
      },
      [SectionType.ABOUT]: {
        aboutTitle: "About Us",
        aboutSubheading: "Our story and mission",
        content: "We are passionate about creating amazing experiences.",
      },
      [SectionType.CTA]: {
        ctaTitle: "Ready to Get Started?",
        ctaSubheading: "Join thousands of satisfied customers",
        buttonText: "Get Started",
        buttonUrl: "#",
      },
      [SectionType.GALLERY]: { images: [] },
      [SectionType.TEAM]: { members: [] },
      [SectionType.FAQ]: { questions: [] },
      [SectionType.BLOG]: { posts: [] },
      [SectionType.NEWSLETTER]: { title: "Subscribe to our newsletter" },
      [SectionType.STATS]: { statistics: [] },
      [SectionType.TIMELINE]: { events: [] },
      [SectionType.PORTFOLIO]: { projects: [] },
      [SectionType.SERVICES]: { services: [] },
      [SectionType.FOOTER]: { links: [] },
      [SectionType.HEADER]: { navigation: [] },
      [SectionType.CUSTOM]: {},
    };

    return defaultContent[type] || {};
  }

  /**
   * Update sections and emit changes
   */
  private updateSections(sections: Section[]): void {
    this.sections = sections;
    this.sectionsChange.emit(sections);
  }

  /**
   * Track by function for section list
   */
  trackBySection(index: number, section: Section): string {
    return section.id;
  }

  /**
   * Get count of visible sections
   */
  getVisibleSectionsCount(): number {
    return this.sections.filter((s) => s.isVisible).length;
  }

  /**
   * Get count of hidden sections
   */
  getHiddenSectionsCount(): number {
    return this.sections.filter((s) => !s.isVisible).length;
  }

  /**
   * Generate a placeholder image as data URL
   */
  private generatePlaceholderImage(color: string, text: string): string {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");

    if (!ctx) return "";

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 300, 200);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + "80");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 200);

    // Add some geometric shapes for visual interest
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(20, 20, 100, 60);
    ctx.fillRect(140, 40, 140, 40);
    ctx.fillRect(20, 100, 260, 20);
    ctx.fillRect(20, 140, 180, 40);

    // Add text
    ctx.fillStyle = "white";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, 150, 100);

    return canvas.toDataURL();
  }

  // Responsive Design Methods

  /**
   * Add section with responsive settings
   */
  addSectionWithResponsiveSettings(libraryItem: SectionLibraryItem): void {
    const responsiveSettings: ResponsiveSettings = this.responsiveSettings || {
      breakpoints: [
        { name: 'mobile', minWidth: 0, maxWidth: 767 },
        { name: 'tablet', minWidth: 768, maxWidth: 1023 },
        { name: 'desktop', minWidth: 1024 }
      ],
      deviceSpecificStyles: {
        mobile: {},
        tablet: {},
        desktop: {}
      }
    };

    const newSection: Section = {
      id: this.generateSectionId(),
      type: libraryItem.type,
      templateId: libraryItem.templateId,
      content: this.getDefaultContent(libraryItem.type),
      styles: {
        customCss: "",
        overrides: {},
        theme: {
          colorScheme: "light",
          spacing: "medium" as any,
          borderRadius: "medium" as any,
          shadow: "medium" as any,
        },
      },
      order: this.sections.length,
      isVisible: true,
      responsiveSettings: responsiveSettings,
      metadata: {
        name: libraryItem.name,
        description: libraryItem.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDuplicate: false,
        customizations: [],
      },
    };

    const updatedSections = [...this.sections, newSection];
    this.updateSections(updatedSections);
    this.showLibrary = false;
  }

  /**
   * Update section responsive settings
   */
  updateSectionResponsiveSettings(section: Section, responsiveSettings: ResponsiveSettings): void {
    const updatedSection = { 
      ...section, 
      responsiveSettings,
      metadata: {
        ...section.metadata,
        updatedAt: new Date()
      }
    };
    
    const updatedSections = this.sections.map((s) =>
      s.id === section.id ? updatedSection : s
    );
    
    this.updateSections(updatedSections);
    this.sectionResponsiveSettingsChanged.emit({
      section: updatedSection,
      responsiveSettings
    });
  }

  /**
   * Toggle section visibility for specific device
   */
  toggleSectionVisibilityForDevice(section: Section, deviceType: DeviceType): void {
    const updatedSection = { ...section };
    
    if (!updatedSection.responsiveSettings.hideOnDevices) {
      updatedSection.responsiveSettings.hideOnDevices = [];
    }

    const hideOnDevices = [...updatedSection.responsiveSettings.hideOnDevices];
    const deviceIndex = hideOnDevices.indexOf(deviceType);

    if (deviceIndex > -1) {
      // Remove device from hide list (show on device)
      hideOnDevices.splice(deviceIndex, 1);
    } else {
      // Add device to hide list (hide on device)
      hideOnDevices.push(deviceType);
    }

    updatedSection.responsiveSettings = {
      ...updatedSection.responsiveSettings,
      hideOnDevices
    };

    updatedSection.metadata.updatedAt = new Date();

    const updatedSections = this.sections.map((s) =>
      s.id === section.id ? updatedSection : s
    );

    this.updateSections(updatedSections);
  }

  /**
   * Check if section is visible on current device
   */
  isSectionVisibleOnCurrentDevice(section: Section): boolean {
    if (!this.currentDevice || !this.enableResponsiveControls) {
      return section.isVisible;
    }

    const hideOnDevices = section.responsiveSettings?.hideOnDevices || [];
    return section.isVisible && !hideOnDevices.includes(this.currentDevice.type);
  }

  /**
   * Check if section is hidden on specific device
   */
  isSectionHiddenOnDevice(section: Section, deviceType: DeviceType): boolean {
    const hideOnDevices = section.responsiveSettings?.hideOnDevices || [];
    return hideOnDevices.includes(deviceType);
  }

  /**
   * Get sections visible on current device
   */
  getSectionsVisibleOnCurrentDevice(): Section[] {
    return this.getSortedSections().filter(section => 
      this.isSectionVisibleOnCurrentDevice(section)
    );
  }

  /**
   * Get device-specific style overrides for section
   */
  getDeviceSpecificStyles(section: Section): any {
    if (!this.currentDevice || !section.responsiveSettings) {
      return {};
    }

    return section.responsiveSettings.deviceSpecificStyles[this.currentDevice.type] || {};
  }

  /**
   * Update device-specific styles for section
   */
  updateDeviceSpecificStyles(section: Section, deviceType: DeviceType, styles: any): void {
    const updatedSection = { ...section };
    
    updatedSection.responsiveSettings = {
      ...updatedSection.responsiveSettings,
      deviceSpecificStyles: {
        ...updatedSection.responsiveSettings.deviceSpecificStyles,
        [deviceType]: styles
      }
    };

    updatedSection.metadata.updatedAt = new Date();

    const updatedSections = this.sections.map((s) =>
      s.id === section.id ? updatedSection : s
    );

    this.updateSections(updatedSections);
  }

  /**
   * Get current device type display name
   */
  getCurrentDeviceTypeName(): string {
    if (!this.currentDevice) return 'Desktop';
    
    switch (this.currentDevice.type) {
      case DeviceType.MOBILE:
        return 'Mobile';
      case DeviceType.TABLET:
        return 'Tablet';
      case DeviceType.DESKTOP:
        return 'Desktop';
      default:
        return 'Desktop';
    }
  }

  /**
   * Get responsive status for section
   */
  getSectionResponsiveStatus(section: Section): string {
    if (!this.enableResponsiveControls) {
      return 'disabled';
    }

    const hideOnDevices = section.responsiveSettings?.hideOnDevices || [];
    const deviceTypes = [DeviceType.MOBILE, DeviceType.TABLET, DeviceType.DESKTOP];
    
    if (hideOnDevices.length === 0) {
      return 'visible-all';
    } else if (hideOnDevices.length === deviceTypes.length) {
      return 'hidden-all';
    } else {
      return 'partial-visibility';
    }
  }

  /**
   * Get responsive status color
   */
  getResponsiveStatusColor(status: string): string {
    const colors = {
      'visible-all': '#4CAF50',
      'partial-visibility': '#FF9800',
      'hidden-all': '#F44336',
      'disabled': '#9E9E9E'
    };
    return colors[status] || '#9E9E9E';
  }

  /**
   * Get responsive status icon
   */
  getResponsiveStatusIcon(status: string): string {
    const icons = {
      'visible-all': '👁️',
      'partial-visibility': '👁️‍🗨️',
      'hidden-all': '🙈',
      'disabled': '🔒'
    };
    return icons[status] || '❓';
  }

  /**
   * Check if responsive controls are enabled and device is selected
   */
  get isResponsiveModeActive(): boolean {
    return this.enableResponsiveControls && !!this.currentDevice;
  }

  /**
   * Get device types for responsive controls
   */
  getDeviceTypes(): DeviceType[] {
    return [DeviceType.MOBILE, DeviceType.TABLET, DeviceType.DESKTOP];
  }

  /**
   * Get device type display name
   */
  getDeviceTypeDisplayName(deviceType: DeviceType): string {
    switch (deviceType) {
      case DeviceType.MOBILE:
        return 'Mobile';
      case DeviceType.TABLET:
        return 'Tablet';
      case DeviceType.DESKTOP:
        return 'Desktop';
      default:
        return deviceType;
    }
  }

  /**
   * Get device type icon
   */
  getDeviceTypeIcon(deviceType: DeviceType): string {
    switch (deviceType) {
      case DeviceType.MOBILE:
        return '📱';
      case DeviceType.TABLET:
        return '📱';
      case DeviceType.DESKTOP:
        return '💻';
      default:
        return '📱';
    }
  }

  /**
   * Override addSection to use responsive version when responsive controls are enabled
   */
  addSection(libraryItem: SectionLibraryItem): void {
    if (this.enableResponsiveControls) {
      this.addSectionWithResponsiveSettings(libraryItem);
    } else {
      // Use original implementation
      const newSection: Section = {
        id: this.generateSectionId(),
        type: libraryItem.type,
        templateId: libraryItem.templateId,
        content: this.getDefaultContent(libraryItem.type),
        styles: {
          customCss: "",
          overrides: {},
          theme: {
            colorScheme: "light",
            spacing: "medium" as any,
            borderRadius: "medium" as any,
            shadow: "medium" as any,
          },
        },
        order: this.sections.length,
        isVisible: true,
        responsiveSettings: {
          breakpoints: [],
          deviceSpecificStyles: {
            mobile: {},
            tablet: {},
            desktop: {},
          },
        },
        metadata: {
          name: libraryItem.name,
          description: libraryItem.description,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDuplicate: false,
          customizations: [],
        },
      };

      const updatedSections = [...this.sections, newSection];
      this.updateSections(updatedSections);
      this.showLibrary = false;
    }
  }
}
