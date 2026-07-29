const axios = require('axios');
const pool = require('../config/database');

// Generates one branded, themed thumbnail per free-tool category via
// Ideogram (same API already used for Blogger/WordPress featured images),
// and stores each as a permanent {tool_slug -> image_url} mapping in
// tool_og_images. These are used as og:image/twitter:image on every tool
// page so link previews (Twitter, iMessage, Slack, etc.) show a real image
// instead of a blank placeholder icon.

// Kept in sync manually with the identically-named lists in
// freeToolAnalyticsController.js / toolPromoTwitterService.js — see those
// files for why this is duplicated rather than imported across layers.
const TOOL_THEMES = [
  { slug: 'best-time-to-book-flights', theme: 'a calendar with an airplane icon and an upward price trend arrow' },
  { slug: 'carry-on-size-checker', theme: 'a suitcase next to a measuring tape' },
  { slug: 'visa-requirement-checker', theme: 'an open passport with a visa stamp' },
  { slug: 'jet-lag-calculator', theme: 'a clock face overlaid on a world map with timezone lines' },
  { slug: 'packing-list-generator', theme: 'an open suitcase with a neat checklist beside it' },
  { slug: 'travel-budget-calculator', theme: 'a wallet, coins, and a small calculator next to an airplane' },
  { slug: 'power-plug-checker', theme: 'a travel power plug adapter with a small world map' },
  { slug: 'tipping-calculator', theme: 'a hand placing cash on a restaurant receipt' },
  { slug: 'layover-checker', theme: 'an airport terminal clock with connecting flight paths' },
  { slug: 'travel-health-checker', theme: 'a first aid kit and a vaccine syringe next to an airplane' },
  { slug: 'water-safety-checker', theme: 'a glass of water with a checkmark and a water droplet icon' },
  { slug: 'flight-carbon-calculator', theme: 'an airplane with a green leaf and a faint CO2 cloud' },
  { slug: 'airport-transfer-calculator', theme: 'an airport shuttle van in front of a terminal' },
  { slug: 'baggage-fee-calculator', theme: 'a suitcase with a price tag and a dollar sign' },
  { slug: 'emergency-number-checker', theme: 'a smartphone showing an emergency call screen' },
  { slug: 'rideshare-checker', theme: 'a car with a smartphone showing a ride-hailing app pin' },
  { slug: 'driving-checker', theme: 'a steering wheel over a world map with a drivers license' },
  { slug: 'sim-checker', theme: 'a SIM card next to a smartphone with signal bars' },
  { slug: 'delay-compensation-checker', theme: 'an airplane with a clock and a euro coin' },
  { slug: 'customs-checker', theme: 'a suitcase at a customs checkpoint with a stamp' },
  { slug: 'best-month-checker', theme: 'a calendar page with sun and weather icons' },
  { slug: 'currency-checker', theme: 'a small stack of different colorful currency banknotes and coins' },
  { slug: 'language-checker', theme: 'a speech bubble with a world map and a translate icon' },
  { slug: 'transit-checker', theme: 'a subway train icon over a simplified metro map' },
  { slug: 'airport-amenities-checker', theme: 'an airport lounge with a wifi icon and comfortable seating' },
  { slug: 'drone-checker', theme: 'a camera drone flying with a no-fly-zone circle icon nearby' },
  { slug: 'alcohol-checker', theme: 'a wine glass and bottle with a checkmark icon' },
  { slug: 'seat-pitch-checker', theme: 'an airplane seat with a measuring tape showing legroom' },
  { slug: 'insurance-cost-estimator', theme: 'a protective shield icon with a small airplane' },
  { slug: 'pet-travel-checker', theme: 'a dog in a pet travel carrier next to an airplane' },
  { slug: 'passport-validity-checker', theme: 'an open passport with a calendar page and a checkmark' },
  { slug: 'public-holiday-checker', theme: 'a calendar page with a festive star or flag marking a holiday date' },
  { slug: 'rental-age-checker', theme: 'a car key next to a drivers license and a small car icon' },
  { slug: 'atm-fee-checker', theme: 'an ATM machine with a bank card and a small coin or bill icon' },
  { slug: 'dress-code-checker', theme: 'a folded modest garment like a scarf or shawl next to a small temple or landmark silhouette' },
  { slug: 'lost-passport-checker', theme: 'an open passport with a magnifying glass or a small exclamation mark icon' },
  { slug: 'tourist-tax-checker', theme: 'a small hotel building icon with a coin or receipt icon beside it' },
  { slug: 'short-term-rental-checker', theme: 'a small house icon with a key and a document or checklist icon' },
  { slug: 'uv-index-checker', theme: 'a sun icon with a sunscreen bottle or a small umbrella' },
  { slug: 'departure-tax-checker', theme: 'an airplane departing with a small ticket or receipt icon' },
  { slug: 'wildlife-safety-checker', theme: 'a stylized snake or paw print icon with a small warning triangle' },
  { slug: 'time-zone-checker', theme: 'a world clock or two overlapping clock faces showing different times' },
  { slug: 'drinking-age-checker', theme: 'a wine glass or beer mug next to a small ID card icon' },
  { slug: 'vpn-censorship-checker', theme: 'a smartphone or laptop icon with a shield or lock symbol' },
  { slug: 'smoking-vaping-checker', theme: 'a no-smoking style icon paired with a small e-cigarette/vape device silhouette' },
  { slug: 'natural-disaster-checker', theme: 'a weather warning triangle icon with a small storm cloud or seismic wave symbol' },
  { slug: 'cashless-payment-checker', theme: 'a credit card with a contactless payment wave symbol next to a small coin or banknote' },
  { slug: 'etiquette-checker', theme: 'a stylized handshake or bowing greeting icon with a small speech bubble' },
  { slug: 'business-hours-checker', theme: 'a store-front icon with a clock and an open/closed sign' },
  { slug: 'internet-speed-checker', theme: 'a laptop with wifi signal bars and a small speedometer icon' },
  { slug: 'airport-arrival-time-checker', theme: 'an airport departure board with a clock icon' },
  { slug: 'medication-legality-checker', theme: 'a pill bottle with a small customs/passport stamp icon' },
  { slug: 'vat-refund-checker', theme: 'a shopping bag with a percentage symbol and a small receipt icon' },
  { slug: 'resort-fee-checker', theme: 'a hotel building icon with a small hidden price tag or magnifying glass on a receipt' },
  { slug: 'travel-advisory-checker', theme: 'a shield icon overlaid on a small world map with a subtle warning-level indicator' },
  { slug: 'lgbtq-travel-safety-checker', theme: 'a small pride-flag-colored heart or checkmark icon next to a world map silhouette' },
  { slug: 'lounge-access-checker', theme: 'a comfortable armchair icon with a small key card or membership badge symbol' },
  { slug: 'accessible-travel-checker', theme: 'a wheelchair accessibility icon next to a small world map silhouette' },
  { slug: 'holiday-season-checker', theme: 'a calendar page with a festive confetti or crowd icon marking a busy date range' },
  { slug: 'overweight-baggage-checker', theme: 'a suitcase on a luggage scale with a small warning weight icon' },
  { slug: 'photography-permit-checker', theme: 'a camera icon with a small tripod silhouette and a subtle permit stamp' },
  { slug: 'souvenir-export-checker', theme: 'a small gift bag or shopping bag icon with a subtle warning or customs stamp symbol' },
  { slug: 'tourist-scams-checker', theme: 'a theatrical mask or magnifying glass icon with a subtle warning triangle, suggesting deception to watch out for' },
  { slug: 'lost-baggage-checker', theme: 'a suitcase with a question mark or a small tracking-radar icon, suggesting a bag that has gone missing' },
  { slug: 'cash-declaration-checker', theme: 'a stack of banknotes with a small customs declaration form or stamp icon' },
  { slug: 'yellow-fever-checker', theme: 'a vaccination syringe or small vaccine vial next to a certificate/passport icon' },
  { slug: 'digital-nomad-visa-checker', theme: 'a laptop on a small table with a palm tree or beach silhouette, suggesting remote work while traveling' },
  { slug: 'solo-female-travel-checker', theme: 'a female traveler silhouette with a backpack next to a small compass or shield icon' },
  { slug: 'minor-consent-checker', theme: 'a small notarized document or letter icon next to a simple parent-and-child silhouette' },
  { slug: 'ramadan-checker', theme: 'a crescent moon and small lantern icon, evoking Ramadan evenings, in a warm minimal style' },
  { slug: 'halal-food-checker', theme: 'a simple plate with a fork and a small crescent/checkmark icon, suggesting verified halal dining' },
];

async function getIdeogramKey() {
  const r = await pool.query(`SELECT value FROM settings WHERE key = 'ideogram_api_key'`).catch(() => ({ rows: [] }));
  return r.rows[0]?.value || null;
}

async function generateOne(ideogramKey, { slug, theme }) {
  const prompt = `Flat modern icon-style illustration representing ${theme}. Minimal, clean composition, vector-art style, TravelSmarter brand colors (deep blue background, orange accent), no text, no watermark, no logo, centered subject, square format.`;
  const response = await axios.post(
    'https://api.ideogram.ai/generate',
    { image_request: { prompt, model: 'V_2', aspect_ratio: 'ASPECT_1_1', style_type: 'DESIGN', magic_prompt_option: 'OFF' } },
    { headers: { 'Api-Key': ideogramKey, 'Content-Type': 'application/json' }, timeout: 60000 }
  );
  const imageUrl = response.data?.data?.[0]?.url;
  if (!imageUrl) throw new Error('Ideogram returned no image URL');

  await pool.query(
    `INSERT INTO tool_og_images (tool_slug, image_url, prompt, generated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (tool_slug) DO UPDATE SET image_url = $2, prompt = $3, generated_at = NOW()`,
    [slug, imageUrl, prompt]
  );
  return { slug, imageUrl };
}

// Fire-and-forget: kicks off generation for every tool slug that doesn't
// already have an image (or all, if force=true), a few at a time so we
// don't hammer Ideogram's rate limit. Callers poll getAllToolImages() to
// watch results fill in — this intentionally does not block the HTTP
// response that triggered it, since 30 sequential image generations would
// likely exceed a typical request timeout.
async function generateAllToolImages(force = false) {
  const ideogramKey = await getIdeogramKey();
  if (!ideogramKey) throw new Error('Ideogram API key not configured');

  let targets = TOOL_THEMES;
  if (!force) {
    const { rows } = await pool.query(`SELECT tool_slug FROM tool_og_images`);
    const have = new Set(rows.map(r => r.tool_slug));
    targets = TOOL_THEMES.filter(t => !have.has(t.slug));
  }
  if (targets.length === 0) return { started: false, reason: 'All tool images already generated' };

  const BATCH_SIZE = 4;
  (async () => {
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(t => generateOne(ideogramKey, t)));
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') console.log(`🖼️ Tool OG image generated: ${batch[idx].slug}`);
        else console.error(`❌ Tool OG image failed for ${batch[idx].slug}:`, r.reason?.message);
      });
    }
    console.log('🖼️ Tool OG image batch generation complete');
  })().catch(err => console.error('❌ Tool OG image generation crashed:', err.message));

  return { started: true, count: targets.length };
}

async function getAllToolImages() {
  const { rows } = await pool.query(`SELECT tool_slug, image_url, generated_at FROM tool_og_images ORDER BY tool_slug ASC`);
  return rows;
}

module.exports = {
  TOOL_THEMES,
  generateAllToolImages,
  getAllToolImages,
};
