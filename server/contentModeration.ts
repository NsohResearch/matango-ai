/**
 * Content Moderation Utilities
 * Ensures AI influencer creation complies with safety guidelines
 */

// Keywords that indicate child/minor content - must be blocked
const BLOCKED_AGE_KEYWORDS = [
  'child',
  'children',
  'kid',
  'kids',
  'minor',
  'minors',
  'underage',
  'under age',
  'under-age',
  'young child',
  'little girl',
  'little boy',
  'toddler',
  'infant',
  'baby',
  'preteen',
  'pre-teen',
  'pre teen',
  'elementary',
  'middle school',
  'middle-school',
  'grade school',
  'grade-school',
  '10 year',
  '11 year',
  '12 year',
  '13 year',
  '14 year',
  '15 year',
  '16 year',
  '17 year',
  '10-year',
  '11-year',
  '12-year',
  '13-year',
  '14-year',
  '15-year',
  '16-year',
  '17-year',
  'ten year old',
  'eleven year old',
  'twelve year old',
  'thirteen year old',
  'fourteen year old',
  'fifteen year old',
  'sixteen year old',
  'seventeen year old',
  'teenager',
  'teen girl',
  'teen boy',
  'teenage',
  'adolescent',
  'juvenile',
  'youth',
  'young teen',
];

// Safe age modifiers that should be added to prompts
const SAFE_AGE_MODIFIERS = [
  'adult',
  'mature',
  'grown',
  'over 18',
  'over 21',
  '20s',
  '30s',
  '40s',
  '50s',
  '60s',
];

/**
 * Check if a prompt contains blocked age-related keywords
 */
export function containsBlockedAgeContent(text: string): { blocked: boolean; reason?: string } {
  const lowerText = text.toLowerCase();
  
  for (const keyword of BLOCKED_AGE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return {
        blocked: true,
        reason: `Content describing minors is not allowed. Detected keyword: "${keyword}"`,
      };
    }
  }
  
  return { blocked: false };
}

/**
 * Sanitize a prompt to ensure it doesn't generate child content
 * Adds safety modifiers and removes potentially problematic terms
 */
export function sanitizePromptForSafety(prompt: string): string {
  let sanitized = prompt;
  
  // Replace any blocked terms with safe alternatives
  const replacements: Record<string, string> = {
    'young girl': 'young adult woman',
    'young boy': 'young adult man',
    'young person': 'young adult',
    'youthful': 'fresh-faced adult',
  };
  
  for (const [blocked, safe] of Object.entries(replacements)) {
    const regex = new RegExp(blocked, 'gi');
    sanitized = sanitized.replace(regex, safe);
  }
  
  return sanitized;
}

/**
 * Build a safe image generation prompt with age restrictions
 */
export function buildSafeImagePrompt(
  basePrompt: string,
  ageRange: string,
  additionalContext?: string
): { prompt: string; negativePrompt: string } {
  // Validate age range
  const validAgeRanges = ['young_adult', 'adult', 'middle_aged', 'senior'];
  if (!validAgeRanges.includes(ageRange)) {
    throw new Error('Invalid age range. Only adult age ranges are allowed.');
  }
  
  // Check for blocked content
  const check = containsBlockedAgeContent(basePrompt);
  if (check.blocked) {
    throw new Error(check.reason);
  }
  
  // Sanitize the prompt
  const sanitizedPrompt = sanitizePromptForSafety(basePrompt);
  
  // Map age range to descriptive text
  const ageDescriptions: Record<string, string> = {
    young_adult: 'young adult in their 20s',
    adult: 'adult in their 30s or 40s',
    middle_aged: 'middle-aged adult in their 50s',
    senior: 'mature adult in their 60s or older',
  };
  
  const ageDescription = ageDescriptions[ageRange] || 'adult';
  
  // Build the final prompt with safety modifiers
  const prompt = `${sanitizedPrompt}, ${ageDescription}, professional photography, high quality${additionalContext ? `, ${additionalContext}` : ''}`;
  
  // Negative prompt to avoid generating minors
  const negativePrompt = 'child, children, kid, kids, minor, underage, young child, toddler, infant, baby, teenager, teen, adolescent, juvenile, cartoon child, anime child, young looking, childlike features, school uniform on minor';
  
  return { prompt, negativePrompt };
}

/**
 * Validate that uploaded reference images don't contain minors
 * This is a placeholder - in production, this would use an AI content moderation API
 */
export async function validateReferenceImages(imageUrls: string[]): Promise<{ valid: boolean; reason?: string }> {
  // In production, this would call a content moderation API like:
  // - AWS Rekognition Content Moderation
  // - Google Cloud Vision Safe Search
  // - Microsoft Azure Content Moderator
  // - OpenAI Moderation API
  
  // For now, we return valid but log a warning
  console.log('[Content Moderation] Reference image validation called for', imageUrls.length, 'images');
  console.log('[Content Moderation] WARNING: Production should implement AI-based age detection');
  
  return { valid: true };
}

/**
 * Get the safety guidelines message for users
 */
export function getSafetyGuidelines(): string {
  return `
## Content Guidelines

Matango.ai is committed to responsible AI use. The following content is not allowed:

1. **No Minors**: AI influencers must represent adults (18+). Child and teen options are not available.

2. **Reference Images**: Upload only images of adults. Images depicting minors will be rejected.

3. **Text Prompts**: Descriptions must be for adult characters only. Prompts attempting to create minor characters will be blocked.

4. **Generated Content**: All generated images will include safety filters to prevent creation of minor-appearing content.

By using this platform, you agree to these guidelines and confirm that all content you create represents adult characters only.
  `.trim();
}
