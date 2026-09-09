declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: { orientation?: string; unit?: string; format?: string | number[] });
    internal: { pageSize: { getHeight(): number; getWidth(): number } };
    addPage(): void;
    setFont(family: string, style: string): void;
    setFontSize(size: number): void;
    setTextColor(r: number, g: number, b: number): void;
    setFillColor(r: number, g: number, b: number): void;
    setDrawColor(r: number, g: number, b: number): void;
    rect(x: number, y: number, w: number, h: number, style?: string): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    text(text: string, x: number, y: number): void;
    save(filename: string): void;
  }
}
