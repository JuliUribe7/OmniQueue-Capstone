const express = require('express');
const router = express.Router();
const telnyxService = require('../services/telnyxService');

// Test send endpoint: POST /api/telnyx/send { to, text }
router.post('/api/telnyx/send', async (req, res) => {
  const { to, text } = req.body || {};
  if (!to || !text) return res.status(400).json({ error: 'Missing to or text in body' });

  if (!process.env.TELNYX_FROM_NUMBER) {
    return res.status(400).json({ error: 'TELNYX_FROM_NUMBER not set in .env; cannot send SMS' });
  }

  try {
    const result = await telnyxService.sendSMS(to, text);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(err && err.status ? err.status : 500).json({ error: err.message || String(err) });
  }
});

// Webhook receiver: Telnyx will POST inbound messages and delivery receipts here
router.post('/api/telnyx/webhook', express.json(), (req, res) => {
  // For now we just log the incoming event. In production, verify signatures.
  // eslint-disable-next-line no-console
  console.log('Telnyx webhook event:', JSON.stringify(req.body));

  // TODO: persist events, correlate replies to tickets, verify signatures
  res.status(200).send('OK');
});

module.exports = router;
