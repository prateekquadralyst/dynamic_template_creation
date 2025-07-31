import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { GlobalStylingControlsComponent } from './global-styling-controls.component';
import { GlobalStylingService } from '../../services/global-styling.service';

describe('GlobalStylingControlsComponent', () => {
  let component: GlobalStylingControlsComponent;
  let fixture: ComponentFixture<GlobalStylingControlsComponent>;
  let globalStylingService: jasmine.SpyObj<GlobalStylingService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('GlobalStylingService', [
      'getCurrentGlobalStyles',
      'updateTypography',
      'updateColors',
      'updateSpacing',
      'updateEffects',
      'resetToDefaults',
      'exportStyles',
      'importStyles'
    ]);

    await TestBed.configureTestingModule({
      imports: [GlobalStylingControlsComponent, FormsModule],
      providers: [
        { provide: GlobalStylingService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalStylingControlsComponent);
    component = fixture.componentInstance;
    globalStylingService = TestBed.inject(GlobalStylingService) as jasmine.SpyObj<GlobalStylingService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle panel visibility', () => {
    expect(component.panels.typography).toBe(true);
    component.togglePanel('typography');
    expect(component.panels.typography).toBe(false);
  });

  it('should update typography when called', () => {
    component.updateTypography();
    expect(globalStylingService.updateTypography).toHaveBeenCalledWith(component.globalStyles.typography);
  });

  it('should update colors when called', () => {
    component.updateColors();
    expect(globalStylingService.updateColors).toHaveBeenCalledWith(component.globalStyles.colors);
  });

  it('should apply color palette', () => {
    const testPalette = {
      name: 'Test Palette',
      colors: {
        primary: '#ff0000',
        secondary: '#00ff00',
        accent: '#0000ff',
        text: '#000000',
        background: '#ffffff',
        surface: '#f0f0f0'
      }
    };

    component.applyColorPalette(testPalette);
    expect(component.globalStyles.colors).toEqual(testPalette.colors);
    expect(globalStylingService.updateColors).toHaveBeenCalledWith(testPalette.colors);
  });

  it('should generate random color', () => {
    const color = component.generateRandomColor();
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should check accessibility', () => {
    const isAccessible = component.isAccessible('#000000', '#ffffff');
    expect(typeof isAccessible).toBe('boolean');
  });
});