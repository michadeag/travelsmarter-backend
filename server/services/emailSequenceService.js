const pool = require('../config/database');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function btn(url, label) {
  return `<a href="${url}" style="display:inline-block;background:#ff6b4a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-top:4px;">${label} →</a>`;
}

function hackBox(content) {
  return `<div style="background:#f0f4ff;border-left:4px solid #667eea;border-radius:0 8px 8px 0;padding:18px 20px;margin:22px 0;color:#1f2937;line-height:1.7;">${content}</div>`;
}

function upgradeBox(text, linkUrl) {
  return `<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:18px 20px;margin:22px 0;">
    <p style="margin:0 0 12px;font-size:14px;color:#92400e;">${text}</p>
    <a href="${linkUrl}" style="display:inline-block;background:#1a2744;color:white;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">See Plans →</a>
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

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

const defaultEmailSequence = [
  {
    day: 0,
    subject: '✈️ Your 20 free travel hacks are ready',
    html: `
      ${h('You\'re in, {firstName}. Here\'s what you have.')}
      ${p('Welcome to TravelSmarter. You now have free access to 20 verified travel hacks across 4 modules — no trial, no credit card, no expiry.')}
      ${hackBox(`
        <strong>Your free modules:</strong><br>
        ✈️ <strong>Flight Hacking</strong> — award arbitrage, mistake fares, booking windows<br>
        💳 <strong>Credit Cards</strong> — sign-up bonuses, transfer partners, stacking<br>
        🏨 <strong>Hotel Hacking</strong> — upgrade psychology, rate arbitrage, status tricks<br>
        ⏰ <strong>Timing Intelligence</strong> — when to book, when to wait, shoulder seasons
      `)}
      ${p('Over the next 10 days you\'ll get one focused hack per email — actionable, specific, and immediately usable.')}
      ${p('But first — your hacks are waiting:')}
      ${btn('{magicUrl}', 'Go to My Free Hacks')}
      ${small('<a href="{appUrl}/cheat-sheet.html" style="color:#9ca3af;">📄 Or download the cheat sheet</a> — all 20 hacks on one page, ready to print.')}
      ${small('Tomorrow: the flight booking window most people miss — and why it saves €300–600 per ticket.')}
    `
  },

  {
    day: 1,
    subject: '✈️ The booking window airlines don\'t advertise',
    html: `
      ${h('This 15-day window saves €300–600 per flight.')}
      ${p('Airlines manage pricing with an algorithm. It optimises for revenue — which means prices are lowest when the algorithm hasn\'t yet decided to push them up.')}
      ${p('That window sits between <strong>30 and 45 days before departure</strong> for most European and short-haul routes (6–10 weeks for transatlantic). Inside 3 weeks, prices spike 40–80%.')}
      ${hackBox(`
        <strong>The hack:</strong><br>
        1. Set a price alert in Google Flights or Skyscanner now for your next trip<br>
        2. Watch it for 2 weeks<br>
        3. Buy when it dips — usually Tuesday/Wednesday evening (airlines reset prices then)<br>
        4. If it hasn\'t moved in 10 days, buy — it won\'t get better
      `)}
      ${p('Pair this with flying Tuesday–Wednesday instead of Friday–Sunday and you can add another €80–150 to the saving.')}
      ${btn('{appUrl}/module.html?id=1', 'See All Flight Hacks')}
      ${small('Tomorrow: a single sentence at hotel check-in that gets you a room upgrade about 40% of the time.')}
    `
  },

  {
    day: 2,
    subject: '🏨 What to say at hotel check-in (works ~40% of the time)',
    html: `
      ${h('One sentence. Free upgrade. Works because of how hotels actually work.')}
      ${p('Hotels oversell room categories constantly. The front desk team has upgrade authority — and they use it to solve problems before they become complaints.')}
      ${p('Which means: the guest who asks nicely and at the right time often wins.')}
      ${hackBox(`
        <strong>The script:</strong><br>
        Walk up, check in normally, then say: <em>"I know it\'s a long shot, but if you have any rooms that didn\'t get claimed today, I\'d be grateful for anything a bit nicer — it\'s a special trip."</em><br><br>
        <strong>Why it works:</strong> you\'re giving them permission to help you without pressure. Works best on Sunday/Monday check-ins when occupancy is lower, and at 5-star properties where front desk staff have more discretion.
      `)}
      ${p('The full Hotel Hacking module has 4 more upgrade strategies, rate arbitrage techniques, and a status matching shortcut that works in under 24 hours.')}
      ${btn('{appUrl}/module.html?id=3', 'See All Hotel Hacks')}
      ${small('Tomorrow: how to earn a free return flight without ever getting on a plane.')}
    `
  },

  {
    day: 3,
    subject: '💳 How to earn a free flight without flying',
    html: `
      ${h('Sign-up bonuses are the fastest path to free flights. Here\'s exactly how they work.')}
      ${p('Most premium travel credit cards offer a sign-up bonus worth €400–900 in flights if you spend a certain amount in the first 3 months. The key insight most people miss:')}
      ${hackBox(`
        <strong>The timing trick:</strong><br>
        Apply for a new travel card 4–6 weeks before a big spend you already planned (holiday shopping, annual insurance, a work trip you\'ll expense). You hit the minimum spend with money you were going to spend anyway — and keep 60,000–80,000 bonus points.<br><br>
        <strong>What that\'s worth:</strong> 60k Avios = a return business class to New York. 80k Amex points = 2 return economy flights to Southeast Asia.
      `)}
      ${p('This is just one of the strategies in the Credit Cards module — which is yours free.')}
      ${btn('{appUrl}/module.html?id=2', 'See Credit Card Hacks')}
      ${upgradeBox('The Smart Traveler plan unlocks 6 more modules — including Travel Money, Travel Insurance, and Car Rentals. All for €19/month.', '{appUrl}/sales-page.html')}
      ${small('Tomorrow: the two weeks per year when flights AND hotels are cheapest simultaneously.')}
    `
  },

  {
    day: 4,
    subject: '⏰ The two cheapest weeks to travel each year',
    html: `
      ${h('Shoulder season isn\'t a secret. But the exact windows are.')}
      ${p('Everyone knows "travel off-peak." Fewer people know which exact weeks hit the sweet spot — after summer crowds leave but before autumn rates kick in, and before Easter but after New Year ski season.')}
      ${hackBox(`
        <strong>The two windows:</strong><br>
        🗓️ <strong>Late April – mid May:</strong> weather is good, school is in, flights and hotels 30–50% cheaper than June<br>
        🗓️ <strong>Mid September – October:</strong> best weather in Southern Europe, 40–60% cheaper than August<br><br>
        <strong>Bonus:</strong> avoid the first and last week of any school holiday. Those are the price spikes — everything in between is significantly cheaper.
      `)}
      ${p('The Timing Intelligence module maps this out month by month for major destinations — with the specific week-by-week price curves airlines actually use.')}
      ${btn('{appUrl}/module.html?id=4', 'See Timing Intelligence')}
      ${small('Tomorrow: the card that gives you the real exchange rate and has saved me hundreds across dozens of trips.')}
    `
  },

  {
    day: 5,
    subject: '💰 Stop losing 5–10% on every currency exchange',
    html: `
      ${h('Every time you use a regular card abroad, you lose 3–8% to hidden fees. Here\'s how to stop.')}
      ${p('The bank you\'ve had since you were 18 charges you a foreign transaction fee of 2–3%. Then the ATM adds 1.5–3%. Then the dynamic currency conversion screen tries to take another 5% if you\'re not careful.')}
      ${p('On a €2,000 trip that\'s €100–200 gone to fees. Here\'s what smart travelers use instead:')}
      ${hackBox(`
        <strong>The three cards worth having:</strong><br>
        💳 <strong>Wise (best for spending):</strong> real mid-market rate, no foreign transaction fee, 2 free ATM withdrawals per month<br>
        💳 <strong>Revolut:</strong> free plan works for light users, great for multi-currency<br>
        💳 <strong>N26:</strong> best for Eurozone travel, instant notifications, virtual cards<br><br>
        <strong>Always:</strong> pay in the local currency (never let a merchant "help" you by charging in euros)
      `)}
      ${p('This is a preview from the Travel Money module. The full module covers ATM strategies, when to use cash vs card, and how to handle currencies in countries where cards aren\'t reliable.')}
      ${upgradeBox('Travel Money is part of the Smart Traveler plan (€19/month) — along with 5 other modules covering Car Rentals, Airport & Transit, Travel Insurance, and more.', '{appUrl}/sales-page.html')}
      ${small('Tomorrow: how to get airport lounge access without a €500 credit card.')}
    `
  },

  {
    day: 6,
    subject: '✈️ Airport lounge access — without the premium card',
    html: `
      ${h('A quiet room, free food, fast Wi-Fi. Most travelers pay €50–80 to get in. Here\'s how to do it for €0.')}
      ${p('Airport lounges used to be for business class passengers. The system has changed — and there are now 4 ways to access them for free or near-free:')}
      ${hackBox(`
        <strong>4 ways in:</strong><br>
        1. <strong>Certain travel credit cards</strong> include Priority Pass — check your card benefits, you might already have it<br>
        2. <strong>Booking the right flight:</strong> some long-haul economy fares include lounge access on the departure airport<br>
        3. <strong>Same-day flight delay:</strong> if your flight is delayed 2+ hours, many lounges will admit you for free — just ask<br>
        4. <strong>Lounge day pass apps</strong> (LoungeBuddy, Priority Pass pay-per-use) — €25–35 vs the rack rate of €80+
      `)}
      ${p('The full Airport & Transit module covers 6 more strategies including TSA PreCheck equivalents in Europe, layover optimisation, and how to get fast-track security without status.')}
      ${upgradeBox('Airport & Transit is in the Smart Traveler plan — unlocked alongside Travel Money, Car Rentals, and 3 other modules. €19/month.', '{appUrl}/sales-page.html')}
      ${small('Tomorrow: travel insurance — why yours might be better than you think (or worse).')}
    `
  },

  {
    day: 7,
    subject: '🛡️ Your credit card might already have travel insurance',
    html: `
      ${h('Before you buy travel insurance, check your credit card. You might already have it.')}
      ${p('Most premium travel credit cards include some level of travel insurance — and most cardholders never read what\'s actually covered.')}
      ${hackBox(`
        <strong>What\'s typically included:</strong><br>
        ✓ Flight delay/cancellation (usually 4+ hours, up to €500–1,500 per person)<br>
        ✓ Lost/delayed baggage (€200–800)<br>
        ✓ Car rental collision damage (saves €15–30/day on rental insurance)<br>
        ✓ Purchase protection on items bought with the card<br><br>
        <strong>What\'s NOT included:</strong> medical evacuation, pre-existing conditions, adventure sports. You still need a standalone policy for these — but you can get a cheaper one because your card covers the rest.
      `)}
      ${p('Log into your credit card\'s benefits portal today and spend 10 minutes reading the travel section. Most people are genuinely surprised by what they already have.')}
      ${p('The full Travel Insurance module covers exactly what to look for, how to stack card benefits with a standalone policy, and how to actually make a claim (the part nobody explains).')}
      ${upgradeBox('Travel Insurance is part of Smart Traveler — along with Travel Money, Airport & Transit, Car Rentals, and more. €19/month.', '{appUrl}/sales-page.html')}
      ${small('Tomorrow: how all of this fits together as a system — and where people leave the most money on the table.')}
    `
  },

  {
    day: 8,
    subject: '🏨 Get hotel Elite status in 24 hours (without staying there)',
    html: `
      ${h('Status matching is the best travel hack most people have never heard of.')}
      ${p('Hotel loyalty programs give Elite status to guests who stay 50–75 nights per year. But there\'s a shortcut almost no one uses:')}
      ${p('<strong>Status matching:</strong> if you have Elite status with one hotel chain, competing chains will often match it — instantly, with no stays required.')}
      ${hackBox(`
        <strong>How it works in practice:</strong><br>
        1. Sign up for free to Marriott Bonvoy and complete their status challenge (10 stays in 90 days)<br>
        2. Email Hyatt, IHG, or Hilton with proof of your Marriott status<br>
        3. Get matched to their equivalent Elite tier — often in 24–48 hours<br><br>
        <strong>What Elite status gets you:</strong> free room upgrades, late checkout, bonus points on every stay, lounge access at some properties. Value: €200–600 per year in upgrades alone.
      `)}
      ${p('This and 4 more status strategies are in the Hotel Hacking module — which is free with your account.')}
      ${btn('{appUrl}/module.html?id=3', 'See Hotel Hacking Module')}
      ${small('Tomorrow: the last email in this sequence. I\'ll show you where most people stop — and what the ones saving €3,000–5,000 per year do differently.')}
    `
  },

  {
    day: 9,
    subject: '🎯 9 hacks in. Here\'s what the full picture looks like.',
    html: `
      ${h('You\'ve had 9 hacks. Here\'s how they compound.')}
      ${p('Most people apply one or two travel tricks and stop. The travelers saving €3,000–5,000 per year use them as a system — each element amplifying the others.')}
      ${hackBox(`
        <strong>The stack, in order:</strong><br>
        1. <strong>Timing:</strong> Shoulder season + Tuesday booking window → save 30–50% on base price<br>
        2. <strong>Flight:</strong> Book in the 30–45 day window → save another €200–400<br>
        3. <strong>Credit card:</strong> Use sign-up bonus for the ticket → net cost: €0–100<br>
        4. <strong>Hotel:</strong> Status match → free upgrade on arrival<br>
        5. <strong>Currency:</strong> Wise card → save 5–8% on all spending<br>
        6. <strong>Insurance:</strong> Credit card covers delays → buy cheaper standalone policy<br><br>
        Applied together on a 10-day trip: €800–1,500 saved vs. booking the normal way.
      `)}
      ${p('Your 4 free modules cover steps 1–3. The other 12 modules go deeper on everything else:')}
      ${upgradeBox(`
        <strong>Smart Traveler (€19/month):</strong> 10 modules total — adds Airport & Transit, Travel Money, Car Rentals, Destinations, Travel Insurance, and more. 55+ hacks.<br><br>
        <strong>Elite (€49/month):</strong> All 16 modules, 87 hacks, exclusive Partner Deals (up to 50% off Wise, Airalo, NordVPN), and access to the Travel Community of 12,340+ members.
      `, '{appUrl}/sales-page.html')}
      ${btn('{appUrl}/sales-page.html', 'See All Plans')}
      ${small('Tomorrow is the last email. If you\'re happy with your 20 free hacks, that\'s great — they\'re yours forever. If you want the rest, I\'ll show you what\'s inside.')}
    `
  },

  {
    day: 10,
    subject: '📬 Last email — your options going forward',
    html: `
      ${h('That\'s the 10-day course. Here\'s where things stand.')}
      ${p('You now have 20 verified travel hacks across 4 modules — flight booking windows, hotel upgrades, credit card timing, and shoulder season strategy. They\'re free and they\'re yours forever.')}
      ${p('If that\'s enough for you, great. Use them, save money, travel smarter.')}
      ${p('If you want the full system — all 16 modules, 87 hacks, and everything that goes with it — here\'s what\'s available:')}
      ${hackBox(`
        <strong>Smart Traveler — €19/month</strong><br>
        10 modules · 55+ hacks · all tools & calculators · Goodies (PDFs & checklists) · Weekly Hack Digest · New deal alerts by email · Standard support<br><br>
        <strong>Elite — €49/month</strong><br>
        16 modules · 87 hacks · everything above + Partner Deals (up to 50% off Wise, Airalo, NordVPN, Booking.com) + Travel Community (12,340+ members) + Priority support<br><br>
        Both plans: no long-term commitment, cancel anytime.
      `)}
      ${btn('{appUrl}/sales-page.html', 'See Plans & Features')}
      ${p('Either way — thank you for reading. I hope the hacks have already saved you something.')}
      ${small('This is the last scheduled email. After this you\'ll only hear from us when we add new hacks or find a genuinely useful deal. Unsubscribe anytime — the link is below.')}
    `
  }
];

// ─── SEED (first run only) ────────────────────────────────────────────────────

async function seedEmailSequence() {
  try {
    const existing = await pool.query(
      `SELECT id FROM email_sequences WHERE name = $1`,
      ['Welcome Email Sequence']
    );

    if (existing.rows.length > 0) {
      console.log('✅ Email sequence already seeded');
      return existing.rows[0].id;
    }

    const sequenceId = uuidv4();
    await pool.query(
      `INSERT INTO email_sequences (id, name, description, is_active, trigger_event, created_at)
       VALUES ($1, $2, $3, true, 'signup', CURRENT_TIMESTAMP)`,
      [sequenceId, 'Welcome Email Sequence', '10-day automated welcome sequence for new users']
    );

    for (const email of defaultEmailSequence) {
      await pool.query(
        `INSERT INTO email_templates (id, sequence_id, day, subject, content, html_content, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP)`,
        [uuidv4(), sequenceId, email.day, email.subject, email.html.replace(/<[^>]*>/g, ''), email.html]
      );
    }

    console.log('✅ Default email sequence seeded with 11 templates');
    return sequenceId;
  } catch (error) {
    console.error('❌ Error seeding email sequence:', error);
    throw error;
  }
}

// ─── UPDATE EXISTING TEMPLATES ────────────────────────────────────────────────
// Call this on server startup to keep DB templates in sync with code.

async function updateEmailTemplates() {
  try {
    const seqResult = await pool.query(
      `SELECT id FROM email_sequences WHERE name = 'Welcome Email Sequence' LIMIT 1`
    );
    if (seqResult.rows.length === 0) return;

    const sequenceId = seqResult.rows[0].id;

    for (const email of defaultEmailSequence) {
      await pool.query(
        `UPDATE email_templates
         SET subject = $1, html_content = $2, content = $3
         WHERE sequence_id = $4 AND day = $5`,
        [email.subject, email.html, email.html.replace(/<[^>]*>/g, ''), sequenceId, email.day]
      );
    }

    console.log('✅ Email templates updated from code');
  } catch (error) {
    console.error('❌ Error updating email templates:', error);
  }
}

// ─── INITIALIZE SEQUENCE FOR NEW USER ────────────────────────────────────────

async function initializeEmailSequence(userId, userEmail, firstName) {
  try {
    console.log(`📧 Initializing email sequence for user ${userId} (${userEmail})`);

    const sequenceResult = await pool.query(
      `SELECT id FROM email_sequences WHERE name = $1 AND is_active = true LIMIT 1`,
      ['Welcome Email Sequence']
    );

    if (sequenceResult.rows.length === 0) {
      console.warn('⚠️ No active email sequence found, skipping');
      return { success: false, message: 'No active email sequence configured' };
    }

    const sequenceId = sequenceResult.rows[0].id;

    const templatesResult = await pool.query(
      `SELECT id, day, subject FROM email_templates
       WHERE sequence_id = $1 AND is_active = true AND day < 9000
       ORDER BY day ASC`,
      [sequenceId]
    );

    if (templatesResult.rows.length === 0) {
      console.warn('⚠️ No email templates found for the sequence');
      return { success: false, message: 'No email templates found' };
    }

    let scheduledCount = 0;
    for (const template of templatesResult.rows) {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + template.day);
      scheduledAt.setHours(9, 0, 0, 0);

      try {
        await pool.query(
          `INSERT INTO scheduled_emails (user_id, template_id, scheduled_at, status, created_at)
           VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP)`,
          [userId, template.id, scheduledAt]
        );
        scheduledCount++;
      } catch (insertError) {
        console.error(`❌ Failed to schedule Day ${template.day} email:`, insertError.message);
      }
    }

    console.log(`✅ Email sequence initialized for ${userEmail} (${scheduledCount} emails scheduled)`);
    return { success: true, scheduledCount };
  } catch (error) {
    console.error('❌ Error initializing email sequence:', error);
    throw error;
  }
}

// ─── SEND PENDING EMAILS ──────────────────────────────────────────────────────

async function sendPendingEmails() {
  try {
    console.log('🔄 Checking for pending emails to send...');

    const tableCheck = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scheduled_emails')`
    );
    if (!tableCheck.rows[0].exists) {
      console.warn('⚠️ scheduled_emails table does not exist yet, skipping');
      return { sent: 0 };
    }

    const result = await pool.query(`
      SELECT se.id, se.user_id, se.template_id, u.email, u.first_name,
             u.unsubscribe_token, u.email_marketing_opt_out,
             et.day, et.subject, et.html_content
      FROM scheduled_emails se
      JOIN users u ON se.user_id = u.id
      JOIN email_templates et ON se.template_id = et.id
      WHERE se.status = 'pending'
        AND se.scheduled_at <= NOW()
        AND et.is_active = true
        AND (u.email_marketing_opt_out IS NULL OR u.email_marketing_opt_out = false)
      ORDER BY se.scheduled_at ASC
    `);

    if (result.rows.length === 0) {
      console.log('✅ No pending emails to send');
      return { sent: 0 };
    }

    const appUrl = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';
    let sentCount = 0;

    for (const row of result.rows) {
      try {
        const emailHtml = (row.html_content || '')
          .split('{firstName}').join(row.first_name || 'Traveler')
          .split('{appUrl}').join(appUrl);

        const fullHtml = `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <tr><td align="center" style="padding:32px 16px;">
              <table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

                <!-- Brand header -->
                <tr>
                  <td style="background:#1a2744;padding:18px 32px;border-radius:12px 12px 0 0;">
                    <span style="font-size:19px;font-weight:700;color:white;font-family:-apple-system,sans-serif;">
                      Travel<span style="color:#ff6b4a;">Smarter</span>
                    </span>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="background:white;padding:36px 32px;border-radius:0 0 12px 12px;color:#1f2937;line-height:1.7;font-size:15px;">
                    ${emailHtml}
                    <hr style="border:none;border-top:1px solid #e5e7eb;margin:36px 0 24px;">
                    <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.7;">
                      You received this because you signed up for TravelSmarter.<br>
                      <a href="${appUrl}/account.html" style="color:#667eea;text-decoration:none;">Manage preferences</a>
                      &nbsp;·&nbsp;
                      <a href="${appUrl}/unsubscribe.html?token=${row.unsubscribe_token}" style="color:#667eea;text-decoration:none;">Unsubscribe</a>
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
          html: fullHtml
        });

        await pool.query(
          `UPDATE scheduled_emails SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [row.id]
        );

        sentCount++;
        console.log(`✅ Sent day ${row.day} email to ${row.email}`);
      } catch (error) {
        console.error(`❌ Error sending email for scheduled_email ${row.id}:`, error);
        await pool.query(
          `UPDATE scheduled_emails SET status = 'failed' WHERE id = $1`,
          [row.id]
        );
      }
    }

    console.log(`✅ Sent ${sentCount} emails`);
    return { sent: sentCount };
  } catch (error) {
    console.error('❌ Error sending pending emails:', error);
    throw error;
  }
}

// ─── SEND DAY-0 IMMEDIATELY ───────────────────────────────────────────────────
// Called right after signup so the user gets their first email without waiting
// for the hourly cron job.

async function sendDay0Email(userId, userEmail, firstName) {
  try {
    const appUrl = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';

    const seqResult = await pool.query(
      `SELECT id FROM email_sequences WHERE name = 'Welcome Email Sequence' LIMIT 1`
    );
    if (!seqResult.rows.length) return;

    const templateResult = await pool.query(
      `SELECT et.id, et.subject, et.html_content
       FROM email_templates et
       WHERE et.sequence_id = $1 AND et.day = 0 AND et.is_active = true
       LIMIT 1`,
      [seqResult.rows[0].id]
    );
    if (!templateResult.rows.length) return;

    const t = templateResult.rows[0];

    // Generate magic login token (7-day expiry)
    const crypto = require('crypto');
    const magicToken = crypto.randomBytes(32).toString('hex');
    const magicExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `UPDATE users SET magic_login_token = $1, magic_login_expires = $2 WHERE id = $3`,
      [magicToken, magicExpires, userId]
    );
    const magicUrl = `${appUrl}/index.html?magic=${magicToken}`;

    const emailHtml = (t.html_content || '')
      .split('{firstName}').join(firstName || 'Traveler')
      .split('{appUrl}').join(appUrl)
      .split('{magicUrl}').join(magicUrl);

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
                  You received this because you signed up for TravelSmarter.<br>
                  <a href="${appUrl}/account.html" style="color:#667eea;text-decoration:none;">Manage preferences</a>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>`;

    await emailService.sendEmail({ to: userEmail, subject: t.subject, html: fullHtml });

    // Mark the scheduled Day-0 email as already sent so cron doesn't send it again
    await pool.query(
      `UPDATE scheduled_emails se
       SET status = 'sent', sent_at = NOW()
       FROM email_templates et
       WHERE se.template_id = et.id
         AND se.user_id = $1
         AND et.day = 0
         AND se.status = 'pending'`,
      [userId]
    );

    console.log(`✅ Day-0 email sent immediately to ${userEmail}`);
  } catch (err) {
    console.error('❌ Error sending Day-0 email immediately:', err.message);
  }
}

module.exports = {
  initializeEmailSequence,
  sendPendingEmails,
  seedEmailSequence,
  updateEmailTemplates,
  sendDay0Email
};
