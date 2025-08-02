import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingService, OnboardingStep, OnboardingTour } from '../../services/onboarding.service';
import { Subject, takeUntil, combineLatest } from 'rxjs';

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="onboarding-overlay" *ngIf="isActive" [class.active]="isActive">
      <!-- Backdrop -->
      <div class="onboarding-backdrop" (click)="skipTour()"></div>
      
      <!-- Highlight spotlight -->
      <div class="onboarding-spotlight" 
           *ngIf="currentStep && currentStep.target"
           [style.top.px]="spotlightPosition.top"
           [style.left.px]="spotlightPosition.left"
           [style.width.px]="spotlightPosition.width"
           [style.height.px]="spotlightPosition.height">
      </div>
      
      <!-- Step content -->
      <div class="onboarding-step" 
           *ngIf="currentStep"
           [class]="'position-' + (currentStep.position || 'center')"
           [style.top.px]="stepPosition.top"
           [style.left.px]="stepPosition.left">
        
        <div class="step-header">
          <h3 class="step-title">{{ currentStep.title }}</h3>
          <button class="close-btn" (click)="skipTour()" aria-label="Close tutorial">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div class="step-content">
          <p [innerHTML]="currentStep.content"></p>
        </div>
        
        <div class="step-footer">
          <div class="step-progress">
            <span class="step-counter">{{ currentStepIndex + 1 }} of {{ totalSteps }}</span>
            <div class="progress-bar">
              <div class="progress-fill" 
                   [style.width.%]="((currentStepIndex + 1) / totalSteps) * 100">
              </div>
            </div>
          </div>
          
          <div class="step-actions">
            <button class="btn btn-secondary" 
                    *ngIf="currentStep.canSkip !== false"
                    (click)="skipTour()">
              Skip Tour
            </button>
            <button class="btn btn-outline" 
                    *ngIf="currentStepIndex > 0"
                    (click)="previousStep()">
              Previous
            </button>
            <button class="btn btn-primary" 
                    (click)="nextStep()">
              {{ isLastStep ? 'Finish' : 'Next' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .onboarding-overlay.active {
      opacity: 1;
      pointer-events: all;
    }

    .onboarding-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(2px);
    }

    .onboarding-spotlight {
      position: absolute;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
      transition: all 0.3s ease;
      pointer-events: none;
      z-index: 10001;
    }

    .onboarding-step {
      position: absolute;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      min-width: 300px;
      z-index: 10002;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .onboarding-step.position-center {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 20px 0;
    }

    .step-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1a1a1a;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.2rem;
      color: #666;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: #f5f5f5;
      color: #333;
    }

    .step-content {
      padding: 16px 20px;
    }

    .step-content p {
      margin: 0;
      line-height: 1.6;
      color: #555;
    }

    .step-footer {
      padding: 0 20px 20px;
      border-top: 1px solid #eee;
      margin-top: 16px;
      padding-top: 16px;
    }

    .step-progress {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .step-counter {
      font-size: 0.875rem;
      color: #666;
      white-space: nowrap;
    }

    .progress-bar {
      flex: 1;
      height: 4px;
      background: #e5e5e5;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #007bff;
      transition: width 0.3s ease;
    }

    .step-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .btn-outline {
      background: transparent;
      color: #007bff;
      border: 1px solid #007bff;
    }

    .btn-outline:hover {
      background: #007bff;
      color: white;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .onboarding-step {
        max-width: calc(100vw - 32px);
        margin: 16px;
      }

      .onboarding-step.position-center {
        position: fixed;
        top: auto;
        bottom: 20px;
        left: 16px;
        right: 16px;
        transform: none;
        max-width: none;
      }

      .step-actions {
        flex-wrap: wrap;
      }

      .btn {
        flex: 1;
        min-width: 80px;
      }
    }
  `]
})
export class OnboardingOverlayComponent implements OnInit, OnDestroy {
  isActive = false;
  currentTour: OnboardingTour | null = null;
  currentStep: OnboardingStep | null = null;
  currentStepIndex = -1;
  totalSteps = 0;
  
  spotlightPosition = { top: 0, left: 0, width: 0, height: 0 };
  stepPosition = { top: 0, left: 0 };

  private destroy$ = new Subject<void>();

  constructor(
    private onboardingService: OnboardingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to onboarding state changes
    combineLatest([
      this.onboardingService.isActive$,
      this.onboardingService.currentTour$,
      this.onboardingService.currentStepIndex$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([isActive, tour, stepIndex]) => {
      this.isActive = isActive;
      this.currentTour = tour;
      this.currentStepIndex = stepIndex;
      this.totalSteps = tour ? tour.steps.length : 0;
      this.currentStep = this.onboardingService.getCurrentStep();
      
      if (this.isActive && this.currentStep) {
        this.updatePositions();
      }
      
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.totalSteps - 1;
  }

  nextStep(): void {
    if (this.currentStep && this.currentStep.action) {
      this.currentStep.action();
    }
    
    if (!this.onboardingService.nextStep()) {
      // Tour completed
    }
  }

  previousStep(): void {
    this.onboardingService.previousStep();
  }

  skipTour(): void {
    this.onboardingService.skipTour();
  }

  private updatePositions(): void {
    if (!this.currentStep || !this.currentStep.target) {
      return;
    }

    // Find the target element
    const targetElement = document.querySelector(this.currentStep.target) as HTMLElement;
    if (!targetElement) {
      return;
    }

    // Get element position and size
    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    // Update spotlight position
    this.spotlightPosition = {
      top: rect.top + scrollTop - 8,
      left: rect.left + scrollLeft - 8,
      width: rect.width + 16,
      height: rect.height + 16
    };

    // Calculate step position based on preferred position
    this.calculateStepPosition(rect, scrollTop, scrollLeft);
  }

  private calculateStepPosition(targetRect: DOMRect, scrollTop: number, scrollLeft: number): void {
    const stepWidth = 400;
    const stepHeight = 300; // Approximate height
    const margin = 20;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (this.currentStep?.position) {
      case 'top':
        top = targetRect.top + scrollTop - stepHeight - margin;
        left = targetRect.left + scrollLeft + (targetRect.width / 2) - (stepWidth / 2);
        break;
      
      case 'bottom':
        top = targetRect.bottom + scrollTop + margin;
        left = targetRect.left + scrollLeft + (targetRect.width / 2) - (stepWidth / 2);
        break;
      
      case 'left':
        top = targetRect.top + scrollTop + (targetRect.height / 2) - (stepHeight / 2);
        left = targetRect.left + scrollLeft - stepWidth - margin;
        break;
      
      case 'right':
        top = targetRect.top + scrollTop + (targetRect.height / 2) - (stepHeight / 2);
        left = targetRect.right + scrollLeft + margin;
        break;
      
      default: // center
        top = (viewportHeight / 2) - (stepHeight / 2) + scrollTop;
        left = (viewportWidth / 2) - (stepWidth / 2) + scrollLeft;
        break;
    }

    // Ensure step stays within viewport bounds
    left = Math.max(margin, Math.min(left, viewportWidth - stepWidth - margin));
    top = Math.max(margin + scrollTop, Math.min(top, viewportHeight - stepHeight - margin + scrollTop));

    this.stepPosition = { top, left };
  }
}