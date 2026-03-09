const fetch = globalThis.fetch || require('node-fetch');

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_FROM = process.env.TELNYX_FROM_NUMBER;
const SIMULATE = (process.env.TELNYX_SIMULATE || '').toLowerCase() === 'true';

async function sendSMS(to, text) {
  if (SIMULATE) {
    // Simulate sending: log and return a fake success object
    // eslint-disable-next-line no-console
    console.log('[Telnyx SIMULATE] sendSMS', { from: TELNYX_FROM || null, to, text });
    return {
      id: 'simulated-msg-' + Date.now(),
      status: 'queued',
      from: TELNYX_FROM || null,
      to,
      text,
      simulated: true,
    };
  }

  if (!TELNYX_API_KEY || !TELNYX_FROM) {
    throw new Error('Telnyx not configured (TELNYX_API_KEY or TELNYX_FROM_NUMBER missing)');
  }

  const res = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TELNYX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: TELNYX_FROM,
      to,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Telnyx error: ${res.status} ${body}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

module.exports = { sendSMS };
