/**
 * Local SEO Content Generation Service
 * Generates ranking-boost distribution content (blog article + per-platform
 * trims) for one local_seo_combinations row. This is a deliberately
 * separate content strategy from services/socialMedia/contentGenerationService.js
 * (which tailors TravelSmarter's own travel-hacks base posts for its social
 * accounts) — Local SEO content always embeds the combination's own YouTube
 * video and calls-to-action with its own Twilio phone number, never a
 * travelsmarterapp.com link or travel-hacks topic.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { extractText } = require('./anthropicUtils');

const client = new Anthropic();
const MODEL = 'claude-sonnet-5';

// @desc Responsive 16:9 YouTube iframe embed, safe to drop into WordPress/
// Blogger/Google Sites HTML bodies.
function buildEmbedHtml(youtubeVideoId) {
  if (!youtubeVideoId) return '';
  return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:24px 0;">
  <iframe src="https://www.youtube.com/embed/${youtubeVideoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allowfullscreen></iframe>
</div>`;
}

// @desc The one CTA every Local SEO piece of content shares — the
// combination's own lead-gen phone number, never a link back to
// travelsmarterapp.com.
function buildPhoneCta(phone) {
  if (!phone) return '';
  return `<p><strong>Ligue agora e peça um orçamento: <a href="tel:${phone}">${phone}</a></strong></p>`;
}

async function generateBaseArticle({ city, niche, keyword_phrase, target_keywords }) {
  const keywordCluster = target_keywords && target_keywords.length > 0 ? target_keywords : [keyword_phrase];

  const prompt = `You are an SEO copywriter writing a local-service blog article in Brazilian Portuguese to support a local-service YouTube video's search ranking.

City: ${city}
Trade/niche: ${niche}
Target keyword cluster (weave these in naturally across a few sections, don't force every one): ${keywordCluster.map((k) => `"${k}"`).join(', ')}

Write a complete article (600-900 words) that:
- Opens with the real, specific problem a resident of ${city} faces when they need a ${niche}
- Has 3-5 H2 sections covering: why hiring a qualified professional matters, red flags to avoid, what fair pricing looks like, what to expect during the service
- Naturally works in the target keyword cluster phrases across those sections
- Mentions that a video walkthrough is embedded further down in the article (e.g. "Assista ao vídeo abaixo para ver na prática") — do not describe or invent specific video content, since you haven't seen it
- Closes with a short paragraph encouraging the reader to get in touch for a quote

Format as clean HTML using only: <h2>, <p>, <ul>, <li>, <strong>, <em>
Do NOT include <html>/<head>/<body> wrapper tags, inline CSS, a phone number, or any call-to-action block — those are added separately. Do not invent a business name.
Only output the HTML content, nothing else.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });

  return extractText(message);
}

// @desc Falls back to a plain sentence if generation fails — Pinterest
// content shouldn't block the rest of a distribution run.
async function generatePinterestDescription({ city, niche, keyword_phrase }) {
  try {
    const prompt = `Write a Pinterest pin description in Brazilian Portuguese (max 300 characters) for a pin promoting a blog article about how to choose a good ${niche} in ${city}.

Requirements:
- 2-3 sentences, practical and benefit-focused, conversational (not corporate)
- Naturally reference "${keyword_phrase}" if it fits
- Output only the description text, no hashtags`;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    return extractText(message);
  } catch (error) {
    console.error(`❌ Local SEO Pinterest description generation failed for ${city}/${niche}:`, error.message);
    return null;
  }
}

/**
 * Builds the full set of distribution content for one combination: a base
 * article (shared, as-is, by WordPress/Blogger/Google Sites — all HTML
 * blog platforms) plus a short Pinterest description. Throws if the base
 * article itself fails to generate (callers should treat the whole
 * distribution attempt as failed in that case); the Pinterest description
 * degrades to a plain fallback sentence instead of failing the whole call.
 */
async function generateDistributionContent(combination) {
  const { city, niche, keyword_phrase, target_keywords, youtube_video_id, youtube_video_url, twilio_phone_number } = combination;

  const [baseArticle, pinterestDescription] = await Promise.all([
    generateBaseArticle({ city, niche, keyword_phrase, target_keywords }),
    generatePinterestDescription({ city, niche, keyword_phrase }),
  ]);

  const embedHtml = buildEmbedHtml(youtube_video_id);
  const phoneCta = buildPhoneCta(twilio_phone_number);
  const fullArticleHtml = [baseArticle, embedHtml, phoneCta].filter(Boolean).join('\n\n');
  const title = `${niche} em ${city}: como escolher o profissional certo`;

  return {
    title,
    wordpress: { title, body: fullArticleHtml },
    blogger: { title, body: fullArticleHtml },
    google_sites: { title, body: fullArticleHtml },
    pinterest: {
      title,
      description:
        pinterestDescription ||
        `${niche} em ${city}: veja como escolher com confiança.${twilio_phone_number ? ` Ligue: ${twilio_phone_number}` : ''}`,
      link: youtube_video_url || null,
    },
  };
}

module.exports = { generateDistributionContent, buildEmbedHtml, buildPhoneCta };
