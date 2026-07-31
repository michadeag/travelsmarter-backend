// Registry of every free-tool controller included in a Trip Brief. Each
// entry's controller exports computeResult(args) directly (see the
// `exports.computeResult = computeResult;` line added to each of these 35
// controllers) — the Trip Brief generator calls each one for the trip's
// destination and assembles the results into one combined PDF.
//
// Only tools with a verified, uniform `computeResult({ country, ... })`
// signature are included here. Airline/airport/route-based tools (carry-on
// size, seat pitch, baggage fee, layover, airport transfer/amenities,
// arrival time, jet lag, time zone, best-time-to-book, packing list,
// budget, carbon, best-month, transit, delay compensation, insurance) use
// different input shapes and are deliberately left out of this first
// version — a traveler can still check those individually on their own
// tool pages. Extending the registry to cover them is a natural fast-follow.
//
// `conditional` is null for tools that always run off the destination
// alone, or the trip field name required to include that tool (the
// section is silently omitted from the brief if the traveler didn't
// provide it).
const TOOLS = [
  // --- Documents & Entry ---
  { slug: 'customs-checker', name: 'Customs Rules', icon: '🛃', category: 'Documents & Entry',
    controller: '../controllers/customsController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'driving-checker', name: 'Driving & IDP', icon: '🚗', category: 'Documents & Entry',
    controller: '../controllers/drivingController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'passport-validity-checker', name: 'Passport Validity', icon: '🛂', category: 'Documents & Entry',
    controller: '../controllers/passportValidityController', conditional: 'passportExpiryDate',
    buildArgs: (trip) => ({ country: trip.destination, expiryDate: trip.passportExpiryDate }) },
  { slug: 'lost-passport-checker', name: 'If You Lose Your Passport', icon: '📕', category: 'Documents & Entry',
    controller: '../controllers/lostPassportController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'onward-travel-checker', name: 'Proof of Onward Travel', icon: '🎫', category: 'Documents & Entry',
    controller: '../controllers/onwardTravelController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'digital-nomad-visa-checker', name: 'Digital Nomad Visa', icon: '💻', category: 'Documents & Entry',
    controller: '../controllers/digitalNomadVisaController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'minor-consent-checker', name: 'Minor Travel Consent Letter', icon: '👨‍👩‍👧', category: 'Documents & Entry',
    controller: '../controllers/minorConsentController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'wedding-legal-checker', name: 'Destination Wedding Legal Requirements', icon: '💍', category: 'Documents & Entry',
    controller: '../controllers/weddingLegalController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },

  // --- Money ---
  { slug: 'currency-checker', name: 'Currency', icon: '💱', category: 'Money',
    controller: '../controllers/currencyController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'currency-convertibility-checker', name: 'Leftover Currency', icon: '💱', category: 'Money',
    controller: '../controllers/currencyConvertibilityController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'cash-declaration-checker', name: 'Cash Declaration Limit', icon: '💵', category: 'Money',
    controller: '../controllers/cashDeclarationController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'atm-fee-checker', name: 'ATM Fees', icon: '🏧', category: 'Money',
    controller: '../controllers/atmFeeController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination, amount: 200 }) },
  { slug: 'tipping-calculator', name: 'Tipping', icon: '💵', category: 'Money',
    controller: '../controllers/tippingController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination, billAmount: 50 }) },
  { slug: 'vat-refund-checker', name: 'Tax-Free Shopping', icon: '🧾', category: 'Money',
    controller: '../controllers/vatRefundController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'tourist-tax-checker', name: 'Tourist Tax', icon: '🏛️', category: 'Money',
    controller: '../controllers/touristTaxController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'departure-tax-checker', name: 'Departure Tax', icon: '🛫', category: 'Money',
    controller: '../controllers/departureTaxController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'cashless-payment-checker', name: 'Card & Cash', icon: '💳', category: 'Money',
    controller: '../controllers/cashlessPaymentController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'resort-fee-checker', name: 'Resort Fees', icon: '🏨', category: 'Money',
    controller: '../controllers/resortFeeController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'souvenir-export-checker', name: 'Souvenir Export Rules', icon: '🛍️', category: 'Money',
    controller: '../controllers/souvenirExportController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'bargaining-checker', name: 'Bargaining & Haggling Norms', icon: '💬', category: 'Money',
    controller: '../controllers/bargainingController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },

  // --- Health & Safety ---
  { slug: 'pharmacy-checker', name: 'Pharmacy & OTC Medication', icon: '💊', category: 'Health & Safety',
    controller: '../controllers/pharmacyController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'travel-health-checker', name: 'Health & Vaccines', icon: '🩺', category: 'Health & Safety',
    controller: '../controllers/healthController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'yellow-fever-checker', name: 'Yellow Fever Certificate', icon: '💉', category: 'Health & Safety',
    controller: '../controllers/yellowFeverController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'pregnancy-travel-checker', name: 'Pregnancy Travel Risk', icon: '🤰', category: 'Health & Safety',
    controller: '../controllers/pregnancyTravelController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'water-safety-checker', name: 'Tap Water Safety', icon: '💧', category: 'Health & Safety',
    controller: '../controllers/waterController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'uv-index-checker', name: 'UV Index', icon: '☀️', category: 'Health & Safety',
    controller: '../controllers/uvIndexController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'wildlife-safety-checker', name: 'Wildlife Safety', icon: '🐍', category: 'Health & Safety',
    controller: '../controllers/wildlifeSafetyController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'natural-disaster-checker', name: 'Natural Disaster Risk', icon: '⛈️', category: 'Health & Safety',
    controller: '../controllers/naturalDisasterController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'emergency-number-checker', name: 'Emergency Numbers', icon: '🚨', category: 'Health & Safety',
    controller: '../controllers/emergencyController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'tourist-scams-checker', name: 'Common Tourist Scams', icon: '🎭', category: 'Health & Safety',
    controller: '../controllers/touristScamsController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'solo-female-travel-checker', name: 'Solo Female Travel Safety', icon: '🧭', category: 'Health & Safety',
    controller: '../controllers/soloFemaleTravelController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'beach-safety-checker', name: 'Beach & Ocean Safety', icon: '🌊', category: 'Health & Safety',
    controller: '../controllers/beachSafetyController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'air-quality-checker', name: 'Air Quality', icon: '🌫️', category: 'Health & Safety',
    controller: '../controllers/airQualityController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'street-food-checker', name: 'Street Food Safety', icon: '🍜', category: 'Health & Safety',
    controller: '../controllers/streetFoodController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'altitude-sickness-checker', name: 'Altitude Sickness Risk', icon: '⛰️', category: 'Health & Safety',
    controller: '../controllers/altitudeSicknessController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'travel-advisory-checker', name: 'Travel Advisory', icon: '🛡️', category: 'Health & Safety',
    controller: '../controllers/travelAdvisoryController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },

  // --- On the Ground ---
  { slug: 'sim-checker', name: 'SIM / eSIM', icon: '📱', category: 'On the Ground',
    controller: '../controllers/simController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'internet-speed-checker', name: 'Internet & Remote Work', icon: '📶', category: 'On the Ground',
    controller: '../controllers/internetSpeedController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'taxi-fare-checker', name: 'Taxi Fare Norms', icon: '🚕', category: 'On the Ground',
    controller: '../controllers/taxiFareController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'rideshare-checker', name: 'Rideshare Apps', icon: '🚕', category: 'On the Ground',
    controller: '../controllers/rideshareController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'short-term-rental-checker', name: 'Short-Term Rental Rules', icon: '🏠', category: 'On the Ground',
    controller: '../controllers/shortTermRentalController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'business-hours-checker', name: 'Business Hours & Weekend', icon: '🕒', category: 'On the Ground',
    controller: '../controllers/businessHoursController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'restaurant-reservation-checker', name: 'Restaurant Reservations', icon: '🍽️', category: 'On the Ground',
    controller: '../controllers/restaurantReservationController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'solo-dining-checker', name: 'Solo Dining', icon: '🍜', category: 'On the Ground',
    controller: '../controllers/soloDiningController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'restaurant-pace-checker', name: 'Restaurant Pace', icon: '🍽️', category: 'On the Ground',
    controller: '../controllers/restaurantPaceController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'attraction-booking-checker', name: 'Attraction Booking', icon: '🎟️', category: 'On the Ground',
    controller: '../controllers/attractionBookingController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'shipping-souvenirs-checker', name: 'Shipping Souvenirs Home', icon: '📦', category: 'On the Ground',
    controller: '../controllers/shippingSouvenirsController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'laundry-checker', name: 'Laundry Access', icon: '🧺', category: 'On the Ground',
    controller: '../controllers/laundryController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'bike-scooter-checker', name: 'Bike & E-Scooter Rentals', icon: '🛴', category: 'On the Ground',
    controller: '../controllers/bikeScooterController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'language-checker', name: 'Language', icon: '🗣️', category: 'On the Ground',
    controller: '../controllers/languageController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'power-plug-checker', name: 'Power Plug & Voltage', icon: '🔌', category: 'On the Ground',
    controller: '../controllers/plugController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'accessible-travel-checker', name: 'Wheelchair & Mobility Accessibility', icon: '♿', category: 'On the Ground',
    controller: '../controllers/accessibleTravelController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'family-travel-checker', name: 'Traveling with Kids', icon: '👨‍👩‍👧', category: 'On the Ground',
    controller: '../controllers/familyTravelController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'holiday-season-checker', name: 'Holiday Season Disruption', icon: '📅', category: 'On the Ground',
    controller: '../controllers/holidaySeasonController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'ramadan-checker', name: 'Ramadan Travel Impact', icon: '🌙', category: 'On the Ground',
    controller: '../controllers/ramadanController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'halal-food-checker', name: 'Halal Food Availability', icon: '🍽️', category: 'On the Ground',
    controller: '../controllers/halalFoodController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'kosher-food-checker', name: 'Kosher Food Availability', icon: '🍽️', category: 'On the Ground',
    controller: '../controllers/kosherFoodController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'luggage-storage-checker', name: 'Left Luggage / Baggage Storage', icon: '🧳', category: 'On the Ground',
    controller: '../controllers/luggageStorageController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'public-restroom-checker', name: 'Public Restroom Availability', icon: '🚻', category: 'On the Ground',
    controller: '../controllers/publicRestroomController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },

  // --- Local Rules ---
  { slug: 'alcohol-checker', name: 'Alcohol Laws', icon: '🍷', category: 'Local Rules',
    controller: '../controllers/alcoholController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'drinking-age-checker', name: 'Legal Drinking Age', icon: '🍺', category: 'Local Rules',
    controller: '../controllers/drinkingAgeController', conditional: 'age',
    buildArgs: (trip) => ({ country: trip.destination, age: trip.age }) },
  { slug: 'smoking-vaping-checker', name: 'Smoking & Vaping', icon: '🚬', category: 'Local Rules',
    controller: '../controllers/smokingVapingController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'drone-checker', name: 'Drone Rules', icon: '🛸', category: 'Local Rules',
    controller: '../controllers/droneController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'vpn-censorship-checker', name: 'Internet Censorship & VPN', icon: '🌐', category: 'Local Rules',
    controller: '../controllers/vpnCensorshipController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'dress-code-checker', name: 'Dress Code', icon: '👗', category: 'Local Rules',
    controller: '../controllers/dressCodeController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'etiquette-checker', name: 'Local Etiquette', icon: '🤝', category: 'Local Rules',
    controller: '../controllers/etiquetteController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'punctuality-checker', name: 'Punctuality & Time Culture', icon: '⏰', category: 'Local Rules',
    controller: '../controllers/punctualityController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'gift-giving-checker', name: 'Gift-Giving Etiquette', icon: '🎁', category: 'Local Rules',
    controller: '../controllers/giftGivingController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'waste-disposal-checker', name: 'Recycling & Waste Disposal', icon: '♻️', category: 'Local Rules',
    controller: '../controllers/wasteDisposalController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'queue-culture-checker', name: 'Queue Culture', icon: '🚶', category: 'Local Rules',
    controller: '../controllers/queueCultureController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'medication-legality-checker', name: 'Medication Legality', icon: '💊', category: 'Local Rules',
    controller: '../controllers/medicationLegalityController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'rental-age-checker', name: 'Car Rental Age', icon: '🚙', category: 'Local Rules',
    controller: '../controllers/rentalAgeController', conditional: 'age',
    buildArgs: (trip) => ({ country: trip.destination, age: trip.age }) },
  { slug: 'car-rental-insurance-checker', name: 'Car Rental Deposit & Insurance', icon: '🚗', category: 'Local Rules',
    controller: '../controllers/carRentalInsuranceController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'lgbtq-travel-safety-checker', name: 'LGBTQ+ Travel Safety', icon: '🏳️‍🌈', category: 'Local Rules',
    controller: '../controllers/lgbtqSafetyController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
  { slug: 'photography-permit-checker', name: 'Photography & Filming Rules', icon: '📷', category: 'Local Rules',
    controller: '../controllers/photographyPermitController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },

  // --- Pet Travel ---
  { slug: 'pet-travel-checker', name: 'Traveling with Pets', icon: '🐾', category: 'Pet Travel',
    controller: '../controllers/petTravelController', conditional: null,
    buildArgs: (trip) => ({ country: trip.destination }) },
];

// Fixed display order for categories in the PDF/preview.
const CATEGORY_ORDER = [
  'Documents & Entry', 'Money', 'Health & Safety', 'On the Ground', 'Local Rules', 'Pet Travel',
];

// Runs every applicable tool for a trip, skipping conditional tools whose
// required field wasn't provided and tolerating any single tool throwing
// (e.g. an edge-case country/age combination) without failing the whole
// brief — a missing section is better than no brief at all.
function computeTripBriefSections(trip) {
  const sections = [];
  for (const tool of TOOLS) {
    if (tool.conditional && !trip[tool.conditional]) continue;
    try {
      // eslint-disable-next-line global-require
      const controller = require(tool.controller);
      const result = controller.computeResult(tool.buildArgs(trip));
      sections.push({ slug: tool.slug, name: tool.name, icon: tool.icon, category: tool.category, result });
    } catch (err) {
      console.warn(`Trip Brief: skipping ${tool.slug} for ${trip.destination} — ${err.message}`);
    }
  }
  return sections;
}

// Groups already-computed sections by category, in CATEGORY_ORDER, dropping
// any category that ended up with zero sections (e.g. Pet Travel data gap).
function groupSectionsByCategory(sections) {
  const byCategory = {};
  for (const section of sections) {
    if (!byCategory[section.category]) byCategory[section.category] = [];
    byCategory[section.category].push(section);
  }
  return CATEGORY_ORDER
    .map(category => ({ category, sections: byCategory[category] || [] }))
    .filter(group => group.sections.length > 0);
}

// Countries safe to offer as a Trip Brief destination — the verified
// intersection of every one of the 35 tools above's own country roster.
// This exists because the 54 free tools were NOT all built against one
// shared country list: 14 of the 35 tools here were built in earlier
// phases of the project, before the country roster was standardized,
// against an older resort/island-oriented list. Those 14 controllers
// (alcohol, currency, customs, driving, drone, emergency, health,
// language, petTravel, plug, rideshare, sim, tipping, water) have since
// each had a 'united-states' entry added, closing the original gap.
// Offering a destination outside this intersection would silently
// produce an incomplete paid PDF (some tools throwing "Unknown country"
// and being dropped from the brief with no visible warning to the
// buyer) — this list is the honest, complete set.
const SAFE_DESTINATIONS = [
  { slug: 'argentina', name: 'Argentina' },
  { slug: 'australia', name: 'Australia' },
  { slug: 'austria', name: 'Austria' },
  { slug: 'brazil', name: 'Brazil' },
  { slug: 'canada', name: 'Canada' },
  { slug: 'colombia', name: 'Colombia' },
  { slug: 'costa-rica', name: 'Costa Rica' },
  { slug: 'czech-republic', name: 'Czech Republic' },
  { slug: 'france', name: 'France' },
  { slug: 'germany', name: 'Germany' },
  { slug: 'greece', name: 'Greece' },
  { slug: 'iceland', name: 'Iceland' },
  { slug: 'india', name: 'India' },
  { slug: 'israel', name: 'Israel' },
  { slug: 'italy', name: 'Italy' },
  { slug: 'japan', name: 'Japan' },
  { slug: 'kenya', name: 'Kenya' },
  { slug: 'mexico', name: 'Mexico' },
  { slug: 'morocco', name: 'Morocco' },
  { slug: 'netherlands', name: 'Netherlands' },
  { slug: 'new-zealand', name: 'New Zealand' },
  { slug: 'peru', name: 'Peru' },
  { slug: 'portugal', name: 'Portugal' },
  { slug: 'south-korea', name: 'South Korea' },
  { slug: 'spain', name: 'Spain' },
  { slug: 'sweden', name: 'Sweden' },
  { slug: 'switzerland', name: 'Switzerland' },
  { slug: 'thailand', name: 'Thailand' },
  { slug: 'turkey', name: 'Turkey' },
  { slug: 'united-arab-emirates', name: 'United Arab Emirates' },
  { slug: 'united-kingdom', name: 'United Kingdom' },
  { slug: 'united-states', name: 'United States' },
  { slug: 'vietnam', name: 'Vietnam' },
];
const SAFE_DESTINATION_SLUGS = new Set(SAFE_DESTINATIONS.map(d => d.slug));

module.exports = {
  TOOLS, CATEGORY_ORDER, computeTripBriefSections, groupSectionsByCategory,
  SAFE_DESTINATIONS, SAFE_DESTINATION_SLUGS,
};
