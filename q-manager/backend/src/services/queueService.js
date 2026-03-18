const { pool, query } = require('../db');
const eventService = require('./eventService');
let telnyx;
try { telnyx = require('./telnyxService'); } catch (e) { telnyx = null; }

async function joinQueue(serviceId, customerToken, phoneNumber) {
  const serviceRes = await query(
    'SELECT * FROM "Service" WHERE "id" = $1',
    [serviceId],
  );
  const service = serviceRes.rows[0];
  if (!service) throw Object.assign(new Error('Service not found'), { status: 404 });

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
         ("id", "position", "status", "serviceId", "customerToken", "phoneNumber", "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, 'Waiting', $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [position, serviceId, customerToken, phoneNumber],
    );
    ticket = ticketRes.rows[0];
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  try {
    await eventService.createEvent(ticket.id, 'joined', { phoneNumber, serviceId });
  } catch (e) {
    console.error('Failed to create join event', e);
  }

  if (phoneNumber && telnyx && process.env.TELNYX_API_KEY) {
    const msg = `You've joined ${service.name}. Your position: ${ticket.position}`;
    telnyx.sendSMS(phoneNumber, msg).catch((err) => {
      console.error('Telnyx send failed', err);
    });
  }

  return ticket;
}

async function getEntryByToken(customerToken) {
  if (!customerToken) return null;
  const res = await query(
    'SELECT * FROM "Ticket" WHERE "customerToken" = $1 ORDER BY "createdAt" DESC LIMIT 1',
    [customerToken],
  );
  return res.rows[0] || null;
}

module.exports = { joinQueue, getEntryByToken };