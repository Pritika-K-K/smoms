import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("=== ALL NOTIFICATIONS IN DB ===");
  const notifs = await prisma.notification.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`Found ${notifs.length} notifications:`);
  console.log(JSON.stringify(notifs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
