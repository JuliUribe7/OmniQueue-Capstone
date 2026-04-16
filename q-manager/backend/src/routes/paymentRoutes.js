const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db');

// Create checkout session for barbershop subscription
router.post('/create-checkout', async (req, res) => {
  try {
    const { businessName, email, businessId } = req.body;

    // Create a Stripe customer
    const customer = await stripe.customers.create({
      email,
      name: businessName,
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: {
        businessId: businessId,
      },
      success_url: `${process.env.FRONTEND_URL}/${businessId}/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?cancelled=true`,
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook - listens for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await db.query(
      `UPDATE "Business" SET "plan" = 'pro' WHERE "id" = $1`,
      [session.metadata.businessId]
    );
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    await db.query(
      `UPDATE "Business" SET "plan" = 'basic' WHERE "stripeCustomerId" = $1`,
      [subscription.customer]
    );
  }

  res.json({ received: true });
});

module.exports = router;