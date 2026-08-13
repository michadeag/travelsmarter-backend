// Given every published guide for a country, pick the 3–9 strongest to
// FEATURE on the bundle page (shown with their description). Every guide is
// still included in the bundle no matter what — this only decides which ones
// get the spotlight vs. a compact "also included" chip. Uses Claude (same
// model as the YouTube comment assistant) so the pick reflects editorial
// judgment from the titles/subtitles instead of a mechanical rule, and runs
// at temperature 0 so the same guide set produces the same pick (keeping the
// committed bundle page stable between publishes). Any failure falls back to a
// deterministic pick — the publish/commit step must never break on curation.

const MIN_FEATURED = 3;
const MAX_FEATURED = 9;

// Stable, no-API fallback: keep the incoming (category, title) order and take
// the first up-to-9. Honest and deterministic; the real curation is the LLM
// path below.
function deterministicPick(guides) {
  return guides.slice(0, Math.min(MAX_FEATURED, guides.length)).map(g => g.slug);
}

// Returns an ordered array of guide slugs to feature (best first), a subset of
// the guides passed in. Never rejects — worst case it returns deterministicPick.
async function selectFeaturedSlugs(guides) {
  // Too few to curate — feature all of them (no "also included" section).
  if (guides.length <= MIN_FEATURED) return guides.map(g => g.slug);
  if (!process.env.ANTHROPIC_API_KEY) return deterministicPick(guides);

  const list = guides
    .map((g, i) => `${i + 1}. [${g.slug}] ${g.title}${g.subtitle ? ` — ${g.subtitle}` : ''}`)
    .join('\n');

  const prompt = `You are curating a sales page for a bundle of ${guides.length} travel PDF guides. Every guide is included in the bundle no matter what — your only job is to choose which ones to FEATURE prominently (shown with their description) so the page reads as a punchy highlight reel instead of a wall of ${guides.length} rows. The rest are listed compactly as "also included".

Pick the ${MIN_FEATURED}–${MAX_FEATURED} guides with the broadest traveler appeal and strongest pull, judging from their titles and descriptions. Prefer a tight, high-impact set over a long one.

Guides:
${list}

Return ONLY a JSON array of the chosen guide slugs (the bracketed values), best first — e.g. ["slug-a","slug-b","slug-c"]. No prose, no code fence.`;

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (msg.content || []).map(b => b.text || '').join('').trim();
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return deterministicPick(guides);

    const valid = new Set(guides.map(g => g.slug));
    const chosen = [...new Set(JSON.parse(match[0]))].filter(s => valid.has(s));

    // Sanity-clamp: need at least MIN_FEATURED real slugs, cap at MAX_FEATURED,
    // and never feature the entire set (that defeats the "highlight" split).
    if (chosen.length < MIN_FEATURED) return deterministicPick(guides);
    const capped = chosen.slice(0, MAX_FEATURED);
    if (capped.length >= guides.length) return capped.slice(0, guides.length - 1);
    return capped;
  } catch (err) {
    console.error('Guide bundle curation failed, using deterministic pick:', err.message);
    return deterministicPick(guides);
  }
}

module.exports = { selectFeaturedSlugs, deterministicPick, MIN_FEATURED, MAX_FEATURED };
