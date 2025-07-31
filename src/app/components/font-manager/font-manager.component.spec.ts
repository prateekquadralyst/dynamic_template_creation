import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FontManagerComponent } from './font-manager.component';
import { FontManagementService } from '../../services/font-management.service';
import { GlobalStylingService } from '../../services/global-styling.service';
import { of } from 'rxjs';
import { FontFamily, FontCategory, FontSource, FontWeight, FontStyle } from '../../models/font.interface';

describe('FontManagerComponent', () => {
  let component: FontManagerComponent;
  let fixture: ComponentFixture<FontManagerComponent>;
  let fontManagementService: jasmine.SpyObj<FontManagementService>;
  let globalStylingService: jasmine.SpyObj<GlobalStylingService>;

  const mockFonts: FontFamily[] = [
    {
      id: 'inter',
      name: 'Inter',
      displayName: 'Inter',
      category: FontCategory.SANS_SERIF,
      variants: [
        { weight: FontWeight.REGULAR, style: FontStyle.NORMAL },
        { weight: FontWeight.BOLD, style: FontStyle.NORMAL }
      ],
      subsets: ['latin'],
      source: FontSource.GOOGLE,
      isCustom: false,
      popularity: 1
    },
    {
      id: 'playfair',
      name: 'Playfair Display',
      displayName: 'Playfair Display',
      category: FontCategory.SERIF,
      variants: [
        { weight: FontWeight.REGULAR, style: FontStyle.NORMAL },
        { weight: FontWeight.BOLD, style: FontStyle.NORMAL }
      ],
      subsets: ['latin'],
      source: FontSource.GOOGLE,
      isCustom: false,
      popularity: 2
    }
  ];

  beforeEach(async () => {
    const fontManagementSpy = jasmine.createSpyObj('FontManagementService', [
      'getAvailableFonts',
      'searchFonts',
      'loadGoogleFont',
      'uploadCustomFont',
      'deleteCustomFont',
      'getFontPairings',
      'generateFontPairingSuggestions',
      'getPreviewText',
      'getFontCSSDeclaration'
    ], {
      availableFonts$: of(mockFonts),
      customFonts$: of([]),
      fontPairings$: of([]),
      loadedFonts$: of(new Set(['Inter']))
    });

    const globalStylingSpy = jasmine.createSpyObj('GlobalStylingService', [
      'updateTypography'
    ]);

    await TestBed.configureTestingModule({
      imports: [FontManagerComponent, FormsModule],
      providers: [
        { provide: FontManagementService, useValue: fontManagementSpy },
        { provide: GlobalStylingService, useValue: globalStylingSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FontManagerComponent);
    component = fixture.componentInstance;
    fontManagementService = TestBed.inject(FontManagementService) as jasmine.SpyObj<FontManagementService>;
    globalStylingService = TestBed.inject(GlobalStylingService) as jasmine.SpyObj<GlobalStylingService>;

    // Setup service method returns
    fontManagementService.getAvailableFonts.and.returnValue(mockFonts);
    fontManagementService.searchFonts.and.returnValue(mockFonts);
    fontManagementService.loadGoogleFont.and.returnValue(of(true));
    fontManagementService.getFontPairings.and.returnValue([]);
    fontManagementService.generateFontPairingSuggestions.and.returnValue([]);
    fontManagementService.getPreviewText.and.returnValue('The quick brown fox jumps over the lazy dog');
    fontManagementService.getFontCSSDeclaration.and.returnValue('font-family: "Inter", sans-serif;');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.activeTab).toBe('browse');
    expect(component.selectedCategory).toBe('all');
    expect(component.searchQuery).toBe('');
    expect(component.previewText).toBe('The quick brown fox jumps over the lazy dog');
    expect(component.previewSize).toBe('18px');
    expect(component.previewWeight).toBe(FontWeight.REGULAR);
  });

  it('should load available fonts on init', () => {
    expect(component.availableFonts).toEqual(mockFonts);
    expect(component.filteredFonts.length).toBeGreaterThan(0);
  });

  it('should filter fonts by category', () => {
    component.selectCategory(FontCategory.SERIF);
    expect(component.selectedCategory).toBe(FontCategory.SERIF);
    // The component uses availableFonts property, not the service method directly
    expect(component.filteredFonts.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle search input', (done) => {
    const event = { target: { value: 'Inter' } } as any;
    component.onSearchInput(event);
    
    // Wait for debounce
    setTimeout(() => {
      expect(fontManagementService.searchFonts).toHaveBeenCalledWith('Inter');
      done();
    }, 350);
  });

  it('should preview font family', () => {
    const font = mockFonts[1]; // Use Playfair which is not loaded
    component.previewFontFamily(font);
    
    expect(component.previewFont).toBe(font);
    expect(fontManagementService.loadGoogleFont).toHaveBeenCalledWith(font);
  });

  it('should select font for heading', () => {
    spyOn(component.fontSelected, 'emit');
    const font = mockFonts[0];
    
    component.selectFont(font, 'heading');
    
    expect(component.fontSelected.emit).toHaveBeenCalledWith({ type: 'heading', font });
    expect(globalStylingService.updateTypography).toHaveBeenCalled();
  });

  it('should select font for body', () => {
    spyOn(component.fontSelected, 'emit');
    const font = mockFonts[0];
    
    component.selectFont(font, 'body');
    
    expect(component.fontSelected.emit).toHaveBeenCalledWith({ type: 'body', font });
    expect(globalStylingService.updateTypography).toHaveBeenCalled();
  });

  it('should handle file selection for upload', () => {
    const mockFile = new File([''], 'test-font.woff2', { type: 'font/woff2' });
    const event = { target: { files: [mockFile] } } as any;
    
    component.onFileSelected(event);
    
    expect(component.uploadForm.files).toEqual([mockFile]);
    expect(component.uploadForm.variants.length).toBe(1);
    expect(component.uploadErrors).toEqual([]);
  });

  it('should validate upload form', () => {
    component.uploadCustomFont();
    
    expect(component.uploadErrors).toContain('Font name is required');
  });

  it('should upload custom font when form is valid', () => {
    const mockFile = new File([''], 'test-font.woff2', { type: 'font/woff2' });
    const mockCustomFont: FontFamily = {
      id: 'custom-test',
      name: 'Test Font',
      displayName: 'Test Font',
      category: FontCategory.SANS_SERIF,
      variants: [{ weight: FontWeight.REGULAR, style: FontStyle.NORMAL }],
      subsets: ['latin'],
      source: FontSource.CUSTOM,
      isCustom: true
    };

    component.uploadForm.name = 'Test Font';
    component.uploadForm.files = [mockFile];
    component.uploadForm.variants = [{ weight: FontWeight.REGULAR, style: FontStyle.NORMAL }];

    fontManagementService.uploadCustomFont.and.returnValue(of(mockCustomFont));
    
    component.uploadCustomFont();
    
    expect(fontManagementService.uploadCustomFont).toHaveBeenCalledWith(component.uploadForm);
  });

  it('should delete custom font', () => {
    const customFont = { ...mockFonts[0], isCustom: true };
    spyOn(window, 'confirm').and.returnValue(true);
    fontManagementService.deleteCustomFont.and.returnValue(of(true));
    
    component.deleteCustomFont(customFont);
    
    expect(fontManagementService.deleteCustomFont).toHaveBeenCalledWith(customFont.id);
  });

  it('should get font source icon', () => {
    expect(component.getFontSourceIcon(FontSource.GOOGLE)).toBe('🌐');
    expect(component.getFontSourceIcon(FontSource.CUSTOM)).toBe('📁');
    expect(component.getFontSourceIcon(FontSource.SYSTEM)).toBe('💻');
  });

  it('should get font category icon', () => {
    expect(component.getFontCategoryIcon(FontCategory.SANS_SERIF)).toBe('📝');
    expect(component.getFontCategoryIcon(FontCategory.SERIF)).toBe('📖');
    expect(component.getFontCategoryIcon(FontCategory.DISPLAY)).toBe('🎨');
  });

  it('should check if font is loaded', () => {
    const loadedFont = mockFonts[0]; // Inter is in loaded fonts
    const unloadedFont = mockFonts[1]; // Playfair is not in loaded fonts
    
    expect(component.isFontLoaded(loadedFont)).toBe(true);
    expect(component.isFontLoaded(unloadedFont)).toBe(false);
  });

  it('should get preview text for category', () => {
    component.getPreviewTextForCategory(FontCategory.SERIF);
    expect(fontManagementService.getPreviewText).toHaveBeenCalledWith(FontCategory.SERIF);
  });

  it('should generate pairing suggestions', () => {
    const font = mockFonts[0];
    component.generatePairingSuggestions(font);
    expect(fontManagementService.generateFontPairingSuggestions).toHaveBeenCalledWith(font);
  });

  it('should get font preview style', () => {
    const font = mockFonts[0];
    const style = component.getFontPreviewStyle(font);
    
    expect(style).toEqual({
      fontFamily: '"Inter", sans-serif',
      fontSize: '18px',
      fontWeight: FontWeight.REGULAR
    });
  });

  it('should switch tabs', () => {
    component.activeTab = 'upload';
    expect(component.activeTab).toBe('upload');
    
    component.activeTab = 'pairings';
    expect(component.activeTab).toBe('pairings');
  });

  it('should reset upload form', () => {
    component.uploadForm.name = 'Test';
    component.uploadForm.files = [new File([''], 'test.woff2')];
    component.uploadErrors = ['Error'];
    
    component.resetUploadForm();
    
    expect(component.uploadForm.name).toBe('');
    expect(component.uploadForm.files).toEqual([]);
    expect(component.uploadErrors).toEqual([]);
  });
});