const express = require('express');
const { getCurrentMenu, upsertMenu, listMenus } = require('../controllers/menuController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/today', requireAuth, getCurrentMenu);
router.get('/', requireAuth, requireRole('ADMIN'), listMenus);
router.post('/', requireAuth, requireRole('ADMIN'), upsertMenu);

module.exports = router;
