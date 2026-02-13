/**
 * Input Sanitization & Validation Layer
 * 
 * Protects against XSS, injection, and malicious content.
 */

/**
 * HTML entities to escape
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Remove HTML tags from a string
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize a string for safe display
 */
export function sanitizeString(str: string | null | undefined): string {
  if (!str) return '';
  return escapeHtml(stripHtml(str.trim()));
}

/**
 * Sanitize a URL to prevent javascript: and data: attacks
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (trimmed.startsWith('javascript:') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('vbscript:')) {
    return '';
  }
  
  // Ensure URL starts with valid protocol
  if (!trimmed.startsWith('http://') && 
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('/')) {
    return '';
  }
  
  return url.trim();
}

/**
 * Validate and sanitize an email address
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return '';
  }
  
  return trimmed;
}

/**
 * Forbidden phrases that should never appear in generated content
 */
const FORBIDDEN_PHRASES = [
  // Misleading claims
  'guaranteed results',
  'get rich quick',
  '100% guaranteed',
  'risk-free',
  'no risk',
  
  // Illegal/harmful
  'illegal',
  'hack',
  'exploit',
  'bypass security',
  
  // Spam indicators
  'act now',
  'limited time only',
  'click here immediately',
  'you won',
  'congratulations you',
  
  // Medical/legal claims without qualification
  'cure',
  'treat disease',
  'medical advice',
  'legal advice',
  
  // Competitor disparagement
  'competitor sucks',
  'worst company',
];

/**
 * Check if content contains forbidden phrases
 */
export function containsForbiddenPhrases(content: string): string[] {
  const lowerContent = content.toLowerCase();
  return FORBIDDEN_PHRASES.filter(phrase => lowerContent.includes(phrase));
}

/**
 * Sanitize content for AI generation prompts
 */
export function sanitizePromptInput(input: string): string {
  // Remove potential prompt injection attempts
  let sanitized = input
    .replace(/ignore previous instructions/gi, '')
    .replace(/disregard all prior/gi, '')
    .replace(/forget everything/gi, '')
    .replace(/new instructions:/gi, '')
    .replace(/system:/gi, '')
    .replace(/assistant:/gi, '')
    .replace(/user:/gi, '');
  
  // Limit length to prevent token abuse
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized.trim();
}

/**
 * Validate JSON input is safe
 */
export function sanitizeJsonInput(input: unknown): unknown {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeJsonInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize keys too
      const safeKey = sanitizeString(key);
      sanitized[safeKey] = sanitizeJsonInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Content safety filter for generated content
 */
export interface ContentSafetyResult {
  safe: boolean;
  violations: string[];
  sanitizedContent?: string;
}

export function checkContentSafety(content: string): ContentSafetyResult {
  const violations: string[] = [];
  
  // Check for forbidden phrases
  const forbidden = containsForbiddenPhrases(content);
  if (forbidden.length > 0) {
    violations.push(...forbidden.map(p => `Forbidden phrase: "${p}"`));
  }
  
  // Check for excessive caps (shouting)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.5 && content.length > 20) {
    violations.push('Excessive capitalization detected');
  }
  
  // Check for excessive punctuation
  const excessivePunctuation = /[!?]{3,}/.test(content);
  if (excessivePunctuation) {
    violations.push('Excessive punctuation detected');
  }
  
  return {
    safe: violations.length === 0,
    violations,
    sanitizedContent: violations.length === 0 ? content : undefined,
  };
}

/**
 * Middleware-style sanitization for request bodies
 */
export function sanitizeRequestBody<T extends Record<string, unknown>>(body: T): T {
  const sanitized = {} as T;
  
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      // Don't sanitize password fields
      if (key.toLowerCase().includes('password')) {
        sanitized[key as keyof T] = value as T[keyof T];
      } else {
        sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
      }
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(v => 
        typeof v === 'string' ? sanitizeString(v) : v
      ) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }
  
  return sanitized;
}
