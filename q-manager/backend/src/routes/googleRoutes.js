const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const googleCalendarService = require('../services/googleCalendarService');
const businessService = require('../services/businessService');
const { query } = require('../db');

// Redirect business owner to Google login
router.get('/api/google/auth', requireAuth, (req, res) => {
  const url = googleCalendarService.getAuthUrl();
  res.json({ url });
});

// Google redirects here after login
router.get('/api/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    const tokens = await googleCalendarService.getTokensFromCode(code);
    // Store tokens in session cookie temporarily — frontend will send businessId
    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard?google_tokens=${encodeURIComponent(JSON.stringify(tokens))}`,
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Google tokens for a business
router.post('/api/google/save-tokens', requireAuth, async (req, res) => {
  try {
    const { tokens } = req.body;
    if (!tokens) return res.status(400).json({ error: 'tokens are required' });
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    await query(
      `UPDATE "Business" SET "googleTokens" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      [JSON.stringify(tokens), business.id],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if business has Google Calendar connected
router.get('/api/google/status', requireAuth, async (req, res) => {
  try {
    const business = await businessService.getBusinessByUser(req.user.id);
    if (!business) return res.status(404).json({ error: 'No business found' });
    res.json({ connected: !!business.googleTokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
