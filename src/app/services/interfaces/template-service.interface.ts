import { Observable } from 'rxjs';
import { 
  CustomTemplate, 
  TemplateSection,
  TemplateProcessingResult,
  TemplateExportData 
} from '../../models/template.interface';
import { SectionType } from '../../models/section.interface';

// Template service interface for dependency injection and testing
export interface ITemplateService {
  // Built-in template management
  getBuiltInTemplates(): TemplateSection[];
  getTemplatesByType(type: SectionType): TemplateSection[];
  getBuiltInTemplate(id: string): TemplateSection | null;
  
  // Custom template management
  getCustomTemplates(): Promise<CustomTemplate[]>;
  getCustomTemplate(id: string): Promise<CustomTemplate | null>;
  createCustomTemplate(template: Partial<CustomTemplate>): Promise<CustomTemplate>;
  updateCustomTemplate(id: string, updates: Partial<CustomTemplate>): Promise<CustomTemplate>;
  deleteCustomTemplate(id: string): Promise<void>;
  duplicateCustomTemplate(id: string, newName?: string): Promise<CustomTemplate>;
  
  // Template processing
  processTemplate(templateId: string, variables: any): Promise<TemplateProcessingResult>;
  validateTemplate(template: CustomTemplate): Promise<TemplateProcessingResult>;
  previewTemplate(template: CustomTemplate, variables: any): Promise<string>;
  
  // Template import/export
  exportTemplate(templateId: string): Promise<TemplateExportData>;
  importTemplate(templateData: TemplateExportData): Promise<CustomTemplate>;
  
  // Template search and filtering
  searchTemplates(query: string, type?: SectionType): Promise<TemplateSection[]>;
  getTemplatesByCategory(category: string): Promise<TemplateSection[]>;
  getPopularTemplates(limit?: number): Promise<TemplateSection[]>;
  
  // Template usage tracking
  incrementTemplateUsage(templateId: string): Promise<void>;
  getTemplateUsageStats(templateId: string): Promise<TemplateUsageStats>;
  
  // Observable streams
  getCustomTemplatesUpdates(): Observable<CustomTemplate[]>;
  getTemplateUpdates(templateId: string): Observable<CustomTemplate>;
}

export interface TemplateUsageStats {
  templateId: string;
  usageCount: number;
  lastUsed: Date;
  averageRating: number;
  totalRatings: number;
}