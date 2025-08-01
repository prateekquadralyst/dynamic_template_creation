import { Routes } from '@angular/router';
import { TemplateGalleryComponent } from './components/template-gallery/template-gallery.component';

export const routes: Routes = [
  {
    path: '',
    component: TemplateGalleryComponent,
    data: { standalone: true }
  },
  {
    path: 'editor',
    loadComponent: () => import('./app.component').then(m => m.AppComponent),
    data: { standalone: true }
  },
  {
    path: 'editor/:templateId',
    loadComponent: () => import('./app.component').then(m => m.AppComponent),
    data: { standalone: true }
  },
  {
    path: 'firebase-demo',
    loadComponent: () => import('./components/firebase-demo/firebase-demo.component').then(m => m.FirebaseDemoComponent),
    data: { standalone: true }
  },
  {
    path: 'sidebar-test',
    loadComponent: () => import('./components/responsive-sidebar/responsive-sidebar.test.component').then(m => m.ResponsiveSidebarTestComponent),
    data: { standalone: true }
  },
  {
    path: '**',
    redirectTo: ''
  }
];