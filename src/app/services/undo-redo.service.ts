import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UndoRedoAction {
  id: string;
  description: string;
  timestamp: Date;
  undo: () => void;
  redo: () => void;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UndoRedoService {
  private undoStack: UndoRedoAction[] = [];
  private redoStack: UndoRedoAction[] = [];
  private maxStackSize = 50;

  private canUndoSubject = new BehaviorSubject<boolean>(false);
  private canRedoSubject = new BehaviorSubject<boolean>(false);
  private lastActionSubject = new BehaviorSubject<string>('');

  canUndo$: Observable<boolean> = this.canUndoSubject.asObservable();
  canRedo$: Observable<boolean> = this.canRedoSubject.asObservable();
  lastAction$: Observable<string> = this.lastActionSubject.asObservable();

  executeAction(action: UndoRedoAction): void {
    // Execute the redo action (which is the initial action)
    action.redo();

    // Add to undo stack
    this.undoStack.push(action);

    // Clear redo stack when new action is performed
    this.redoStack = [];

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.updateState();
  }

  undo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }

    const action = this.undoStack.pop()!;
    action.undo();

    this.redoStack.push(action);
    this.updateState();

    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }

    const action = this.redoStack.pop()!;
    action.redo();

    this.undoStack.push(action);
    this.updateState();

    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getLastAction(): string {
    if (this.undoStack.length === 0) {
      return '';
    }
    return this.undoStack[this.undoStack.length - 1].description;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.updateState();
  }

  getUndoHistory(): UndoRedoAction[] {
    return [...this.undoStack].reverse();
  }

  getRedoHistory(): UndoRedoAction[] {
    return [...this.redoStack].reverse();
  }

  private updateState(): void {
    this.canUndoSubject.next(this.canUndo());
    this.canRedoSubject.next(this.canRedo());
    this.lastActionSubject.next(this.getLastAction());
  }

  // Helper method to create simple text change actions
  createTextChangeAction(
    id: string,
    description: string,
    oldValue: string,
    newValue: string,
    setter: (value: string) => void
  ): UndoRedoAction {
    return {
      id,
      description,
      timestamp: new Date(),
      undo: () => setter(oldValue),
      redo: () => setter(newValue),
      data: { oldValue, newValue }
    };
  }

  // Helper method to create array change actions
  createArrayChangeAction<T>(
    id: string,
    description: string,
    oldArray: T[],
    newArray: T[],
    setter: (array: T[]) => void
  ): UndoRedoAction {
    return {
      id,
      description,
      timestamp: new Date(),
      undo: () => setter([...oldArray]),
      redo: () => setter([...newArray]),
      data: { oldArray: [...oldArray], newArray: [...newArray] }
    };
  }
}