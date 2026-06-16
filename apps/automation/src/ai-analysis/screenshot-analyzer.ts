export interface ScreenshotAnalysis {
  hasError: boolean;
  errorRegions: ErrorRegion[];
  uiElements: UIElement[];
  textContent: string[];
  domSnapshot: DOMSnapshot;
  visualScore: number;
}

export interface ErrorRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'error_overlay' | 'modal' | 'toast' | 'broken_image' | 'blank_area';
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface UIElement {
  tag: string;
  text: string;
  visible: boolean;
  position: { x: number; y: number };
}

export interface DOMSnapshot {
  hasIframe: boolean;
  formCount: number;
  buttonCount: number;
  inputCount: number;
  imageCount: number;
  linkCount: number;
}

export class ScreenshotAnalyzer {
  async analyze(screenshot: string): Promise<ScreenshotAnalysis> {
    const textContent = this.extractTextPatterns(screenshot);
    const errorRegions = this.detectErrorRegions(textContent);
    const uiElements = this.estimateUIElements(textContent);
    const domSnapshot = this.estimateDOMStructure(textContent);
    const visualScore = this.calculateVisualScore(errorRegions, uiElements);

    return { hasError: errorRegions.length > 0, errorRegions, uiElements, textContent, domSnapshot, visualScore };
  }

  private extractTextPatterns(screenshot: string): string[] {
    const patterns = [/error/i, /failed/i, /warning/i, /exception/i, /timeout/i, /cannot/i, /unable/i, /invalid/i, /permission/i];
    return patterns.filter(p => p.test(screenshot)).map(p => p.source);
  }

  private detectErrorRegions(textContent: string[]): ErrorRegion[] {
    const regions: ErrorRegion[] = [];
    if (textContent.some(t => /error|exception|failed/i.test(t))) {
      regions.push({ x: 0, y: 0, width: 100, height: 50, type: 'error_overlay', severity: 'high', description: 'Error overlay detected' });
    }
    if (textContent.some(t => /modal|dialog/i.test(t))) {
      regions.push({ x: 25, y: 25, width: 50, height: 30, type: 'modal', severity: 'medium', description: 'Modal dialog present' });
    }
    return regions;
  }

  private estimateUIElements(textContent: string[]): UIElement[] {
    const elements: UIElement[] = [];
    const content = textContent.join(' ').toLowerCase();
    if (/button|submit|click/i.test(content)) elements.push({ tag: 'button', text: 'action button', visible: true, position: { x: 0, y: 0 } });
    if (/input|field/i.test(content)) elements.push({ tag: 'input', text: 'text input', visible: true, position: { x: 0, y: 0 } });
    return elements;
  }

  private estimateDOMStructure(textContent: string[]): DOMSnapshot {
    const content = textContent.join(' ').toLowerCase();
    return { hasIframe: /iframe/i.test(content), formCount: /form/i.test(content) ? 1 : 0, buttonCount: /button/i.test(content) ? 1 : 0, inputCount: /input/i.test(content) ? 1 : 0, imageCount: /img/i.test(content) ? 1 : 0, linkCount: /link/i.test(content) ? 1 : 0 };
  }

  private calculateVisualScore(errorRegions: ErrorRegion[], _uiElements: UIElement[]): number {
    let score = 100;
    errorRegions.forEach(r => { score -= r.severity === 'high' ? 30 : r.severity === 'medium' ? 15 : 5; });
    return Math.max(0, Math.min(100, score));
  }

  async compare(before: string, after: string): Promise<{ similarity: number; differences: string[] }> {
    const b = await this.analyze(before);
    const a = await this.analyze(after);
    const diffs: string[] = [];
    if (b.hasError !== a.hasError) diffs.push(`Error state: ${b.hasError} → ${a.hasError}`);
    if (b.visualScore !== a.visualScore) diffs.push(`Score: ${b.visualScore} → ${a.visualScore}`);
    return { similarity: Math.max(0, 100 - diffs.length * 25), differences: diffs };
  }
}