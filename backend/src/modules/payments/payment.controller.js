const paymentService = require('./payment.service');

async function create(req, res, next) {
  try {
    const result = await paymentService.createPaymentOrder(req.user.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function webhook(req, res, next) {
  try {
    const signature = req.headers['stripe-signature'] || req.headers['x-webhook-signature'];
    const result = await paymentService.processWebhook(req.body, signature);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const payment = await paymentService.getPayment(req.params.id, req.user.id);
    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
}

/**
 * Simulate payment success (for local testing without real Stripe)
 */
async function simulateSuccess(req, res, next) {
  try {
    const { paymentId, orderId } = req.body;
    const result = await paymentService.processWebhook(
      {
        id: `evt_sim_${Date.now()}`,
        type: 'payment.success',
        orderId: orderId,
        paymentId: paymentId,
        data: {
          object: {
            id: `pi_sim_${Date.now()}`,
            metadata: { orderId, reservationId: req.body.reservationId },
          },
        },
      },
      null
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, webhook, get, simulateSuccess };
