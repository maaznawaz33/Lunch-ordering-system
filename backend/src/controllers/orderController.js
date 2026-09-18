const prisma = require('../config/db');
const { recordAudit } = require('../utils/auditLog');
const { getEffectiveOrderDate } = require('../utils/orderWindow');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function placeOrder(req, res, next) {
  try {
    const { quantity } = req.body;
    const qty = parseInt(quantity, 10);

    if (!qty || qty < 1 || qty > 10) {
      return res.status(400).json({ error: 'Quantity must be between 1 and 10.' });
    }

    const effectiveDate = getEffectiveOrderDate();
    const menu = await prisma.menu.findFirst({ where: { date: effectiveDate, isPublished: true } });
    if (!menu) return res.status(404).json({ error: "That day's menu is not available for ordering." });

    const totalAmount = Number(menu.price) * qty;

    const order = await prisma.order.upsert({
      where: { userId_menuId: { userId: req.user.id, menuId: menu.id } },
      update: { quantity: qty, totalAmount, status: 'CONFIRMED' },
      create: { userId: req.user.id, menuId: menu.id, quantity: qty, totalAmount, status: 'CONFIRMED' },
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

async function getMyOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { menu: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

async function getOrdersReport(req, res, next) {
  try {
    const { date, from, to, status } = req.query;

    let rangeStart;
    let rangeEnd;
    if (date) {
      rangeStart = startOfDay(date);
      rangeEnd = startOfDay(date);
    } else if (from && to) {
      rangeStart = startOfDay(from);
      rangeEnd = startOfDay(to);
    } else {
      rangeStart = startOfDay(new Date());
      rangeEnd = startOfDay(new Date());
    }

    const menusInRange = await prisma.menu.findMany({
      where: { date: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true },
    });
    const menuIds = menusInRange.map((m) => m.id);

    const where = { menuId: { in: menuIds } };
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        vendor: true,
        menu: true,
      },
      orderBy: [{ menu: { date: 'asc' } }, { createdAt: 'desc' }],
    });

    const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0);
    const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    res.json({ orders, totalQuantity, totalAmount });
  } catch (err) {
    next(err);
  }
}

async function assignVendor(req, res, next) {
  try {
    const { orderIds, vendorId } = req.body;

    if (!vendorId || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'vendorId and at least one orderId are required.' });
    }

    const result = await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { vendorId },
    });

    await recordAudit({
      actorId: req.user.id,
      action: 'VENDOR_ASSIGNED',
      entity: 'Order',
      details: { orderIds, vendorId, ordersUpdated: result.count },
    });

    res.json({ updated: result.count });
  } catch (err) {
    next(err);
  }
}

module.exports = { placeOrder, getMyOrders, getOrdersReport, assignVendor };
