import { SectionOrderingUtil } from './section-ordering.util';
import { Section, SectionType, ReorderOperationType, SectionReorderOperation } from '../models/section.interface';

describe('SectionOrderingUtil', () => {
  let mockSections: Section[];

  beforeEach(() => {
    mockSections = [
      createMockSection('1', SectionType.HERO, 0),
      createMockSection('2', SectionType.FEATURES, 1),
      createMockSection('3', SectionType.TESTIMONIALS, 2),
      createMockSection('4', SectionType.CTA, 3)
    ];
  });

  function createMockSection(id: string, type: SectionType, order: number): Section {
    return {
      id,
      type,
      templateId: `template-${type}`,
      content: {},
      styles: {},
      order,
      isVisible: true,
      responsiveSettings: {
        breakpoints: [],
        deviceSpecificStyles: { mobile: {}, tablet: {}, desktop: {} }
      },
      metadata: {
        name: `Section ${id}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        customizations: []
      }
    };
  }

  describe('moveSectionUp', () => {
    it('should move a section up by one position', () => {
      const result = SectionOrderingUtil.moveSectionUp(mockSections, '2');
      
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('1');
      expect(result[2].id).toBe('3');
      expect(result[3].id).toBe('4');
      
      // Check normalized orders
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(result[2].order).toBe(2);
      expect(result[3].order).toBe(3);
    });

    it('should not move the first section up', () => {
      const result = SectionOrderingUtil.moveSectionUp(mockSections, '1');
      
      expect(result).toEqual(mockSections);
    });
  });

  describe('moveSectionDown', () => {
    it('should move a section down by one position', () => {
      const result = SectionOrderingUtil.moveSectionDown(mockSections, '2');
      
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('2');
      expect(result[3].id).toBe('4');
    });

    it('should not move the last section down', () => {
      const result = SectionOrderingUtil.moveSectionDown(mockSections, '4');
      
      expect(result).toEqual(mockSections);
    });
  });

  describe('moveSectionToPosition', () => {
    it('should move a section to a specific position', () => {
      const result = SectionOrderingUtil.moveSectionToPosition(mockSections, '4', 1);
      
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('4');
      expect(result[2].id).toBe('2');
      expect(result[3].id).toBe('3');
    });

    it('should handle invalid positions gracefully', () => {
      const result = SectionOrderingUtil.moveSectionToPosition(mockSections, '2', -1);
      expect(result).toEqual(mockSections);
      
      const result2 = SectionOrderingUtil.moveSectionToPosition(mockSections, '2', 10);
      expect(result2).toEqual(mockSections);
    });
  });

  describe('handleDragDrop', () => {
    it('should handle drag and drop reordering', () => {
      const result = SectionOrderingUtil.handleDragDrop(mockSections, 0, 2);
      
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('1');
      expect(result[3].id).toBe('4');
    });

    it('should handle same position drag drop', () => {
      const result = SectionOrderingUtil.handleDragDrop(mockSections, 1, 1);
      expect(result).toEqual(mockSections);
    });
  });

  describe('normalizeOrder', () => {
    it('should normalize section orders to be sequential', () => {
      const sectionsWithGaps = [
        createMockSection('1', SectionType.HERO, 0),
        createMockSection('2', SectionType.FEATURES, 5),
        createMockSection('3', SectionType.TESTIMONIALS, 10)
      ];

      const result = SectionOrderingUtil.normalizeOrder(sectionsWithGaps);
      
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(result[2].order).toBe(2);
    });
  });

  describe('getNextOrder', () => {
    it('should return the next available order value', () => {
      const nextOrder = SectionOrderingUtil.getNextOrder(mockSections);
      expect(nextOrder).toBe(4);
    });

    it('should return 0 for empty sections array', () => {
      const nextOrder = SectionOrderingUtil.getNextOrder([]);
      expect(nextOrder).toBe(0);
    });
  });

  describe('insertSectionAtPosition', () => {
    it('should insert a new section at the specified position', () => {
      const newSection = createMockSection('5', SectionType.ABOUT, 0);
      const result = SectionOrderingUtil.insertSectionAtPosition(mockSections, newSection, 2);
      
      expect(result.length).toBe(5);
      expect(result[2].id).toBe('5');
      expect(result[2].order).toBe(2);
    });
  });

  describe('removeSection', () => {
    it('should remove a section and normalize orders', () => {
      const result = SectionOrderingUtil.removeSection(mockSections, '2');
      
      expect(result.length).toBe(3);
      expect(result.find((s: any) => s.id === '2')).toBeUndefined();
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(result[2].order).toBe(2);
    });
  });

  describe('duplicateSection', () => {
    it('should duplicate a section and insert it after the original', () => {
      const result = SectionOrderingUtil.duplicateSection(mockSections, '2', 'new-2');
      
      expect(result.length).toBe(5);
      expect(result[2].id).toBe('new-2');
      expect(result[2].metadata.isDuplicate).toBe(true);
      expect(result[2].metadata.originalId).toBe('2');
    });
  });

  describe('validateSectionOrder', () => {
    it('should validate correct section order', () => {
      const isValid = SectionOrderingUtil.validateSectionOrder(mockSections);
      expect(isValid).toBe(true);
    });

    it('should detect invalid section order', () => {
      const invalidSections = [
        createMockSection('1', SectionType.HERO, 0),
        createMockSection('2', SectionType.FEATURES, 2), // Gap in order
        createMockSection('3', SectionType.TESTIMONIALS, 3)
      ];
      
      const isValid = SectionOrderingUtil.validateSectionOrder(invalidSections);
      expect(isValid).toBe(false);
    });
  });

  describe('canMoveUp and canMoveDown', () => {
    it('should correctly determine if sections can be moved', () => {
      expect(SectionOrderingUtil.canMoveUp(mockSections, '1')).toBe(false);
      expect(SectionOrderingUtil.canMoveUp(mockSections, '2')).toBe(true);
      
      expect(SectionOrderingUtil.canMoveDown(mockSections, '4')).toBe(false);
      expect(SectionOrderingUtil.canMoveDown(mockSections, '3')).toBe(true);
    });
  });

  describe('reorderSections', () => {
    it('should handle MOVE_UP operation', () => {
      const operation: SectionReorderOperation = {
        type: ReorderOperationType.MOVE_UP,
        sectionId: '2',
        targetPosition: 0,
        sourcePosition: 1
      };
      
      const result = SectionOrderingUtil.reorderSections(mockSections, operation);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('1');
    });

    it('should handle DRAG_DROP operation', () => {
      const operation: SectionReorderOperation = {
        type: ReorderOperationType.DRAG_DROP,
        sectionId: '1',
        targetPosition: 2,
        sourcePosition: 0
      };
      
      const result = SectionOrderingUtil.reorderSections(mockSections, operation);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('1');
    });
  });
});