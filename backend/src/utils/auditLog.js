const prisma = require('../config/db');

/**
 * Records an admin/system action for accountability.
 * Never throws - logging failures must not break the main request.
 */
async function recordAudit({ actorId, action, entity, entityId, details }) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { recordAudit };
