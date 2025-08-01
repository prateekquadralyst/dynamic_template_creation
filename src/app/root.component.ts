import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="app-root">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-root {
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class RootComponent {
  title = 'dynamic-preview-app';
}