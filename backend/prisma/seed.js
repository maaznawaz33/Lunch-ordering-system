const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Weekly menu from the client's requirements doc
const WEEKLY_MENU = [
  { dayOffset: 1, itemName: 'Beef Haleem with Naan' }, // Monday
  { dayOffset: 2, itemName: 'Chicken Karahi with Naan' }, // Tuesday
  { dayOffset: 3, itemName: 'Daal Chawal' }, // Wednesday
  { dayOffset: 4, itemName: 'Chicken Nihari with Naan' }, // Thursday
  { dayOffset: 5, itemName: 'Chicken Biryani' }, // Friday
  { dayOffset: 6, itemName: 'Aloo Qeema (Beef) with Naan' }, // Saturday
  { dayOffset: 0, itemName: 'Vegetable Bhujia with Naan' }, // Sunday
];

function nextDateForWeekday(dayOffset) {
  // dayOffset: 0 = Sunday ... 6 = Saturday (JS convention)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (dayOffset - today.getDay() + 7) % 7;
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return result;
}

async function main() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'ChangeMe123!'; // CHANGE IMMEDIATELY after first login

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      fullName: 'System Admin',
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  console.log(`Seeded admin user: ${adminEmail} / ${adminPassword} (CHANGE THIS PASSWORD)`);

  for (const day of WEEKLY_MENU) {
    const date = nextDateForWeekday(day.dayOffset);
    await prisma.menu.upsert({
      where: { date },
      update: {},
      create: {
        date,
        itemName: day.itemName,
        price: 275.0,
        isPublished: true,
      },
    });
  }

  console.log('Seeded this week\'s menu.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
