const axios = require('axios');
const pool = require('../config/database');

// Generates one branded, themed thumbnail per free-tool category via
// OpenAI's image API (same provider already used as the Pinterest service's
// preferred option — see pinterestService.js), and stores each as a
// permanent {tool_slug -> image bytes} mapping in tool_og_images. These are
// used as og:image/twitter:image on every tool page so link previews
// (Twitter, iMessage, Slack, etc.) show a real image instead of a blank
// placeholder icon.
//
// Originally used Ideogram instead. Switched 2026-07-30 after Ideogram
// started rejecting every request with 401s tracing back to a declined
// payment method on that account — not a code issue, but OpenAI billing
// is simpler to keep working and this app already depends on it elsewhere.
//
// Ideogram's /generate endpoint returned "ephemeral" signed URLs that
// expire within ~24-48h (confirmed: they 410 after expiry) — storing that
// raw URL directly, as this service originally did, meant every image
// silently went dead within a day or two. OpenAI's gpt-image-1 returns
// base64 image bytes directly (no ephemeral URL to worry about).
//
// A first attempt at fixing this downloaded the bytes and wrote them to this
// server's own local disk (server/og-images/), serving them via
// express.static. That silently never worked in production: this app runs
// on a platform with an ephemeral/read-only container filesystem, so every
// fs.writeFileSync() failed, was swallowed by the batch loop's
// Promise.allSettled (logged server-side only, never surfaced to the admin
// dashboard), and the database was never updated — "Generate Missing"
// appeared to do nothing at all, every single time.
//
// The actual fix: store the image bytes themselves in Postgres (a real,
// durable store that survives redeploys, unlike container disk) and serve
// them back out through a dedicated route (GET /og-images/:slug.png,
// registered in server.js) instead of a static file.
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.travelsmarterapp.com';

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
  { slug: 'kosher-food-checker', theme: 'a simple plate with a fork and a small Star of David/checkmark icon, suggesting verified kosher dining' },
  { slug: 'car-rental-insurance-checker', theme: 'a small rental car icon with a shield or document icon nearby, suggesting insurance coverage' },
  { slug: 'pregnancy-travel-checker', theme: 'a small mosquito icon with a subtle warning symbol, next to a gentle heart or care-related icon' },
  { slug: 'sports-equipment-checker', theme: 'a ski, golf club, and surfboard silhouette arranged together with a small luggage tag icon' },
  { slug: 'wedding-legal-checker', theme: 'a pair of interlocking wedding rings with a small legal document or passport icon nearby' },
  { slug: 'luggage-storage-checker', theme: 'a small suitcase icon next to a locker or storage locker icon' },
  { slug: 'public-restroom-checker', theme: 'a simple restroom door sign icon with a small toilet paper roll icon nearby, in a clean minimal style' },
  { slug: 'beach-safety-checker', theme: 'a wave icon with a small warning flag or jellyfish silhouette nearby' },
  { slug: 'air-quality-checker', theme: 'a hazy skyline icon with a small air/wind swirl motif' },
  { slug: 'street-food-checker', theme: 'a street food cart or noodle bowl icon with a small steam swirl' },
  { slug: 'altitude-sickness-checker', theme: 'a mountain peak icon with a small altimeter or thin-air swirl motif' },
  { slug: 'onward-travel-checker', theme: 'a boarding pass or ticket icon with a small checkmark or arrow motif' },
  { slug: 'family-travel-checker', theme: 'a stroller or family icon with a small heart or sun motif' },
  { slug: 'bargaining-checker', theme: 'a hand gesture haggling over a small price tag or market stall icon, with a speech bubble motif' },
  { slug: 'punctuality-checker', theme: 'a clock or wristwatch icon with a small calendar or footstep motif suggesting arrival time' },
  { slug: 'gift-giving-checker', theme: 'a wrapped gift box with a ribbon and a small speech bubble or heart motif' },
  { slug: 'restaurant-reservation-checker', theme: 'a set restaurant table with a small reserved sign or an open book icon suggesting a reservation' },
  { slug: 'bike-scooter-checker', theme: 'a shared city bike or e-scooter icon with a small smartphone/app motif nearby' },
  { slug: 'pharmacy-checker', theme: 'a pharmacy cross icon with a small pill bottle or capsule motif' },
  { slug: 'solo-dining-checker', theme: 'a single place setting at a small restaurant table with a bowl of noodles or ramen' },
  { slug: 'laundry-checker', theme: 'a laundry washing machine icon with a small folded clothes or basket motif' },
];

async function getOpenaiKey() {
  const r = await pool.query(`SELECT value FROM settings WHERE key = 'openai_api_key'`).catch(() => ({ rows: [] }));
  return r.rows[0]?.value || null;
}

async function generateOne(openaiKey, { slug, theme }) {
  const prompt = `Flat modern icon-style illustration representing ${theme}. Minimal, clean composition, vector-art style, TravelSmarter brand colors (deep blue background, orange accent), no text, no watermark, no logo, centered subject, square format.`;
  const response = await axios.post(
    'https://api.openai.com/v1/images/generations',
    { model: 'gpt-image-1', prompt, n: 1, size: '1024x1024' },
    { headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' }, timeout: 120000 }
  );
  const imgData = response.data?.data?.[0];
  if (!imgData) throw new Error('OpenAI returned no image');

  // gpt-image-1 returns base64 bytes directly (no expiring URL to chase
  // like Ideogram had) — fall back to downloading a url if one is present.
  let imageBuffer;
  if (imgData.b64_json) {
    imageBuffer = Buffer.from(imgData.b64_json, 'base64');
  } else if (imgData.url) {
    const imageRes = await axios.get(imgData.url, { responseType: 'arraybuffer', timeout: 30000 });
    imageBuffer = Buffer.from(imageRes.data);
  } else {
    throw new Error('OpenAI returned no image data');
  }

  const imageUrl = `${API_BASE_URL}/og-images/${slug}.png`;

  await pool.query(
    `INSERT INTO tool_og_images (tool_slug, image_url, image_data, prompt, generated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (tool_slug) DO UPDATE SET image_url = $2, image_data = $3, prompt = $4, generated_at = NOW()`,
    [slug, imageUrl, imageBuffer, prompt]
  );
  return { slug, imageUrl };
}

// Enqueues every tool slug that doesn't already have real image bytes
// stored (or all, if force=true) for a background poller to actually
// generate — see processOgImageQueue() below for why this doesn't just
// generate inline. "Has bytes stored" (not just "has a database row")
// means a stale pre-fix row with a dead Ideogram URL and no image_data
// doesn't count as done. Callers poll getAllToolImages() to watch results
// fill in over the next few minutes.
async function generateAllToolImages(force = false) {
  const openaiKey = await getOpenaiKey();
  if (!openaiKey) throw new Error('OpenAI API key not configured');

  let targets = TOOL_THEMES;
  if (!force) {
    const { rows } = await pool.query(`SELECT tool_slug FROM tool_og_images WHERE image_data IS NOT NULL`);
    const have = new Set(rows.map(r => r.tool_slug));
    targets = TOOL_THEMES.filter(t => !have.has(t.slug));
  }
  if (targets.length === 0) return { started: false, reason: 'All tool images already generated' };

  for (const t of targets) {
    await pool.query(
      `INSERT INTO tool_og_image_queue (tool_slug, requested_at) VALUES ($1, NOW())
       ON CONFLICT (tool_slug) DO UPDATE SET requested_at = NOW()`,
      [t.slug]
    );
  }

  return { started: true, count: targets.length };
}

// Drains a few pending slugs from tool_og_image_queue and actually
// generates them — called from a setInterval in server.js (the one
// background-execution pattern already proven reliable in this app,
// unlike an unawaited async IIFE inside a request handler, which never
// completed in production even once the disk-write bug was fixed).
// BATCH_SIZE stays small since each Ideogram call can take several
// seconds and this runs frequently rather than all at once.
const QUEUE_BATCH_SIZE = 4;
async function processOgImageQueue() {
  const { rows: queued } = await pool.query(
    `SELECT tool_slug FROM tool_og_image_queue ORDER BY requested_at ASC LIMIT $1`,
    [QUEUE_BATCH_SIZE]
  );
  if (queued.length === 0) return { processed: 0 };

  const openaiKey = await getOpenaiKey();
  if (!openaiKey) {
    console.error('❌ Tool OG image queue has pending items but no OpenAI API key configured');
    return { processed: 0, error: 'OpenAI API key not configured' };
  }

  const themeBySlug = new Map(TOOL_THEMES.map(t => [t.slug, t]));
  let processed = 0;

  for (const { tool_slug } of queued) {
    const target = themeBySlug.get(tool_slug);
    try {
      if (target) {
        await generateOne(openaiKey, target);
        console.log(`🖼️ Tool OG image generated: ${tool_slug}`);
      } else {
        console.warn(`⚠️ Tool OG image queue had unknown slug, dropping: ${tool_slug}`);
      }
    } catch (err) {
      console.error(`❌ Tool OG image failed for ${tool_slug}:`, err.message);
    } finally {
      // Remove regardless of outcome — a failed slug can be re-queued via
      // "Generate Missing" (still missing image_data) or "Regenerate All"
      // rather than retried forever automatically.
      await pool.query(`DELETE FROM tool_og_image_queue WHERE tool_slug = $1`, [tool_slug]);
      processed++;
    }
  }

  return { processed };
}

// Only rows with real stored bytes count — a stale pre-fix row (dead
// Ideogram URL, image_data NULL) would otherwise show as "generated" in
// the admin dashboard while actually being a broken image everywhere it's
// used.
async function getAllToolImages() {
  const { rows } = await pool.query(
    `SELECT tool_slug, image_url, generated_at FROM tool_og_images WHERE image_data IS NOT NULL ORDER BY tool_slug ASC`
  );
  return rows;
}

// Serves the actual PNG bytes for GET /og-images/:slug.png (registered in
// server.js) — the replacement for what used to be express.static reading
// a file off disk.
async function getToolImageBytes(slug) {
  const { rows } = await pool.query(
    `SELECT image_data FROM tool_og_images WHERE tool_slug = $1 AND image_data IS NOT NULL`,
    [slug]
  );
  return rows[0]?.image_data || null;
}

module.exports = {
  TOOL_THEMES,
  generateAllToolImages,
  processOgImageQueue,
  getAllToolImages,
  getToolImageBytes,
};
