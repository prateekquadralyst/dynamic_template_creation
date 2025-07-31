import { Section, SectionPosition, SectionOrderUpdate, SectionReorderOperation, ReorderOperationType } from '../models/section.interface';

/**
 * Utility class for managing section ordering and positioning
 */
export class SectionOrderingUtil {
  
  /**
   * Reorder sections based on a reorder operation
   */
  static reorderSections(sections: Section[], operation: SectionReorderOperation): Section[] {
    const updatedSections = [...sections];
    
    switch (operation.type) {
      case ReorderOperationType.MOVE_UP:
        return this.moveSectionUp(updatedSections, operation.sectionId);
      
      case ReorderOperationType.MOVE_DOWN:
        return this.moveSectionDown(updatedSections, operation.sectionId);
      
      case ReorderOperationType.MOVE_TO_POSITION:
        return this.moveSectionToPosition(updatedSections, operation.sectionId, operation.targetPosition);
      
      case ReorderOperationType.DRAG_DROP:
        return this.handleDragDrop(updatedSections, operation.sourcePosition, operation.targetPosition);
      
      default:
        return updatedSections;
    }
  }

  /**
   * Move a section up by one position
   */
  static moveSectionUp(sections: Section[], sectionId: string): Section[] {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex <= 0) return sections;

    const updatedSections = [...sections];
    [updatedSections[sectionIndex], updatedSections[sectionIndex - 1]] = 
    [updatedSections[sectionIndex - 1], updatedSections[sectionIndex]];

    return this.normalizeOrder(updatedSections);
  }

  /**
   * Move a section down by one position
   */
  static moveSectionDown(sections: Section[], sectionId: string): Section[] {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex >= sections.length - 1 || sectionIndex === -1) return sections;

    const updatedSections = [...sections];
    [updatedSections[sectionIndex], updatedSections[sectionIndex + 1]] = 
    [updatedSections[sectionIndex + 1], updatedSections[sectionIndex]];

    return this.normalizeOrder(updatedSections);
  }

  /**
   * Move a section to a specific position
   */
  static moveSectionToPosition(sections: Section[], sectionId: string, targetPosition: number): Section[] {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1 || targetPosition < 0 || targetPosition >= sections.length) {
      return sections;
    }

    const updatedSections = [...sections];
    const [movedSection] = updatedSections.splice(sectionIndex, 1);
    updatedSections.splice(targetPosition, 0, movedSection);

    return this.normalizeOrder(updatedSections);
  }

  /**
   * Handle drag and drop reordering
   */
  static handleDragDrop(sections: Section[], sourceIndex: number, targetIndex: number): Section[] {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || 
        sourceIndex >= sections.length || targetIndex >= sections.length) {
      return sections;
    }

    const updatedSections = [...sections];
    const [draggedSection] = updatedSections.splice(sourceIndex, 1);
    updatedSections.splice(targetIndex, 0, draggedSection);

    return this.normalizeOrder(updatedSections);
  }

  /**
   * Normalize section order values to be sequential starting from 0
   */
  static normalizeOrder(sections: Section[]): Section[] {
    return sections.map((section, index) => ({
      ...section,
      order: index
    }));
  }

  /**
   * Sort sections by their order property
   */
  static sortSectionsByOrder(sections: Section[]): Section[] {
    return [...sections].sort((a, b) => a.order - b.order);
  }

  /**
   * Get the next available order value
   */
  static getNextOrder(sections: Section[]): number {
    if (sections.length === 0) return 0;
    return Math.max(...sections.map(s => s.order)) + 1;
  }

  /**
   * Insert a new section at a specific position
   */
  static insertSectionAtPosition(sections: Section[], newSection: Section, position: number): Section[] {
    const updatedSections = [...sections];
    
    // Ensure position is within bounds
    const insertPosition = Math.max(0, Math.min(position, sections.length));
    
    // Set the order for the new section
    newSection.order = insertPosition;
    
    // Insert the section
    updatedSections.splice(insertPosition, 0, newSection);
    
    return this.normalizeOrder(updatedSections);
  }

  /**
   * Remove a section and normalize remaining orders
   */
  static removeSection(sections: Section[], sectionId: string): Section[] {
    const updatedSections = sections.filter(s => s.id !== sectionId);
    return this.normalizeOrder(updatedSections);
  }

  /**
   * Duplicate a section and insert it after the original
   */
  static duplicateSection(sections: Section[], sectionId: string, newSectionId: string): Section[] {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return sections;

    const originalSection = sections[sectionIndex];
    const duplicatedSection: Section = {
      ...originalSection,
      id: newSectionId,
      metadata: {
        ...originalSection.metadata,
        name: `${originalSection.metadata.name || 'Section'} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDuplicate: true,
        originalId: originalSection.id,
        customizations: []
      }
    };

    return this.insertSectionAtPosition(sections, duplicatedSection, sectionIndex + 1);
  }

  /**
   * Validate section order consistency
   */
  static validateSectionOrder(sections: Section[]): boolean {
    const sortedSections = this.sortSectionsByOrder(sections);
    
    for (let i = 0; i < sortedSections.length; i++) {
      if (sortedSections[i].order !== i) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get section positions for all sections
   */
  static getSectionPositions(sections: Section[]): SectionPosition[] {
    return sections.map(section => ({
      sectionId: section.id,
      order: section.order
    }));
  }

  /**
   * Apply section order updates
   */
  static applySectionOrderUpdates(sections: Section[], updates: SectionOrderUpdate[]): Section[] {
    let updatedSections = [...sections];
    
    updates.forEach(update => {
      const sectionIndex = updatedSections.findIndex(s => s.id === update.sectionId);
      if (sectionIndex !== -1) {
        updatedSections[sectionIndex] = {
          ...updatedSections[sectionIndex],
          order: update.newOrder
        };
      }
    });
    
    return this.sortSectionsByOrder(updatedSections);
  }

  /**
   * Check if a section can be moved up
   */
  static canMoveUp(sections: Section[], sectionId: string): boolean {
    const section = sections.find(s => s.id === sectionId);
    return section ? section.order > 0 : false;
  }

  /**
   * Check if a section can be moved down
   */
  static canMoveDown(sections: Section[], sectionId: string): boolean {
    const section = sections.find(s => s.id === sectionId);
    const maxOrder = Math.max(...sections.map(s => s.order));
    return section ? section.order < maxOrder : false;
  }
}