import { Component, OnInit, OnDestroy, Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { GlobalStylingService } from '../../services/global-styling.service';

@Component({
  selector: 'app-css-injector',
  standalone: true,
  template: '', // No template needed - this component only injects CSS
})
export class CssInjectorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private styleElement: HTMLStyleElement | null = null;

  constructor(
    private globalStylingService: GlobalStylingService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    // Create style element
    this.styleElement = this.renderer.createElement('style');
    this.renderer.setAttribute(this.styleElement, 'id', 'global-styling-css');
    this.renderer.appendChild(this.document.head, this.styleElement);

    // Subscribe to CSS custom properties changes
    this.globalStylingService.cssCustomProperties$
      .pipe(takeUntil(this.destroy$))
      .subscribe(css => {
        if (this.styleElement) {
          this.styleElement.textContent = css;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Remove style element
    if (this.styleElement && this.styleElement.parentNode) {
      this.renderer.removeChild(this.document.head, this.styleElement);
    }
  }
}