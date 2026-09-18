const { Parser } = require('json2csv');
const prisma = require('../config/db');
const { recordAudit } = require('../utils/auditLog');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function listVendors(req, res, next) {
  try {
    const vendors = await prisma.vendor.findMany({ orderBy: { name: 'asc' } });
    res.json({ vendors });
  } catch (err) {
    next(err);
  }
}

async function createVendor(req, res, next) {
  try {
    const { name, contactInfo } = req.body;
    if (!name) return res.status(400).json({ error: 'Vendor name is required.' });
    const vendor = await prisma.vendor.create({ data: { name, contactInfo } });
    await recordAudit({ actorId: req.user.id, action: 'VENDOR_CREATED', entity: 'Vendor', entityId: vendor.id });
    res.status(201).json({ vendor });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: { id: true, fullName: true, email: true, phone: true, isActive: true, createdAt: true },
      orderBy: { fullName: 'asc' },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function deactivateUser(req, res, next) {
  try {
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (target.role === 'ADMIN') return res.status(403).json({ error: 'Cannot remove an admin account.' });

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await recordAudit({ actorId: req.user.id, action: 'USER_DEACTIVATED', entity: 'User', entityId: id });

    res.json({ message: 'User removed.' });
  } catch (err) {
    next(err);
  }
}

async function exportDailyReport(req, res, next) {
  try {
    const dateParam = req.query.date ? startOfDay(req.query.date) : startOfDay(new Date());
    const menu = await prisma.menu.findFirst({ where: { date: dateParam } });
    if (!menu) return res.status(404).json({ error: 'No menu found for that date.' });

    const orders = await prisma.order.findMany({
      where: { menuId: menu.id, status: 'CONFIRMED' },
      include: { user: true, vendor: true },
      orderBy: { user: { fullName: 'asc' } },
    });

    const rows = orders.map((o) => ({
      Employee: o.user.fullName,
      Email: o.user.email,
      Item: menu.itemName,
      Quantity: o.quantity,
      TotalAmount: o.totalAmount,
      Vendor: o.vendor ? o.vendor.name : 'Unassigned',
      OrderedAt: o.createdAt.toISOString(),
    }));

    const parser = new Parser();
    const csv = parser.parse(
      rows.length ? rows : [{ Employee: '', Email: '', Item: '', Quantity: '', TotalAmount: '', Vendor: '', OrderedAt: '' }]
    );

    await recordAudit({ actorId: req.user.id, action: 'REPORT_EXPORTED', entity: 'Menu', entityId: menu.id });

    res.header('Content-Type', 'text/csv');
    res.attachment(`lunch-report-${dateParam.toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { listVendors, createVendor, listUsers, deactivateUser, exportDailyReport };
