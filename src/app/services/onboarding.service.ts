import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
  canSkip?: boolean;
  isOptional?: boolean;
}

export interface OnboardingTour {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  isCompleted?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private currentTourSubject = new BehaviorSubject<OnboardingTour | null>(null);
  private currentStepIndexSubject = new BehaviorSubject<number>(-1);
  private isActiveSubject = new BehaviorSubject<boolean>(false);

  currentTour$: Observable<OnboardingTour | null> = this.currentTourSubject.asObservable();
  currentStepIndex$: Observable<number> = this.currentStepIndexSubject.asObservable();
  isActive$: Observable<boolean> = this.isActiveSubject.asObservable();

  private tours: Map<string, OnboardingTour> = new Map();
  private completedTours: Set<string> = new Set();

  constructor() {
    this.loadCompletedTours();
    this.registerDefaultTours();
  }

  registerTour(tour: OnboardingTour): void {
    this.tours.set(tour.id, tour);
  }

  startTour(tourId: string): boolean {
    const tour = this.tours.get(tourId);
    if (!tour || tour.steps.length === 0) {
      return false;
    }

    this.currentTourSubject.next(tour);
    this.currentStepIndexSubject.next(0);
    this.isActiveSubject.next(true);

    return true;
  }

  nextStep(): boolean {
    const currentTour = this.currentTourSubject.value;
    const currentIndex = this.currentStepIndexSubject.value;

    if (!currentTour || currentIndex >= currentTour.steps.length - 1) {
      this.completeTour();
      return false;
    }

    this.currentStepIndexSubject.next(currentIndex + 1);
    return true;
  }

  previousStep(): boolean {
    const currentIndex = this.currentStepIndexSubject.value;

    if (currentIndex <= 0) {
      return false;
    }

    this.currentStepIndexSubject.next(currentIndex - 1);
    return true;
  }

  skipTour(): void {
    this.endTour();
  }

  completeTour(): void {
    const currentTour = this.currentTourSubject.value;
    if (currentTour) {
      this.completedTours.add(currentTour.id);
      this.saveCompletedTours();
    }
    this.endTour();
  }

  private endTour(): void {
    this.currentTourSubject.next(null);
    this.currentStepIndexSubject.next(-1);
    this.isActiveSubject.next(false);
  }

  getCurrentStep(): OnboardingStep | null {
    const currentTour = this.currentTourSubject.value;
    const currentIndex = this.currentStepIndexSubject.value;

    if (!currentTour || currentIndex < 0 || currentIndex >= currentTour.steps.length) {
      return null;
    }

    return currentTour.steps[currentIndex];
  }

  isTourCompleted(tourId: string): boolean {
    return this.completedTours.has(tourId);
  }

  resetTourProgress(tourId: string): void {
    this.completedTours.delete(tourId);
    this.saveCompletedTours();
  }

  getAllTours(): OnboardingTour[] {
    return Array.from(this.tours.values()).map(tour => ({
      ...tour,
      isCompleted: this.isTourCompleted(tour.id)
    }));
  }

  private loadCompletedTours(): void {
    try {
      const completed = localStorage.getItem('onboarding_completed_tours');
      if (completed) {
        this.completedTours = new Set(JSON.parse(completed));
      }
    } catch (error) {
      console.warn('Failed to load completed tours:', error);
    }
  }

  private saveCompletedTours(): void {
    try {
      localStorage.setItem('onboarding_completed_tours', JSON.stringify(Array.from(this.completedTours)));
    } catch (error) {
      console.warn('Failed to save completed tours:', error);
    }
  }

  private registerDefaultTours(): void {
    // Basic tour for new users
    this.registerTour({
      id: 'basic-tour',
      name: 'Getting Started',
      description: 'Learn the basics of using the Website Builder',
      steps: [
        {
          id: 'welcome',
          title: 'Welcome to Website Builder!',
          content: 'This tour will help you get started with creating your first website. You can skip this tour at any time.',
          position: 'center',
          canSkip: true
        },
        {
          id: 'editor-panel',
          title: 'Editor Panel',
          content: 'This is your main editing panel where you can customize your website content, styles, and sections.',
          target: '.editor-panel',
          position: 'right'
        },
        {
          id: 'preview-panel',
          title: 'Live Preview',
          content: 'See your changes in real-time in this preview panel. You can switch between desktop, tablet, and mobile views.',
          target: '.preview-panel',
          position: 'left'
        },
        {
          id: 'hero-section',
          title: 'Hero Section',
          content: 'Start by customizing your hero section - the first thing visitors see on your website.',
          target: '.panel-section:has(.panel-title:contains("Hero"))',
          position: 'right'
        },
        {
          id: 'template-selector',
          title: 'Browse Layouts',
          content: 'Click "Browse Layouts" to choose from different design templates for each section.',
          target: '.change-layout-btn',
          position: 'right'
        },
        {
          id: 'project-manager',
          title: 'Project Management',
          content: 'Save your work and manage multiple projects using the project manager.',
          target: '.project-manager-btn',
          position: 'bottom'
        }
      ]
    });

    // Advanced features tour
    this.registerTour({
      id: 'advanced-tour',
      name: 'Advanced Features',
      description: 'Discover advanced features and shortcuts',
      steps: [
        {
          id: 'keyboard-shortcuts',
          title: 'Keyboard Shortcuts',
          content: 'Use Ctrl+Z to undo, Ctrl+Y to redo, and Ctrl+S to save your project quickly.',
          position: 'center'
        },
        {
          id: 'drag-drop',
          title: 'Drag & Drop',
          content: 'You can drag and drop elements to reorder them. Look for drag handles and drop zones.',
          position: 'center'
        },
        {
          id: 'responsive-design',
          title: 'Responsive Design',
          content: 'Test your website on different devices using the device preview buttons.',
          target: '.device-buttons',
          position: 'bottom'
        },
        {
          id: 'global-styling',
          title: 'Global Styling',
          content: 'Apply consistent styling across your entire website using global styling controls.',
          target: '.panel-section:has(.panel-title:contains("Global"))',
          position: 'right'
        }
      ]
    });
  }
}