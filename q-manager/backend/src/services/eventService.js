const prisma = require('../prismaClient');

async function createEvent(ticketId, type, metadata = {}) {
  return prisma.event.create({
    data: { ticketId, type, metadata },
  });
}

module.exports = { createEvent };
