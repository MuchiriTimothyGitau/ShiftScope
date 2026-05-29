// Sanitizes scraped HTML to prevent XSS when rendered in the dashboard.
// Strips script tags, event handlers, dangerous attributes.
export function sanitizeScrapedHtml(raw: string | null | undefined): string {
  if (!raw) return '';

  let clean = raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*?on\w+\s*=\s*["'][^"']*["'][^>]*>/gi, '<$1>')
    .replace(/<[^>]*?on\w+\s*=\s*[^\s>]+[^>]*>/gi, '<$1>')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<svg[\s\S]*?onload[\s\S]*?<\/svg>/gi, '')
    .replace(/<link[\s\S]*?href\s*=\s*["']javascript/gi, '<link disabled');

  return clean;
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['https:', 'http:', 'git+https:'];
    if (!allowedProtocols.includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
