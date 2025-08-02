import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DragDropItem {
  id: string;
  type: string;
  data: any;
  element?: HTMLElement;
}

export interface DropZone {
  id: string;
  accepts: string[];
  element: HTMLElement;
  onDrop: (item: DragDropItem, zone: DropZone) => void;
  onDragOver?: (item: DragDropItem, zone: DropZone) => boolean;
  onDragLeave?: (item: DragDropItem, zone: DropZone) => void;
}

@Injectable({
  providedIn: 'root'
})
export class DragDropService {
  private isDraggingSubject = new BehaviorSubject<boolean>(false);
  private currentItemSubject = new BehaviorSubject<DragDropItem | null>(null);
  private dropZones: Map<string, DropZone> = new Map();

  isDragging$: Observable<boolean> = this.isDraggingSubject.asObservable();
  currentItem$: Observable<DragDropItem | null> = this.currentItemSubject.asObservable();

  private dragStartPosition = { x: 0, y: 0 };
  private dragThreshold = 5; // pixels

  startDrag(item: DragDropItem, event: MouseEvent | TouchEvent): void {
    this.currentItemSubject.next(item);
    
    // Store initial position
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    this.dragStartPosition = { x: clientX, y: clientY };

    // Add visual feedback
    this.addDragVisualFeedback(item);
    
    // Set up event listeners
    this.setupDragListeners();
  }

  private setupDragListeners(): void {
    const handleMouseMove = (e: MouseEvent) => this.handleDragMove(e);
    const handleTouchMove = (e: TouchEvent) => this.handleDragMove(e);
    const handleMouseUp = (e: MouseEvent) => this.handleDragEnd(e);
    const handleTouchEnd = (e: TouchEvent) => this.handleDragEnd(e);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);

    // Store cleanup function
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    // Store cleanup for later use
    (this as any).dragCleanup = cleanup;
  }

  private handleDragMove(event: MouseEvent | TouchEvent): void {
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    // Check if we've moved enough to start dragging
    const deltaX = Math.abs(clientX - this.dragStartPosition.x);
    const deltaY = Math.abs(clientY - this.dragStartPosition.y);

    if (!this.isDraggingSubject.value && (deltaX > this.dragThreshold || deltaY > this.dragThreshold)) {
      this.isDraggingSubject.next(true);
      this.addDragOverlay();
    }

    if (this.isDraggingSubject.value) {
      event.preventDefault();
      this.updateDragPosition(clientX, clientY);
      this.checkDropZones(clientX, clientY);
    }
  }

  private handleDragEnd(event: MouseEvent | TouchEvent): void {
    const clientX = 'touches' in event ? event.changedTouches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.changedTouches[0].clientY : event.clientY;

    if (this.isDraggingSubject.value) {
      this.handleDrop(clientX, clientY);
    }

    this.endDrag();
  }

  private handleDrop(x: number, y: number): void {
    const currentItem = this.currentItemSubject.value;
    if (!currentItem) return;

    // Find the drop zone at the current position
    const element = document.elementFromPoint(x, y);
    if (!element) return;

    // Find the closest drop zone
    const dropZone = this.findDropZoneForElement(element);
    if (dropZone && this.canDrop(currentItem, dropZone)) {
      dropZone.onDrop(currentItem, dropZone);
      this.showDropSuccess(dropZone);
    } else {
      this.showDropFailure();
    }
  }

  private endDrag(): void {
    this.isDraggingSubject.next(false);
    this.currentItemSubject.next(null);
    this.removeDragVisualFeedback();
    this.removeDragOverlay();
    this.clearDropZoneHighlights();

    // Cleanup event listeners
    if ((this as any).dragCleanup) {
      (this as any).dragCleanup();
      delete (this as any).dragCleanup;
    }
  }

  registerDropZone(zone: DropZone): void {
    this.dropZones.set(zone.id, zone);
    this.setupDropZoneListeners(zone);
  }

  unregisterDropZone(zoneId: string): void {
    this.dropZones.delete(zoneId);
  }

  private setupDropZoneListeners(zone: DropZone): void {
    zone.element.addEventListener('dragover', (e) => {
      e.preventDefault();
      const currentItem = this.currentItemSubject.value;
      if (currentItem && this.canDrop(currentItem, zone)) {
        zone.element.classList.add('drag-over');
        if (zone.onDragOver) {
          zone.onDragOver(currentItem, zone);
        }
      }
    });

    zone.element.addEventListener('dragleave', (e) => {
      zone.element.classList.remove('drag-over');
      const currentItem = this.currentItemSubject.value;
      if (currentItem && zone.onDragLeave) {
        zone.onDragLeave(currentItem, zone);
      }
    });
  }

  private canDrop(item: DragDropItem, zone: DropZone): boolean {
    return zone.accepts.includes(item.type) || zone.accepts.includes('*');
  }

  private findDropZoneForElement(element: Element): DropZone | null {
    // Walk up the DOM tree to find a drop zone
    let current = element;
    while (current && current !== document.body) {
      for (const zone of this.dropZones.values()) {
        if (zone.element === current || zone.element.contains(current)) {
          return zone;
        }
      }
      current = current.parentElement!;
    }
    return null;
  }

  private checkDropZones(x: number, y: number): void {
    const element = document.elementFromPoint(x, y);
    if (!element) return;

    const currentItem = this.currentItemSubject.value;
    if (!currentItem) return;

    // Clear all highlights first
    this.clearDropZoneHighlights();

    // Find and highlight valid drop zone
    const dropZone = this.findDropZoneForElement(element);
    if (dropZone && this.canDrop(currentItem, dropZone)) {
      dropZone.element.classList.add('drag-over-valid');
    }
  }

  private clearDropZoneHighlights(): void {
    this.dropZones.forEach(zone => {
      zone.element.classList.remove('drag-over', 'drag-over-valid');
    });
  }

  private addDragVisualFeedback(item: DragDropItem): void {
    if (item.element) {
      item.element.classList.add('dragging');
    }
    document.body.classList.add('drag-in-progress');
  }

  private removeDragVisualFeedback(): void {
    const currentItem = this.currentItemSubject.value;
    if (currentItem && currentItem.element) {
      currentItem.element.classList.remove('dragging');
    }
    document.body.classList.remove('drag-in-progress');
  }

  private addDragOverlay(): void {
    const overlay = document.createElement('div');
    overlay.className = 'drag-overlay';
    overlay.id = 'drag-overlay';
    document.body.appendChild(overlay);
  }

  private removeDragOverlay(): void {
    const overlay = document.getElementById('drag-overlay');
    if (overlay) {
      document.body.removeChild(overlay);
    }
  }

  private updateDragPosition(x: number, y: number): void {
    // This could be used to update a drag preview element
    const dragPreview = document.querySelector('.drag-preview') as HTMLElement;
    if (dragPreview) {
      dragPreview.style.left = `${x + 10}px`;
      dragPreview.style.top = `${y + 10}px`;
    }
  }

  private showDropSuccess(zone: DropZone): void {
    zone.element.classList.add('drop-success');
    setTimeout(() => {
      zone.element.classList.remove('drop-success');
    }, 300);
  }

  private showDropFailure(): void {
    // Could show a visual indication of failed drop
    document.body.classList.add('drop-failed');
    setTimeout(() => {
      document.body.classList.remove('drop-failed');
    }, 300);
  }

  // Utility method to make an element draggable
  makeDraggable(element: HTMLElement, item: DragDropItem): void {
    element.draggable = true;
    element.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left mouse button
        this.startDrag({ ...item, element }, e);
      }
    });

    element.addEventListener('touchstart', (e) => {
      this.startDrag({ ...item, element }, e);
    }, { passive: true });
  }
}