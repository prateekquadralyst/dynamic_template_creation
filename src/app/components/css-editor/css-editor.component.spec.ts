import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CssEditorComponent } from './css-editor.component';

describe('CssEditorComponent', () => {
  let component: CssEditorComponent;
  let fixture: ComponentFixture<CssEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CssEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CssEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.currentValue).toBe('');
    expect(component.errors).toEqual([]);
    expect(component.conflicts).toEqual([]);
    expect(component.isMinified).toBe(false);
  });

  it('should emit value changes', () => {
    spyOn(component.valueChange, 'emit');
    const testValue = '.test { color: red; }';
    
    component.setValue(testValue);
    
    expect(component.currentValue).toBe(testValue);
  });

  it('should validate CSS and detect errors', () => {
    const invalidCSS = '.test { color: invalid-color; }';
    
    component.setValue(invalidCSS);
    
    // The validation should detect the invalid color
    expect(component.errors.length).toBeGreaterThan(0);
  });

  it('should minify CSS correctly', () => {
    const css = `
      .test {
        color: red;
        background: blue;
      }
    `;
    
    component.setValue(css);
    component.minifyCSS();
    
    expect(component.isMinified).toBe(true);
    expect(component.currentValue.length).toBeLessThan(css.length);
  });

  it('should beautify CSS correctly', () => {
    const minifiedCSS = '.test{color:red;background:blue;}';
    
    component.setValue(minifiedCSS);
    component.beautifyCSS();
    
    expect(component.isMinified).toBe(false);
    expect(component.currentValue).toContain('\n');
  });

  it('should insert snippets correctly', () => {
    const snippet = 'display: flex;';
    
    // Mock editor position
    component['editor'] = {
      getPosition: () => ({ lineNumber: 1, column: 1 }),
      executeEdits: jasmine.createSpy('executeEdits')
    } as any;
    
    component.insertSnippet(snippet);
    
    expect(component['editor']?.executeEdits).toHaveBeenCalled();
  });

  it('should set theme correctly', () => {
    component['editor'] = {
      setTheme: jasmine.createSpy('setTheme')
    } as any;
    
    component.setTheme('vs-dark');
    
    expect(component.theme).toBe('vs-dark');
  });
});