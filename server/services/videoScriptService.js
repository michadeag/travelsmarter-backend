const pool = require('../config/database');

// Curated bank of short-form (YouTube Shorts / Instagram Reels / TikTok)
// video script ideas, each promoting one specific free tool. Source of
// truth lives here in code (not hand-edited in the DB) — mirrors the
// toolLeadEmailSequence.js pattern: syncVideoScriptIdeas() upserts this
// array into the DB on every boot, so adding/editing a script is just a
// code change + deploy, and the `key` column keeps the upsert idempotent.
//
// CTA is platform-aware on purpose: YouTube comments render links as
// clickable, so "link in the first comment" works there and should point
// straight at the specific tool page (pin that comment after posting).
// Instagram/TikTok never make links in captions or comments clickable,
// so "link in bio" is the only functional CTA — the bio link should point
// at https://travelsmarterapp.com/free-travel-tools.html (the hub), not
// any single tool, since the same bio link has to work across videos
// promoting different tools.
const SCRIPT_IDEAS = [
  {
    key: 'resort-fee-vegas-lie',
    toolSlug: 'resort-fee-checker',
    toolName: 'Resort Fee Checker',
    hook: "Your $99 Vegas hotel room is a lie",
    voiceover: "You booked a $99 room in Vegas. At checkout, it's $140. That extra $41 a night? A 'resort fee' — for a pool you didn't use and wifi you already have on your phone. It's not optional, and it's almost never in the price you see when booking. Before you book anywhere in Vegas, Orlando, or Miami — check if there's a hidden resort fee first.",
    ctaYoutube: "Free Resort Fee Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Resort Fee Checker — link in bio",
    caption: "The hotel price you see is almost never the price you pay 💸",
    hashtags: "#travelhacks #vegastravel #hiddenfees #traveltiktok",
  },
  {
    key: 'medication-legality-japan',
    toolSlug: 'medication-legality-checker',
    toolName: 'Medication Legality Checker',
    hook: "Your prescription could get you arrested in Japan",
    voiceover: "Adderall — totally normal in the US — is a controlled substance in Japan and South Korea. Bring it without checking, and it can be confiscated at customs, or worse. Same goes for some common painkillers in Greece and Egypt. Always check your destination's medication rules before you pack your prescriptions — not after you land.",
    ctaYoutube: "Free Medication Legality Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Medication Legality Checker — link in bio",
    caption: "Don't find out at customs 💊✈️",
    hashtags: "#traveltips #packingtips #traveladvice",
  },
  {
    key: 'customs-800-loophole',
    toolSlug: 'customs-checker',
    toolName: 'Customs Checker',
    hook: "You have $800 you didn't know about",
    voiceover: "Every time you fly back to the US, you get an $800 duty-free exemption — no tax on souvenirs, gifts, anything you bought, up to that amount. Most travelers have no idea it exists, or how close they are to the limit. Check your destination's exact duty-free allowance before your next shopping spree abroad.",
    ctaYoutube: "Free Customs Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Customs Checker — link in bio",
    caption: "The $800 loophole nobody tells you about 💰",
    hashtags: "#travelmoney #dutyfree #traveltips",
  },
  {
    key: 'tipping-japan-rude',
    toolSlug: 'tipping-calculator',
    toolName: 'Tipping Calculator',
    hook: "Tipping in Japan is actually rude",
    voiceover: "In the US, not tipping 20% gets you side-eye. In Japan, tipping at all can be seen as insulting — like you think they need the extra cash to do their job well. Meanwhile in France, an 18% service charge is already built into your bill by law. Tipping culture flips completely by country — check before your next trip so you don't offend anyone, or underpay.",
    ctaYoutube: "Free Tipping Calculator — link in the first comment 👇",
    ctaReelsTiktok: "Free Tipping Calculator — link in bio",
    caption: "One habit, two totally opposite reactions 🌍",
    hashtags: "#tippingculture #traveletiquette #japantravel",
  },
  {
    key: 'vape-illegal-southeast-asia',
    toolSlug: 'smoking-vaping-checker',
    toolName: 'Smoking & Vaping Legality Checker',
    hook: "Your vape is illegal the second you land",
    voiceover: "Vapes are completely normal at home. In Thailand, Singapore, and Vietnam? Straight-up illegal — confiscated at customs, sometimes with a fine attached. 'I didn't know' doesn't help once it's already in a bin. Always check local vaping and smoking laws before you pack — it takes ten seconds.",
    ctaYoutube: "Free Smoking & Vaping Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Smoking & Vaping Checker — link in bio",
    caption: "Packed like normal, landed in trouble 🚭",
    hashtags: "#travelmistakes #southeastasiatravel #traveltips",
  },
  {
    key: 'passport-rule-strands-travelers',
    toolSlug: 'visa-requirement-checker',
    toolName: 'Visa Requirement Checker',
    hook: "The passport rule that strands more travelers than visas",
    voiceover: "Everyone worries about visas. The rule that actually strands travelers is passport validity — many countries require six months of validity beyond your travel dates, not just past your return date. Airlines check this at the gate, before you even reach immigration. Miss it, and you don't fly at all.",
    ctaYoutube: "Free Visa & Passport Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Visa & Passport Checker — link in bio",
    caption: "The rule nobody checks until it's too late ✈️😬",
    hashtags: "#traveltips #passporttips #travelmistakes",
  },
  {
    key: 'passport-valid-not-valid-enough',
    toolSlug: 'passport-validity-checker',
    toolName: 'Passport Validity Checker',
    hook: "Your passport can be 'valid' and still get you denied boarding",
    voiceover: "Your passport says it's valid until next March. Doesn't matter — if your destination requires six months of validity beyond your travel dates and you're inside that window, airlines will deny boarding on the spot. This trips up more travelers than any visa rule. Check your exact dates before you book, not before you fly.",
    ctaYoutube: "Free Passport Validity Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Passport Validity Checker — link in bio",
    caption: "Valid ≠ valid enough 🛂",
    hashtags: "#passporttips #traveltips #travelhacks",
  },
  {
    key: 'vat-refund-uk-killed-it',
    toolSlug: 'vat-refund-checker',
    toolName: 'VAT Refund Checker',
    hook: "The UK quietly killed tax-free shopping and nobody told you",
    voiceover: "Up until 2021, tourists could get a VAT refund shopping in the UK. Not anymore — it's gone, and a lot of travelers still don't know. Meanwhile the US and Canada never had a national refund scheme at all, while most of the EU, Japan, and South Korea still refund 10 to 25 percent. Check before you budget your shopping.",
    ctaYoutube: "Free VAT Refund Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free VAT Refund Checker — link in bio",
    caption: "Still budgeting for a refund that doesn't exist anymore? 🧾",
    hashtags: "#traveltips #shoppingtips #europetravel",
  },
  {
    key: 'atm-popup-always-say-no',
    toolSlug: 'atm-fee-checker',
    toolName: 'ATM Fee Checker',
    hook: "Always say no to this ATM popup",
    voiceover: "When a foreign ATM asks if you want to be charged in your home currency, that's Dynamic Currency Conversion — and it always means a worse exchange rate with a hidden markup. Always choose to be charged in the local currency instead. It's one tap, and it saves you real money every single withdrawal.",
    ctaYoutube: "Free ATM Fee Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free ATM Fee Checker — link in bio",
    caption: "One wrong tap costs you every time you withdraw 💸",
    hashtags: "#travelmoney #traveltips #moneysavingtips",
  },
  {
    key: 'tourist-tax-cash-only-surprise',
    toolSlug: 'tourist-tax-checker',
    toolName: 'Tourist Tax Checker',
    hook: "The hotel fee that's cash-only and never in your booking price",
    voiceover: "Booking sites almost never show you the nightly tourist tax a lot of cities charge — and it's often cash-only, paid directly at check-in. Show up without local cash and it's an awkward moment at the front desk. Budget a small buffer and check the local tourist tax before you go.",
    ctaYoutube: "Free Tourist Tax Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Tourist Tax Checker — link in bio",
    caption: "The fee your booking confirmation never mentions 🏨",
    hashtags: "#traveltips #europetravel #hiddenfees",
  },
  {
    key: 'departure-tax-miss-flight',
    toolSlug: 'departure-tax-checker',
    toolName: 'Departure Tax Checker',
    hook: "The cash-only fee that catches travelers at the gate",
    voiceover: "Most departure taxes are baked into your ticket price now — but a handful of countries still require a separate cash payment right at the airport before you fly out. Show up without local currency and you could genuinely miss your flight over it. A 30-second check saves you the scramble.",
    ctaYoutube: "Free Departure Tax Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Departure Tax Checker — link in bio",
    caption: "The fee that can make you miss your flight 🛫",
    hashtags: "#traveltips #travelhacks #airporttips",
  },
  {
    key: 'water-safety-ice-cubes',
    toolSlug: 'water-safety-checker',
    toolName: 'Tap Water Safety Checker',
    hook: "You know not to drink the tap water. You forgot about the ice",
    voiceover: "Most travelers already know not to drink tap water somewhere risky. What they forget is that ice cubes and salads washed in tap water carry the exact same risk — and they're way easier to overlook. Check the water safety rating for your destination before you order that iced coffee.",
    ctaYoutube: "Free Tap Water Safety Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Tap Water Safety Checker — link in bio",
    caption: "It's not the water you're avoiding, it's the ice 🧊",
    hashtags: "#traveltips #travelhealth #foodsafety",
  },
  {
    key: 'wildlife-venom-movie-advice',
    toolSlug: 'wildlife-safety-checker',
    toolName: 'Wildlife Safety Checker',
    hook: "If you get bitten by something venomous, forget everything you've seen in movies",
    voiceover: "Sucking out venom, using a tourniquet — that outdated advice can actually make a venomous bite or sting worse. The real move: stay calm, keep the limb still, and get to medical care immediately. Know the wildlife risk at your destination before you go, not after something happens.",
    ctaYoutube: "Free Wildlife Safety Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Wildlife Safety Checker — link in bio",
    caption: "The movie advice that makes a venomous bite worse 🐍",
    hashtags: "#travelsafety #traveltips #outdoortravel",
  },
  {
    key: 'hurricane-season-beach-trip',
    toolSlug: 'natural-disaster-checker',
    toolName: 'Natural Disaster Risk Checker',
    hook: "You just booked a beach trip during hurricane season",
    voiceover: "Mexico's Caribbean coast, Vietnam, the Philippines — all gorgeous, all with a defined hurricane or typhoon season that a lot of travelers book straight through without checking. Know the riskiest months before you commit, and make sure your travel insurance actually covers named-storm evacuation.",
    ctaYoutube: "Free Natural Disaster Risk Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Natural Disaster Risk Checker — link in bio",
    caption: "Check the season before you check the flight price 🌀",
    hashtags: "#traveltips #hurricaneseason #beachvacation",
  },
  {
    key: 'emergency-911-doesnt-work',
    toolSlug: 'emergency-number-checker',
    toolName: 'Emergency Number Checker',
    hook: "911 doesn't work almost anywhere outside the US",
    voiceover: "Dial 911 in most of the world and nothing happens. Every country has its own emergency number — some split police, fire, and ambulance into three completely different numbers. Save your destination's actual emergency number before you land, not while you're trying to remember it during an emergency.",
    ctaYoutube: "Free Emergency Number Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Emergency Number Checker — link in bio",
    caption: "The number that only works in one country 🚨",
    hashtags: "#traveltips #travelsafety #traveladvice",
  },
  {
    key: 'uber-exited-markets',
    toolSlug: 'rideshare-checker',
    toolName: 'Rideshare Availability Checker',
    hook: "Uber isn't everywhere you'd expect",
    voiceover: "Uber has fully exited entire markets — Southeast Asia, mainland China, Denmark — in favor of local apps you've probably never heard of. Show up assuming Uber will be there and you can end up stranded outside the airport at midnight. Check what actually works at your destination before you land.",
    ctaYoutube: "Free Rideshare Availability Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Rideshare Availability Checker — link in bio",
    caption: "Don't find out Uber left the country at midnight 🚕",
    hashtags: "#traveltips #travelhacks #travelfail",
  },
  {
    key: 'drone-confiscated-no-permit',
    toolSlug: 'drone-checker',
    toolName: 'Drone Rules Checker',
    hook: "Your drone can get confiscated before you even take off",
    voiceover: "A lot of countries require drone registration before you fly, and some ban them completely in historic centers, near government buildings, or entire cities. Fly without checking, and the drone doesn't come home with you. Always check local drone rules before you pack it — registration usually can't be done last-minute anyway.",
    ctaYoutube: "Free Drone Rules Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Drone Rules Checker — link in bio",
    caption: "Packed the drone, forgot to check the law 🛸",
    hashtags: "#dronetravel #traveltips #travelvlog",
  },
  {
    key: 'vpn-blocked-once-landed',
    toolSlug: 'vpn-censorship-checker',
    toolName: 'VPN & Censorship Checker',
    hook: "Set up your VPN before you land in China, not after",
    voiceover: "In heavily censored countries, the VPN provider's own website and app store listing are often blocked too — so if you land without one already installed and tested, you may not be able to get one at all. Set it up, test it, and make sure it actually works before you fly, not once you're already offline.",
    ctaYoutube: "Free VPN & Censorship Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free VPN & Censorship Checker — link in bio",
    caption: "You can't download a VPN once you can't access the internet 🌐",
    hashtags: "#traveltips #digitalnomad #chinatravel",
  },
  {
    key: 'temple-dress-code-turned-away',
    toolSlug: 'dress-code-checker',
    toolName: 'Dress Code Checker',
    hook: "The temple visit that turns you away at the door",
    voiceover: "Shoulders and knees covered — a lot of temples, mosques, and churches enforce that strictly, no exceptions, no rentals available on-site half the time. Pack one lightweight scarf or sarong and an unplanned temple stop never turns into a wasted trip. Check the local dress code before you go.",
    ctaYoutube: "Free Dress Code Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Dress Code Checker — link in bio",
    caption: "Turned away at the door over a pair of shorts 👗",
    hashtags: "#traveltips #templetravel #packingtips",
  },
  {
    key: 'drinking-age-16-vs-21',
    toolSlug: 'drinking-age-checker',
    toolName: 'Legal Drinking Age Checker',
    hook: "Legal at 16 here. Illegal at 21 two borders over",
    voiceover: "The legal drinking age swings from 16 in parts of Europe to 21 in the US, with genuine surprises in between — Japan keeps it at 20 even though adulthood there starts at 18. If you're anywhere near the threshold, ID checks are routine. Check the actual local age before you order.",
    ctaYoutube: "Free Legal Drinking Age Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Legal Drinking Age Checker — link in bio",
    caption: "Same age, completely different rules by country 🍻",
    hashtags: "#traveltips #travelfacts #partytravel",
  },
  {
    key: 'rental-age-hidden-surcharge',
    toolSlug: 'rental-age-checker',
    toolName: 'Car Rental Age Checker',
    hook: "The rental car fee that never shows up in the online quote",
    voiceover: "Book a rental under 25 and the online price looks totally normal — until you're at the counter and a young-driver surcharge suddenly appears, sometimes doubling the total. It's almost never disclosed upfront. Check your destination's age rules before you book, not after you're already standing at the desk.",
    ctaYoutube: "Free Car Rental Age Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Car Rental Age Checker — link in bio",
    caption: "The fee that only appears once you're at the counter 🚗",
    hashtags: "#traveltips #rentalcar #budgettravel",
  },
  {
    key: 'germany-sunday-everything-closed',
    toolSlug: 'business-hours-checker',
    toolName: 'Business Hours Checker',
    hook: "Showing up in Germany on a Sunday? Everything's closed",
    voiceover: "Germany, Austria, and Switzerland close almost everything on Sundays — by law, not just habit. Meanwhile Israel and Jordan shift their entire weekend to Friday and Saturday. Plan a shopping day or errands around the wrong day, and you'll be standing outside locked doors. Check the local weekend before you plan around it.",
    ctaYoutube: "Free Business Hours Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Business Hours Checker — link in bio",
    caption: "Wrong day, wrong country, everything's closed 🕒",
    hashtags: "#traveltips #europetravel #travelmistakes",
  },
  {
    key: 'modern-countries-cash-only',
    toolSlug: 'currency-checker',
    toolName: 'Currency & Cash Culture Checker',
    hook: "Some of the 'most modern' countries are surprisingly cash-only",
    voiceover: "You'd assume a developed, modern country means card everywhere — but some of the most advanced economies are still surprisingly cash-heavy in daily life, small vendors especially. Don't assume card-only just because a country feels modern. Check the actual cash culture before you land with an empty wallet.",
    ctaYoutube: "Free Currency & Cash Culture Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Currency & Cash Culture Checker — link in bio",
    caption: "Modern doesn't always mean cashless 💳",
    hashtags: "#traveltips #travelmoney #traveladvice",
  },
  {
    key: 'airport-sim-kiosk-worst-deal',
    toolSlug: 'sim-checker',
    toolName: 'SIM & eSIM Checker',
    hook: "The airport SIM kiosk is the worst deal in the airport",
    voiceover: "That SIM card kiosk right after baggage claim is convenient, and it is almost never the cheapest option. An eSIM bought in advance usually beats it on both price and setup time — and you land already connected instead of standing in line. Check your destination's best SIM option before you fly.",
    ctaYoutube: "Free SIM & eSIM Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free SIM & eSIM Checker — link in bio",
    caption: "Land already connected instead of standing in that line 📱",
    hashtags: "#traveltips #esim #travelhacks",
  },
  {
    key: 'pet-travel-months-not-weeks',
    toolSlug: 'pet-travel-checker',
    toolName: 'Pet Travel Checker',
    hook: "Bringing your dog to a rabies-free country takes months of prep, not weeks",
    voiceover: "Australia, Iceland, a handful of Caribbean islands — rabies-free destinations often require blood tests with mandatory waiting periods before your pet can even qualify to travel. This is the one piece of trip prep that genuinely cannot be rushed. Check your destination's pet import rules the moment you start planning.",
    ctaYoutube: "Free Pet Travel Checker — link in the first comment 👇",
    ctaReelsTiktok: "Free Pet Travel Checker — link in bio",
    caption: "The trip prep that can't be rushed, no matter how much you pay 🐾",
    hashtags: "#travelwithpets #petsoftiktok #traveltips",
  },
];

async function syncVideoScriptIdeas() {
  for (const idea of SCRIPT_IDEAS) {
    await pool.query(
      `INSERT INTO video_script_ideas
         (key, tool_slug, tool_name, hook, voiceover, cta_youtube, cta_reels_tiktok, caption, hashtags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (key) DO UPDATE SET
         tool_slug = EXCLUDED.tool_slug, tool_name = EXCLUDED.tool_name, hook = EXCLUDED.hook,
         voiceover = EXCLUDED.voiceover, cta_youtube = EXCLUDED.cta_youtube,
         cta_reels_tiktok = EXCLUDED.cta_reels_tiktok, caption = EXCLUDED.caption, hashtags = EXCLUDED.hashtags`,
      [idea.key, idea.toolSlug, idea.toolName, idea.hook, idea.voiceover,
        idea.ctaYoutube, idea.ctaReelsTiktok, idea.caption, idea.hashtags]
    );
  }
}

// Rotation: least-shown / longest-since-shown first, random tiebreak — so
// repeated use surfaces fresh ideas before old ones resurface.
async function getRandomIdeas(count) {
  const { rows } = await pool.query(
    `SELECT * FROM video_script_ideas
     ORDER BY times_shown ASC, last_shown_at ASC NULLS FIRST, RANDOM()
     LIMIT $1`,
    [count]
  );
  if (rows.length > 0) {
    await pool.query(
      `UPDATE video_script_ideas SET times_shown = times_shown + 1, last_shown_at = NOW() WHERE id = ANY($1::uuid[])`,
      [rows.map(r => r.id)]
    );
  }
  return rows;
}

module.exports = { SCRIPT_IDEAS, syncVideoScriptIdeas, getRandomIdeas };
