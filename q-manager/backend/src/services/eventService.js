const pool = require('../prismaClient');
const eventService = require('./eventService');
let telnyx;
try { telnyx = require('./telnyxService'); } catch (e) { telnyx = null; }

async function joinQueue(serviceId, customerToken, phoneNumber) {
  const serviceRes = await pool.query(
    `SELECT * FROM "Service" WHERE id = $1`, [serviceId]
  );
  const service = serviceRes.rows[0];
  if (!service) throw Object.assign(new Error('Service not found'), { status: 404 });

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM "Ticket" WHERE "serviceId" = $1 AND status = 'Waiting'`,
    [serviceId]
  );
  const position = parseInt(countRes.rows[0].count) + 1;

  const ticketRes = await pool.query(
    `INSERT INTO "Ticket" (id, position, status, "serviceId", "customerToken", "phoneNumber", "snoozeCount", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, 'Waiting', $2, $3, $4, 0, NOW(), NOW())
     RETURNING *`,
    [position, serviceId, customerToken, phoneNumber]
  );
  const ticket = ticketRes.rows[0];

  try {
    await eventService.createEvent(ticket.id, 'joined', { phoneNumber, serviceId });
  } catch (e) {
    console.error('Failed to create join event', e);
  }

  if (phoneNumber && telnyx && process.env.TELNYX_API_KEY) {
    const msg = `You've joined ${service.name}. Your position: ${position}`;
    telnyx.sendSMS(phoneNumber, msg).catch((err) => {
      console.error('Telnyx send failed', err);
    });
  }

  return ticket;
}

async function getEntryByToken(customerToken) {
  if (!customerToken) return null;
  const result = await pool.query(
    `SELECT * FROM "Ticket" WHERE "customerToken" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
    [customerToken]
  );
  return result.rows[0] || null;
}

module.exports = { joinQueue, getEntryByToken };