function getKarachiNow() {
  const nowKarachiStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' });
  return new Date(nowKarachiStr);
}

function getCutoffParts() {
  const cutoff = process.env.ORDER_CUTOFF_TIME || '09:30';
  const [h, m] = cutoff.split(':').map(Number);
  return { h, m };
}

function isPastCutoffNow() {
  const now = getKarachiNow();
  const { h, m } = getCutoffParts();
  const cutoffToday = new Date(now);
  cutoffToday.setHours(h, m, 0, 0);
  return now > cutoffToday;
}

function getEffectiveOrderDate() {
  const now = getKarachiNow();
  const effective = new Date(now);
  effective.setHours(0, 0, 0, 0);
  if (isPastCutoffNow()) {
    effective.setDate(effective.getDate() + 1);
  }
  return effective;
}

function describeEffectiveDate(effectiveDate) {
  const now = getKarachiNow();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  const isTomorrow = effectiveDate.getTime() > todayMidnight.getTime();
  const dayLabel = isTomorrow ? 'Tomorrow' : 'Today';
  const weekday = effectiveDate.toLocaleDateString('en-US', { weekday: 'long' });

  return { dayLabel, weekday };
}

module.exports = { getEffectiveOrderDate, describeEffectiveDate, isPastCutoffNow };
