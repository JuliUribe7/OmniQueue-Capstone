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

module.exports = { join, getStatus };
