/**
 * Content Generation Service
 * Uses Claude to rewrite one base post into a tailored version per social
 * platform, respecting each platform's character limit, hashtag support,
 * and tone (see socialMedia/adapters/*.js getConfig() for where these
 * constraints come from).
 */

const Anthropic = require('@anthropic-ai/sdk');
const { extractText } = require('../anthropicUtils');

const client = new Anthropic();

const PLATFORM_SPECS = {
  twitter: { maxCharacters: 280, hashtags: true, tone: 'punchy and concise, hook in the first line' },
  reddit: { maxCharacters: 40000, hashtags: false, tone: 'conversational, community-appropriate, no hard sell or marketing language' },
  pinterest: { maxCharacters: 500, hashtags: true, tone: 'inspirational, descriptive, benefit-focused' },
  instagram: { maxCharacters: 2200, hashtags: true, tone: 'casual, visual, engaging, line breaks for readability' },
  linkedin: { maxCharacters: 1300, hashtags: true, tone: 'professional, insight-led' },
};

function buildPrompt(basePost, platforms) {
  const specLines = platforms
    .map((p) => {
      const s = PLATFORM_SPECS[p];
      return `- ${p}: max ${s.maxCharacters} characters, ${s.hashtags ? 'hashtags welcome' : 'do not use hashtags'}, tone: ${s.tone}`;
    })
    .join('\n');

  return `You are a social media copywriter for TravelSmarter, a travel-hacks brand.

BASE CONTENT:
Title: ${basePost.title || '(none)'}
Content: ${basePost.content}

Rewrite this ONE piece of content into a tailored version for EACH of these platforms:
${specLines}

Stay factually consistent with the base content — don't invent new claims, numbers, or details that aren't in it.

Return ONLY a JSON object (no markdown, no explanation) mapping each platform name to its rewritten text, e.g.:
{"twitter": "...", "reddit": "..."}`;
}

/**
 * Generates a platform-specific version of basePost for each entry in
 * platforms. Falls back to the original content, unchanged, for any
 * platform the model didn't return or if generation fails entirely —
 * callers should never fail post creation just because generation did.
 */
async function generatePlatformVersions(basePost, platforms) {
  const validPlatforms = platforms.filter((p) => PLATFORM_SPECS[p]);
  const fallback = {};
  validPlatforms.forEach((p) => {
    fallback[p] = basePost.content;
  });

  if (validPlatforms.length === 0) return {};

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: buildPrompt(basePost, validPlatforms) }],
    });

    const responseText = extractText(message);
    const parsed = JSON.parse(responseText);

    // Merge over the fallback so any platform the model skipped still gets
    // the original content instead of ending up undefined.
    return { ...fallback, ...parsed };
  } catch (error) {
    console.error('❌ Platform content generation failed, falling back to original content:', error.message);
    return fallback;
  }
}

module.exports = { generatePlatformVersions, PLATFORM_SPECS };
