const { pool, query } = require('../db');
const eventService = require('./eventService');
const notificationService = require('./notificationService');
const { sendEmail } = require('./resendService');

async function joinQueue(serviceId, customerToken, phoneNumber, customerName, customerEmail, business, staffId) {
  // Look up the service
  const serviceRes = await query(
    'SELECT * FROM "Service" WHERE "id" = $1',
    [serviceId],
  );
  const service = serviceRes.rows[0];
  if (!service) throw Object.assign(new Error('Service not found'), { status: 404 });

  // Use a transaction so position count + ticket insert are atomic
  const client = await pool.connect();
  let ticket;
  try {
    await client.query('BEGIN');

    const countRes = await client.query(
      'SELECT COUNT(*) FROM "Ticket" WHERE "serviceId" = $1 AND "status" = $2',
      [serviceId, 'Waiting'],
    );
    const position = parseInt(countRes.rows[0].count, 10) + 1;

    const ticketRes = await client.query(
      `INSERT INTO "Ticket"
         ("position", "status", "serviceId", "staffId", "customerToken", "phoneNumber", "customerName", "customerEmail", "createdAt", "updatedAt")
       VALUES ($1, 'Waiting', $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [position, serviceId, staffId || null, customerToken, phoneNumber, customerName || null, customerEmail || null],
    );
    ticket = ticketRes.rows[0];

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Log event
  try {
    await eventService.createEvent(ticket.id, 'joined', { phoneNumber, serviceId });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to create join event', e);
  }

  // Send notification based on business channel preference
  if (business && (phoneNumber || customerEmail)) {
    const smsText = `You've joined ${service.name}. Your position: #${ticket.position}. Estimated wait: ${service.avgTime * ticket.position} min.`;
    notificationService.sendNotification(
      business,
      { phone: phoneNumber, email: customerEmail, name: customerName },
      {
        sms: smsText,
        subject: `Queue Confirmation – ${service.name}`,
        html: `<p>Hi ${customerName || 'there'},</p>
               <p>You've joined the queue for <strong>${service.name}</strong>.</p>
               <p>Your position: <strong>#${ticket.position}</strong><br>
               Estimated wait: <strong>${service.avgTime * ticket.position} min</strong></p>
               <p>Thanks for using OmniQueue!</p>`,
      },
    ).catch((err) => console.error('Notification failed:', err.message));
  }

  return ticket;
}

async function getEntryByToken(customerToken) {
  if (!customerToken) return null;
  const res = await query(
    `SELECT t.*, s."name" as "serviceName", s."avgTime"
     FROM "Ticket" t
     JOIN "Service" s ON t."serviceId" = s."id"
     WHERE t."customerToken" = $1
     ORDER BY t."createdAt" DESC LIMIT 1`,
    [customerToken],
  );
  return res.rows[0] || null;
}

async function getQueueByService(serviceId) {
  const res = await query(
    'SELECT * FROM "Ticket" WHERE "serviceId" = $1 ORDER BY "position" ASC',
    [serviceId],
  );
  return res.rows;
}

async function callTicket(ticketId) {
  const res = await query(
    `UPDATE "Ticket" SET "status" = 'Called', "updatedAt" = NOW() WHERE "id" = $1 RETURNING *`,
    [ticketId],
  );
  return res.rows[0] || null;
}

async function markTicketDone(ticketId) {
  const res = await query(
    `UPDATE "Ticket" SET "status" = 'Done', "updatedAt" = NOW() WHERE "id" = $1 RETURNING *`,
    [ticketId],
  );
  const ticket = res.rows[0] || null;

  // Send review request email if customer provided email
  if (ticket && ticket.customerEmail) {
    try {
      const serviceRes = await query(
        `SELECT s."name", b."id" as "businessId", b."name" as "businessName"
         FROM "Service" s JOIN "Business" b ON s."businessId" = b.id
         WHERE s.id = $1`,
        [ticket.serviceId],
      );
      const row = serviceRes.rows[0];
      if (row) {
        const reviewUrl = `${process.env.FRONTEND_URL}/${row.businessId}?review=${ticket.id}`;
        sendEmail(
          ticket.customerEmail,
          `How was your visit to ${row.businessName}?`,
          `<p>Hi ${ticket.customerName || 'there'},</p>
           <p>Thank you for visiting <strong>${row.businessName}</strong>!</p>
           <p>We'd love to hear about your experience. It only takes a second:</p>
           <p><a href="${reviewUrl}" style="background:#0a7ea4;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Leave a Review ★</a></p>
           <p>Thanks for using OmniQueue!</p>`,
        ).catch((err) => console.error('Review email failed:', err.message));
      }
    } catch (e) {
      console.error('Failed to send review email:', e.message);
    }
  }

  return ticket;
}

async function removeTicket(ticketId) {
  await query('DELETE FROM "Event" WHERE "ticketId" = $1', [ticketId]);
  const res = await query(
    'DELETE FROM "Ticket" WHERE "id" = $1 RETURNING *',
    [ticketId],
  );
  return res.rows[0] || null;
}

module.exports = { joinQueue, getEntryByToken, getQueueByService, callTicket, markTicketDone, removeTicket };
