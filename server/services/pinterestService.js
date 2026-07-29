const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../config/database');

let anthropic = null;
async function getAnthropicClient() {
  if (process.env.ANTHROPIC_API_KEY) return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const r = await pool.query(`SELECT value FROM settings WHERE key = 'anthropic_api_key'`).catch(() => ({ rows: [] }));
  const key = r.rows[0]?.value;
  if (!key) throw new Error('Anthropic API key not configured');
  return new Anthropic({ apiKey: key });
}

// One entry per free tool (55 total) — title/promptTheme are pulled from the
// same source material as toolLeadEmailSequence.js's hooks and
// toolOgImageService.js's TOOL_THEMES, so Pinterest content stays
// consistent with the rest of the promo stack instead of being generic,
// unrelated travel-tips topics. toolSlug drives the actual backlink in
// generatePin() below, so each pin sends traffic to its matching tool page.
const TOPICS = [
  { category: 'best-time-to-book-flights', toolSlug: 'best-time-to-book-flights', title: 'The 30-60 day flight booking window', promptTheme: 'a calendar with an airplane icon and an upward price trend arrow', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'carry-on-size-checker', toolSlug: 'carry-on-size-checker', title: 'Gate fees cost more than booking fees', promptTheme: 'a suitcase next to a measuring tape', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'visa-requirement-checker', toolSlug: 'visa-requirement-checker', title: 'The passport rule most travelers miss', promptTheme: 'an open passport with a visa stamp', boards: ['Passport & Visa Tips', 'Travel Planning', 'Travel Tips'], tags: ['#traveltips', '#passporttips', '#travelplanning', '#travelsmarter', '#traveladvice'] },
  { category: 'jet-lag-calculator', toolSlug: 'jet-lag-calculator', title: 'Adjust your sleep before you fly', promptTheme: 'a clock face overlaid on a world map with timezone lines', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'packing-list-generator', toolSlug: 'packing-list-generator', title: 'The #1 travel packing regret', promptTheme: 'an open suitcase with a neat checklist beside it', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'travel-budget-calculator', toolSlug: 'travel-budget-calculator', title: 'Where your travel budget really goes', promptTheme: 'a wallet, coins, and a small calculator next to an airplane', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'power-plug-checker', toolSlug: 'power-plug-checker', title: 'Voltage matters more than plug shape', promptTheme: 'a travel power plug adapter with a small world map', boards: ['Travel Hacks', 'Travel Tips', 'Travel Tools'], tags: ['#travelhacks', '#traveltips', '#traveltools', '#travelsmarter'] },
  { category: 'tipping-calculator', toolSlug: 'tipping-calculator', title: 'Tipping norms aren\'t universal', promptTheme: 'a hand placing cash on a restaurant receipt', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'layover-checker', toolSlug: 'layover-checker', title: 'Airport connection times, decoded', promptTheme: 'an airport terminal clock with connecting flight paths', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'travel-health-checker', toolSlug: 'travel-health-checker', title: 'Some vaccines need weeks of lead time', promptTheme: 'a first aid kit and a vaccine syringe next to an airplane', boards: ['Travel Safety', 'Travel Health Tips', 'Travel Tips'], tags: ['#travelsafety', '#traveltips', '#travelhealth', '#travelsmarter', '#traveladvice'] },
  { category: 'water-safety-checker', toolSlug: 'water-safety-checker', title: 'The tap water risk everyone forgets', promptTheme: 'a glass of water with a checkmark and a water droplet icon', boards: ['Travel Safety', 'Travel Health Tips', 'Travel Tips'], tags: ['#travelsafety', '#traveltips', '#travelhealth', '#travelsmarter', '#traveladvice'] },
  { category: 'flight-carbon-calculator', toolSlug: 'flight-carbon-calculator', title: 'One flight, a month\'s worth of CO2', promptTheme: 'an airplane with a green leaf and a faint CO2 cloud', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'airport-transfer-calculator', toolSlug: 'airport-transfer-calculator', title: 'Pre-booked transfers beat airport taxis', promptTheme: 'an airport shuttle van in front of a terminal', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'baggage-fee-calculator', toolSlug: 'baggage-fee-calculator', title: 'Book your bag online, not at the airport', promptTheme: 'a suitcase with a price tag and a dollar sign', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'emergency-number-checker', toolSlug: 'emergency-number-checker', title: '911 doesn\'t work everywhere', promptTheme: 'a smartphone showing an emergency call screen', boards: ['Travel Safety', 'Travel Health Tips', 'Travel Tips'], tags: ['#travelsafety', '#traveltips', '#travelhealth', '#travelsmarter', '#traveladvice'] },
  { category: 'rideshare-checker', toolSlug: 'rideshare-checker', title: 'Uber isn\'t everywhere you\'d expect', promptTheme: 'a car with a smartphone showing a ride-hailing app pin', boards: ['Travel Hacks', 'Travel Tips', 'Travel Tools'], tags: ['#travelhacks', '#traveltips', '#traveltools', '#travelsmarter'] },
  { category: 'driving-checker', toolSlug: 'driving-checker', title: 'Your IDP isn\'t a license by itself', promptTheme: 'a steering wheel over a world map with a drivers license', boards: ['Travel Hacks', 'Travel Tips', 'Travel Tools'], tags: ['#travelhacks', '#traveltips', '#traveltools', '#travelsmarter'] },
  { category: 'sim-checker', toolSlug: 'sim-checker', title: 'Airport SIM kiosks aren\'t the cheapest', promptTheme: 'a SIM card next to a smartphone with signal bars', boards: ['Travel Hacks', 'Travel Tips', 'Travel Tools'], tags: ['#travelhacks', '#traveltips', '#traveltools', '#travelsmarter'] },
  { category: 'delay-compensation-checker', toolSlug: 'delay-compensation-checker', title: 'You have to file for EU261 compensation', promptTheme: 'an airplane with a clock and a euro coin', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'customs-checker', toolSlug: 'customs-checker', title: 'Declaring honestly beats under-declaring', promptTheme: 'a suitcase at a customs checkpoint with a stamp', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'best-month-checker', toolSlug: 'best-month-checker', title: 'Best weather ≠ best flight prices', promptTheme: 'a calendar page with sun and weather icons', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'currency-checker', toolSlug: 'currency-checker', title: 'Even \'modern\' countries can be cash-heavy', promptTheme: 'a small stack of different colorful currency banknotes and coins', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'language-checker', toolSlug: 'language-checker', title: 'Five words that go a long way', promptTheme: 'a speech bubble with a world map and a translate icon', boards: ['Travel Hacks', 'Travel Tips', 'Travel Tools'], tags: ['#travelhacks', '#traveltips', '#traveltools', '#travelsmarter'] },
  { category: 'transit-checker', toolSlug: 'transit-checker', title: 'Your transit card pays for itself fast', promptTheme: 'a subway train icon over a simplified metro map', boards: ['Travel Hacks', 'Travel Tips', 'Travel Tools'], tags: ['#travelhacks', '#traveltips', '#traveltools', '#travelsmarter'] },
  { category: 'airport-amenities-checker', toolSlug: 'airport-amenities-checker', title: 'Some airports are worth the layover', promptTheme: 'an airport lounge with a wifi icon and comfortable seating', boards: ['Travel Hacks', 'Travel Tips', 'Travel Tools'], tags: ['#travelhacks', '#traveltips', '#traveltools', '#travelsmarter'] },
  { category: 'drone-checker', toolSlug: 'drone-checker', title: 'Drone permits can\'t be rushed', promptTheme: 'a camera drone flying with a no-fly-zone circle icon nearby', boards: ['Travel Tips', 'Cultural Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#traveletiquette', '#travelhacks', '#travelsmarter', '#traveladvice'] },
  { category: 'alcohol-checker', toolSlug: 'alcohol-checker', title: 'Election-day alcohol bans, explained', promptTheme: 'a wine glass and bottle with a checkmark icon', boards: ['Travel Tips', 'Cultural Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#traveletiquette', '#travelhacks', '#travelsmarter', '#traveladvice'] },
  { category: 'seat-pitch-checker', toolSlug: 'seat-pitch-checker', title: 'Skip the paid seat upgrade — try this', promptTheme: 'an airplane seat with a measuring tape showing legroom', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'insurance-cost-estimator', toolSlug: 'insurance-cost-estimator', title: 'What travel insurance actually costs', promptTheme: 'a protective shield icon with a small airplane', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'pet-travel-checker', toolSlug: 'pet-travel-checker', title: 'The pet-travel prep that takes months', promptTheme: 'a dog in a pet travel carrier next to an airplane', boards: ['Pet Travel', 'Traveling with Pets', 'Travel Tips'], tags: ['#travelwithpets', '#petsoftiktok', '#traveltips', '#travelsmarter'] },
  { category: 'passport-validity-checker', toolSlug: 'passport-validity-checker', title: 'The 6-month passport rule that strands travelers', promptTheme: 'an open passport with a calendar page and a checkmark', boards: ['Passport & Visa Tips', 'Travel Planning', 'Travel Tips'], tags: ['#traveltips', '#passporttips', '#travelplanning', '#travelsmarter', '#traveladvice'] },
  { category: 'public-holiday-checker', toolSlug: 'public-holiday-checker', title: 'The trip-planning mistake nobody checks for', promptTheme: 'a calendar page with a festive star or flag marking a holiday date', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'rental-age-checker', toolSlug: 'rental-age-checker', title: 'The rental fee that only shows up at the counter', promptTheme: 'a car key next to a drivers license and a small car icon', boards: ['Travel Tips', 'Cultural Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#traveletiquette', '#travelhacks', '#travelsmarter', '#traveladvice'] },
  { category: 'atm-fee-checker', toolSlug: 'atm-fee-checker', title: 'The ATM popup you should always decline', promptTheme: 'an ATM machine with a bank card and a small coin or bill icon', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'dress-code-checker', toolSlug: 'dress-code-checker', title: 'The temple visit that gets you turned away', promptTheme: 'a folded modest garment like a scarf or shawl next to a small temple or landmark silhouette', boards: ['Travel Tips', 'Cultural Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#traveletiquette', '#travelhacks', '#travelsmarter', '#traveladvice'] },
  { category: 'lost-passport-checker', toolSlug: 'lost-passport-checker', title: 'The one number worth saving before you fly', promptTheme: 'an open passport with a magnifying glass or a small exclamation mark icon', boards: ['Passport & Visa Tips', 'Travel Planning', 'Travel Tips'], tags: ['#traveltips', '#passporttips', '#travelplanning', '#travelsmarter', '#traveladvice'] },
  { category: 'tourist-tax-checker', toolSlug: 'tourist-tax-checker', title: 'The fee that never shows up in the booking price', promptTheme: 'a small hotel building icon with a coin or receipt icon beside it', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'short-term-rental-checker', toolSlug: 'short-term-rental-checker', title: 'The Airbnb booking that can get cancelled last-minute', promptTheme: 'a small house icon with a key and a document or checklist icon', boards: ['Travel Tips', 'Cultural Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#traveletiquette', '#travelhacks', '#travelsmarter', '#traveladvice'] },
  { category: 'uv-index-checker', toolSlug: 'uv-index-checker', title: 'Sunburn happens faster than you think', promptTheme: 'a sun icon with a sunscreen bottle or a small umbrella', boards: ['Travel Safety', 'Travel Health Tips', 'Travel Tips'], tags: ['#travelsafety', '#traveltips', '#travelhealth', '#travelsmarter', '#traveladvice'] },
  { category: 'departure-tax-checker', toolSlug: 'departure-tax-checker', title: 'The cash-only fee that catches travelers by surprise', promptTheme: 'an airplane departing with a small ticket or receipt icon', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'wildlife-safety-checker', toolSlug: 'wildlife-safety-checker', title: 'The safety tip most packing lists skip', promptTheme: 'a stylized snake or paw print icon with a small warning triangle', boards: ['Travel Safety', 'Travel Health Tips', 'Travel Tips'], tags: ['#travelsafety', '#traveltips', '#travelhealth', '#travelsmarter', '#traveladvice'] },
  { category: 'time-zone-checker', toolSlug: 'time-zone-checker', title: 'The "let\'s call later" that never works', promptTheme: 'a world clock or two overlapping clock faces showing different times', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'drinking-age-checker', toolSlug: 'drinking-age-checker', title: 'Legal in one country, not the next border over', promptTheme: 'a wine glass or beer mug next to a small ID card icon', boards: ['Travel Tips', 'Cultural Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#traveletiquette', '#travelhacks', '#travelsmarter', '#traveladvice'] },
  { category: 'vpn-censorship-checker', toolSlug: 'vpn-censorship-checker', title: 'The app store that disappears once you land', promptTheme: 'a smartphone or laptop icon with a shield or lock symbol', boards: ['Travel Tips', 'Cultural Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#traveletiquette', '#travelhacks', '#travelsmarter', '#traveladvice'] },
  { category: 'smoking-vaping-checker', toolSlug: 'smoking-vaping-checker', title: 'Legal at home, confiscated at customs', promptTheme: 'a no-smoking style icon paired with a small e-cigarette/vape device silhouette', boards: ['Travel Tips', 'Cultural Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#traveletiquette', '#travelhacks', '#travelsmarter', '#traveladvice'] },
  { category: 'natural-disaster-checker', toolSlug: 'natural-disaster-checker', title: 'Booking a beach trip during hurricane season', promptTheme: 'a weather warning triangle icon with a small storm cloud or seismic wave symbol', boards: ['Travel Safety', 'Travel Health Tips', 'Travel Tips'], tags: ['#travelsafety', '#traveltips', '#travelhealth', '#travelsmarter', '#traveladvice'] },
  { category: 'cashless-payment-checker', toolSlug: 'cashless-payment-checker', title: 'Your card works everywhere — except where it doesn\'t', promptTheme: 'a credit card with a contactless payment wave symbol next to a small coin or banknote', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'etiquette-checker', toolSlug: 'etiquette-checker', title: 'One gesture, two very different meanings', promptTheme: 'a stylized handshake or bowing greeting icon with a small speech bubble', boards: ['Travel Tips', 'Cultural Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#traveletiquette', '#travelhacks', '#travelsmarter', '#traveladvice'] },
  { category: 'business-hours-checker', toolSlug: 'business-hours-checker', title: 'Showing up on a Sunday in Germany', promptTheme: 'a store-front icon with a clock and an open/closed sign', boards: ['Travel Hacks', 'Travel Tips', 'Travel Tools'], tags: ['#travelhacks', '#traveltips', '#traveltools', '#travelsmarter'] },
  { category: 'internet-speed-checker', toolSlug: 'internet-speed-checker', title: 'Booking a "workation" with no wifi to work on', promptTheme: 'a laptop with wifi signal bars and a small speedometer icon', boards: ['Travel Hacks', 'Travel Tips', 'Travel Tools'], tags: ['#travelhacks', '#traveltips', '#traveltools', '#travelsmarter'] },
  { category: 'airport-arrival-time-checker', toolSlug: 'airport-arrival-time-checker', title: 'Sprinting through LAX with 12 minutes to spare', promptTheme: 'an airport departure board with a clock icon', boards: ['Travel Planning', 'Travel Hacks', 'Travel Tips'], tags: ['#traveltips', '#travelhacks', '#travelplanning', '#travelsmarter'] },
  { category: 'medication-legality-checker', toolSlug: 'medication-legality-checker', title: 'Your routine prescription, their controlled substance', promptTheme: 'a pill bottle with a small customs/passport stamp icon', boards: ['Travel Tips', 'Cultural Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#traveletiquette', '#travelhacks', '#travelsmarter', '#traveladvice'] },
  { category: 'vat-refund-checker', toolSlug: 'vat-refund-checker', title: 'The UK stopped tax-free shopping and nobody told you', promptTheme: 'a shopping bag with a percentage symbol and a small receipt icon', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'resort-fee-checker', toolSlug: 'resort-fee-checker', title: 'That $99 Vegas room is actually $140', promptTheme: 'a hotel building icon with a small hidden price tag or magnifying glass on a receipt', boards: ['Travel Money Tips', 'Budget Travel', 'Travel Hacks'], tags: ['#travelmoney', '#budgettravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'travel-advisory-checker', toolSlug: 'travel-advisory-checker', title: 'Is your destination actually safe right now?', promptTheme: 'a shield icon overlaid on a small world map with a subtle warning-level indicator', boards: ['Travel Safety', 'Travel Health Tips', 'Travel Tips'], tags: ['#travelsafety', '#traveltips', '#travelhealth', '#travelsmarter', '#traveladvice'] },
  { category: 'lgbtq-travel-safety-checker', toolSlug: 'lgbtq-travel-safety-checker', title: 'Legal in one country, criminalized a few hours away', promptTheme: 'a small pride-flag-colored heart or checkmark icon next to a world map silhouette', boards: ['Travel Safety', 'Travel Tips', 'LGBTQ Travel'], tags: ['#travelsafety', '#lgbtqtravel', '#traveltips', '#travelsmarter', '#traveladvice'] },
  { category: 'lounge-access-checker', toolSlug: 'lounge-access-checker', title: 'Your Priority Pass might be useless at your own hub', promptTheme: 'a comfortable armchair icon with a small key card or membership badge symbol', boards: ['Travel Hacks', 'Travel Tips', 'Travel Rewards'], tags: ['#travelhacks', '#prioritypass', '#traveltips', '#travelsmarter'] },
  { category: 'accessible-travel-checker', toolSlug: 'accessible-travel-checker', title: 'The most charming parts of a city are often the least accessible', promptTheme: 'a wheelchair accessibility icon next to a small world map silhouette', boards: ['Accessible Travel', 'Travel Tips', 'Travel Safety'], tags: ['#accessibletravel', '#wheelchairtravel', '#traveltips', '#travelsmarter'] },
  { category: 'holiday-season-checker', toolSlug: 'holiday-season-checker', title: "You didn't check the calendar. Now every train is sold out", promptTheme: 'a calendar page with a festive confetti or crowd icon marking a busy date range', boards: ['Travel Planning', 'Travel Tips', 'Travel Hacks'], tags: ['#traveltips', '#travelplanning', '#travelhacks', '#travelsmarter'] },
  { category: 'overweight-baggage-checker', toolSlug: 'overweight-baggage-checker', title: '3 extra pounds just cost more than your plane ticket', promptTheme: 'a suitcase on a luggage scale with a small warning weight icon', boards: ['Travel Hacks', 'Budget Travel', 'Travel Tips'], tags: ['#travelhacks', '#budgettravel', '#traveltips', '#travelsmarter'] },
  { category: 'photography-permit-checker', toolSlug: 'photography-permit-checker', title: "Your tripod might need a permit you don't even know about", promptTheme: 'a camera icon with a small tripod silhouette and a subtle permit stamp', boards: ['Travel Photography', 'Travel Tips', 'Travel Hacks'], tags: ['#travelphotography', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'souvenir-export-checker', toolSlug: 'souvenir-export-checker', title: "That souvenir you just bought might not be legal to take home", promptTheme: 'a small gift bag or shopping bag icon with a subtle warning or customs stamp symbol', boards: ['Travel Tips', 'Travel Hacks', 'Travel Shopping'], tags: ['#traveltips', '#travelhacks', '#travelmistakes', '#travelsmarter'] },
  { category: 'tourist-scams-checker', toolSlug: 'tourist-scams-checker', title: "The #1 tourist scam in your destination — know it before you land", promptTheme: 'a theatrical mask or magnifying glass icon with a subtle warning triangle, suggesting deception to watch out for', boards: ['Travel Tips', 'Travel Hacks', 'Travel Safety'], tags: ['#traveltips', '#travelhacks', '#travelsafety', '#travelsmarter'] },
  { category: 'lost-baggage-checker', toolSlug: 'lost-baggage-checker', title: "If the airline loses your bag, you're owed way more than you think", promptTheme: 'a suitcase with a question mark or a small tracking-radar icon, suggesting a bag that has gone missing', boards: ['Travel Tips', 'Travel Hacks', 'Flight Tips'], tags: ['#traveltips', '#travelhacks', '#flightcompensation', '#travelsmarter'] },
  { category: 'cash-declaration-checker', toolSlug: 'cash-declaration-checker', title: "The cash limit that decides if customs keeps your money", promptTheme: 'a stack of banknotes with a small customs declaration form or stamp icon', boards: ['Travel Tips', 'Travel Hacks', 'Travel Money'], tags: ['#traveltips', '#travelhacks', '#travelmoney', '#travelsmarter'] },
  { category: 'yellow-fever-checker', toolSlug: 'yellow-fever-checker', title: "The vaccine certificate some countries legally require for entry", promptTheme: 'a vaccination syringe or small vaccine vial next to a certificate/passport icon', boards: ['Travel Tips', 'Travel Hacks', 'Travel Health'], tags: ['#traveltips', '#travelhacks', '#traveldocuments', '#travelsmarter'] },
  { category: 'digital-nomad-visa-checker', toolSlug: 'digital-nomad-visa-checker', title: "The visa most remote workers don't know exists", promptTheme: 'a laptop on a small table with a palm tree or beach silhouette, suggesting remote work while traveling', boards: ['Travel Tips', 'Digital Nomad', 'Remote Work'], tags: ['#digitalnomad', '#traveltips', '#remotework', '#travelsmarter'] },
  { category: 'solo-female-travel-checker', toolSlug: 'solo-female-travel-checker', title: "Is it actually safe for a woman to travel here alone?", promptTheme: 'a female traveler silhouette with a backpack next to a small compass or shield icon', boards: ['Travel Tips', 'Solo Female Travel', 'Travel Safety'], tags: ['#solofemaletravel', '#traveltips', '#travelsafety', '#travelsmarter'] },
  { category: 'minor-consent-checker', toolSlug: 'minor-consent-checker', title: "The document that saves your family trip at the border", promptTheme: 'a small notarized document or letter icon next to a simple parent-and-child silhouette', boards: ['Travel Tips', 'Family Travel', 'Travel Hacks'], tags: ['#familytravel', '#traveltips', '#travelhacks', '#travelsmarter'] },
  { category: 'ramadan-checker', toolSlug: 'ramadan-checker', title: "The one thing that changes everything about this trip", promptTheme: 'a crescent moon and small lantern icon, evoking Ramadan evenings, in a warm minimal style', boards: ['Travel Tips', 'Travel Hacks', 'Trip Planning'], tags: ['#traveltips', '#travelhacks', '#ramadan', '#travelsmarter'] },
  { category: 'halal-food-checker', toolSlug: 'halal-food-checker', title: "Will you actually be able to eat halal here?", promptTheme: 'a simple plate with a fork and a small crescent/checkmark icon, suggesting verified halal dining', boards: ['Travel Tips', 'Halal Travel', 'Trip Planning'], tags: ['#halaltravel', '#traveltips', '#muslimtravel', '#travelsmarter'] },
  { category: 'kosher-food-checker', toolSlug: 'kosher-food-checker', title: "Will you actually be able to eat kosher here?", promptTheme: 'a simple plate with a fork and a small Star of David/checkmark icon, suggesting verified kosher dining', boards: ['Travel Tips', 'Kosher Travel', 'Trip Planning'], tags: ['#koshertravel', '#traveltips', '#jewishtravel', '#travelsmarter'] },
  { category: 'car-rental-insurance-checker', toolSlug: 'car-rental-insurance-checker', title: "The rental car surprise nobody warns you about", promptTheme: 'a small rental car icon with a shield or document icon nearby, suggesting insurance coverage', boards: ['Travel Tips', 'Travel Hacks', 'Road Trip'], tags: ['#traveltips', '#travelhacks', '#carrental', '#travelsmarter'] },
];

class PinterestService {
  constructor() {
    this.accessToken = null;
    this.boardId = null;
    this.boardName = null;
    this.ideogramKey = null;
    this.openaiKey = null;
    this.postCounter = 0;
    this.topicIndex = 0;
    this.userBoards = [];
    this.TOPICS = TOPICS;
  }

  async loadSettings() {
    try {
      const claudeKeyResult = await pool.query("SELECT value FROM settings WHERE key = 'anthropic_api_key' LIMIT 1");
      const claudeKey = claudeKeyResult.rows[0]?.value || process.env.ANTHROPIC_API_KEY;
      if (claudeKey) anthropic = new Anthropic({ apiKey: claudeKey });

      const result = await pool.query(
        `SELECT key, value FROM settings WHERE key IN (
          'pinterest_access_token','pinterest_board_id','pinterest_board_name',
          'pinterest_post_counter','pinterest_topic_index','ideogram_api_key','openai_api_key'
        )`
      );
      result.rows.forEach(({ key, value }) => {
        if (key === 'pinterest_access_token') this.accessToken = value;
        if (key === 'pinterest_board_id') this.boardId = value;
        if (key === 'pinterest_board_name') this.boardName = value;
        if (key === 'pinterest_post_counter') this.postCounter = parseInt(value) || 0;
        if (key === 'pinterest_topic_index') this.topicIndex = parseInt(value) || 0;
        if (key === 'ideogram_api_key') this.ideogramKey = value;
        if (key === 'openai_api_key') this.openaiKey = value;
      });

      // Load user boards from DB
      try {
        const boardsR = await pool.query(`SELECT value FROM settings WHERE key = 'pinterest_boards_json'`);
        if (boardsR.rows[0]) this.userBoards = JSON.parse(boardsR.rows[0].value);
      } catch (e) { this.userBoards = []; }

    } catch (err) {
      console.error('Pinterest: loadSettings error:', err.message);
    }
  }

  isConfigured() {
    return !!(this.accessToken && (this.openaiKey || this.ideogramKey));
  }

  // Pick a random matching board from user's actual boards
  _pickBoard(topic) {
    if (!this.userBoards.length) return { id: this.boardId, name: this.boardName || 'Travel' };
    // Collect all matching boards
    const matches = this.userBoards.filter(b =>
      topic.boards.some(preferred =>
        b.name.toLowerCase().includes(preferred.toLowerCase()) ||
        preferred.toLowerCase().includes(b.name.toLowerCase())
      )
    );
    const pool = matches.length ? matches : this.userBoards;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async generateImage(topic) {
    const prompt = `Pinterest pin design, vertical 2:3 portrait format, bold flat-design travel infographic — optimized to stop the scroll.

HEADLINE (large, bold sans-serif, perfectly spelled, sharply legible, high contrast against its background, max 8 words): "${topic.title}"

VISUAL: ${topic.promptTheme} — one single clean, centered flat-design icon/illustration with generous white space around it. Not a busy or photorealistic scene — simplicity keeps the headline readable.

SMALL BOTTOM BANNER TEXT (small, clean, legible): "Free Instant Check →"

Color palette: warm coral (#FF6B4A) and cream background with deep navy (#1A2744) accents — bright, high-contrast, eye-catching.

Style: modern flat-design infographic, clean vector-art illustration, professional travel-blog aesthetic, generous margins, no clutter.

No watermarks, no stock photos of people, no fake logos.`;

    if (this.openaiKey) {
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        { model: 'gpt-image-1', prompt, n: 1, size: '1024x1536' },
        { headers: { 'Authorization': `Bearer ${this.openaiKey}`, 'Content-Type': 'application/json' }, timeout: 120000 }
      );
      const imgData = response.data?.data?.[0];
      const url = imgData?.url || (imgData?.b64_json ? `data:image/png;base64,${imgData.b64_json}` : null);
      if (!url) throw new Error('OpenAI returned no image');
      console.log(`📌 Pinterest: OpenAI image ready (${imgData?.url ? 'url' : 'base64'})`);
      return url;
    }

    if (!this.ideogramKey) throw new Error('No image generation API key configured');
    const response = await axios.post(
      'https://api.ideogram.ai/generate',
      {
        image_request: {
          prompt,
          model: 'V_2',
          resolution: 'RESOLUTION_832_1248',
          style_type: 'DESIGN',
          magic_prompt_option: 'OFF'
        }
      },
      { headers: { 'Api-Key': this.ideogramKey, 'Content-Type': 'application/json' }, timeout: 60000 }
    );
    const url = response.data?.data?.[0]?.url;
    if (!url) throw new Error('Ideogram returned no image');
    console.log(`📌 Pinterest: Ideogram image ready → ${url.substring(0, 60)}...`);
    return url;
  }

  async generateDescription(topic) {
    const prompt = `Write a Pinterest pin description for a free instant travel checker tool. Pin headline: "${topic.title}". What the tool covers: ${topic.promptTheme}.

Requirements:
- 2–3 sentences, conversational, not corporate
- Make clear it's a free, instant, no-signup tool
- Mention 1 specific reason this matters while planning a trip
- Max 300 characters

Output only the description text. No hashtags (those come separately).`;

    anthropic = await getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].text.trim();
  }

  async generatePin(topicIndex = null) {
    await this.loadSettings();
    const index = topicIndex !== null ? topicIndex : this.topicIndex % TOPICS.length;
    const topic = TOPICS[index % TOPICS.length];
    const includeCTA = true; // always true — destination link is always present
    const board = this._pickBoard(topic);
    // Link straight to the tool page the pin is actually about, with a UTM
    // tag so Pinterest analytics/free-tool analytics can attribute traffic.
    const link = `https://travelsmarterapp.com/${topic.toolSlug}.html?ref=pinterest&pin=${topic.toolSlug}`;

    console.log(`📌 Pinterest: generating description for "${topic.title}"`);
    const description = await this.generateDescription(topic);

    console.log(`📌 Pinterest: generating image for "${topic.title}"`);
    const imageUrl = await this.generateImage(topic);

    const tags = topic.tags.join(' ');

    // Save as draft
    const dbResult = await pool.query(
      `INSERT INTO pinterest_posts (title, category, image_url, description, tags, board_id, board_name, link, included_cta, status, posted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW()) RETURNING id`,
      [topic.title, topic.category, imageUrl, description, tags, board.id || null, board.name || null, link, includeCTA]
    );

    this.topicIndex++;
    this.postCounter++;
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('pinterest_topic_index', $1, 'text') ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(this.topicIndex)]
    );
    await pool.query(
      `INSERT INTO settings (key, value, type) VALUES ('pinterest_post_counter', $1, 'text') ON CONFLICT (key) DO UPDATE SET value = $1`,
      [String(this.postCounter)]
    );

    return {
      title: topic.title,
      description,
      imageUrl,
      tags,
      board,
      link,
      includeCTA,
      category: topic.category,
      dbId: dbResult.rows[0].id,
    };
  }

  async markAsPosted(dbId, pinUrl = null) {
    await pool.query(
      `UPDATE pinterest_posts SET status = 'posted', pin_id = $1, posted_at = NOW() WHERE id = $2`,
      [pinUrl || null, dbId]
    );
  }

  async getRecentPosts(limit = 20) {
    try {
      const r = await pool.query(
        `SELECT id, title, category, image_url, description, board_name, included_cta, status, pin_id, posted_at
         FROM pinterest_posts ORDER BY posted_at DESC LIMIT $1`,
        [limit]
      );
      return r.rows;
    } catch { return []; }
  }

  getTopics() {
    return TOPICS.map((t, i) => ({
      index: i,
      title: t.title,
      category: t.category,
      isNext: i === this.topicIndex % TOPICS.length,
    }));
  }

  getStatus() {
    return {
      connected: !!this.accessToken,
      ideogramConfigured: !!this.ideogramKey,
      boardId: this.boardId,
      boardName: this.boardName,
      boardsLoaded: this.userBoards.length,
      postCounter: this.postCounter,
      nextTopic: TOPICS[this.topicIndex % TOPICS.length]?.title || null,
    };
  }

  // Legacy: kept for backward compat
  async createAndPost() {
    throw new Error('Auto-posting disabled — use copy-paste workflow via /generate endpoint.');
  }

  startScheduler() { return { started: false, reason: 'Auto-posting not available — use copy-paste workflow' }; }
  stopScheduler() { return { stopped: false, reason: 'No scheduler running' }; }
}

module.exports = new PinterestService();
