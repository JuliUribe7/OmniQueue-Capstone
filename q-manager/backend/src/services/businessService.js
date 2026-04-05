const { query } = require('../db');

async function createBusiness(userId, name, type) {
  const res = await query(
    `INSERT INTO "Business" ("userId", "name", "type")
     VALUES ($1, $2, $3) RETURNING *`,
    [userId, name, type],
  );
  return res.rows[0];
}

async function getBusinessByUser(userId) {
  const res = await query(
    'SELECT * FROM "Business" WHERE "userId" = $1',
    [userId],
  );
  return res.rows[0] || null;
}

async function updateBusiness(userId, name, type) {
  const res = await query(
    `UPDATE "Business" SET "name" = $1, "type" = $2, "updatedAt" = NOW()
     WHERE "userId" = $3 RETURNING *`,
    [name, type, userId],
  );
  return res.rows[0] || null;
}

async function getServices(businessId) {
  const res = await query(
    'SELECT * FROM "Service" WHERE "businessId" = $1 ORDER BY "createdAt" ASC',
    [businessId],
  );
  return res.rows;
}

async function addService(businessId, name, avgTime) {
  const res = await query(
    `INSERT INTO "Service" ("businessId", "name", "avgTime")
     VALUES ($1, $2, $3) RETURNING *`,
    [businessId, name, avgTime || 15],
  );
  return res.rows[0];
}

async function updateService(serviceId, businessId, name, avgTime) {
  const res = await query(
    `UPDATE "Service" SET "name" = $1, "avgTime" = $2, "updatedAt" = NOW()
     WHERE "id" = $3 AND "businessId" = $4 RETURNING *`,
    [name, avgTime, serviceId, businessId],
  );
  return res.rows[0] || null;
}

async function deleteService(serviceId, businessId) {
  const res = await query(
    'DELETE FROM "Service" WHERE "id" = $1 AND "businessId" = $2 RETURNING *',
    [serviceId, businessId],
  );
  return res.rows[0] || null;
}

async function getQueueForBusiness(businessId) {
  const res = await query(
    `SELECT t.*, s."name" as "serviceName", s."avgTime"
     FROM "Ticket" t
     JOIN "Service" s ON t."serviceId" = s."id"
     WHERE s."businessId" = $1
     ORDER BY t."position" ASC`,
    [businessId],
  );
  return res.rows;
}

module.exports = {
  createBusiness,
  getBusinessByUser,
  updateBusiness,
  getServices,
  addService,
  updateService,
  deleteService,
  getQueueForBusiness,
};
