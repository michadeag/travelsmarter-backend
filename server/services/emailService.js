const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function wrap(body) {
  const appUrl = process.env.FRONTEND_URL || 'https://travelsmarterapp.com';
  return `<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;">
    <div style="background:#1a2744;padding:24px 32px;border-radius:10px 10px 0 0;text-align:center;">
      <span style="color:#ff6b4a;font-size:20px;font-weight:700;">✈️ TravelSmarter</span>
    </div>
    <div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
      ${body}
      <hr style="margin:32px 0 20px;border:none;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        © 2026 TravelSmarter &nbsp;·&nbsp;
        <a href="${appUrl}/auth.html" style="color:#9ca3af;">Sign in</a> &nbsp;·&nbsp;
        <a href="${appUrl}/sales-page.html" style="color:#9ca3af;">Plans</a>
      </p>
    </div>
  </div>`;
}

// Email templates
const templates = {
  welcomeEmail: (user) => ({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
    subject: '✈️ Your 20 free travel hacks are ready',
    html: wrap(`
      <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hi ${user.firstName || 'there'},</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 20px;">Your TravelSmarter account is live. Your 20 free hacks are waiting — no credit card, no catch.</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 8px;"><strong>What you have access to right now:</strong></p>
      <ul style="color:#374151;line-height:1.9;margin:0 0 24px;padding-left:20px;">
        <li>4 core modules (Flights, Credit Cards, Hotels, Timing)</li>
        <li>20 verified travel hacks — immediately usable</li>
        <li>Travel tools: currency converter, trip planner, packing list</li>
      </ul>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/index.html" style="display:inline-block;background:#ff6b4a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Go to My Free Hacks →</a>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">Over the next 10 days I'll send you one focused hack per email — actionable and specific. Tomorrow: the flight booking window most people miss, and why it saves €300–600 per ticket.</p>
    `)
  }),

  subscriptionConfirmation: (user, subscription) => ({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
    subject: `✅ ${subscription.planName} is active — welcome to the upgrade`,
    html: wrap(`
      <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hi ${user.firstName || 'there'},</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 20px;">Your <strong>${subscription.planName}</strong> subscription is live. Everything is unlocked and ready.</p>
      <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:10px;padding:18px 20px;margin:0 0 24px;">
        <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
          <tr><td style="padding:5px 0;color:#6b7280;">Plan</td><td style="text-align:right;font-weight:700;">${subscription.planName}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;">Price</td><td style="text-align:right;">$${subscription.priceMonthly}/month</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;">Next renewal</td><td style="text-align:right;">${new Date(subscription.nextBillingDate).toLocaleDateString('en-US')}</td></tr>
        </table>
      </div>
      <p style="color:#374151;line-height:1.7;margin:0 0 8px;"><strong>What's unlocked:</strong></p>
      <ul style="color:#374151;line-height:1.9;margin:0 0 24px;padding-left:20px;">
        ${subscription.tier === 'smart_traveler' ? `
          <li>10 modules with 55+ verified hacks</li>
          <li>Weekly Deal Digest emails</li>
          <li>Exclusive partner deals</li>
          <li>All travel tools and goodies</li>
        ` : `
          <li>All 16 modules with 87+ verified hacks</li>
          <li>Partner Deals (Wise, Airalo, NordVPN and more)</li>
          <li>Travel Community access</li>
          <li>Weekly Deal Digest + priority support</li>
        `}
      </ul>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/index.html" style="display:inline-block;background:#ff6b4a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Go to My Modules →</a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Manage your subscription anytime in your account settings.</p>
    `)
  }),

  paymentSuccessful: (user, payment) => ({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
    subject: `Payment confirmed — $${payment.amount}`,
    html: wrap(`
      <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hi ${user.firstName || 'there'},</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 20px;">Your payment went through successfully. Here's your receipt:</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 20px;margin:0 0 24px;">
        <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
          <tr><td style="padding:5px 0;color:#6b7280;">Amount</td><td style="text-align:right;font-weight:700;">$${payment.amount}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;">Date</td><td style="text-align:right;">${new Date().toLocaleDateString('en-US')}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;">Plan</td><td style="text-align:right;">${payment.tier}</td></tr>
        </table>
      </div>
      <p style="color:#6b7280;font-size:13px;">Receipt and invoice available in your account settings.</p>
    `)
  }),

  paymentFailed: (user, payment) => ({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
    subject: `Action required — payment could not be processed`,
    html: wrap(`
      <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hi ${user.firstName || 'there'},</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 16px;">We weren't able to process your last payment. Your subscription will be paused if this isn't resolved in the next few days.</p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
        <p style="color:#991b1b;font-weight:700;margin:0 0 6px;">Common reasons:</p>
        <ul style="color:#991b1b;margin:0;padding-left:18px;line-height:1.8;font-size:14px;">
          <li>Card expired</li>
          <li>Insufficient funds</li>
          <li>Card issuer blocked the charge</li>
        </ul>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/account.html" style="display:inline-block;background:#ff6b4a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Update Payment Method →</a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Questions? Reply to this email and we'll sort it out.</p>
    `)
  }),

  subscriptionCancelled: (user) => ({
    to: user.email,
    from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
    subject: 'Your TravelSmarter subscription has been cancelled',
    html: wrap(`
      <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hi ${user.firstName || 'there'},</p>
      <p style="color:#374151;line-height:1.7;margin:0 0 16px;">Your subscription has been cancelled. Your premium access stays active until the end of the current billing period — after that you'll automatically fall back to the Free plan with your 20 hacks.</p>
      <div style="background:#f0f4ff;border-left:4px solid #667eea;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
        <p style="color:#1e3a8a;font-weight:700;margin:0 0 4px;">Your free plan keeps:</p>
        <ul style="color:#1e3a8a;margin:0;padding-left:18px;line-height:1.8;font-size:14px;">
          <li>4 core modules and 20 verified hacks</li>
          <li>All travel tools</li>
        </ul>
      </div>
      <p style="color:#374151;line-height:1.7;margin:0 0 20px;">If there was something missing or something we could have done better — just reply to this email. I read every response.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://travelsmarterapp.com'}/sales-page.html" style="display:inline-block;background:#1a2744;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Reactivate Anytime →</a>
      </div>
      <p style="color:#6b7280;font-size:13px;">— Michael from TravelSmarter</p>
    `)
  })
};

// Helper function to get plan name from tier
const getPlanName = (tier) => {
  const plans = {
    'free': 'Free',
    'smart_traveler': 'Smart Traveler',
    'elite': 'Elite'
  };
  return plans[tier] || tier;
};

// Email sending functions
const emailService = {
  // Generic email sending function (used by email sequences)
  async sendEmail(msg) {
    try {
      console.log(`📨 Attempting to send email to ${msg.to}`);
      console.log(`🔑 SendGrid API Key status: ${process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET'}`);

      // Ensure default from address if not provided
      if (!msg.from) {
        msg.from = process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com';
      }

      console.log(`📧 Sending email: ${msg.subject} to ${msg.to}`);
      await sgMail.send(msg);
      console.log(`✉️ Email sent successfully to ${msg.to}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send email to ${msg.to}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Full error:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send welcome email to new users
  async sendWelcomeEmail(user) {
    try {
      console.log(`📨 Attempting to send welcome email to ${user.email}`);
      console.log(`🔑 SendGrid API Key status: ${process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET'}`);

      const msg = templates.welcomeEmail(user);
      console.log(`📧 Email template created for ${user.email}`);

      await sgMail.send(msg);
      console.log(`✉️ Welcome email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${user.email}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Full error:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send subscription confirmation
  async sendSubscriptionConfirmation(user, tier, nextBillingDate) {
    try {
      const subscription = {
        planName: getPlanName(tier),
        priceMonthly: tier === 'elite' ? 49 : tier === 'smart_traveler' ? 19 : 0,
        tier,
        nextBillingDate
      };
      const msg = templates.subscriptionConfirmation(user, subscription);
      await sgMail.send(msg);
      console.log(`✉️ Subscription confirmation sent to ${user.email} (${tier})`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send subscription confirmation to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send payment successful email
  async sendPaymentSuccessful(user, amount, tier) {
    try {
      const payment = {
        amount: (amount / 100).toFixed(2), // Convert from cents
        tier: getPlanName(tier)
      };
      const msg = templates.paymentSuccessful(user, payment);
      await sgMail.send(msg);
      console.log(`✉️ Payment success email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send payment success email to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send payment failed email
  async sendPaymentFailed(user, amount, tier) {
    try {
      const payment = {
        amount: (amount / 100).toFixed(2),
        tier: getPlanName(tier)
      };
      const msg = templates.paymentFailed(user, payment);
      await sgMail.send(msg);
      console.log(`⚠️ Payment failed email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send payment failed email to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Send subscription cancelled email
  async sendSubscriptionCancelled(user) {
    try {
      const msg = templates.subscriptionCancelled(user);
      await sgMail.send(msg);
      console.log(`✉️ Cancellation email sent to ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send cancellation email to ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = emailService;
