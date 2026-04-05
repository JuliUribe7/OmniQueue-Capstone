const { v4: uuidv4 } = require('uuid');
const queueService = require('../services/queueService');

async function join(req, res, next) {
  try {
    const { serviceId } = req.params;
    const { phoneNumber, customerToken } = req.body;
    const token = customerToken || uuidv4();

    const ticket = await queueService.joinQueue(serviceId, token, phoneNumber);

    res.json({ ticket, customerToken: token });
  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const { token } = req.params;
    const ticket = await queueService.getEntryByToken(token);
    if (!ticket) return res.status(404).json({ error: 'Entry not found' });
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

async function getQueue(req, res, next) {
  try {
    const { serviceId } = req.params;
    const tickets = await queueService.getQueueByService(serviceId);
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
}

async function callTicket(req, res, next) {
  try {
    const { ticketId } = req.params;
    const ticket = await queueService.callTicket(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

async function markDone(req, res, next) {
  try {
    const { ticketId } = req.params;
    const ticket = await queueService.markTicketDone(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

async function removeTicket(req, res, next) {
  try {
    const { ticketId } = req.params;
    const ticket = await queueService.removeTicket(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

module.exports = { join, getStatus, getQueue, callTicket, markDone, removeTicket };
