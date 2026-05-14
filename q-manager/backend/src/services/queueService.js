const { pool, query } = require('../db');
const eventService = require('./eventService');
const notificationService = require('./notificationService');

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
  return res.rows[0] || null;
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
