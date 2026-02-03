// Content highlighting and scrolling functionality
import { HighlightInstruction } from '../shared/types/messages';

class ContentHighlighter {
  private overlays: HTMLElement[] = [];
  private styleElement: HTMLStyleElement | null = null;
  private highlightMap: Map<string, Element> = new Map(); // Map highlight ID to element

  constructor() {
    this.injectStyles();
  }

  /**
   * Inject CSS styles for highlights
   */
  private injectStyles(): void {
    if (this.styleElement) return;

    this.styleElement = document.createElement('style');
    this.styleElement.textContent = `
      .llm-assistant-highlight {
        position: absolute;
        pointer-events: none;
        z-index: 999999;
        transition: opacity 0.3s ease;
        box-sizing: border-box;
      }

      .llm-assistant-highlight.fade-in {
        animation: llm-highlight-fade-in 0.5s ease-in-out;
      }

      .llm-assistant-highlight.pulse {
        animation: llm-highlight-pulse 2s ease-in-out infinite;
      }

      @keyframes llm-highlight-fade-in {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @keyframes llm-highlight-pulse {
        0%, 100% {
          opacity: 0.4;
        }
        50% {
          opacity: 0.8;
        }
      }
    `;

    document.head.appendChild(this.styleElement);
  }

  /**
   * Highlight content based on instructions
   */
  async highlight(instructions: HighlightInstruction[]): Promise<HighlightResult[]> {
    console.log('Highlighting content:', instructions);
    const results: HighlightResult[] = [];

    // Clear existing highlights
    this.clearHighlights();

    for (const instruction of instructions) {
      try {
        // Find element(s) to highlight
        const elements = this.findElements(instruction);

        for (const element of elements) {
          // Store element reference for later scrolling
          this.highlightMap.set(instruction.id, element);

          // Create overlay
          const overlay = this.createOverlay(element, instruction);
          this.overlays.push(overlay);

          // Track result for side panel
          results.push({
            id: instruction.id,
            textSnippet: instruction.textSnippet,
            element: this.getElementDescription(element)
          });

          // Auto-scroll to first element if requested
          if (instruction.scrollTo && elements.indexOf(element) === 0) {
            await this.smoothScrollTo(element, instruction.animateScroll);
          }
        }

        // Auto-remove highlight after duration
        if (instruction.duration) {
          setTimeout(() => {
            this.clearHighlights();
          }, instruction.duration);
        }
      } catch (error) {
        console.error('Error highlighting element:', error);
      }
    }

    return results;
  }

  /**
   * Scroll to a specific highlight by ID
   */
  async scrollToHighlight(highlightId: string, animate: boolean = true): Promise<boolean> {
    const element = this.highlightMap.get(highlightId);
    if (!element) {
      console.warn(`Highlight not found: ${highlightId}`);
      return false;
    }

    await this.smoothScrollTo(element, animate);
    return true;
  }

  /**
   * Get a human-readable description of an element
   */
  private getElementDescription(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const text = element.textContent?.trim().substring(0, 50) || '';
    return `${tag}: ${text}${text.length >= 50 ? '...' : ''}`;
  }

  /**
   * Find elements on the page to highlight
   */
  private findElements(instruction: HighlightInstruction): Element[] {
    const elements: Element[] = [];

    // Try CSS selector first
    if (instruction.selector) {
      const found = document.querySelectorAll(instruction.selector);
      elements.push(...Array.from(found));
    }

    // Try XPath
    if (instruction.xpath && elements.length === 0) {
      const result = document.evaluate(
        instruction.xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );

      for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        if (node instanceof Element) {
          elements.push(node);
        }
      }
    }

    // Fallback: Find by text snippet
    if (instruction.textSnippet && elements.length === 0) {
      const found = this.findByText(instruction.textSnippet);
      if (found) {
        elements.push(found);
      }
    }

    return elements;
  }

  /**
   * Find element by text content with fuzzy matching
   */
  private findByText(text: string): Element | null {
    const normalizedText = text.trim().toLowerCase();
    const searchTokens = this.tokenize(normalizedText);

    // Try exact match first
    const exactMatch = this.findByTextExact(normalizedText);
    if (exactMatch) return exactMatch;

    // Fall back to fuzzy matching
    return this.findByTextFuzzy(searchTokens, normalizedText);
  }

  /**
   * Find element by exact text match
   */
  private findByTextExact(normalizedText: string): Element | null {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      const content = node.textContent?.trim().toLowerCase() || '';

      if (content.includes(normalizedText)) {
        return node.parentElement;
      }
    }

    return null;
  }

  /**
   * Find element by fuzzy text matching using Jaccard similarity
   */
  private findByTextFuzzy(searchTokens: string[], originalText: string): Element | null {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let bestMatch: { element: Element | null; score: number } = {
      element: null,
      score: 0
    };

    const MIN_SCORE = 0.3; // Minimum similarity score to accept a match
    let node;

    while ((node = walker.nextNode())) {
      const content = node.textContent?.trim().toLowerCase() || '';
      if (content.length < 10) continue; // Skip very short text nodes

      const contentTokens = this.tokenize(content);
      const score = this.jaccardSimilarity(searchTokens, contentTokens);

      if (score > bestMatch.score && score >= MIN_SCORE) {
        bestMatch = {
          element: node.parentElement,
          score
        };
      }
    }

    console.log(`Fuzzy match for "${originalText.substring(0, 50)}..." - score: ${bestMatch.score.toFixed(2)}`);
    return bestMatch.element;
  }

  /**
   * Tokenize text into words (removes punctuation, splits on whitespace)
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * Calculate Jaccard similarity between two token sets
   * J(A,B) = |A ∩ B| / |A ∪ B|
   */
  private jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Create highlight overlay for an element
   */
  private createOverlay(target: Element, instruction: HighlightInstruction): HTMLElement {
    const rect = target.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    const overlay = document.createElement('div');
    overlay.className = 'llm-assistant-highlight fade-in pulse';
    overlay.dataset.highlightId = instruction.id;

    // Apply styles
    overlay.style.cssText = `
      position: absolute;
      top: ${rect.top + scrollTop}px;
      left: ${rect.left + scrollLeft}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background-color: ${instruction.style.backgroundColor};
      border: ${instruction.style.border};
      pointer-events: none;
      z-index: 999999;
      border-radius: 4px;
    `;

    document.body.appendChild(overlay);

    // Update overlay position on scroll/resize
    const updatePosition = () => {
      const newRect = target.getBoundingClientRect();
      const newScrollTop = window.scrollY || document.documentElement.scrollTop;
      const newScrollLeft = window.scrollX || document.documentElement.scrollLeft;

      overlay.style.top = `${newRect.top + newScrollTop}px`;
      overlay.style.left = `${newRect.left + newScrollLeft}px`;
      overlay.style.width = `${newRect.width}px`;
      overlay.style.height = `${newRect.height}px`;
    };

    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    // Store cleanup function
    (overlay as any)._cleanup = () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };

    return overlay;
  }

  /**
   * Smooth scroll to an element
   */
  private async smoothScrollTo(element: Element, animate: boolean): Promise<void> {
    element.scrollIntoView({
      behavior: animate ? 'smooth' : 'auto',
      block: 'center',
      inline: 'nearest'
    });

    // Wait for scroll to complete
    if (animate) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    console.log('Clearing highlights');

    this.overlays.forEach((overlay) => {
      // Call cleanup function if it exists
      if ((overlay as any)._cleanup) {
        (overlay as any)._cleanup();
      }

      overlay.remove();
    });

    this.overlays = [];
    this.highlightMap.clear();
  }

  /**
   * Remove injected styles
   */
  cleanup(): void {
    this.clearHighlights();

    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }
}

// Result interface for highlight operations
export interface HighlightResult {
  id: string;
  textSnippet: string;
  element: string; // Human-readable description
}

// Export singleton instance
export const highlighter = new ContentHighlighter();
