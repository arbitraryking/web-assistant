// Content highlighting and scrolling functionality
import { HighlightInstruction } from '../shared/types/messages';

class ContentHighlighter {
  private overlays: HTMLElement[] = [];
  private styleElement: HTMLStyleElement | null = null;

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
  async highlight(instructions: HighlightInstruction[]): Promise<void> {
    console.log('Highlighting content:', instructions);

    // Clear existing highlights
    this.clearHighlights();

    for (const instruction of instructions) {
      try {
        // Find element(s) to highlight
        const elements = this.findElements(instruction);

        for (const element of elements) {
          // Create overlay
          const overlay = this.createOverlay(element, instruction);
          this.overlays.push(overlay);

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
   * Find element by text content
   */
  private findByText(text: string): Element | null {
    const normalizedText = text.trim().toLowerCase();

    // Create a TreeWalker to iterate through text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      const content = node.textContent?.trim().toLowerCase() || '';

      if (content.includes(normalizedText)) {
        // Return the parent element
        return node.parentElement;
      }
    }

    return null;
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

// Export singleton instance
export const highlighter = new ContentHighlighter();
