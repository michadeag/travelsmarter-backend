const pool = require('../config/database');
const emailService = require('./emailService');

// 30-day drip sequence for leads captured by the free SEO tools (anyone who
// downloaded a PDF from one of the free-tool pages). Distinct from
// emailSequenceService.js's user-account sequences: these leads have no
// `users` row, so scheduling lives in its own tool_lead_scheduled_emails
// table (FK'd to tool_leads instead of users) rather than reusing
// scheduled_emails. Content mixes a practical tip, a cross-promoted tool,
// and — every 5th day — a TravelSmarter Pro pitch, cycling through all 30
// free tools over the 30 days (wrapping once the tool count exceeds 30).

const TOOL_LEAD_SEQUENCE_NAME = 'Free Tool Leads Sequence';

// ─── HELPERS (mirrors emailSequenceService.js's private helpers) ─────────────

function btn(url, label) {
  return `<a href="${url}" style="display:inline-block;background:#ff6b4a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-top:4px;">${label} →</a>`;
}
function tipBox(content) {
  return `<div style="background:#f0f4ff;border-left:4px solid #667eea;border-radius:0 8px 8px 0;padding:18px 20px;margin:22px 0;color:#1f2937;line-height:1.7;">${content}</div>`;
}
// Pitch-day box with two CTAs, ladder-style: the Trip Brief (one trip,
// $19, low-friction) as the primary button, TravelSmarter Pro (ongoing,
// $19/month) as a smaller secondary line — same pairing used in every
// individual tool's PDF/confirmation email (see pdfService.addFooterCTA).
function dualUpgradeBox(tripBriefText, proText) {
  return `<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:18px 20px;margin:22px 0;">
    <p style="margin:0 0 12px;font-size:14px;color:#92400e;">${tripBriefText}</p>
    <a href="{appUrl}/trip-brief.html" style="display:inline-block;background:#ff6b4a;color:white;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">Get My Trip Brief →</a>
    <p style="margin:16px 0 8px;font-size:12.5px;color:#92400e;">${proText}</p>
    <a href="{appUrl}/sales-page.html" style="display:inline-block;background:#1a2744;color:white;padding:9px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:12.5px;">See TravelSmarter Pro →</a>
  </div>`;
}
function h(text) {
  return `<h2 style="color:#1a2744;font-size:21px;font-weight:700;margin:0 0 16px;line-height:1.3;">${text}</h2>`;
}
function p(text) {
  return `<p style="color:#374151;margin:0 0 14px;line-height:1.75;font-size:15px;">${text}</p>`;
}
function small(text) {
  return `<p style="color:#9ca3af;font-size:13px;margin:16px 0 0;line-height:1.6;">${text}</p>`;
}

// ─── THE 30 FREE TOOLS ────────────────────────────────────────────────────────
// slug/name/url/teaser mirror free-travel-tools.html; hook is a short
// subject-line-style summary of tip, written once here.

const TOOLS = [
  { url: 'best-time-to-book-flights.html', icon: '📅', name: 'Best Time to Book Flights', hook: 'The 30-60 day flight booking window', tip: "Most airlines release their lowest fares in a window 30-60 days before departure — book too early or too late and you'll likely pay more." },
  { url: 'carry-on-size-checker.html', icon: '🧳', name: 'Carry-On Size Checker', hook: 'Gate fees cost more than booking fees', tip: "Budget carriers often charge more for a non-compliant carry-on at the gate than at booking — always check sizing before you fly, not after you've packed." },
  { url: 'visa-requirement-checker.html', icon: '🛂', name: 'Visa Requirement Checker', hook: 'The passport rule most travelers miss', tip: 'Passport validity rules trip up more travelers than visa rules — many countries require 6 months of validity beyond your travel dates, not just past your return date.' },
  { url: 'jet-lag-calculator.html', icon: '🕐', name: 'Jet Lag Calculator', hook: 'Adjust your sleep before you fly', tip: "Shifting your sleep schedule 1-2 days before you fly, in the direction of your destination's time zone, meaningfully reduces jet lag on arrival." },
  { url: 'packing-list-generator.html', icon: '🎒', name: 'Packing List Generator', hook: 'The #1 travel packing regret', tip: 'Overpacking is the most common travel regret — a climate-adjusted list built for your exact trip length beats a generic checklist every time.' },
  { url: 'travel-budget-calculator.html', icon: '💰', name: 'Travel Budget Calculator', hook: 'Where your travel budget really goes', tip: "Your biggest budget variable usually isn't flights or hotels — it's food and activities, which can swing your total cost by 30% or more depending on travel style." },
  { url: 'power-plug-checker.html', icon: '🔌', name: 'Power Plug & Voltage Checker', hook: 'Voltage matters more than plug shape', tip: 'Voltage mismatches, not just plug shape, can actually damage electronics — always check both before you pack an adapter.' },
  { url: 'tipping-calculator.html', icon: '💵', name: 'Tipping Calculator', hook: "Tipping norms aren't universal", tip: "Tipping expectations vary more than most travelers expect — what's generous in one country can be considered unusual in another." },
  { url: 'layover-checker.html', icon: '🛫', name: 'Layover Checker', hook: 'Airport connection times, decoded', tip: 'Published minimum connection times are often more conservative than they need to be, but terminal changes and budget-carrier gates eat time fast — always check the specific airport.' },
  { url: 'travel-health-checker.html', icon: '🩺', name: 'Travel Health Checker', hook: 'Some vaccines need weeks of lead time', tip: 'Some vaccines need to be given weeks before departure to take effect — checking a month out, not the week before, gives you real options.' },
  { url: 'water-safety-checker.html', icon: '💧', name: 'Tap Water Safety Checker', hook: 'The tap water risk everyone forgets', tip: 'Ice cubes and salads washed in tap water are the most commonly overlooked risks, even when travelers already know not to drink it directly.' },
  { url: 'flight-carbon-calculator.html', icon: '🌍', name: 'Flight Carbon Calculator', hook: "One flight, a month's worth of CO2", tip: 'A single long-haul flight can emit more CO2 than many people produce in a month — cabin class alone can double or triple your personal share.' },
  { url: 'airport-transfer-calculator.html', icon: '🚕', name: 'Airport Transfer Cost Calculator', hook: 'Pre-booked transfers beat airport taxis', tip: 'Pre-booked airport transfers are often cheaper than an on-arrival taxi, especially at airports with long queues or a reputation for overcharging.' },
  { url: 'baggage-fee-calculator.html', icon: '🧳', name: 'Checked Baggage Fee Calculator', hook: 'Book your bag online, not at the airport', tip: 'Adding a checked bag during booking is almost always cheaper than paying at the airport — sometimes by 2-3x on budget carriers.' },
  { url: 'emergency-number-checker.html', icon: '🚨', name: 'Emergency Number Checker', hook: "911 doesn't work everywhere", tip: 'Emergency numbers vary by country — knowing the local number before you need it saves precious time in an actual emergency.' },
  { url: 'rideshare-checker.html', icon: '🚗', name: 'Rideshare Availability Checker', hook: "Uber isn't everywhere you'd expect", tip: 'Uber has fully exited several major markets (Southeast Asia, mainland China) in favor of local apps — assuming it will be there can leave you stranded.' },
  { url: 'driving-checker.html', icon: '🛣️', name: 'Driving Side & IDP Checker', hook: "Your IDP isn't a license by itself", tip: 'An International Driving Permit is a translation document, not a standalone license — it must be carried alongside your regular license at all times.' },
  { url: 'sim-checker.html', icon: '📶', name: 'SIM Card & eSIM Checker', hook: "Airport SIM kiosks aren't the cheapest", tip: 'Airport SIM kiosks are convenient but rarely the cheapest option — an eSIM bought in advance often beats it on both price and setup time.' },
  { url: 'delay-compensation-checker.html', icon: '💸', name: 'Flight Delay & Cancellation Compensation Checker', hook: 'You have to file for EU261 compensation', tip: "EU261 compensation is often missed simply because travelers don't know it exists — it isn't automatic, you have to file a claim." },
  { url: 'customs-checker.html', icon: '🛃', name: 'Duty-Free & Customs Allowance Checker', hook: 'Declaring honestly beats under-declaring', tip: "Declaring everything, even amounts over your exemption, is safer than under-declaring — you just pay duty on the excess, with no penalty for being honest." },
  { url: 'best-month-checker.html', icon: '☀️', name: 'Best Time to Visit Checker', hook: 'Best weather ≠ best flight prices', tip: "The best weather and the cheapest flights rarely land on the same weeks for a destination — worth checking both separately before locking in dates." },
  { url: 'currency-checker.html', icon: '💳', name: 'Currency & Cash Culture Checker', hook: "Even 'modern' countries can be cash-heavy", tip: "Some of the most developed economies are surprisingly cash-heavy in daily life — don't assume card-only just because a country feels modern." },
  { url: 'language-checker.html', icon: '🗣️', name: 'English Proficiency & Language Checker', hook: 'Five words that go a long way', tip: "Learning five words — hello, please, thank you, excuse me, the check please — goes further than most travelers expect, even where English is common." },
  { url: 'transit-checker.html', icon: '🚇', name: 'Public Transport Pass Checker', hook: 'Your transit card pays for itself fast', tip: "A city's transit card is almost always worth it even for a 2-3 day visit — it's usually faster and cheaper than buying single tickets each ride." },
  { url: 'airport-amenities-checker.html', icon: '📶', name: 'Airport WiFi & Amenities Checker', hook: 'Some airports are worth the layover', tip: 'A handful of airports have turned the terminal itself into a destination — worth knowing before you rush through a long layover instead of enjoying it.' },
  { url: 'drone-checker.html', icon: '🚁', name: 'Drone & Photography Laws Checker', hook: "Drone permits can't be rushed", tip: "Drone registration has to happen before your trip in most countries — there's rarely a same-day approval option once you've already landed." },
  { url: 'alcohol-checker.html', icon: '🍷', name: 'Alcohol Laws & Dry Countries Checker', hook: 'Election-day alcohol bans, explained', tip: 'Some countries ban retail alcohol sales on election days, even where alcohol is normally freely available — a rule most travelers never think to check.' },
  { url: 'seat-pitch-checker.html', icon: '💺', name: 'Seat Pitch & Legroom Checker', hook: 'Skip the paid seat upgrade — try this', tip: "Exit row and bulkhead seats often beat the paid 'extra legroom' product, sometimes for a lower fee — check the seat map, not just the fare name." },
  { url: 'insurance-cost-estimator.html', icon: '🧳', name: 'Travel Insurance Cost Estimator', hook: 'What travel insurance actually costs', tip: 'Travel insurance typically runs 4-12% of your trip cost — the older you are and the more adventurous the trip, the higher that percentage climbs.' },
  { url: 'pet-travel-checker.html', icon: '🐾', name: 'Pet Travel & Import Requirements Checker', hook: 'The pet-travel prep that takes months', tip: 'Pet import rules for rabies-free destinations (Australia, Iceland, several Caribbean islands) often require blood tests with mandatory waiting periods — this is one prep task that can\'t be rushed.' },
  { url: 'passport-validity-checker.html', icon: '🛂', name: 'Passport Validity Checker', hook: 'The 6-month passport rule that strands travelers', tip: 'Many countries require your passport to stay valid 6 months beyond your entry date, not just past your return — airlines enforce this at check-in, before you even reach immigration.' },
  { url: 'public-holiday-checker.html', icon: '📅', name: 'Public Holiday & Bank Closure Checker', hook: 'The trip-planning mistake nobody checks for', tip: "Landing during a national holiday can mean closed banks, shops, and even attractions — checking your destination's holiday calendar takes two minutes and can save a whole day of your trip." },
  { url: 'rental-age-checker.html', icon: '🚗', name: 'Car Rental Age & Young Driver Fee Checker', hook: 'The rental fee that only shows up at the counter', tip: "Under-25 drivers routinely get hit with a young-driver surcharge that never shows up in the online quote — checking your destination's age rules before booking avoids an unpleasant surprise at the counter." },
  { url: 'atm-fee-checker.html', icon: '💳', name: 'ATM & Foreign Transaction Fee Checker', hook: 'The ATM popup you should always decline', tip: "When a foreign ATM or card terminal asks if you'd like to be charged in your home currency, always say no — that's Dynamic Currency Conversion, and it quietly applies a worse exchange rate with a hidden markup." },
  { url: 'dress-code-checker.html', icon: '👗', name: 'Local Dress Code & Etiquette Checker', hook: 'The temple visit that gets you turned away', tip: "Many temples, mosques, and churches enforce a shoulders-and-knees-covered dress code strictly — pack a lightweight scarf or sarong so an unplanned visit never gets you turned away at the door." },
  { url: 'lost-passport-checker.html', icon: '🛂', name: 'Lost Passport & Embassy Contact Checker', hook: 'The one number worth saving before you fly', tip: "Save your embassy's 24-hour emergency contact number before you travel, not after you need it — a police report plus an embassy visit is the universal first step if your passport is ever lost or stolen." },
  { url: 'tourist-tax-checker.html', icon: '🏨', name: 'Tourist Tax / City Tax Checker', hook: 'The fee that never shows up in the booking price', tip: "Many cities charge a nightly tourist tax that booking sites don't include in the headline price — and it's often cash-only, paid directly at check-in — so budgeting a small buffer avoids an awkward surprise at the front desk." },
  { url: 'short-term-rental-checker.html', icon: '🏠', name: 'Short-Term Rental (Airbnb) Regulations Checker', hook: 'The Airbnb booking that can get cancelled last-minute', tip: "Cities like Barcelona, New York, and Amsterdam have cracked down hard on unlicensed short-term rentals — checking that a listing displays a valid registration number before booking avoids a last-minute cancellation from a regulatory shutdown." },
  { url: 'uv-index-checker.html', icon: '☀️', name: 'UV Index & Sun Safety Checker', hook: 'Sunburn happens faster than you think', tip: "Australia and New Zealand have some of the highest UV levels on Earth due to Southern Hemisphere ozone thinning — sunburn can happen in under 15 minutes at midday, so packing SPF 50+ matters more there than almost anywhere else." },
  { url: 'departure-tax-checker.html', icon: '🛫', name: 'Airport Departure Tax Checker', hook: 'The cash-only fee that catches travelers by surprise', tip: "Departure taxes are almost always bundled into your ticket price today, but a handful of countries still occasionally require a separate cash payment at the airport — worth a 30-second check so you're not caught without local currency at the gate." },
  { url: 'wildlife-safety-checker.html', icon: '🐍', name: 'Wildlife & Venomous Animal Safety Checker', hook: 'The safety tip most packing lists skip', tip: "If you're ever bitten or stung by something venomous, the outdated advice to suck out venom or apply a tourniquet can actually cause more harm — stay calm, keep the limb still, and get to medical care immediately instead." },
  { url: 'time-zone-checker.html', icon: '🕐', name: 'Time Zone Converter & Best Call Time Checker', hook: 'The "let\'s call later" that never works', tip: "Agreeing on a call time without naming whose time zone it's in is the #1 cause of missed calls between travelers and home — always state it explicitly, like \"3pm your time,\" and set up a second time zone on your phone before you fly." },
  { url: 'drinking-age-checker.html', icon: '🍷', name: 'Legal Drinking Age Checker', hook: 'Legal in one country, not the next border over', tip: 'The legal drinking age swings from 18 in most of Europe to 21 in the US, with plenty of quirks in between (Japan keeps it at 20 despite lowering adulthood to 18) — worth a quick check if you\'re anywhere near the threshold, since ID checks are routine.' },
  { url: 'vpn-censorship-checker.html', icon: '🌐', name: 'Internet Censorship & VPN Necessity Checker', hook: 'The app store that disappears once you land', tip: "In heavily censored countries like China, VPN provider websites and app stores are often blocked too — set up and test your VPN before you fly, not after you've already landed and lost access to Google entirely." },
  { url: 'smoking-vaping-checker.html', icon: '🚬', name: 'Smoking & Vaping Legality Checker', hook: 'Legal at home, confiscated at customs', tip: "Vapes that are perfectly legal back home are outright illegal in Thailand, Singapore, and Vietnam — check the rules before you pack one, since \"I didn't know\" doesn't help once it's already been confiscated." },
  { url: 'natural-disaster-checker.html', icon: '⛈️', name: 'Natural Disaster & Severe Weather Season Checker', hook: 'Booking a beach trip during hurricane season', tip: "Popular destinations like Mexico's Caribbean coast, Vietnam, and the Philippines each have a defined hurricane/typhoon season — check the riskiest months before you book, and buy travel insurance that explicitly covers named-storm evacuation." },
  { url: 'cashless-payment-checker.html', icon: '💳', name: 'Card & Cashless Payment Checker', hook: 'Your card works everywhere — except where it doesn\'t', tip: "Countries like China and Vietnam are far more cash-reliant for foreign cards than you'd expect, while Sweden and Norway are almost entirely cashless — check before you land so you're not stuck at a card-only or cash-only counter." },
  { url: 'etiquette-checker.html', icon: '🤝', name: 'Local Etiquette & Taboos Checker', hook: 'One gesture, two very different meanings', tip: "The 'OK' hand sign is friendly in most of the West but vulgar in Brazil, and pointing your feet at someone is a real offense in Thailand — a few minutes learning local etiquette prevents the kind of misstep that's hard to walk back." },
  { url: 'business-hours-checker.html', icon: '🕒', name: 'Business Hours & Weekend Checker', hook: 'Showing up on a Sunday in Germany', tip: "Germany, Austria, and Switzerland close almost everything on Sundays by law, while Israel and Jordan shift their whole weekend to Friday-Saturday — check the local weekend and closure pattern before you plan a day around shopping or errands." },
  { url: 'internet-speed-checker.html', icon: '📶', name: 'Internet Speed & Remote Work Checker', hook: 'Booking a "workation" with no wifi to work on', tip: 'Countries like Portugal, Spain, and Thailand now offer dedicated digital nomad visas with genuinely fast internet, while some popular destinations still lack both — check connectivity and visa options before committing to work remotely from your next trip.' },
  { url: 'airport-arrival-time-checker.html', icon: '🛬', name: 'Airport Arrival Time Checker', hook: 'Sprinting through LAX with 12 minutes to spare', tip: "Not every airport needs the generic \"2 hours domestic, 3 hours international\" rule — LAX and Heathrow genuinely need more buffer, while Singapore Changi and Tokyo Haneda are fast enough that you can safely cut it closer." },
  { url: 'medication-legality-checker.html', icon: '💊', name: 'Medication Legality Checker', hook: 'Your routine prescription, their controlled substance', tip: "Common prescriptions like Adderall are effectively banned in Japan and South Korea, and everyday painkillers with codeine are restricted in Greece and Egypt — check before you pack your regular medication, and always carry the original packaging plus a doctor's letter." },
  { url: 'vat-refund-checker.html', icon: '🧾', name: 'VAT/Tax-Free Shopping Refund Checker', hook: 'The UK stopped tax-free shopping and nobody told you', tip: "The UK abolished tourist VAT refunds in 2021, and the US and Canada never had a national scheme at all — while most of the EU, Japan, and South Korea still refund 10-25%. Check before you budget your shopping." },
  { url: 'resort-fee-checker.html', icon: '🏨', name: 'Resort Fee Checker', hook: 'That $99 Vegas room is actually $140', tip: "Hidden resort fees ($25-45/night) are widespread in Las Vegas, Orlando, Miami, and Hawaii, and common at Mexican beach resorts too — check before you book, since the fee rarely shows up until the final checkout screen." },
  { url: 'travel-advisory-checker.html', icon: '🛡️', name: 'Travel Advisory Checker', hook: 'Is your destination actually safe right now?', tip: "Advisory levels are national averages that can hide real regional variation — a country can be very safe in its tourist areas and genuinely risky elsewhere. Check the specific level and reason for your destination, and always confirm against your own government's official current advisory before you fly." },
];

// ─── BUILD THE 30-DAY SEQUENCE ────────────────────────────────────────────────

function buildToolLeadSequence() {
  const days = [];
  for (let day = 1; day <= 30; day++) {
    const tool = TOOLS[(day - 1) % TOOLS.length];
    const isPitchDay = day % 5 === 0;
    const isFinale = day === 30;

    let html = '';
    if (day === 1) {
      html += h(`Welcome — here's your free travel toolkit`);
      html += p(`You grabbed a free PDF from one of TravelSmarter's free trip-planning tools. Over the next 30 days you'll get one practical tip and one tool spotlight per email — genuinely useful on their own, no strings attached.`);
    } else if (isFinale) {
      html += h(`Day 30 — you've seen the whole toolkit`);
      html += p(`This is the last email in this series. Over the past month you've gotten a tip and a tool a day, covering everything from flight timing to pet travel paperwork.`);
    } else {
      html += h(tool.hook);
    }

    html += tipBox(`<strong>Tip:</strong> ${tool.tip}`);
    html += p(`<strong>${tool.icon} ${tool.name}</strong> — try it free, no sign-up required for the instant answer:`);
    html += btn(`{appUrl}/${tool.url}`, `Try ${tool.name}`);

    if (isFinale) {
      html += dualUpgradeBox(
        `Ready for your next trip? Skip checking tools one by one — get every relevant check (visa, money, health, local laws, and more) combined into one Trip Brief PDF for $19.`,
        `Traveling often? TravelSmarter Pro adds automatic price alerts, 87 verified travel hacks, and every tool in this series with saved trip profiles. $19/month, cancel anytime.`
      );
      html += small(`That's it for this series — but the tools are always free and always there at <a href="{appUrl}/free-travel-tools.html" style="color:#667eea;">travelsmarterapp.com/free-travel-tools.html</a>. Safe travels.`);
    } else if (isPitchDay) {
      html += dualUpgradeBox(
        `Planning an actual trip? Get every relevant check — visa, money, health, local laws, and more — combined into one Trip Brief PDF for $19, instead of checking tools one by one.`,
        `Or if you travel often, TravelSmarter Pro adds automatic price alerts and 87 verified travel hacks on top of everything free. $19/month, cancel anytime.`
      );
      html += small(`Tomorrow: ${TOOLS[day % TOOLS.length].hook.toLowerCase()}.`);
    } else {
      html += small(`Tomorrow: ${TOOLS[day % TOOLS.length].hook.toLowerCase()}.`);
    }

    days.push({
      day,
      subject: day === 1
        ? `✈️ Your free travel toolkit (1/30)`
        : isFinale
        ? `🎁 Last one — see everything you've got`
        : `${tool.icon} ${tool.hook}`,
      html,
    });
  }
  return days;
}

const toolLeadEmailSequence = buildToolLeadSequence();

// ─── SEED / UPDATE ────────────────────────────────────────────────────────────

async function seedToolLeadSequence() {
  try {
    const existing = await pool.query(`SELECT id FROM email_sequences WHERE name = $1`, [TOOL_LEAD_SEQUENCE_NAME]);
    if (existing.rows.length > 0) {
      console.log('✅ Free Tool Leads sequence already seeded');
      return existing.rows[0].id;
    }

    const { v4: uuidv4 } = require('uuid');
    const sequenceId = uuidv4();
    await pool.query(
      `INSERT INTO email_sequences (id, name, description, is_active, trigger_event, created_at)
       VALUES ($1, $2, $3, true, 'tool_lead_pdf_download', CURRENT_TIMESTAMP)`,
      [sequenceId, TOOL_LEAD_SEQUENCE_NAME, '30-day drip for free-tool PDF leads: daily tip + tool spotlight, with a TravelSmarter Pro pitch every 5th day.']
    );

    for (const email of toolLeadEmailSequence) {
      await pool.query(
        `INSERT INTO email_templates (id, sequence_id, day, subject, content, html_content, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)`,
        [uuidv4(), sequenceId, email.day, email.subject, email.html.replace(/<[^>]*>/g, ''), email.html]
      );
    }

    console.log(`✅ Free Tool Leads sequence seeded with ${toolLeadEmailSequence.length} templates`);
    return sequenceId;
  } catch (error) {
    console.error('❌ Error seeding Free Tool Leads sequence:', error);
    throw error;
  }
}

async function updateToolLeadTemplates() {
  try {
    const seqResult = await pool.query(`SELECT id FROM email_sequences WHERE name = $1 LIMIT 1`, [TOOL_LEAD_SEQUENCE_NAME]);
    if (seqResult.rows.length === 0) return;
    const sequenceId = seqResult.rows[0].id;

    for (const email of toolLeadEmailSequence) {
      await pool.query(
        `UPDATE email_templates SET subject = $1, html_content = $2, content = $3 WHERE sequence_id = $4 AND day = $5`,
        [email.subject, email.html, email.html.replace(/<[^>]*>/g, ''), sequenceId, email.day]
      );
    }
    console.log('✅ Free Tool Leads templates updated from code');
  } catch (error) {
    console.error('❌ Error updating Free Tool Leads templates:', error);
  }
}

// ─── ENROLL A NEW LEAD ────────────────────────────────────────────────────────
// Called right after a tool_leads row is inserted. Schedules days 1-30 — day 0
// is the tool-specific confirmation email each tool controller already sends
// synchronously, so this sequence starts the day after.

async function initializeToolLeadSequence(leadId, leadEmail, firstName) {
  try {
    const sequenceResult = await pool.query(
      `SELECT id FROM email_sequences WHERE name = $1 AND is_active = true LIMIT 1`,
      [TOOL_LEAD_SEQUENCE_NAME]
    );
    if (sequenceResult.rows.length === 0) {
      console.warn('⚠️ No active Free Tool Leads sequence found, skipping');
      return { success: false, message: 'No active sequence configured' };
    }
    const sequenceId = sequenceResult.rows[0].id;

    const templatesResult = await pool.query(
      `SELECT id, day FROM email_templates WHERE sequence_id = $1 AND is_active = true ORDER BY day ASC`,
      [sequenceId]
    );

    let scheduledCount = 0;
    for (const template of templatesResult.rows) {
      const scheduledAt = new Date();
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + template.day);
      scheduledAt.setUTCHours(15, 0, 0, 0); // 15:00 UTC — an hour after the main welcome sequence, to spread send load

      try {
        await pool.query(
          `INSERT INTO tool_lead_scheduled_emails (lead_id, template_id, scheduled_at, status, created_at)
           VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)`,
          [leadId, template.id, scheduledAt]
        );
        scheduledCount++;
      } catch (insertError) {
        console.error(`❌ Failed to schedule lead day ${template.day} email:`, insertError.message);
      }
    }

    console.log(`✅ Free Tool Leads sequence initialized for ${leadEmail} (${scheduledCount} emails scheduled)`);
    return { success: true, scheduledCount };
  } catch (error) {
    console.error('❌ Error initializing Free Tool Leads sequence:', error);
    // Never throw — enrollment failure must not break the PDF download itself.
    return { success: false, message: error.message };
  }
}

// ─── SEND PENDING LEAD EMAILS (hourly poller) ────────────────────────────────

async function sendPendingLeadEmails() {
  try {
    const tableCheck = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tool_lead_scheduled_emails')`
    );
    if (!tableCheck.rows[0].exists) return { sent: 0 };

    // Stop the drip the moment a lead converts to a real account — they'll
    // get the main welcome/spotlight sequences instead.
    await pool.query(`
      UPDATE tool_lead_scheduled_emails tse
      SET status = 'cancelled'
      FROM tool_leads tl
      WHERE tse.lead_id = tl.id
        AND tse.status = 'pending'
        AND tl.converted_to_user_id IS NOT NULL
    `);

    const result = await pool.query(`
      SELECT tse.id, tse.lead_id, tse.template_id, tl.email, tl.first_name, tl.unsubscribe_token,
             et.day, et.subject, et.html_content
      FROM tool_lead_scheduled_emails tse
      JOIN tool_leads tl ON tse.lead_id = tl.id
      JOIN email_templates et ON tse.template_id = et.id
      WHERE tse.status = 'pending'
        AND tse.scheduled_at <= NOW()
        AND et.is_active = true
        AND (tl.email_opt_out IS NULL OR tl.email_opt_out = false)
      ORDER BY tse.scheduled_at ASC
    `);

    if (result.rows.length === 0) return { sent: 0 };

    const appUrl = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';
    let sentCount = 0;

    for (const row of result.rows) {
      try {
        const emailHtml = (row.html_content || '')
          .split('{firstName}').join(row.first_name || 'there')
          .split('{appUrl}').join(appUrl);

        const fullHtml = `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <tr><td align="center" style="padding:32px 16px;">
              <table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
                <tr>
                  <td style="background:#1a2744;padding:18px 32px;border-radius:12px 12px 0 0;">
                    <span style="font-size:19px;font-weight:700;color:white;font-family:-apple-system,sans-serif;">
                      Travel<span style="color:#ff6b4a;">Smarter</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="background:white;padding:36px 32px;border-radius:0 0 12px 12px;color:#1f2937;line-height:1.7;font-size:15px;">
                    ${emailHtml}
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:36px 0 24px;">
                    <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.7;">
                      You received this because you downloaded a free tool guide from TravelSmarter.<br>
                      <a href="${appUrl}/unsubscribe.html?token=${row.unsubscribe_token}&type=lead" style="color:#667eea;text-decoration:none;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        `;

        await emailService.sendEmail({
          to: row.email,
          subject: row.subject,
          html: fullHtml,
          trackingSettings: {
            clickTracking: { enable: true, enableText: false },
            openTracking: { enable: true }
          },
          customArgs: {
            scheduled_lead_email_id: String(row.id),
            lead_id: String(row.lead_id),
            template_id: String(row.template_id),
            sequence_name: TOOL_LEAD_SEQUENCE_NAME,
            day: String(row.day)
          }
        });

        await pool.query(`UPDATE tool_lead_scheduled_emails SET status = 'sent', sent_at = NOW() WHERE id = $1`, [row.id]);
        sentCount++;
        console.log(`✅ Sent lead day ${row.day} email to ${row.email}`);
      } catch (error) {
        console.error(`❌ Error sending lead email for tool_lead_scheduled_emails ${row.id}:`, error);
        await pool.query(`UPDATE tool_lead_scheduled_emails SET status = 'failed' WHERE id = $1`, [row.id]);
      }
    }

    console.log(`✅ Sent ${sentCount} lead emails`);
    return { sent: sentCount };
  } catch (error) {
    console.error('❌ Error sending pending lead emails:', error);
    return { sent: 0, error: error.message };
  }
}

module.exports = {
  TOOL_LEAD_SEQUENCE_NAME,
  toolLeadEmailSequence,
  seedToolLeadSequence,
  updateToolLeadTemplates,
  initializeToolLeadSequence,
  sendPendingLeadEmails,
};
