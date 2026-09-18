const prisma = require('../config/db');
const { recordAudit } = require('../utils/auditLog');
const { getEffectiveOrderDate, describeEffectiveDate } = require('../utils/orderWindow');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getCurrentMenu(req, res, next) {
  try {
    const effectiveDate = getEffectiveOrderDate();
    const { dayLabel, weekday } = describeEffectiveDate(effectiveDate);

    const menu = await prisma.menu.findFirst({ where: { date: effectiveDate, isPublished: true } });

    if (!menu) {
      return res.status(404).json({
        error: `${weekday}'s menu hasn't been published yet.`,
        effectiveDate,
        dayLabel,
        weekday,
      });
    }

    res.json({ menu, effectiveDate, dayLabel, weekday });
  } catch (err) {
    next(err);
  }
}

async function upsertMenu(req, res, next) {
  try {
    const { date, itemName, description, price, isPublished } = req.body;
    if (!date || !itemName) {
      return res.status(400).json({ error: 'date and itemName are required.' });
    }

    const menuDate = startOfDay(date);
    const menu = await prisma.menu.upsert({
      where: { date: menuDate },
      update: { itemName, description, price, isPublished: !!isPublished },
      create: {
        date: menuDate,
        itemName,
        description,
        price: price || process.env.DEFAULT_LUNCH_PRICE || 275.0,
        isPublished: !!isPublished,
      },
    });

    await recordAudit({ actorId: req.user.id, action: 'MENU_UPSERT', entity: 'Menu', entityId: menu.id, details: { date, itemName } });

    res.status(201).json({ menu });
  } catch (err) {
    next(err);
  }
}

async function listMenus(req, res, next) {
  try {
    const menus = await prisma.menu.findMany({ orderBy: { date: 'asc' } });
    res.json({ menus });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCurrentMenu, upsertMenu, listMenus };
