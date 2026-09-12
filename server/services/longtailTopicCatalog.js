// Topic catalog for the long-tail Q&A page pipeline (longtailPublisherService.js).
//
// Every template here was deliberately chosen to be:
//  - NOT already covered by any of the ~100 free-tool checkers (checked
//    against the full controller list before adding any of these) — the
//    point is new keyword surface area, not cannibalizing existing pages.
//  - Stable/evergreen — cultural and practical norms, not visa rules,
//    exchange rates, or anything else that goes stale or carries real
//    factual-accuracy risk if slightly wrong. Nothing here is the kind of
//    fact that could cause real harm if imprecise (unlike, say, entry
//    requirements) — see the PDF-guide pilot decision earlier for the same
//    reasoning applied to guide topics.
//  - Genuinely long-tail: narrow enough that they wouldn't justify their
//    own interactive "checker" tool, but real enough to be an actual
//    search/AI-answer-engine query.
//
// 20 templates x 64 countries = 1,280 possible pages. At the pipeline's
// starting rate (1-2/day), that's roughly 2+ years of runway before this
// catalog needs expanding — deliberately oversized so "slow and steady"
// growth doesn't require attention again soon.
//
// Each template also carries a `toolSlug` naming the one existing free-tool
// checker (see TOOLS below) that's the closest topical match — used by
// longtailPublisherService.js to pitch that tool when the page's country
// has no published PDF guide yet. `null` means no free tool is a close
// enough fit; those pages fall back to a generic hub pitch instead of
// forcing an unrelated tool onto the page.
const TEMPLATES = [
  {
    key: 'nod-meaning', toolSlug: 'etiquette-checker',
    question: (c) => `Does Nodding Mean "Yes" in ${c.name}?`,
    prompt: (c) => `whether nodding the head means "yes" and shaking it means "no" in ${c.name} — most places follow this, but a few cultures (e.g. Bulgaria, parts of Greece, Albania, some Balkan regions) partially or fully reverse it, or use a head-tilt/wobble that visitors misread. Give the genuinely accurate answer for ${c.name} specifically — if it follows the standard nod-means-yes convention, say so plainly rather than manufacturing a false "twist."`,
  },
  {
    key: 'hand-gestures', toolSlug: 'etiquette-checker',
    question: (c) => `Which Hand Gestures Should You Avoid in ${c.name}?`,
    prompt: (c) => `which common hand gestures (thumbs up, the "OK" sign, the V-sign/peace sign, beckoning with one finger, etc.) carry an offensive or very different meaning in ${c.name}, if any. If ${c.name} has no notably different gesture taboos from general Western norms, say that honestly rather than inventing a taboo.`,
  },
  {
    key: 'eye-contact', toolSlug: 'etiquette-checker',
    question: (c) => `Is Direct Eye Contact Polite or Rude in ${c.name}?`,
    prompt: (c) => `whether direct eye contact during conversation is expected as a sign of confidence/respect, or considered too intense/disrespectful (especially with elders or authority figures), in ${c.name}.`,
  },
  {
    key: 'personal-space', toolSlug: 'etiquette-checker',
    question: (c) => `How Much Personal Space Do People Expect in ${c.name}?`,
    prompt: (c) => `the typical comfortable conversational distance between people who aren't close friends/family in ${c.name} — closer/more tactile cultures vs. cultures that expect more physical distance.`,
  },
  {
    key: 'shoes-off', toolSlug: 'etiquette-checker',
    question: (c) => `Do You Take Your Shoes Off When Entering a Home in ${c.name}?`,
    prompt: (c) => `whether it's expected to remove your shoes when entering someone's home in ${c.name}, and whether that norm extends to certain other indoor spaces there.`,
  },
  {
    key: 'addressing-people', toolSlug: 'etiquette-checker',
    question: (c) => `First Names or Titles? How to Address People in ${c.name}`,
    prompt: (c) => `whether it's normal to use first names quickly with new acquaintances/colleagues in ${c.name}, or whether formal titles and surnames are expected until invited to do otherwise.`,
  },
  {
    key: 'finishing-plate', toolSlug: 'etiquette-checker',
    question: (c) => `Is It Rude to Leave Food on Your Plate in ${c.name}?`,
    prompt: (c) => `whether finishing everything on your plate is expected as polite, or whether leaving a little food is actually the polite signal that you've had enough, in ${c.name}.`,
  },
  {
    key: 'splitting-bill', toolSlug: 'tipping-calculator',
    question: (c) => `Is Splitting the Bill Common in ${c.name}?`,
    prompt: (c) => `whether splitting a restaurant bill evenly among a group is normal and expected in ${c.name}, or whether one person typically pays (with reciprocation expected later), and how people usually settle up in practice.`,
  },
  {
    key: 'hands-on-table', toolSlug: 'etiquette-checker',
    question: (c) => `Table Manners in ${c.name}: Hands on the Table or in Your Lap?`,
    prompt: (c) => `whether keeping your hands (wrists) visible on the table while eating is expected as good manners, or whether that's considered odd/rude and hands should stay in your lap between bites, in ${c.name}.`,
  },
  {
    key: 'dinner-time', toolSlug: 'etiquette-checker',
    question: (c) => `What Time Do People Eat Dinner in ${c.name}?`,
    prompt: (c) => `the typical/normal time people sit down for dinner in ${c.name}, and how that compares to what a visitor from a country with an earlier or later dinner custom should expect (e.g. restaurants may be empty/full at times that surprise them).`,
  },
  {
    key: 'breakfast-norm', toolSlug: 'etiquette-checker',
    question: (c) => `What's a Typical Breakfast in ${c.name}?`,
    prompt: (c) => `what a typical everyday breakfast actually looks like for locals in ${c.name} — not a tourist-hotel buffet, but what people really eat most mornings.`,
  },
  {
    key: 'cheers-toast', toolSlug: 'etiquette-checker',
    question: (c) => `How Do You Say "Cheers" in ${c.name}, and Do You Clink Glasses?`,
    prompt: (c) => `the local word/phrase used when toasting drinks in ${c.name}, and whether clinking glasses is standard practice there (and any notable etiquette around it, like maintaining eye contact while clinking).`,
  },
  {
    key: 'escalator-side', toolSlug: 'transit-checker',
    question: (c) => `Which Side Do You Stand On an Escalator in ${c.name}?`,
    prompt: (c) => `whether there's a "stand right, walk left" (or the reverse) convention on escalators in ${c.name}'s cities, particularly in transit stations — or whether no such convention is really followed there.`,
  },
  {
    key: 'sidewalk-side', toolSlug: 'transit-checker',
    question: (c) => `Which Side Do People Walk On in ${c.name}?`,
    prompt: (c) => `whether there's a noticeable convention for which side of the sidewalk/staircase people keep to when walking in ${c.name} (often, but not always, matching the side of the road traffic drives on), or whether it's essentially unstructured there.`,
  },
  {
    key: 'giving-up-seat', toolSlug: 'transit-checker',
    question: (c) => `Is It Expected to Give Up Your Seat on Public Transport in ${c.name}?`,
    prompt: (c) => `whether offering your seat to elderly, pregnant, or disabled passengers on buses/trains/metro is a strong social expectation in ${c.name}, including whether there are designated priority seats and how strictly that's observed.`,
  },
  {
    key: 'hailing-taxi', toolSlug: 'rideshare-checker',
    question: (c) => `How Do You Hail a Taxi in ${c.name}?`,
    prompt: (c) => `the normal way to get a taxi in ${c.name} — raising a hand on the street, only via app, only from designated taxi stands, or phoning ahead — and anything a first-time visitor should know about the local method.`,
  },
  {
    key: 'small-talk', toolSlug: 'etiquette-checker',
    question: (c) => `Is Small Talk With Strangers Normal in ${c.name}?`,
    prompt: (c) => `whether casual small talk with strangers (shopkeepers, people in line, seatmates) is normal and expected in ${c.name}, or whether that would come across as unusual/intrusive there.`,
  },
  {
    key: 'dial-code', toolSlug: null,
    question: (c) => `What's the International Dial Code for ${c.name}?`,
    prompt: (c) => `${c.name}'s international calling code, its domestic long-distance/trunk prefix if any, and a correctly formatted example of dialing a local number from abroad.`,
  },
  {
    key: 'business-cards', toolSlug: 'etiquette-checker',
    question: (c) => `How Do You Exchange Business Cards in ${c.name}?`,
    prompt: (c) => `whether there's a notable etiquette around presenting/receiving business cards in ${c.name} (e.g. two hands, a moment of reading it before putting it away, avoiding writing on someone's card) — and if there's no particularly distinct custom there, say so rather than inventing formality that doesn't exist.`,
  },
  {
    key: 'pda-norms', toolSlug: 'etiquette-checker',
    question: (c) => `Is Holding Hands or Kissing in Public Normal in ${c.name}?`,
    prompt: (c) => `how comfortable/normal public displays of affection like holding hands or a brief kiss are for opposite-sex couples in everyday public settings in ${c.name} — keep this to general social-comfort norms, not a legal-risk assessment (that's covered by the LGBTQ+ Travel Safety tool already on the site).`,
  },
];

// Display metadata for the tool pitch CTA — kept small and local rather than
// importing tripBriefRegistry.js's full registry, same reasoning as
// TOOL_BASE_SLUGS in toolPromoTwitterService.js (a small, rarely-changed
// lookup isn't worth a cross-service dependency).
const TOOLS = {
  'etiquette-checker': { name: 'Local Etiquette & Taboos Checker', icon: '🤝' },
  'tipping-calculator': { name: 'Tipping Calculator', icon: '💵' },
  'transit-checker': { name: 'Public Transport Pass Checker', icon: '🚇' },
  'rideshare-checker': { name: 'Rideshare Availability Checker', icon: '🚗' },
};

const COUNTRIES = [
  ['france', 'France'], ['austria', 'Austria'], ['czech-republic', 'Czech Republic'], ['denmark', 'Denmark'],
  ['germany', 'Germany'], ['greece', 'Greece'], ['hungary', 'Hungary'], ['iceland', 'Iceland'],
  ['italy', 'Italy'], ['netherlands', 'Netherlands'], ['portugal', 'Portugal'], ['spain', 'Spain'],
  ['sweden', 'Sweden'], ['switzerland', 'Switzerland'], ['ireland', 'Ireland'], ['united-kingdom', 'United Kingdom'],
  ['turkey', 'Turkey'], ['japan', 'Japan'], ['thailand', 'Thailand'], ['indonesia', 'Indonesia'],
  ['singapore', 'Singapore'], ['south-korea', 'South Korea'], ['hong-kong', 'Hong Kong'], ['vietnam', 'Vietnam'],
  ['philippines', 'Philippines'], ['malaysia', 'Malaysia'], ['china', 'China'], ['india', 'India'],
  ['maldives', 'Maldives'], ['taiwan', 'Taiwan'], ['sri-lanka', 'Sri Lanka'], ['cambodia', 'Cambodia'],
  ['australia', 'Australia'], ['new-zealand', 'New Zealand'], ['fiji', 'Fiji'], ['french-polynesia', 'French Polynesia'],
  ['mexico', 'Mexico'], ['dominican-republic', 'Dominican Republic'], ['puerto-rico', 'Puerto Rico'], ['bahamas', 'Bahamas'],
  ['jamaica', 'Jamaica'], ['aruba', 'Aruba'], ['turks-and-caicos', 'Turks and Caicos'], ['st-lucia', 'St. Lucia'],
  ['costa-rica', 'Costa Rica'], ['panama', 'Panama'], ['belize', 'Belize'], ['cayman-islands', 'Cayman Islands'],
  ['antigua-and-barbuda', 'Antigua and Barbuda'], ['curacao', 'Curaçao'], ['canada', 'Canada'], ['united-arab-emirates', 'United Arab Emirates'],
  ['morocco', 'Morocco'], ['south-africa', 'South Africa'], ['qatar', 'Qatar'], ['israel', 'Israel'],
  ['tanzania', 'Tanzania'], ['kenya', 'Kenya'], ['argentina', 'Argentina'], ['peru', 'Peru'],
  ['chile', 'Chile'], ['colombia', 'Colombia'], ['brazil', 'Brazil'], ['united-states', 'United States'],
].map(([slug, name]) => ({ slug, name }));

function slugify(str) {
  return str.toLowerCase().replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

module.exports = { TEMPLATES, COUNTRIES, TOOLS, slugify };
