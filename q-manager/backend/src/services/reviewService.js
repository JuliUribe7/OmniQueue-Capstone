const { query } = require('../db');

async function createReview(businessId, ticketId, customerName, rating, comment) {
  const res = await query(
    `INSERT INTO "Review" ("businessId", "ticketId", "customerName", "rating", "comment")
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [businessId, ticketId || null, customerName || null, rating, comment || null],
  );
  return res.rows[0];
}

async function getReviewsForBusiness(businessId) {
  const res = await query(
    `SELECT * FROM "Review" WHERE "businessId" = $1 ORDER BY "createdAt" DESC`,
    [businessId],
  );
  return res.rows;
}

async function getReviewStats(businessId) {
  const res = await query(
    `SELECT
       COUNT(*)::integer AS total,
       ROUND(AVG(rating), 1) AS average,
       COUNT(*) FILTER (WHERE rating = 5)::integer AS five,
       COUNT(*) FILTER (WHERE rating = 4)::integer AS four,
       COUNT(*) FILTER (WHERE rating = 3)::integer AS three,
       COUNT(*) FILTER (WHERE rating = 2)::integer AS two,
       COUNT(*) FILTER (WHERE rating = 1)::integer AS one
     FROM "Review" WHERE "businessId" = $1`,
    [businessId],
  );
  return res.rows[0];
}

module.exports = { createReview, getReviewsForBusiness, getReviewStats };
