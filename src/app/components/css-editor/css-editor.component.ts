import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil, debounceTime } from "rxjs";
// import * as monaco from "monaco-editor";
import { parse } from "css-tree";
import {
  CSSValidationError,
  CSSConflict,
} from "../../services/css-validation.service";

@Component({
  selector: "app-css-editor",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./css-editor.component.html",
  styleUrls: ["./css-editor.component.css"],
})
export class CssEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("editorContainer", { static: true }) editorContainer!: ElementRef;

  @Input() initialValue: string = "";
  @Input() theme: "vs" | "vs-dark" | "hc-black" = "vs";
  @Input() readOnly: boolean = false;
  @Input() minimap: boolean = true;
  @Input() lineNumbers: boolean = true;
  @Input() wordWrap: "on" | "off" | "wordWrapColumn" | "bounded" = "on";

  @Output() valueChange = new EventEmitter<string>();
  @Output() validationErrors = new EventEmitter<CSSValidationError[]>();
  @Output() cssConflicts = new EventEmitter<CSSConflict[]>();
  @Output() editorReady = new EventEmitter<any>();

  private destroy$ = new Subject<void>();
  private editor: any = null;
  private validationSubject = new Subject<string>();

  // Editor state
  currentValue: string = "";
  errors: CSSValidationError[] = [];
  conflicts: CSSConflict[] = [];
  isMinified: boolean = false;

  // Editor options
  editorOptions = {
    fontSize: 14,
    tabSize: 2,
    insertSpaces: true,
    formatOnPaste: true,
    formatOnType: true,
    autoIndent: "full" as const,
    bracketPairColorization: { enabled: true },
    colorDecorators: true,
    folding: true,
    foldingHighlight: true,
    showFoldingControls: "always" as const,
    matchBrackets: "always" as const,
    renderWhitespace: "selection" as const,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: "blink" as const,
    cursorSmoothCaretAnimation: "on" as const,
    links: true,
    mouseWheelZoom: true,
    multiCursorModifier: "ctrlCmd" as const,
    occurrencesHighlight: "singleFile" as const,
    renderLineHighlight: "line" as const,
    selectionHighlight: true,
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showColors: true,
      showFiles: true,
      showReferences: true,
      showFolders: true,
      showTypeParameters: true,
      showIssues: true,
      showUsers: true,
      showValues: true,
      showMethods: true,
      showFunctions: true,
      showConstructors: true,
      showFields: true,
      showVariables: true,
      showClasses: true,
      showStructs: true,
      showInterfaces: true,
      showModules: true,
      showProperties: true,
      showEvents: true,
      showOperators: true,
      showUnits: true,
    },
  };

  constructor() {}

  ngOnInit(): void {
    this.currentValue = this.initialValue;

    // Set up validation debouncing
    this.validationSubject
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe((value) => {
        this.validateCSS(value);
        this.detectConflicts(value);
      });
  }

  ngAfterViewInit(): void {
    this.initializeEditor();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.editor) {
      this.editor.dispose();
    }
  }

  /**
   * Initialize fallback CSS editor (textarea-based)
   */
  private async initializeEditor(): Promise<void> {
    try {
      // Create a simple textarea-based editor as fallback
      const textarea = document.createElement("textarea");
      textarea.value = this.currentValue;
      textarea.className = "css-textarea-editor";
      textarea.style.cssText = `
        width: 100%;
        height: 400px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.4;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        resize: vertical;
        background: ${this.theme === "vs-dark" ? "#1e1e1e" : "#ffffff"};
        color: ${this.theme === "vs-dark" ? "#d4d4d4" : "#000000"};
      `;

      if (this.readOnly) {
        textarea.readOnly = true;
      }

      // Clear container and add textarea
      this.editorContainer.nativeElement.innerHTML = "";
      this.editorContainer.nativeElement.appendChild(textarea);

      // Set up event listeners
      textarea.addEventListener("input", (event) => {
        const value = (event.target as HTMLTextAreaElement).value;
        this.currentValue = value;
        this.valueChange.emit(value);
        this.validationSubject.next(value);
      });

      // Store reference to textarea as editor
      this.editor = {
        getValue: () => textarea.value,
        setValue: (value: string) => {
          textarea.value = value;
          this.currentValue = value;
        },
        focus: () => textarea.focus(),
        dispose: () => textarea.remove(),
        getPosition: () => ({ lineNumber: 1, column: 1 }),
        executeEdits: () => {},
        getAction: () => ({ run: () => {} }),
        layout: () => {},
        getModel: () => null,
      };

      // Emit editor ready event
      this.editorReady.emit(this.editor);

      // Initial validation
      if (this.currentValue) {
        this.validationSubject.next(this.currentValue);
      }
    } catch (error) {
      console.error("Failed to initialize CSS Editor:", error);
    }
  }

  /**
   * Add custom CSS snippets (disabled for fallback editor)
   */
  private addCustomSnippets(): void {
    // Monaco Editor snippets are disabled in fallback mode
    // This functionality will be restored when Monaco Editor is properly configured
  }

  /**
   * Validate CSS using css-tree parser
   */
  private validateCSS(css: string): void {
    const errors: CSSValidationError[] = [];

    if (!css.trim()) {
      this.errors = errors;
      this.validationErrors.emit(errors);
      return;
    }

    try {
      // Parse CSS
      const ast = parse(css, {
        onParseError: (error: any) => {
          errors.push({
            line: error.line || 1,
            column: error.column || 1,
            message: error.message,
            severity: "error",
            type: "syntax",
          });
        },
      });

      // Additional custom validations
      this.performCustomValidations(css, errors);
    } catch (error) {
      if (error instanceof Error) {
        errors.push({
          line: 1,
          column: 1,
          message: `Parse error: ${error.message}`,
          severity: "error",
          type: "syntax",
        });
      }
    }

    this.errors = errors;
    this.validationErrors.emit(errors);
    this.updateEditorMarkers(errors);
  }

  /**
   * Perform custom CSS validations
   */
  private performCustomValidations(
    css: string,
    errors: CSSValidationError[]
  ): void {
    const lines = css.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Check for missing semicolons
      if (
        trimmedLine.includes(":") &&
        !trimmedLine.endsWith(";") &&
        !trimmedLine.endsWith("{") &&
        !trimmedLine.endsWith("}") &&
        trimmedLine !== ""
      ) {
        errors.push({
          line: lineNumber,
          column: line.length,
          message: "Missing semicolon",
          severity: "warning",
          type: "syntax",
        });
      }

      // Check for invalid color values
      const colorMatch = trimmedLine.match(/color\s*:\s*([^;]+)/);
      if (colorMatch && !this.isValidColor(colorMatch[1].trim())) {
        errors.push({
          line: lineNumber,
          column: line.indexOf(colorMatch[1]),
          message: "Invalid color value",
          severity: "error",
          type: "value",
        });
      }

      // Check for deprecated properties
      const deprecatedProperties = ["filter", "-webkit-filter", "-moz-filter"];
      deprecatedProperties.forEach((prop) => {
        if (trimmedLine.includes(`${prop}:`)) {
          errors.push({
            line: lineNumber,
            column: line.indexOf(prop),
            message: `Property '${prop}' is deprecated`,
            severity: "warning",
            type: "property",
          });
        }
      });
    });
  }

  /**
   * Check if a color value is valid
   */
  private isValidColor(color: string): boolean {
    const colorRegex =
      /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)|hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)|[a-zA-Z]+)$/;
    return colorRegex.test(color);
  }

  /**
   * Detect CSS conflicts
   */
  private detectConflicts(css: string): void {
    const conflicts: CSSConflict[] = [];
    const propertyMap = new Map<
      string,
      Map<
        string,
        { values: string[]; locations: { line: number; column: number }[] }
      >
    >();

    try {
      const ast = parse(css);

      // Walk through AST to find duplicate properties
      this.walkAST(ast, (node: any, line: number, column: number) => {
        if (node.type === "Rule") {
          const selector = this.getSelector(node);

          if (node.block && node.block.children) {
            node.block.children.forEach((declaration: any) => {
              if (declaration.type === "Declaration") {
                const property = declaration.property;
                const value = this.getValueFromDeclaration(declaration);

                if (!propertyMap.has(selector)) {
                  propertyMap.set(selector, new Map());
                }

                const selectorMap = propertyMap.get(selector)!;
                if (!selectorMap.has(property)) {
                  selectorMap.set(property, { values: [], locations: [] });
                }

                const propertyData = selectorMap.get(property)!;
                propertyData.values.push(value);
                propertyData.locations.push({ line, column });

                // If we have multiple different values for the same property, it's a conflict
                if (
                  propertyData.values.length > 1 &&
                  new Set(propertyData.values).size > 1
                ) {
                  conflicts.push({
                    selector,
                    property,
                    values: [...new Set(propertyData.values)],
                    locations: propertyData.locations,
                    severity: this.getConflictSeverity(property, [
                      ...new Set(propertyData.values),
                    ]),
                  });
                }
              }
            });
          }
        }
      });
    } catch (error) {
      console.warn("Error detecting conflicts:", error);
    }

    this.conflicts = conflicts;
    this.cssConflicts.emit(conflicts);
  }

  /**
   * Walk through CSS AST
   */
  private walkAST(
    node: any,
    callback: (node: any, line: number, column: number) => void
  ): void {
    if (!node) return;

    const line = node.loc?.start?.line || 1;
    const column = node.loc?.start?.column || 1;

    callback(node, line, column);

    if (node.children) {
      node.children.forEach((child: any) => this.walkAST(child, callback));
    }
    if (node.block) {
      this.walkAST(node.block, callback);
    }
    if (node.prelude) {
      this.walkAST(node.prelude, callback);
    }
  }

  /**
   * Get selector string from AST node
   */
  private getSelector(node: any): string {
    if (node.prelude && node.prelude.children) {
      return node.prelude.children
        .map((child: any) => {
          if (child.type === "TypeSelector") {
            return child.name;
          } else if (child.type === "ClassSelector") {
            return "." + child.name;
          } else if (child.type === "IdSelector") {
            return "#" + child.name;
          }
          return "";
        })
        .join("");
    }
    return "unknown";
  }

  /**
   * Get value string from declaration node (internal method)
   */
  private getValueFromDeclaration(declaration: any): string {
    if (declaration.value && declaration.value.children) {
      return declaration.value.children
        .map((child: any) => {
          if (child.type === "Identifier") {
            return child.name;
          } else if (child.type === "Number") {
            return child.value;
          } else if (child.type === "Dimension") {
            return child.value + child.unit;
          } else if (child.type === "Hash") {
            return "#" + child.value;
          }
          return child.value || "";
        })
        .join(" ");
    }
    return "";
  }

  /**
   * Update editor markers for validation errors (disabled for fallback editor)
   */
  private updateEditorMarkers(errors: CSSValidationError[]): void {
    // Monaco Editor markers are disabled in fallback mode
    // This functionality will be restored when Monaco Editor is properly configured
  }

  /**
   * Format CSS code
   */
  formatCode(): void {
    if (this.editor) {
      this.editor.getAction("editor.action.formatDocument")?.run();
    }
  }

  /**
   * Minify CSS code
   */
  minifyCSS(): void {
    if (!this.editor) return;

    const value = this.editor.getValue();
    const minified = this.minifyCSS_Internal(value);
    this.editor.setValue(minified);
    this.isMinified = true;
  }

  /**
   * Internal CSS minification
   */
  private minifyCSS_Internal(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/\s*{\s*/g, "{") // Remove spaces around opening braces
      .replace(/;\s*/g, ";") // Remove spaces after semicolons
      .replace(/\s*}\s*/g, "}") // Remove spaces around closing braces
      .replace(/\s*,\s*/g, ",") // Remove spaces around commas
      .replace(/\s*:\s*/g, ":") // Remove spaces around colons
      .trim();
  }

  /**
   * Beautify CSS code
   */
  beautifyCSS(): void {
    if (!this.editor) return;

    const value = this.editor.getValue();
    const beautified = this.beautifyCSS_Internal(value);
    this.editor.setValue(beautified);
    this.isMinified = false;
  }

  /**
   * Internal CSS beautification
   */
  private beautifyCSS_Internal(css: string): string {
    return css
      .replace(/\s*{\s*/g, " {\n  ") // Add newline and indent after opening brace
      .replace(/;\s*/g, ";\n  ") // Add newline and indent after semicolon
      .replace(/\s*}\s*/g, "\n}\n\n") // Add newlines around closing brace
      .replace(/,\s*/g, ",\n") // Add newline after comma in selectors
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Remove excessive newlines
      .trim();
  }

  /**
   * Insert CSS snippet at cursor
   */
  insertSnippet(snippet: string): void {
    if (!this.editor) return;

    // For textarea fallback, just append the snippet to the current value
    const currentValue = this.editor.getValue();
    const newValue = currentValue + "\n" + snippet;
    this.editor.setValue(newValue);
  }

  /**
   * Set editor theme
   */
  setTheme(theme: "vs" | "vs-dark" | "hc-black"): void {
    if (this.editor) {
      // For textarea fallback, update the background and text colors
      const textarea =
        this.editorContainer.nativeElement.querySelector("textarea");
      if (textarea) {
        textarea.style.background = theme === "vs-dark" ? "#1e1e1e" : "#ffffff";
        textarea.style.color = theme === "vs-dark" ? "#d4d4d4" : "#000000";
      }
      this.theme = theme;
    }
  }

  /**
   * Set editor value
   */
  setValue(value: string): void {
    if (this.editor) {
      this.editor.setValue(value);
      this.currentValue = value;
    }
  }

  /**
   * Get editor value
   */
  getValue(): string {
    return this.editor ? this.editor.getValue() : this.currentValue;
  }

  /**
   * Focus editor
   */
  focus(): void {
    if (this.editor) {
      this.editor.focus();
    }
  }

  /**
   * Resize editor
   */
  resize(): void {
    if (this.editor) {
      this.editor.layout();
    }
  }

  /**
   * Get conflict severity based on property and values
   */
  private getConflictSeverity(
    property: string,
    values: string[]
  ): "high" | "medium" | "low" {
    const criticalProperties = ["display", "position", "float", "clear"];
    const importantProperties = [
      "width",
      "height",
      "margin",
      "padding",
      "color",
      "background",
    ];

    if (criticalProperties.includes(property)) {
      return "high";
    } else if (importantProperties.includes(property)) {
      return "medium";
    } else {
      return "low";
    }
  }
}
