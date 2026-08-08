const pool = require('../config/database');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const toolLeadEmailSequence = require('../services/toolLeadEmailSequence');

// Public transit card/pass per destination, reused from Tool #1's 80-city
// list. hasSystem is false for destinations with no dedicated visitor-
// relevant transit card (small islands, resort towns, cash-only bus
// networks) — the note explains the practical alternative there instead.
const DESTINATIONS = {
  paris: { name: 'Paris', hasSystem: true, cardName: 'Navigo Easy', whereToBuy: 'any metro station ticket machine or RATP window', note: 'The reusable Navigo Easy card works for metro, bus, and RER — load individual tickets (a carnet of 10) or a day pass depending on how much you\'ll ride.' },
  london: { name: 'London', hasSystem: true, cardName: 'Oyster card', whereToBuy: 'Tube stations, newsagents, or just tap a contactless card/phone directly', note: 'Tapping a contactless debit/credit card or phone is now easier than buying an Oyster card for most visitors — fares are automatically capped daily.' },
  rome: { name: 'Rome', hasSystem: true, cardName: 'BIT ticket / Roma Pass', whereToBuy: 'metro stations, tobacco shops (tabacchi), or newsstands', note: 'A single BIT ticket covers 100 minutes of bus, tram, or metro travel; the Roma Pass adds museum entry if you\'re sightseeing heavily.' },
  barcelona: { name: 'Barcelona', hasSystem: true, cardName: 'T-Casual / Hola BCN card', whereToBuy: 'metro station ticket machines', note: 'The T-Casual (10 rides) is the best value for most visitors; the Hola BCN card offers unlimited rides for a set number of days.' },
  amsterdam: { name: 'Amsterdam', hasSystem: true, cardName: 'OV-chipkaart / GVB day ticket', whereToBuy: 'metro/tram stations, Schiphol Airport, or GVB ticket machines', note: 'A disposable OV-chipkaart or a GVB day pass covers trams, buses, and the metro throughout the city.' },
  lisbon: { name: 'Lisbon', hasSystem: true, cardName: 'Viva Viagem card', whereToBuy: 'metro station machines or kiosks', note: 'The reloadable Viva Viagem card covers metro, trams (including the famous Tram 28), buses, and funiculars.' },
  dublin: { name: 'Dublin', hasSystem: true, cardName: 'Leap Card', whereToBuy: 'newsagents, Dublin Airport, or online', note: 'The Leap Card covers buses, DART trains, and the Luas tram, with fares capped lower than paying cash.' },
  athens: { name: 'Athens', hasSystem: true, cardName: 'ATH.ENA Ticket card', whereToBuy: 'metro station machines', note: 'A reloadable ATH.ENA card covers metro, bus, tram, and trolley — a 90-minute ticket lets you transfer freely.' },
  reykjavik: { name: 'Reykjavik', hasSystem: false, cardName: null, whereToBuy: null, note: 'Reykjavik has a limited but functional city bus system (Strætó, pay via app or exact cash) — most visitors rely on walking, a rental car, or tours instead.' },
  madrid: { name: 'Madrid', hasSystem: true, cardName: 'Tarjeta Multi', whereToBuy: 'metro station machines', note: 'The reloadable Tarjeta Multi covers metro, bus, and commuter rail — a 10-ride Metrobús ticket is the best value for short stays.' },
  venice: { name: 'Venice', hasSystem: true, cardName: 'Venezia Unica / ACTV vaporetto pass', whereToBuy: 'ACTV ticket booths near major vaporetto stops', note: 'Water buses (vaporetti) are the city\'s actual public transit — a multi-day ACTV pass is worth it if you\'re island-hopping or riding often.' },
  prague: { name: 'Prague', hasSystem: true, cardName: 'Lítačka card / transfer ticket', whereToBuy: 'metro station machines or newsstands', note: 'A 90-minute transfer ticket covers metro, tram, and bus — a 24 or 72-hour pass is better value if you\'re riding a lot.' },
  vienna: { name: 'Vienna', hasSystem: true, cardName: 'Wiener Linien ticket', whereToBuy: 'metro station machines or tobacco shops (Trafik)', note: 'A 24, 48, or 72-hour ticket covers metro, tram, and bus with unlimited rides — excellent value for sightseeing-heavy visits.' },
  berlin: { name: 'Berlin', hasSystem: true, cardName: 'BVG Tageskarte (day ticket)', whereToBuy: 'metro station machines or the BVG app', note: 'A Tageskarte (day ticket) covers U-Bahn, S-Bahn, tram, and bus across the zones you choose.' },
  santorini: { name: 'Santorini', hasSystem: false, cardName: null, whereToBuy: null, note: 'Santorini\'s public buses run fixed routes between towns with cash fares paid to the conductor — many visitors also rely on rental ATVs or taxis.' },
  tokyo: { name: 'Tokyo', hasSystem: true, cardName: 'Suica or Pasmo card', whereToBuy: 'ticket machines at any train or subway station', note: 'A rechargeable Suica or Pasmo card works across nearly all trains, subways, and buses in Japan, and even at convenience stores — genuinely essential.' },
  bangkok: { name: 'Bangkok', hasSystem: true, cardName: 'Rabbit Card (BTS)', whereToBuy: 'BTS Skytrain stations', note: 'The Rabbit Card covers the BTS Skytrain; the MRT subway uses a separate card — between them and app-based taxis, you rarely need a car.' },
  bali: { name: 'Bali', hasSystem: false, cardName: null, whereToBuy: null, note: 'Bali has no significant public transit network — ride-hailing apps (Grab/Gojek) and scooter rentals are how most visitors get around.' },
  singapore: { name: 'Singapore', hasSystem: true, cardName: 'EZ-Link card', whereToBuy: 'MRT stations or 7-Eleven stores', note: 'The EZ-Link card covers the MRT, buses, and even some retail purchases — one of the easiest transit systems in the world for visitors.' },
  seoul: { name: 'Seoul', hasSystem: true, cardName: 'T-money card', whereToBuy: 'convenience stores (CU, GS25) or subway station machines', note: 'The T-money card covers the subway and buses, with automatic transfer discounts, and even works in some taxis.' },
  'hong-kong': { name: 'Hong Kong', hasSystem: true, cardName: 'Octopus card', whereToBuy: 'MTR stations or convenience stores', note: 'The Octopus card covers the MTR, buses, trams, and even the Star Ferry — also usable at many shops and restaurants.' },
  sydney: { name: 'Sydney', hasSystem: true, cardName: 'Opal card', whereToBuy: 'convenience stores, newsagents, or online', note: 'The Opal card covers trains, buses, ferries, and light rail, with fares automatically capped daily and weekly.' },
  'ho-chi-minh-city': { name: 'Ho Chi Minh City', hasSystem: false, cardName: null, whereToBuy: null, note: 'Public buses exist and take cash fares, but most visitors rely on ride-hailing apps like Grab for taxis and motorbike rides.' },
  manila: { name: 'Manila', hasSystem: true, cardName: 'Beep card', whereToBuy: 'LRT/MRT stations', note: 'The Beep card covers Manila\'s LRT and MRT lines — jeepneys and regular buses still generally run on cash.' },
  auckland: { name: 'Auckland', hasSystem: true, cardName: 'AT HOP card', whereToBuy: 'convenience stores or train/bus stations', note: 'The AT HOP card covers buses, trains, and ferries across Auckland at a lower fare than paying cash.' },
  phuket: { name: 'Phuket', hasSystem: false, cardName: null, whereToBuy: null, note: 'Phuket has no significant public transit network — songthaews (shared trucks), taxis, and scooter rentals are how most visitors get around.' },
  'kuala-lumpur': { name: 'Kuala Lumpur', hasSystem: true, cardName: "Touch 'n Go card", whereToBuy: 'LRT/MRT stations or convenience stores', note: "The Touch 'n Go card covers the LRT, MRT, monorail, and buses, and even highway tolls." },
  beijing: { name: 'Beijing', hasSystem: true, cardName: 'Yikatong card', whereToBuy: 'subway station machines', note: 'The reloadable Yikatong card covers the subway and buses across the city.' },
  delhi: { name: 'Delhi', hasSystem: true, cardName: 'Delhi Metro smart card', whereToBuy: 'metro station counters', note: 'The Delhi Metro smart card covers the metro system, by far the easiest way to get around the city while avoiding traffic.' },
  maldives: { name: 'Maldives', hasSystem: false, cardName: null, whereToBuy: null, note: 'There\'s no public transit system relevant to visitors — inter-island transport is by resort boat or seaplane transfer.' },
  cancun: { name: 'Cancún', hasSystem: false, cardName: null, whereToBuy: null, note: 'Local buses (R-1/R-2 routes) running along the Hotel Zone are cash-only and cheap — most visitors also use taxis or rental cars.' },
  'punta-cana': { name: 'Punta Cana', hasSystem: false, cardName: null, whereToBuy: null, note: 'Punta Cana has no public transit system relevant to visitors — resorts and taxis are the standard way to get around.' },
  'san-juan': { name: 'San Juan', hasSystem: false, cardName: null, whereToBuy: null, note: 'San Juan has a limited public bus network (AMA, cash fares); most visitors rely on rental cars, taxis, or ride-hailing apps.' },
  nassau: { name: 'Nassau', hasSystem: false, cardName: null, whereToBuy: null, note: 'Nassau\'s jitney buses are cash-only and a cheap way to get around New Providence island.' },
  'montego-bay': { name: 'Montego Bay', hasSystem: false, cardName: null, whereToBuy: null, note: 'Jamaica has no unified transit card — route taxis and resort transfers are how most visitors get around.' },
  'cabo-san-lucas': { name: 'Cabo San Lucas', hasSystem: false, cardName: null, whereToBuy: null, note: 'No public transit card here — taxis, rental cars, and resort shuttles are standard.' },
  aruba: { name: 'Aruba', hasSystem: false, cardName: null, whereToBuy: null, note: 'Aruba has a public bus system (Arubus) but it runs on cash fares with no card — most visitors rent a car or use taxis.' },
  'turks-and-caicos': { name: 'Turks and Caicos', hasSystem: false, cardName: null, whereToBuy: null, note: 'No public transit system here — taxis and rental cars are standard.' },
  'st-lucia': { name: 'St. Lucia', hasSystem: false, cardName: null, whereToBuy: null, note: 'No public transit card — shared minibuses run on cash fares along fixed routes.' },
  'san-jose-costa-rica': { name: 'San José', hasSystem: false, cardName: null, whereToBuy: null, note: 'Costa Rica\'s buses are affordable and cash-based with no unified card system — most visitors combine buses with shuttles or a rental car.' },
  vancouver: { name: 'Vancouver', hasSystem: true, cardName: 'Compass Card', whereToBuy: 'SkyTrain stations or London Drugs stores', note: 'The Compass Card covers the SkyTrain, SeaBus, and buses across Metro Vancouver.' },
  toronto: { name: 'Toronto', hasSystem: true, cardName: 'PRESTO card', whereToBuy: 'subway stations or convenience stores', note: 'The PRESTO card covers the TTC subway, streetcars, and buses across Toronto.' },
  montreal: { name: 'Montreal', hasSystem: true, cardName: 'OPUS card', whereToBuy: 'metro station machines', note: 'The OPUS card covers the Metro and buses across Montreal.' },
  'quebec-city': { name: 'Quebec City', hasSystem: true, cardName: 'OPUS card (RTC network)', whereToBuy: 'bus terminals or select pharmacies', note: 'The OPUS card covers Quebec City\'s RTC bus network — there\'s no metro/subway system here.' },
  calgary: { name: 'Calgary', hasSystem: true, cardName: 'Calgary Transit fare card', whereToBuy: 'C-Train stations or convenience stores', note: 'Calgary\'s C-Train light rail and buses accept a reloadable fare card, though many visitors just buy day passes.' },
  dubai: { name: 'Dubai', hasSystem: true, cardName: 'Nol card', whereToBuy: 'metro stations', note: 'The Nol card covers the Dubai Metro, buses, and even the water taxis (abra) — the metro is fast, clean, and very tourist-friendly.' },
  marrakech: { name: 'Marrakech', hasSystem: false, cardName: null, whereToBuy: null, note: 'No notable transit card here — petit taxis and walking within the medina are how most visitors get around.' },
  'cape-town': { name: 'Cape Town', hasSystem: true, cardName: 'MyCiTi card', whereToBuy: 'MyCiTi stations', note: 'The MyCiTi bus system with its reloadable card covers key tourist routes, though many visitors also use ride-hailing apps or a rental car for flexibility.' },
  'rio-de-janeiro': { name: 'Rio de Janeiro', hasSystem: true, cardName: 'RioCard', whereToBuy: 'metro stations', note: 'The RioCard covers the metro, which is the safest and most efficient way to move between major tourist areas.' },
  'buenos-aires': { name: 'Buenos Aires', hasSystem: true, cardName: 'SUBE card', whereToBuy: 'kiosks and subte (subway) stations', note: 'The SUBE card covers the subte (subway), buses (colectivos), and trains across the city — essential and very cheap.' },
  bogota: { name: 'Bogotá', hasSystem: true, cardName: 'TuLlave card', whereToBuy: 'TransMilenio stations', note: 'The TuLlave card covers the TransMilenio bus rapid transit system, Bogotá\'s main public transit backbone.' },
  lima: { name: 'Lima', hasSystem: true, cardName: 'Metropolitano card', whereToBuy: 'Metropolitano stations', note: 'The reloadable card covers the Metropolitano bus rapid transit line, though most tourist areas are still best explored by taxi or rideshare.' },
  cusco: { name: 'Cusco', hasSystem: false, cardName: null, whereToBuy: null, note: 'No notable transit card here — walking, taxis, and organized tours cover nearly everything visitors need.' },
  santiago: { name: 'Santiago', hasSystem: true, cardName: 'Bip! card', whereToBuy: 'metro stations', note: 'The Bip! card covers the Santiago Metro and buses, and is required — cash isn\'t accepted on board.' },
  cartagena: { name: 'Cartagena', hasSystem: false, cardName: null, whereToBuy: null, note: 'No notable transit card here — the walled city is walkable, and taxis cover everything else.' },
  zurich: { name: 'Zurich', hasSystem: true, cardName: 'SBB / ZVV ticket (or Swiss Travel Pass)', whereToBuy: 'train station machines', note: 'Switzerland\'s transit is famously punctual — a day pass or Swiss Travel Pass covers trains, trams, and buses across the region.' },
  munich: { name: 'Munich', hasSystem: true, cardName: 'MVV day ticket', whereToBuy: 'station machines', note: 'An MVV day ticket covers the U-Bahn, S-Bahn, tram, and bus — good value if you\'re riding more than a couple of times.' },
  milan: { name: 'Milan', hasSystem: true, cardName: 'ATM card', whereToBuy: 'metro station machines', note: 'A rechargeable ATM card covers the metro, tram, and bus — a 90-minute ticket lets you transfer freely.' },
  copenhagen: { name: 'Copenhagen', hasSystem: true, cardName: 'Rejsekort', whereToBuy: 'station machines or 7-Eleven', note: 'The Rejsekort covers the Metro, S-train, and buses — a City Pass is simpler for short visits.' },
  stockholm: { name: 'Stockholm', hasSystem: true, cardName: 'SL Access card', whereToBuy: 'metro station machines or Pressbyrån kiosks', note: 'The SL Access card covers the Tunnelbana (metro), buses, and commuter trains.' },
  budapest: { name: 'Budapest', hasSystem: true, cardName: 'BKK travel pass', whereToBuy: 'metro station machines', note: 'A 24 or 72-hour travel pass covers the metro, tram, and bus with unlimited rides — excellent value for sightseeing.' },
  istanbul: { name: 'Istanbul', hasSystem: true, cardName: 'Istanbulkart', whereToBuy: 'kiosks near metro/tram/ferry stops', note: 'The Istanbulkart covers the metro, tram, bus, and even ferries across the Bosphorus — genuinely essential and gets cheaper with each transfer.' },
  edinburgh: { name: 'Edinburgh', hasSystem: false, cardName: null, whereToBuy: null, note: 'No reloadable transit card here — buy single or day tickets in cash or via the Lothian Buses app.' },
  nice: { name: 'Nice', hasSystem: true, cardName: "Ligne d'Azur card", whereToBuy: 'tram station machines', note: "The Ligne d'Azur card covers the tram and buses across Nice and the surrounding Côte d'Azur." },
  taipei: { name: 'Taipei', hasSystem: true, cardName: 'EasyCard', whereToBuy: 'MRT stations or convenience stores', note: 'The EasyCard covers the MRT, buses, and even YouBike bike-share — genuinely essential and also usable at convenience stores.' },
  colombo: { name: 'Colombo', hasSystem: false, cardName: null, whereToBuy: null, note: 'No reloadable transit card here — tuk-tuks (negotiated or metered) and ride-hailing apps are how most visitors get around.' },
  'siem-reap': { name: 'Siem Reap', hasSystem: false, cardName: null, whereToBuy: null, note: 'No public transit system — tuk-tuks are the standard way to get around and to Angkor Wat.' },
  fiji: { name: 'Fiji', hasSystem: false, cardName: null, whereToBuy: null, note: 'No unified transit card — local buses run on cash fares, and taxis or resort transfers cover the rest.' },
  'bora-bora': { name: 'Bora Bora', hasSystem: false, cardName: null, whereToBuy: null, note: 'No public transit system — resort boat shuttles, bikes, and taxis are how visitors get around.' },
  'panama-city': { name: 'Panama City', hasSystem: true, cardName: 'Metrobús card', whereToBuy: 'metro/Metrobús stations', note: 'The Metrobús card covers Panama City\'s metro and bus system.' },
  'belize-city': { name: 'Belize City', hasSystem: false, cardName: null, whereToBuy: null, note: 'No notable transit card here — regional buses run on cash fares, and taxis cover the rest.' },
  'grand-cayman': { name: 'Grand Cayman', hasSystem: false, cardName: null, whereToBuy: null, note: 'No public transit card — buses run on cash fares, and rental cars or taxis are common.' },
  antigua: { name: 'Antigua', hasSystem: false, cardName: null, whereToBuy: null, note: 'No public transit card — shared buses run on cash fares along fixed routes.' },
  curacao: { name: 'Curaçao', hasSystem: false, cardName: null, whereToBuy: null, note: 'No public transit card — buses (konvooi) run on cash fares, and rental cars are common.' },
  doha: { name: 'Doha', hasSystem: true, cardName: 'Karwa Smartcard', whereToBuy: 'metro stations', note: 'The Karwa Smartcard covers the Doha Metro, which is modern, clean, and easy for visitors to use.' },
  'tel-aviv': { name: 'Tel Aviv', hasSystem: true, cardName: 'Rav-Kav card', whereToBuy: 'train stations or kiosks', note: 'The Rav-Kav card covers buses and trains across Tel Aviv and greater Israel.' },
  'abu-dhabi': { name: 'Abu Dhabi', hasSystem: true, cardName: 'Hafilat card', whereToBuy: 'bus stations', note: 'The Hafilat card covers Abu Dhabi\'s public bus network — there\'s no metro system yet, so taxis fill in the gaps.' },
  zanzibar: { name: 'Zanzibar', hasSystem: false, cardName: null, whereToBuy: null, note: 'No public transit card — dala-dala shared trucks run on cash fares, and taxis or scooters cover the rest.' },
  nairobi: { name: 'Nairobi', hasSystem: false, cardName: null, whereToBuy: null, note: 'No unified transit card — matatus (shared minibuses) run on cash fares, though most visitors rely on ride-hailing apps for safety and convenience.' },
  casablanca: { name: 'Casablanca', hasSystem: true, cardName: 'Casablanca tramway card', whereToBuy: 'tram station machines', note: 'A reloadable card covers Casablanca\'s tramway; buses and petit taxis fill in the rest of the city.' },
};

function computeResult({ destination }) {
  const data = DESTINATIONS[destination];
  if (!data) throw new Error('Unknown destination');

  const headline = data.hasSystem
    ? `${data.name}'s public transit card is the ${data.cardName}.`
    : `${data.name} has no dedicated public transit card.`;

  return {
    destination, destinationName: data.name, hasSystem: data.hasSystem,
    cardName: data.cardName, whereToBuy: data.whereToBuy, note: data.note, headline,
  };
}

// @desc Instant lookup, no email required
// @route POST /api/tools/transit-checker/calculate
// @access Public
exports.calculateTransit = (req, res) => {
  try {
    const { destination } = req.body;
    if (!destination) return res.status(400).json({ success: false, error: 'destination is required' });
    const result = computeResult({ destination });
    res.status(200).json({ success: true, result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc Capture email as a lead, generate + stream a PDF, send confirmation email
// @route POST /api/tools/transit-checker/pdf
// @access Public
exports.generateTransitPdf = async (req, res) => {
  try {
    const { email, firstName, sourcePage, destination } = req.body;
    if (!email || !destination) {
      return res.status(400).json({ success: false, error: 'email and destination are required' });
    }

    const result = computeResult({ destination });

    const leadResult = await pool.query(
      `INSERT INTO tool_leads (email, first_name, tool_slug, input_data, result_data, pdf_generated_at, source_page)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       RETURNING id`,
      [email, firstName || null, 'transit-checker',
        JSON.stringify({ destination }), JSON.stringify(result), sourcePage || null]
    );

    toolLeadEmailSequence.initializeToolLeadSequence(leadResult.rows[0].id, email, firstName).catch(err =>
      console.error('Failed to initialize lead email sequence:', err.message)
    );

    const doc = pdfService.createBrandedDoc(`${result.destinationName} Public Transit Guide`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transit-checker.pdf"');
    doc.pipe(res);

    pdfService.heading(doc, result.headline);
    pdfService.paragraph(doc, result.note);

    if (result.hasSystem) {
      pdfService.highlightBox(doc, `Buy it at: ${result.whereToBuy}`);
    }

    pdfService.heading(doc, 'Getting around smoothly');
    pdfService.bulletList(doc, [
      result.hasSystem
        ? `Buy your ${result.cardName} as soon as you land — it usually saves both time and money versus single paper tickets.`
        : 'Download a ride-hailing app before you land, since that\'s typically the most reliable way to get around here.',
      'Screenshot your hotel address and a couple of key destinations before you land, in case you\'re not connected right away.',
      'Keep a little local cash on hand even in card-friendly cities — not every bus or small vendor takes contactless payment.',
      'Google Maps or Citymapper usually has accurate local transit routing built in, even for cities with less common card systems.',
    ]);

    pdfService.addFooterCTA(doc, destination);
    doc.end();

    emailService.sendEmail({
      to: email,
      subject: `🚇 Your ${result.destinationName} transit guide`,
      html: `<p>Hi ${firstName || 'there'},</p>
<p>Here's your transit check for ${result.destinationName}:</p>
<p style="background:#f0f4ff;padding:16px 20px;border-radius:8px;font-weight:bold;color:#1a2744;">${result.headline}</p>
<p>Want automatic price alerts and trip-planning tools that go beyond getting around? That's what TravelSmarter does.</p>
<p style="background:#fff7ed;border-left:4px solid #ff6b4a;padding:14px 18px;border-radius:6px;">🧭 <strong>Got other open questions about this trip?</strong> Get the full Trip Brief — visa, money, health, local laws, and more, combined into one PDF for $19.</p>
<p><a href="https://travelsmarterapp.com/trip-brief.html?destination=${destination}" style="background:#ff6b4a;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;">See Your Trip Brief →</a></p>
<p style="font-size:13px;color:#9ca3af;">Or unlock 50+ tools and ongoing updates with <a href="https://travelsmarterapp.com/sales-page.html" style="color:#ff6b4a;font-weight:bold;">TravelSmarter Pro →</a></p>
<p>Safe travels,<br>The TravelSmarter Team</p>`,
    }).catch(err => console.error('Failed to send transit-checker confirmation email:', err.message));

  } catch (error) {
    console.error('generateTransitPdf error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.DESTINATIONS = DESTINATIONS;
