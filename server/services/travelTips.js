/**
 * Travel Tips, Tricks & Hacks Database
 * Curated content for daily Twitter posts
 */

const travelTips = [
  // Flight Hacks
  {
    category: 'flights',
    tip: '✈️ Clear your browser cookies before booking flights! Airlines track your searches and may increase prices if you keep checking the same route.',
    hashtags: '#TravelHack #FlightDeals #SaveMoney'
  },
  {
    category: 'flights',
    tip: '🎫 Book flights on Tuesday-Wednesday for the cheapest fares. Sunday is the most expensive day to book. Plan ahead!',
    hashtags: '#BudgetTravel #FlightTips #TravelSmarter'
  },
  {
    category: 'flights',
    tip: '💡 Flying with a layover? The layover city is usually cheaper than direct flights. You get a stopover bonus!',
    hashtags: '#TravelHacks #FlightDeals #AdventureAwaits'
  },
  {
    category: 'flights',
    tip: '📱 Use incognito/private browser mode when searching for flights. Prevents dynamic pricing increases.',
    hashtags: '#ProTip #TravelHack #SmartTraveler'
  },
  {
    category: 'flights',
    tip: '🌍 Flying between Europe and USA? Check Scott\'s Cheap Flights weekly deals - often under €300 transatlantic!',
    hashtags: '#CheapFlights #TravelDeals #BudgetTravel'
  },

  // Hotel & Accommodation Hacks
  {
    category: 'hotels',
    tip: '🏨 Book hotels directly through their website instead of OTA. You often get perks: free wifi, room upgrades, late checkout.',
    hashtags: '#HotelHacks #TravelTips #SaveMoney'
  },
  {
    category: 'hotels',
    tip: '💰 Hotels offer better rates for longer stays. 7+ nights usually unlocks 20-40% discounts. Plan longer trips!',
    hashtags: '#AccommodationHacks #TravelTips #SmartBooking'
  },
  {
    category: 'hotels',
    tip: '📞 Call hotels directly 24 hours before arrival. You can negotiate rates or get free upgrades.',
    hashtags: '#HotelHacks #TravelTrick #ProTips'
  },
  {
    category: 'hotels',
    tip: '🌙 Staying midweek (Tue-Thu)? Hotels drop prices 30-50% compared to weekends. Plan accordingly!',
    hashtags: '#BudgetTravel #HotelDeals #SaveMoney'
  },
  {
    category: 'hotels',
    tip: '⭐ Check Airbnb for entire apartments instead of hotels. Often cheaper for groups and has kitchens to save on dining!',
    hashtags: '#AccommodationHacks #TravelSmarter #BudgetTrip'
  },

  // Dining & Food Hacks
  {
    category: 'dining',
    tip: '🍽️ Eat where locals eat, not tourist areas. Food is 50% cheaper and 100% better. Ask your hotel staff!',
    hashtags: '#TravelTip #FoodHack #LocalEats'
  },
  {
    category: 'dining',
    tip: '🕐 Lunch specials in Europe are 30-50% cheaper than dinner prices at the same restaurant. Eat your main meal at lunch!',
    hashtags: '#DiningHacks #BudgetTravel #SmartTraveler'
  },
  {
    category: 'dining',
    tip: '🥗 Visit grocery stores and markets instead of restaurants. Prepare picnic lunches and save hundreds per trip!',
    hashtags: '#BudgetTravel #TravelHack #SaveMoney'
  },
  {
    category: 'dining',
    tip: '☕ Free water in most European restaurants. Ask for "tap water" - it\\'s always free. Saves €3-5 per meal!',
    hashtags: '#TravelHacks #EuropeTips #BudgetFriendly'
  },

  // Transportation Hacks
  {
    category: 'transport',
    tip: '🚌 Take buses instead of trains when possible. Up to 70% cheaper while still comfortable and scenic!',
    hashtags: '#TransportHacks #BudgetTravel #TravelTips'
  },
  {
    category: 'transport',
    tip: '🚂 Book train tickets 6-8 weeks in advance for best European rail prices. Early bird saves 50%+',
    hashtags: '#TrainTips #EuropeTravel #SaveMoney'
  },
  {
    category: 'transport',
    tip: '🚕 Avoid airport taxis! Use Uber, public transport, or shuttle buses. Save €20-50 per transfer.',
    hashtags: '#TravelHack #AirportTips #BudgetTravel'
  },
  {
    category: 'transport',
    tip: '🎫 City tourism cards (Berlin Card, Paris Visite) save 30-40% on public transport + museum entries. Worth it!',
    hashtags: '#TravelTips #CityGuides #SaveMoney'
  },

  // Activity & Attraction Hacks
  {
    category: 'activities',
    tip: '🏛️ Many museums offer free admission 1-2 hours before closing. Perfect for budget travelers!',
    hashtags: '#MuseumHacks #BudgetTravel #ActivitiesTips'
  },
  {
    category: 'activities',
    tip: '🎫 Free walking tours available in most cities (tip-based). Best way to explore + learn local history!',
    hashtags: '#CityTours #FreeActivities #TravelHack'
  },
  {
    category: 'activities',
    tip: '⛪ Many churches/cathedrals are free to visit during off-hours. Check opening times!',
    hashtags: '#TravelTips #FreeAttractions #CultureTrip'
  },
  {
    category: 'activities',
    tip: '🏞️ Nature hikes and parks are usually FREE. Best views without breaking the bank!',
    hashtags: '#NatureLovers #FreeTravelActivities #AdventureAwaits'
  },

  // General Travel Hacks
  {
    category: 'general',
    tip: '📅 Travel during shoulder season (May, Sept, Oct) for best prices + fewer crowds. Win-win!',
    hashtags: '#TravelPlanning #BudgetTravel #SmartDates'
  },
  {
    category: 'general',
    tip: '💳 Use travel rewards credit cards for flights. You can get free flights with points!',
    hashtags: '#MilesHacks #RewardsPoints #FreeFlight'
  },
  {
    category: 'general',
    tip: '🧳 Pack light - carry-on only saves €30-50 per trip. Most airlines charge for checked bags!',
    hashtags: '#PackingHacks #BudgetTravel #TravelTips'
  },
  {
    category: 'general',
    tip: '🛡️ Travel insurance saves thousands in medical emergencies. €3-5/day is worth the protection!',
    hashtags: '#TravelSafety #ProTips #TravelSmarter'
  },
  {
    category: 'general',
    tip: '💬 Learn 5 key phrases in local language. You\'ll get better service & may unlock deals locals know!',
    hashtags: '#TravelTips #CulturalTips #LocalConnections'
  },
  {
    category: 'general',
    tip: '📱 Get an international SIM card or eSIM instead of roaming. Save 70% on phone bills!',
    hashtags: '#TravelHack #PhoneTips #SaveMoney'
  },
  {
    category: 'general',
    tip: '💰 Withdraw money from ATMs, not currency exchange booths. ATMs give better rates and lower fees.',
    hashtags: '#MoneyHacks #TravelTips #SmartTravel'
  },
  {
    category: 'general',
    tip: '🗺️ Download offline maps (Google Maps) before traveling. Navigate without paying for data!',
    hashtags: '#TravelApps #ProTips #SmartTraveling'
  },
  {
    category: 'general',
    tip: '🎒 Travel with locals on Couchsurfing or similar. Free accommodation + authentic experience!',
    hashtags: '#BudgetTravel #CommunityTravel #LocalExperience'
  },

  // Seasonal & Regional Tips
  {
    category: 'seasonal',
    tip: '❄️ Winter travel to Europe? Ski resorts + Christmas markets offer magical experiences at lower prices!',
    hashtags: '#WinterTravel #EuropeTrip #HolidayDeals'
  },
  {
    category: 'seasonal',
    tip: '☀️ Summer is peak season everywhere. Visit in May or Sept for summer weather + 40% cheaper prices!',
    hashtags: '#TravelPlanning #BudgetSeason #SmartDates'
  },
  {
    category: 'seasonal',
    tip: '🌧️ Rainy season = cheapest prices! Hotels drop rates 50%+ when it rains. Worth it for savings!',
    hashtags: '#BudgetTravel #SeasonalDeals #TravelHacks'
  },

  // TravelSmarter App Specific
  {
    category: 'app',
    tip: '🚀 Find flight deals 60-80% cheaper using TravelSmarter AI! Smart alerts sent to your phone. Download now!',
    hashtags: '#TravelSmarter #AppLife #SmartTraveler'
  },
  {
    category: 'app',
    tip: '💡 Get insider travel hacks curated by experts. TravelSmarter has 1000+ tips for every destination!',
    hashtags: '#TravelApp #ProTips #TravelSmarter'
  },
  {
    category: 'app',
    tip: '✨ Compare 100+ booking sites instantly. TravelSmarter finds the best deals in seconds, not hours!',
    hashtags: '#TravelTech #SmartBooking #TravelSmarter'
  },
  {
    category: 'app',
    tip: '📱 Smart Traveler plan: €9.99/month for all travel hacks + Elite plan: €29.99 for VIP deals!',
    hashtags: '#TravelSmarter #Pricing #Plans'
  }
];

/**
 * Get all tips
 */
function getAllTips() {
  return travelTips;
}

/**
 * Get random tip
 */
function getRandomTip() {
  const randomIndex = Math.floor(Math.random() * travelTips.length);
  return travelTips[randomIndex];
}

/**
 * Get tips by category
 */
function getTipsByCategory(category) {
  return travelTips.filter(tip => tip.category === category);
}

/**
 * Get random tip from category
 */
function getRandomTipByCategory(category) {
  const categoryTips = getTipsByCategory(category);
  if (categoryTips.length === 0) return getRandomTip();
  const randomIndex = Math.floor(Math.random() * categoryTips.length);
  return categoryTips[randomIndex];
}

/**
 * Get multiple random tips
 */
function getRandomTips(count = 5) {
  const tips = [];
  const indexesUsed = new Set();

  while (tips.length < Math.min(count, travelTips.length)) {
    const randomIndex = Math.floor(Math.random() * travelTips.length);
    if (!indexesUsed.has(randomIndex)) {
      tips.push(travelTips[randomIndex]);
      indexesUsed.add(randomIndex);
    }
  }

  return tips;
}

module.exports = {
  getAllTips,
  getRandomTip,
  getTipsByCategory,
  getRandomTipByCategory,
  getRandomTips
};
