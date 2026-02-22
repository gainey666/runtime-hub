/**
 * Auto-Clicker Module Type Declarations
 * Fixing the CommonJS/TypeScript mess
 */

declare module './screen-capture/windows-capture' {
  class WindowsScreenCapture {
    constructor();
    capture(config: any): Promise<any>;
    getScreenSize(): Promise<any>;
    validateArea(config: any): boolean;
  }
  export = WindowsScreenCapture;
}

declare module './screen-capture/ocr-engine' {
  class OCREngine {
    constructor();
    recognize(imageData: Buffer, config: any): Promise<any>;
    setLanguage(language: string[]): void;
    getSupportedLanguages(): string[];
  }
  export = OCREngine;
}

declare module './click-automation/mouse-control' {
  class MouseControl {
    constructor();
    move(x: number, y: number): Promise<void>;
    click(config: any): Promise<any>;
    getPosition(): Promise<any>;
    setCursor(cursor: any): void;
    testClick(): Promise<boolean>;
  }
  export = MouseControl;
}
