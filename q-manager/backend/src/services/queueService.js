const prisma = require('../prismaClient');
const eventService = require('./eventService');
let telnyx;
try { telnyx = require('./telnyxService'); } catch (e) { telnyx = null; }

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

  // log event
  try {
    await eventService.createEvent(ticket.id, 'joined', { phoneNumber, serviceId });
  } catch (e) {
    // swallow event errors but log
    // eslint-disable-next-line no-console
    console.error('Failed to create join event', e);
  }

  // send SMS if configured and phoneNumber present
  if (phoneNumber && telnyx && process.env.TELNYX_API_KEY) {
    const msg = `You've joined ${service.name}. Your position: ${position}`;
    telnyx.sendSMS(phoneNumber, msg).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Telnyx send failed', err);
    });
  }

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
