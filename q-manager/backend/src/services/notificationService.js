const telnyxService = require('./telnyxService');
const resendService = require('./resendService');
const { query } = require('../db');

async function sendNotification(business, contact, message) {
  const channel = (business.notificationChannel || 'sms').toLowerCase();

  if ((channel === 'sms' || channel === 'both') && contact.phone) {
    try {
      await telnyxService.sendSMS(contact.phone, message.sms);
      await query(
        `UPDATE "Business" SET "smsSentTotal" = "smsSentTotal" + 1 WHERE "id" = $1`,
        [business.id],
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('SMS notification failed:', err.message);
    }
  }

  if ((channel === 'email' || channel === 'both') && contact.email) {
    try {
      await resendService.sendEmail(contact.email, message.subject, message.html);
      await query(
        `UPDATE "Business" SET "emailSentTotal" = "emailSentTotal" + 1 WHERE "id" = $1`,
        [business.id],
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Email notification failed:', err.message);
    }
  }
}

module.exports = { sendNotification };
