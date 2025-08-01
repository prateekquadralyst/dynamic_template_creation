import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Asset, AssetUsage } from '../models/asset.interface';
import { AssetService } from './asset.service';
import { ProjectService } from './project.service';
import { Project } from '../models/project.interface';
import { Section } from '../models/section.interface';

export interface AssetReplacementJob {
  id: string;
  oldAssetId: string;
  newAssetId: string;
  affectedProjects: string[];
  affectedSections: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  replacementCount: number;
}

export interface AssetReplacementPreview {
  oldAsset: Asset;
  newAsset: Asset;
  usageLocations: AssetUsage[];
  previewChanges: AssetReplacementChange[];
}

export interface AssetReplacementChange {
  projectId: string;
  projectName: string;
  sectionId: string;
  sectionName: string;
  variableName: string;
  oldValue: string;
  newValue: string;
}

@Injectable({
  providedIn: 'root'
})
export class AssetReplacementService {
  private replacementJobs = new Map<string, BehaviorSubject<AssetReplacementJob>>();

  constructor(
    private assetService: AssetService,
    private projectService: ProjectService
  ) {}

  /**
   * Preview asset replacement to show what will be affected
   */
  async previewAssetReplacement(oldAssetId: string, newAssetId: string): Promise<AssetReplacementPreview> {
    const [oldAsset, newAsset, usageLocations] = await Promise.all([
      this.assetService.getAsset(oldAssetId),
      this.assetService.getAsset(newAssetId),
      this.assetService.getAssetUsage(oldAssetId)
    ]);

    if (!oldAsset || !newAsset) {
      throw new Error('Asset not found');
    }

    const previewChanges: AssetReplacementChange[] = [];
    const projects = await this.projectService.getProjects();

    for (const usage of usageLocations) {
      const project = projects.find(p => p.id === usage.projectId);
      if (!project) continue;

      const section = project.sections.find(s => s.id === usage.sectionId);
      if (!section) continue;

      previewChanges.push({
        projectId: usage.projectId,
        projectName: project.name,
        sectionId: usage.sectionId,
        sectionName: section.metadata.name || `Section ${section.type}`,
        variableName: usage.variableName,
        oldValue: oldAsset.url,
        newValue: newAsset.url
      });
    }

    return {
      oldAsset,
      newAsset,
      usageLocations,
      previewChanges
    };
  }

  /**
   * Replace asset across all projects and sections
   */
  async replaceAsset(oldAssetId: string, newAssetId: string): Promise<AssetReplacementJob> {
    const jobId = this.generateJobId();
    const preview = await this.previewAssetReplacement(oldAssetId, newAssetId);
    
    const job: AssetReplacementJob = {
      id: jobId,
      oldAssetId,
      newAssetId,
      affectedProjects: [...new Set(preview.previewChanges.map(c => c.projectId))],
      affectedSections: [...new Set(preview.previewChanges.map(c => c.sectionId))],
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
      replacementCount: 0
    };

    const jobSubject = new BehaviorSubject(job);
    this.replacementJobs.set(jobId, jobSubject);

    // Start replacement process
    this.processReplacement(job, preview, jobSubject);

    return job;
  }

  /**
   * Replace asset in a specific project
   */
  async replaceAssetInProject(projectId: string, oldAssetId: string, newAssetId: string): Promise<void> {
    const project = await this.projectService.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const [oldAsset, newAsset] = await Promise.all([
      this.assetService.getAsset(oldAssetId),
      this.assetService.getAsset(newAssetId)
    ]);

    if (!oldAsset || !newAsset) {
      throw new Error('Asset not found');
    }

    let replacementCount = 0;
    const updatedSections = project.sections.map(section => {
      const updatedSection = { ...section };
      let sectionModified = false;

      // Replace in section content
      if (section.content) {
        const updatedContent = { ...section.content };
        
        // Check all content properties for asset references
        Object.keys(updatedContent).forEach(key => {
          const value = updatedContent[key];
          if (typeof value === 'string' && value === oldAsset.url) {
            updatedContent[key] = newAsset.url;
            sectionModified = true;
            replacementCount++;
          } else if (typeof value === 'object' && value !== null) {
            // Handle nested objects (like team members, testimonials, etc.)
            const updatedNestedContent = this.replaceAssetInObject(value, oldAsset.url, newAsset.url);
            if (updatedNestedContent.modified) {
              updatedContent[key] = updatedNestedContent.content;
              sectionModified = true;
              replacementCount += updatedNestedContent.replacementCount;
            }
          }
        });

        if (sectionModified) {
          updatedSection.content = updatedContent;
        }
      }

      return updatedSection;
    });

    if (replacementCount > 0) {
      const updatedProject = {
        ...project,
        sections: updatedSections,
        updatedAt: new Date()
      };

      await this.projectService.updateProject(projectId, updatedProject);

      // Update asset usage counts
      await this.assetService.updateAsset(oldAssetId, {
        usageCount: Math.max(0, oldAsset.usageCount - replacementCount)
      });

      await this.assetService.updateAsset(newAssetId, {
        usageCount: newAsset.usageCount + replacementCount
      });
    }
  }

  /**
   * Replace asset in a specific section
   */
  async replaceAssetInSection(projectId: string, sectionId: string, oldAssetId: string, newAssetId: string): Promise<void> {
    const project = await this.projectService.getProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const sectionIndex = project.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) {
      throw new Error(`Section ${sectionId} not found`);
    }

    const [oldAsset, newAsset] = await Promise.all([
      this.assetService.getAsset(oldAssetId),
      this.assetService.getAsset(newAssetId)
    ]);

    if (!oldAsset || !newAsset) {
      throw new Error('Asset not found');
    }

    const section = project.sections[sectionIndex];
    let replacementCount = 0;
    let sectionModified = false;

    if (section.content) {
      const updatedContent = { ...section.content };
      
      // Check all content properties for asset references
      Object.keys(updatedContent).forEach(key => {
        const value = updatedContent[key];
        if (typeof value === 'string' && value === oldAsset.url) {
          updatedContent[key] = newAsset.url;
          sectionModified = true;
          replacementCount++;
        } else if (typeof value === 'object' && value !== null) {
          // Handle nested objects
          const updatedNestedContent = this.replaceAssetInObject(value, oldAsset.url, newAsset.url);
          if (updatedNestedContent.modified) {
            updatedContent[key] = updatedNestedContent.content;
            sectionModified = true;
            replacementCount += updatedNestedContent.replacementCount;
          }
        }
      });

      if (sectionModified) {
        const updatedSections = [...project.sections];
        updatedSections[sectionIndex] = {
          ...section,
          content: updatedContent,
          metadata: {
            ...section.metadata,
            updatedAt: new Date()
          }
        };

        const updatedProject = {
          ...project,
          sections: updatedSections,
          updatedAt: new Date()
        };

        await this.projectService.updateProject(projectId, updatedProject);

        // Update asset usage counts
        await this.assetService.updateAsset(oldAssetId, {
          usageCount: Math.max(0, oldAsset.usageCount - replacementCount)
        });

        await this.assetService.updateAsset(newAssetId, {
          usageCount: newAsset.usageCount + replacementCount
        });
      }
    }
  }

  /**
   * Get replacement job updates
   */
  getReplacementJobUpdates(jobId: string): Observable<AssetReplacementJob> {
    const jobSubject = this.replacementJobs.get(jobId);
    if (!jobSubject) {
      throw new Error(`Replacement job ${jobId} not found`);
    }
    return jobSubject.asObservable();
  }

  /**
   * Cancel replacement job
   */
  cancelReplacementJob(jobId: string): void {
    const jobSubject = this.replacementJobs.get(jobId);
    if (jobSubject) {
      const job = jobSubject.value;
      job.status = 'failed';
      job.error = 'Cancelled by user';
      jobSubject.next(job);
      this.replacementJobs.delete(jobId);
    }
  }

  /**
   * Process replacement job (private method)
   */
  private async processReplacement(
    job: AssetReplacementJob,
    preview: AssetReplacementPreview,
    jobSubject: BehaviorSubject<AssetReplacementJob>
  ): Promise<void> {
    try {
      job.status = 'processing';
      job.progress = 10;
      jobSubject.next(job);

      const totalProjects = job.affectedProjects.length;
      let processedProjects = 0;

      for (const projectId of job.affectedProjects) {
        await this.replaceAssetInProject(projectId, job.oldAssetId, job.newAssetId);
        processedProjects++;
        
        job.progress = 10 + (processedProjects / totalProjects) * 80;
        jobSubject.next(job);
      }

      // Update global asset usage tracking
      await this.assetService.replaceAsset(job.oldAssetId, job.newAssetId);

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      job.replacementCount = preview.previewChanges.length;
      jobSubject.next(job);

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      jobSubject.next(job);
    }
  }

  /**
   * Replace asset references in nested objects
   */
  private replaceAssetInObject(obj: any, oldUrl: string, newUrl: string): { content: any; modified: boolean; replacementCount: number } {
    let modified = false;
    let replacementCount = 0;
    const updatedObj = Array.isArray(obj) ? [...obj] : { ...obj };

    const processValue = (value: any): any => {
      if (typeof value === 'string' && value === oldUrl) {
        modified = true;
        replacementCount++;
        return newUrl;
      } else if (typeof value === 'object' && value !== null) {
        const nested = this.replaceAssetInObject(value, oldUrl, newUrl);
        if (nested.modified) {
          modified = true;
          replacementCount += nested.replacementCount;
          return nested.content;
        }
      }
      return value;
    };

    if (Array.isArray(updatedObj)) {
      for (let i = 0; i < updatedObj.length; i++) {
        updatedObj[i] = processValue(updatedObj[i]);
      }
    } else {
      Object.keys(updatedObj).forEach(key => {
        updatedObj[key] = processValue(updatedObj[key]);
      });
    }

    return {
      content: updatedObj,
      modified,
      replacementCount
    };
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return 'replacement_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Find all assets used in a project
   */
  async findAssetsInProject(projectId: string): Promise<Asset[]> {
    const project = await this.projectService.getProject(projectId);
    if (!project) {
      return [];
    }

    const assetUrls = new Set<string>();
    
    // Extract asset URLs from all sections
    project.sections.forEach(section => {
      if (section.content) {
        this.extractAssetUrls(section.content, assetUrls);
      }
    });

    // Get assets by URLs
    const allAssets = await this.assetService.getAssets();
    return allAssets.filter(asset => assetUrls.has(asset.url));
  }

  /**
   * Extract asset URLs from content object
   */
  private extractAssetUrls(obj: any, urlSet: Set<string>): void {
    if (typeof obj === 'string') {
      // Check if it looks like an asset URL (data: or http/https)
      if (obj.startsWith('data:') || obj.startsWith('http') || obj.startsWith('blob:')) {
        urlSet.add(obj);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach(item => this.extractAssetUrls(item, urlSet));
      } else {
        Object.values(obj).forEach(value => this.extractAssetUrls(value, urlSet));
      }
    }
  }

  /**
   * Get asset replacement suggestions based on similarity
   */
  async getReplacementSuggestions(assetId: string): Promise<Asset[]> {
    const asset = await this.assetService.getAsset(assetId);
    if (!asset) {
      return [];
    }

    const allAssets = await this.assetService.getAssets();
    
    // Filter assets of the same type
    const similarAssets = allAssets.filter(a => 
      a.id !== assetId && 
      a.type === asset.type
    );

    // Sort by similarity (simplified - could be enhanced with more sophisticated matching)
    return similarAssets.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Same dimensions get higher score
      if (asset.dimensions && a.dimensions && 
          asset.dimensions.width === a.dimensions.width && 
          asset.dimensions.height === a.dimensions.height) {
        scoreA += 10;
      }
      if (asset.dimensions && b.dimensions && 
          asset.dimensions.width === b.dimensions.width && 
          asset.dimensions.height === b.dimensions.height) {
        scoreB += 10;
      }

      // Similar size gets higher score
      const sizeRatioA = Math.min(asset.size, a.size) / Math.max(asset.size, a.size);
      const sizeRatioB = Math.min(asset.size, b.size) / Math.max(asset.size, b.size);
      scoreA += sizeRatioA * 5;
      scoreB += sizeRatioB * 5;

      // Common tags get higher score
      const commonTagsA = asset.tags.filter(tag => a.tags.includes(tag)).length;
      const commonTagsB = asset.tags.filter(tag => b.tags.includes(tag)).length;
      scoreA += commonTagsA * 2;
      scoreB += commonTagsB * 2;

      return scoreB - scoreA;
    }).slice(0, 10); // Return top 10 suggestions
  }
}