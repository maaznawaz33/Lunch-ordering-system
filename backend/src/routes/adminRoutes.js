const express = require('express');
const { listVendors, createVendor, listUsers, deactivateUser, exportDailyReport } = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/vendors', listVendors);
router.post('/vendors', createVendor);
router.get('/users', listUsers);
router.delete('/users/:id', deactivateUser);
router.get('/reports/daily', exportDailyReport);

module.exports = router;
