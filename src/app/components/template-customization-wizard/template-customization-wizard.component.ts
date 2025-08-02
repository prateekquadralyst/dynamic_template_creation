import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { TemplateSection } from "../../models/template.interface";
import { SectionType } from "../../models/section.interface";
import { TemplateService } from "../../services/template.service";
import { ProjectService } from "../../services/project.service";
import { Project } from "../../models/project.interface";
import { AssetInputComponent } from "../asset-picker/asset-input.component";
import { Asset, AssetType } from "../../models/asset.interface";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

interface ProjectSetup {
  name: string;
  description: string;
  createNew: boolean;
  selectedProjectId?: string;
}

interface TemplateCustomization {
  headerText?: string;
  heroSubheading?: string;
  imageUrl?: string;
  heroImage?: Asset;
  featuresTitle?: string;
  featuresSubheading?: string;
  colorScheme?: string;
  fontStyle?: string;
}

@Component({
  selector: "app-template-customization-wizard",
  standalone: true,
  imports: [CommonModule, FormsModule, AssetInputComponent],
  templateUrl: "./template-customization-wizard.component.html",
  styleUrls: ["./template-customization-wizard.component.css"],
})
export class TemplateCustomizationWizardComponent implements OnInit {
  @Input() template!: TemplateSection;
  @Output() wizardCompleted = new EventEmitter<{
    project: Project;
    customization: TemplateCustomization;
  }>();
  @Output() wizardCancelled = new EventEmitter<void>();

  // Wizard state
  currentStep = 0;
  isProcessing = false;

  // Wizard steps
  steps: WizardStep[] = [
    {
      id: "project",
      title: "Project Setup",
      description: "Create a new project or select an existing one",
      isCompleted: false,
    },
    {
      id: "customize",
      title: "Template Customization",
      description: "Customize the template with your content",
      isCompleted: false,
    },
    {
      id: "review",
      title: "Review & Launch",
      description: "Review your settings and launch the editor",
      isCompleted: false,
    },
  ];

  // Project setup data
  projectSetup: ProjectSetup = {
    name: "",
    description: "",
    createNew: true,
  };

  // Template customization data
  customization: TemplateCustomization = {};

  // Available projects for selection
  availableProjects: Project[] = [];

  // Color schemes and font options
  colorSchemes = [
    {
      id: "modern-blue",
      name: "Modern Blue",
      primary: "#4361ee",
      secondary: "#4cc9f0",
    },
    {
      id: "warm-organic",
      name: "Warm Organic",
      primary: "#e07a5f",
      secondary: "#81b29a",
    },
    {
      id: "dark-tech",
      name: "Dark Tech",
      primary: "#7209b7",
      secondary: "#4cc9f0",
    },
    {
      id: "minimal-light",
      name: "Minimal Light",
      primary: "#2b2d42",
      secondary: "#ef233c",
    },
  ];

  fontStyles = [
    { id: "modern", name: "Modern", heading: "Poppins", body: "Inter" },
    {
      id: "classic",
      name: "Classic",
      heading: "Merriweather",
      body: "Source Sans Pro",
    },
    { id: "tech", name: "Tech", heading: "Roboto", body: "Roboto" },
    {
      id: "elegant",
      name: "Elegant",
      heading: "Playfair Display",
      body: "Work Sans",
    },
  ];

  constructor(
    private templateService: TemplateService,
    private projectService: ProjectService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAvailableProjects();
    this.initializeCustomization();
  }

  /**
   * Load available projects for selection
   */
  private async loadAvailableProjects(): Promise<void> {
    try {
      this.availableProjects = await this.projectService.getProjects();
    } catch (error) {
      console.error("Failed to load projects:", error);
      this.availableProjects = [];
    }
  }

  /**
   * Initialize customization with template defaults
   */
  private initializeCustomization(): void {
    // Set default project name based on template
    this.projectSetup.name = `${this.template.name} Project`;
    this.projectSetup.description = `A website project based on the ${this.template.name} template`;

    // Initialize customization based on template type
    if (this.template.variables) {
      const variables = this.template.variables as any;

      if (variables.headerText) {
        this.customization.headerText = variables.headerText;
      }
      if (variables.heroSubheading) {
        this.customization.heroSubheading = variables.heroSubheading;
      }
      if (variables.imageUrl) {
        this.customization.imageUrl = variables.imageUrl;
      }
      if (variables.featuresTitle) {
        this.customization.featuresTitle = variables.featuresTitle;
      }
      if (variables.featuresSubheading) {
        this.customization.featuresSubheading = variables.featuresSubheading;
      }
    }

    // Set default color scheme and font
    this.customization.colorScheme = "modern-blue";
    this.customization.fontStyle = "modern";
  }

  /**
   * Navigate to next step
   */
  nextStep(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.steps[this.currentStep].isCompleted = true;
      this.currentStep++;
    }
  }

  /**
   * Navigate to previous step
   */
  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  /**
   * Check if current step is valid
   */
  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 0: // Project setup
        if (this.projectSetup.createNew) {
          return this.projectSetup.name.trim().length > 0;
        } else {
          return !!this.projectSetup.selectedProjectId;
        }
      case 1: // Template customization
        return true; // All fields are optional
      case 2: // Review
        return true;
      default:
        return false;
    }
  }

  /**
   * Complete the wizard and launch the editor
   */
  async completeWizard(): Promise<void> {
    this.isProcessing = true;

    try {
      let project: Project;

      if (this.projectSetup.createNew) {
        // Create new project
        project = await this.projectService.createProject({
          name: this.projectSetup.name,
          description: this.projectSetup.description,
        });
      } else {
        // Load existing project
        project = await this.projectService.getProject(
          this.projectSetup.selectedProjectId!
        );
      }

      // Apply template selection
      this.templateService.setSelectedTemplate(
        this.mapSectionTypeToString(this.template.type),
        this.template.id
      );

      // Apply color scheme
      if (this.customization.colorScheme) {
        this.templateService.setSelectedStyle(this.customization.colorScheme);
      }

      // Emit completion event
      this.wizardCompleted.emit({ project, customization: this.customization });

      // Navigate to editor with customization data
      const queryParams: any = {
        projectId: project.id,
        fromWizard: "true",
      };

      // Add customization data to query params
      if (this.customization.headerText) {
        queryParams.headerText = this.customization.headerText;
      }
      if (this.customization.heroSubheading) {
        queryParams.heroSubheading = this.customization.heroSubheading;
      }
      if (this.customization.imageUrl) {
        queryParams.imageUrl = this.customization.imageUrl;
      }
      if (this.customization.heroImage?.url) {
        queryParams.heroImageUrl = this.customization.heroImage.url;
      }
      if (this.customization.featuresTitle) {
        queryParams.featuresTitle = this.customization.featuresTitle;
      }
      if (this.customization.featuresSubheading) {
        queryParams.featuresSubheading = this.customization.featuresSubheading;
      }

      await this.router.navigate(["/editor", this.template.id], {
        queryParams,
      });
    } catch (error) {
      console.error("Failed to complete wizard:", error);
      this.isProcessing = false;
    }
  }

  /**
   * Cancel the wizard
   */
  cancelWizard(): void {
    this.wizardCancelled.emit();
  }

  /**
   * Map SectionType to string
   */
  public mapSectionTypeToString(type: any): string {
    switch (type) {
      case 0: // SectionType.HERO
        return "hero";
      case 1: // SectionType.FEATURES
        return "features";
      case 2: // SectionType.TESTIMONIALS
        return "testimonials";
      case 3: // SectionType.PRICING
        return "pricing";
      case 4: // SectionType.CONTACT
        return "contact";
      default:
        return "hero";
    }
  }

  /**
   * Get selected color scheme
   */
  getSelectedColorScheme() {
    return this.colorSchemes.find(
      (scheme) => scheme.id === this.customization.colorScheme
    );
  }

  /**
   * Get selected font style
   */
  getSelectedFontStyle() {
    return this.fontStyles.find(
      (font) => font.id === this.customization.fontStyle
    );
  }

  /**
   * Check if the template is a hero template
   */
  isHeroTemplate(): boolean {
    return this.template.type === SectionType.HERO;
  }

  /**
   * Check if the template is a features template
   */
  isFeaturesTemplate(): boolean {
    return this.template.type === SectionType.FEATURES;
  }

  /**
   * Handle hero image selection
   */
  onHeroImageSelected(asset: Asset | null): void {
    console.log("Hero image selected in wizard:", asset);
    this.customization.heroImage = asset || undefined;
    // Also update the legacy imageUrl for backward compatibility
    this.customization.imageUrl = asset?.url || undefined;
    console.log("Updated customization:", this.customization);
  }

  /**
   * Get allowed asset types for image selection
   */
  get allowedImageTypes(): AssetType[] {
    return [AssetType.IMAGE];
  }

  /**
   * Handle image error by setting fallback image
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/images/template-placeholder.png';
    }
  }
}
