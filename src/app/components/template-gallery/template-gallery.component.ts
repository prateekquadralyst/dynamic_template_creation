import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TemplateCustomizationWizardComponent } from '../template-customization-wizard/template-customization-wizard.component';
import { TemplateService } from '../../services/template.service';
import { TemplateSection } from '../../models/template.interface';
import { SectionType } from '../../models/section.interface';

interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  type: SectionType;
  description: string;
}

interface TemplateFilter {
  category: string;
  complexity: string;
  searchQuery: string;
}

interface ExtendedTemplateSection extends TemplateSection {
  category: string;
  complexity: string;
}

@Component({
  selector: 'app-template-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule, TemplateCustomizationWizardComponent],
  templateUrl: './template-gallery.component.html',
  styleUrls: ['./template-gallery.component.css']
})
export class TemplateGalleryComponent implements OnInit, OnDestroy {
  @Output() templateSelected = new EventEmitter<{ template: TemplateSection; category: string }>();
  @Output() closeGallery = new EventEmitter<void>();

  // Template data
  allTemplates: ExtendedTemplateSection[] = [];
  filteredTemplates: ExtendedTemplateSection[] = [];
  
  // Categories
  categories: TemplateCategory[] = [
    {
      id: 'hero',
      name: 'Hero Sections',
      icon: 'bi-layout-text-window',
      type: SectionType.HERO,
      description: 'Eye-catching header sections to make a great first impression'
    },
    {
      id: 'features',
      name: 'Feature Sections',
      icon: 'bi-grid-3x3-gap',
      type: SectionType.FEATURES,
      description: 'Showcase your product features and benefits'
    },
    {
      id: 'testimonials',
      name: 'Testimonials',
      icon: 'bi-chat-quote',
      type: SectionType.TESTIMONIALS,
      description: 'Display customer reviews and social proof'
    },
    {
      id: 'pricing',
      name: 'Pricing Tables',
      icon: 'bi-currency-dollar',
      type: SectionType.PRICING,
      description: 'Present your pricing plans clearly'
    },
    {
      id: 'contact',
      name: 'Contact Forms',
      icon: 'bi-envelope',
      type: SectionType.CONTACT,
      description: 'Help visitors get in touch with you'
    }
  ];

  // Filter state
  filter: TemplateFilter = {
    category: 'all',
    complexity: 'all',
    searchQuery: ''
  };

  // UI state
  isLoading = true;
  selectedCategory: string = 'all';
  viewMode: 'grid' | 'list' = 'grid';
  isNavigating = false;
  selectedTemplateId: string | null = null;
  
  // Wizard state
  showWizard = false;
  selectedTemplateForWizard: TemplateSection | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private templateService: TemplateService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadAllTemplates();
    this.applyFilters();
    this.isLoading = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all templates from all categories
   */
  private async loadAllTemplates(): Promise<void> {
    try {
      const allTemplates: ExtendedTemplateSection[] = [];

      // Load templates for each category
      for (const category of this.categories) {
        const templates = await this.templateService.getAllTemplatesByType(category.type);
        
        // Add category and complexity information to each template
        const extendedTemplates = templates.map(template => ({
          ...template,
          category: category.id,
          complexity: this.determineComplexity(template)
        }));
        
        allTemplates.push(...extendedTemplates);
      }

      this.allTemplates = allTemplates;

    } catch (error) {
      console.error('Failed to load templates:', error);
      this.allTemplates = [];
    }
  }

  /**
   * Determine template complexity based on HTML/CSS content
   */
  private determineComplexity(template: TemplateSection): string {
    const htmlLength = template.html.length;
    const cssLength = template.css.length;
    const totalLength = htmlLength + cssLength;

    if (totalLength < 1000) return 'simple';
    if (totalLength < 2500) return 'medium';
    return 'complex';
  }

  /**
   * Apply current filters to templates
   */
  applyFilters(): void {
    let filtered = [...this.allTemplates];

    // Category filter
    if (this.filter.category !== 'all') {
      filtered = filtered.filter(template => template.category === this.filter.category);
    }

    // Complexity filter
    if (this.filter.complexity !== 'all') {
      filtered = filtered.filter(template => 
        template.complexity === this.filter.complexity
      );
    }

    // Search filter
    if (this.filter.searchQuery.trim()) {
      const query = this.filter.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        (template.tags && template.tags.some(tag => 
          tag.toLowerCase().includes(query)
        ))
      );
    }

    this.filteredTemplates = filtered;
  }

  /**
   * Handle category selection
   */
  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    this.filter.category = categoryId;
    this.applyFilters();
  }

  /**
   * Handle complexity filter change
   */
  onComplexityFilterChange(): void {
    this.applyFilters();
  }

  /**
   * Handle search input
   */
  onSearchChange(): void {
    this.applyFilters();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filter = {
      category: 'all',
      complexity: 'all',
      searchQuery: ''
    };
    this.selectedCategory = 'all';
    this.applyFilters();
  }

  /**
   * Toggle view mode between grid and list
   */
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  /**
   * Handle template selection
   */
  onTemplateSelect(template: TemplateSection): void {
    // Show the customization wizard
    this.selectedTemplateForWizard = template;
    this.showWizard = true;
  }

  /**
   * Handle wizard completion
   */
  onWizardCompleted(event: any): void {
    this.showWizard = false;
    this.selectedTemplateForWizard = null;
    // The wizard handles navigation to the editor
  }

  /**
   * Handle wizard cancellation
   */
  onWizardCancelled(): void {
    this.showWizard = false;
    this.selectedTemplateForWizard = null;
  }

  /**
   * Map SectionType enum to string for template service
   */
  private mapSectionTypeToString(type: SectionType): string {
    switch (type) {
      case SectionType.HERO:
        return 'hero';
      case SectionType.FEATURES:
        return 'features';
      case SectionType.TESTIMONIALS:
        return 'testimonials';
      case SectionType.PRICING:
        return 'pricing';
      case SectionType.CONTACT:
        return 'contact';
      default:
        return 'hero';
    }
  }

  /**
   * Handle template preview
   */
  onTemplatePreview(template: TemplateSection, event: Event): void {
    event.stopPropagation();
    // TODO: Implement template preview modal
    console.log('Preview template:', template.name);
  }

  /**
   * Close the gallery
   */
  onClose(): void {
    this.closeGallery.emit();
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: string): TemplateCategory | undefined {
    return this.categories.find(cat => cat.id === id);
  }

  /**
   * Get complexity badge class
   */
  getComplexityBadgeClass(complexity: string): string {
    switch (complexity) {
      case 'simple':
        return 'badge bg-success';
      case 'medium':
        return 'badge bg-warning';
      case 'complex':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  /**
   * Get template count for category
   */
  getTemplateCountForCategory(categoryId: string): number {
    if (categoryId === 'all') {
      return this.allTemplates.length;
    }
    return this.allTemplates.filter(template => template.category === categoryId).length;
  }

  /**
   * TrackBy function for template list performance
   */
  trackByTemplateId(index: number, template: TemplateSection): string {
    return template.id;
  }
}