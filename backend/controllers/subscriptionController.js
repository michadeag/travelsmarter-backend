const pool = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Pricing configuration
const PRICING = {
  smart_traveler: {
    name: 'Smart Traveler',
    price: 1900, // in cents = €19.00
    priceMonthly: 19.00,
    stripeProductId: 'prod_smart_traveler', // Will be set up in Stripe
  },
  elite: {
    name: 'Elite',
    price: 4900, // in cents = €49.00
    priceMonthly: 49.00,
    stripeProductId: 'prod_elite', // Will be set up in Stripe
  },
};

// @desc Create checkout session
// @route POST /api/subscriptions/checkout
// @access Private
exports.createCheckoutSession = async (req, res) => {
  try {
    const { tier, promoCode } = req.body;
    const userId = req.user.id;

    // Validate tier
    if (!PRICING[tier]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription tier'
      });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT id, email, stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Create or get Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      // Update user with Stripe customer ID
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, userId]
      );
    }

    // Calculate price with promo code
    let amount = PRICING[tier].price;
    let discountPercent = 0;

    if (promoCode) {
      const promoResult = await pool.query(
        `SELECT discount_percent, discount_amount, current_uses, max_uses FROM promo_codes
         WHERE code = $1 AND is_active = true AND (max_uses IS NULL OR current_uses < max_uses)`,
        [promoCode.toUpperCase()]
      );

      if (promoResult.rows.length > 0) {
        const promo = promoResult.rows[0];
        if (promo.discount_percent) {
          discountPercent = promo.discount_percent;
          amount = Math.round(amount * (1 - promo.discount_percent / 100));
        } else if (promo.discount_amount) {
          amount = Math.max(0, amount - Math.round(promo.discount_amount * 100));
        }
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: PRICING[tier].name,
              description: `TravelSmarter ${PRICING[tier].name} - Monthly Subscription`,
              metadata: {
                tier: tier,
              },
            },
            unit_amount: amount,
            recurring: {
              interval: 'month',
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout?tier=${tier}`,
      metadata: {
        userId: userId,
        tier: tier,
        promoCode: promoCode || '',
        discountPercent: discountPercent,
      },
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating checkout session',
      error: error.message,
    });
  }
};

// @desc Handle Stripe webhook
// @route POST /api/subscriptions/webhook
// @access Public
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).json({
      success: false,
      message: 'Webhook signature verification failed',
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook handler error',
    });
  }
};

async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata.userId;
  const tier = session.metadata.tier;
  const subscriptionId = session.subscription;

  // Update user subscription
  await pool.query(
    `UPDATE users
     SET subscription_tier = $1, subscription_status = 'active', stripe_subscription_id = $2
     WHERE id = $3`,
    [tier, subscriptionId, userId]
  );

  // Create subscription record
  await pool.query(
    `INSERT INTO subscriptions (user_id, tier, status, price_monthly, stripe_subscription_id)
     VALUES ($1, $2, 'active', $3, $4)`,
    [userId, tier, PRICING[tier].priceMonthly, subscriptionId]
  );

  // Log payment
  await pool.query(
    `INSERT INTO payment_history (user_id, stripe_payment_intent_id, amount, status, subscription_tier)
     VALUES ($1, $2, $3, 'completed', $4)`,
    [userId, session.payment_intent, PRICING[tier].priceMonthly, tier]
  );

  // Update promo code usage if applicable
  if (session.metadata.promoCode) {
    await pool.query(
      `UPDATE promo_codes SET current_uses = current_uses + 1
       WHERE code = $1`,
      [session.metadata.promoCode.toUpperCase()]
    );
  }

  console.log(`✅ Subscription activated for user ${userId} - tier ${tier}`);
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;

  // Find user by Stripe customer ID
  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length === 0) return;

  const userId = userResult.rows[0].id;
  const status = subscription.status === 'active' ? 'active' : 'inactive';

  await pool.query(
    `UPDATE users SET subscription_status = $1 WHERE id = $2`,
    [status, userId]
  );

  console.log(`📝 Subscription updated for user ${userId} - status ${status}`);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  // Find user by Stripe customer ID
  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length === 0) return;

  const userId = userResult.rows[0].id;

  // Downgrade to free tier
  await pool.query(
    `UPDATE users SET subscription_tier = 'free', subscription_status = 'inactive' WHERE id = $1`,
    [userId]
  );

  console.log(`❌ Subscription cancelled for user ${userId}`);
}

async function handlePaymentSucceeded(invoice) {
  const customerId = invoice.customer;

  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length === 0) return;

  const userId = userResult.rows[0].id;

  console.log(`💰 Payment succeeded for user ${userId}`);
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  const userResult = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (userResult.rows.length === 0) return;

  const userId = userResult.rows[0].id;

  console.log(`⚠️ Payment failed for user ${userId}`);
  // Here you could send an email notification
}

// @desc Get user subscription
// @route GET /api/subscriptions/current
// @access Private
exports.getCurrentSubscription = async (req, res) => {
  try {
    const subscriptionResult = await pool.query(
      `SELECT id, user_id, tier, status, price_monthly, current_period_start, current_period_end
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (subscriptionResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        subscription: {
          tier: 'free',
          status: 'inactive',
        },
      });
    }

    const subscription = subscriptionResult.rows[0];

    res.status(200).json({
      success: true,
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        priceMonthly: subscription.price_monthly,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription',
      error: error.message,
    });
  }
};

// @desc Cancel subscription
// @route POST /api/subscriptions/cancel
// @access Private
exports.cancelSubscription = async (req, res) => {
  try {
    // Get user subscription
    const userResult = await pool.query(
      'SELECT stripe_subscription_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_subscription_id) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    const subscriptionId = userResult.rows[0].stripe_subscription_id;

    // Cancel at period end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    res.status(200).json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription',
      error: error.message,
    });
  }
};

// @desc Get pricing plans
// @route GET /api/subscriptions/pricing
// @access Public
exports.getPricing = async (req, res) => {
  res.status(200).json({
    success: true,
    pricing: {
      free: {
        name: 'Free',
        price: 0,
        features: [
          '3 hacks per month',
          'Basic module access',
          'Community verification',
        ],
      },
      smart_traveler: {
        name: PRICING.smart_traveler.name,
        price: PRICING.smart_traveler.priceMonthly,
        features: [
          'All 16 modules',
          'Unlimited access to 87 hacks',
          'Daily deal alerts',
          'Save hacks & deals',
          'Priority support',
          'Expert community',
        ],
      },
      elite: {
        name: PRICING.elite.name,
        price: PRICING.elite.priceMonthly,
        features: [
          'Everything in Smart Traveler',
          'SMS alerts for mistake fares',
          'Expert consultations (Calendly)',
          'Custom deal filters',
          'Partner discount access',
          'Premium email support',
        ],
      },
    },
  });
};
