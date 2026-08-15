import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Deleting auto-predictive tickets from database...");
  
  // Find tickets created by auto-predictive alert
  const predictiveTickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { description: { contains: '[PREDICTIVE ALERT]' } },
        { description: { contains: 'predictive' } },
        { description: { contains: 'Machine failure imminent' } },
      ],
    },
  });

  console.log(`Found ${predictiveTickets.length} predictive tickets to delete.`);

  for (const t of predictiveTickets) {
    // Delete notifications associated with ticket
    await prisma.notification.deleteMany({ where: { ticketId: t.id } });
    // Delete work orders associated with ticket
    await prisma.workOrder.deleteMany({ where: { ticketId: t.id } });
    // Delete ticket
    await prisma.ticket.delete({ where: { id: t.id } });
    console.log(`Deleted predictive ticket #${t.ticketNumber || t.id}`);
  }

  // Delete audit logs related to predictive tickets
  const deletedLogs = await prisma.auditLog.deleteMany({
    where: {
      action: { in: ['AUTO_PREDICTIVE_TICKET_CREATED', 'PREDICTIVE_ALERT'] },
    },
  });
  console.log(`Deleted ${deletedLogs.count} predictive audit log records.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
