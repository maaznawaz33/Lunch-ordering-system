const express = require('express');
const { placeOrder, getMyOrders, getOrdersReport, assignVendor } = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, placeOrder);
router.get('/mine', requireAuth, getMyOrders);
router.get('/', requireAuth, requireRole('ADMIN'), getOrdersReport);
router.post('/assign-vendor', requireAuth, requireRole('ADMIN'), assignVendor);

module.exports = router;
