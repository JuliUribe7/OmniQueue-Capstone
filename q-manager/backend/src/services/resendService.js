const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'OmniQueue <notifications@omniqueue.app>';

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
  const { Resend } = require('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendEmail(to, subject, html, attachments) {
  const resend = getResend();
  const payload = { from: FROM_EMAIL, to, subject, html };
  if (attachments) payload.attachments = attachments;
  const { error } = await resend.emails.send(payload);
  if (error) throw new Error(`Resend error: ${error.message}`);
}

module.exports = { sendEmail };
