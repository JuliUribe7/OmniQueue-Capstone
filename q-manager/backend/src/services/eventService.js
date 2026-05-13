const { query } = require('../db');

async function createEvent(ticketId, type, metadata = {}) {
  const res = await query(
    `INSERT INTO "Event" ("id", "ticketId", "type", "metadata", "createdAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())
     RETURNING *`,
    [ticketId, type, JSON.stringify(metadata)],
  );
  return res.rows[0];
}

async function createFunnelEvent(businessId, type, metadata = {}) {
  const res = await query(
    `INSERT INTO "FunnelEvent" ("id", "businessId", "type", "metadata", "createdAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())
     RETURNING *`,
    [businessId, type, JSON.stringify(metadata)],
  );
  return res.rows[0];
}

module.exports = { createEvent, createFunnelEvent };
