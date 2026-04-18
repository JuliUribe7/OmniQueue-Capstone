const telnyxService = require('./telnyxService');
const resendService = require('./resendService');

/**
 * Send a notification to a customer based on the business's notificationChannel.
 * @param {object} business - Business row (must include notificationChannel)
 * @param {object} contact  - { phone, email, name }
 * @param {object} message  - { sms: string, subject: string, html: string }
 */
async function sendNotification(business, contact, message) {
  const channel = (business.notificationChannel || 'sms').toLowerCase();
  const errors = [];

  if ((channel === 'sms' || channel === 'both') && contact.phone) {
    try {
      await telnyxService.sendSMS(contact.phone, message.sms);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('SMS notification failed:', err.message);
      errors.push(err);
    }
  }

  if ((channel === 'email' || channel === 'both') && contact.email) {
    try {
      await resendService.sendEmail(contact.email, message.subject, message.html);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Email notification failed:', err.message);
      errors.push(err);
    }
  }
}

module.exports = { sendNotification };
