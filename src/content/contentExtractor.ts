// Content extraction using Readability.js
import { Readability } from '@mozilla/readability';
import { PageContent } from '../shared/types/messages';

/**
 * Extract page content using Readability.js
 */
export function extractPageContent(): PageContent | null {
  try {
    // Clone document for Readability (it modifies the DOM)
    const documentClone = document.cloneNode(true) as Document;

    // Create Readability instance
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article) {
      console.warn('[Content Extractor] Readability could not parse the page, using fallback');
      return fallbackExtraction();
    }

    // Extract content
    const content: PageContent = {
      url: window.location.href,
      title: article.title || document.title,
      content: article.textContent || '',
      metadata: {
        description: getMetaDescription(),
        author: article.byline || undefined,
        publishDate: getPublishDate()
      }
    };

    console.log('[Content Extractor] Extracted content length:', content.content.length);
    console.log('[Content Extractor] Title:', content.title);
    console.log('[Content Extractor] First 200 chars:', content.content.substring(0, 200));

    return content;
  } catch (error) {
    console.error('[Content Extractor] Error extracting page content:', error);
    return fallbackExtraction();
  }
}

/**
 * Fallback extraction method when Readability fails
 */
function fallbackExtraction(): PageContent | null {
  try {
    // Try to get main content from common semantic tags
    const mainContent =
      document.querySelector('main')?.textContent ||
      document.querySelector('article')?.textContent ||
      document.querySelector('[role="main"]')?.textContent ||
      document.querySelector('.content')?.textContent ||
      document.querySelector('#content')?.textContent ||
      document.body.textContent ||
      '';

    return {
      url: window.location.href,
      title: document.title,
      content: mainContent.trim(),
      metadata: {
        description: getMetaDescription()
      }
    };
  } catch (error) {
    console.error('Fallback extraction failed:', error);
    return null;
  }
}

/**
 * Get meta description from page
 */
function getMetaDescription(): string | undefined {
  const metaDesc =
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content');

  return metaDesc || undefined;
}

/**
 * Get publish date from page
 */
function getPublishDate(): string | undefined {
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="publish-date"]',
    'meta[name="date"]',
    'time[datetime]'
  ];

  for (const selector of dateSelectors) {
    const element = document.querySelector(selector);
    const date =
      element?.getAttribute('content') ||
      element?.getAttribute('datetime');

    if (date) return date;
  }

  return undefined;
}

/**
 * Extract headings structure from page
 */
export function extractHeadingsStructure(): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];

  const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headingElements.forEach((heading) => {
    const level = parseInt(heading.tagName.substring(1));
    const text = heading.textContent?.trim() || '';

    if (text) {
      headings.push({ level, text });
    }
  });

  return headings;
}
