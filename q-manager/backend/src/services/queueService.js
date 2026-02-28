const prisma = require('../prismaClient');

async function joinQueue(serviceId, customerToken, phoneNumber) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) throw Object.assign(new Error('Service not found'), { status: 404 });

  const waitingCount = await prisma.ticket.count({
    where: { serviceId, status: 'Waiting' },
  });

  const position = waitingCount + 1;

  const ticket = await prisma.ticket.create({
    data: {
      position,
      status: 'Waiting',
      serviceId,
      customerToken,
      phoneNumber,
    },
  });

  return ticket;
}

async function getEntryByToken(customerToken) {
  if (!customerToken) return null;
  const ticket = await prisma.ticket.findFirst({
    where: { customerToken },
    orderBy: { createdAt: 'desc' },
  });
  return ticket;
}

module.exports = { joinQueue, getEntryByToken };
