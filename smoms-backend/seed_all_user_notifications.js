import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding notifications for all user accounts...");

  const users = await prisma.user.findMany();
  const tickets = await prisma.ticket.findMany({
    include: {
      machine: true,
      raisedBy: true,
      assignedEngineer: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${users.length} users and ${tickets.length} tickets.`);

  const admin = users.find(u => u.role === 'ADMIN');
  const manager = users.find(u => u.role === 'MANAGER');

  for (const t of tickets) {
    const tNum = t.ticketNumber || t.id.slice(0, 8);
    const mName = t.machine?.name || 'Machine Asset';
    const opId = t.raisedById;
    const engId = t.assignedEngineerId;

    // 1. Notification for Operator when ticket raised
    if (opId) {
      const existingOp = await prisma.notification.findFirst({
        where: { userId: opId, ticketId: t.id, message: { contains: 'raised successfully' } },
      });
      if (!existingOp) {
        await prisma.notification.create({
          data: {
            userId: opId,
            ticketId: t.id,
            message: `Ticket #${tNum} raised successfully for machine "${mName}".`,
            createdAt: new Date(t.createdAt.getTime() + 1000),
          },
        });
      }
    }

    // 2. Notification for Assigned Engineer
    if (engId) {
      const existingEng = await prisma.notification.findFirst({
        where: { userId: engId, ticketId: t.id, message: { contains: 'assigned to Ticket' } },
      });
      if (!existingEng) {
        await prisma.notification.create({
          data: {
            userId: engId,
            ticketId: t.id,
            message: `You have been assigned to Ticket #${tNum} for machine "${mName}".`,
            createdAt: new Date(t.createdAt.getTime() + 2000),
          },
        });
      }
    }

    // 3. Notifications for status specific states
    if (t.status === 'RESOLVED' || t.status === 'CLOSED' || t.status === 'APPROVED') {
      if (opId) {
        const existingRes = await prisma.notification.findFirst({
          where: { userId: opId, ticketId: t.id, message: { contains: 'RESOLVED' } },
        });
        if (!existingRes) {
          await prisma.notification.create({
            data: {
              userId: opId,
              ticketId: t.id,
              message: `Ticket #${tNum} for machine "${mName}" marked RESOLVED by engineer. Pending sign-off.`,
              createdAt: new Date(t.createdAt.getTime() + 5000),
            },
          });
        }
      }
      if (manager) {
        const existingMgr = await prisma.notification.findFirst({
          where: { userId: manager.id, ticketId: t.id, message: { contains: 'RESOLVED' } },
        });
        if (!existingMgr) {
          await prisma.notification.create({
            data: {
              userId: manager.id,
              ticketId: t.id,
              message: `Ticket #${tNum} for ${mName} resolved. Pending manager approval.`,
              createdAt: new Date(t.createdAt.getTime() + 6000),
            },
          });
        }
      }
    }

    if (t.status === 'CLOSED' || t.status === 'APPROVED') {
      if (opId) {
        const existingClosedOp = await prisma.notification.findFirst({
          where: { userId: opId, ticketId: t.id, message: { contains: 'APPROVED & CLOSED' } },
        });
        if (!existingClosedOp) {
          await prisma.notification.create({
            data: {
              userId: opId,
              ticketId: t.id,
              message: `Ticket #${tNum} for ${mName} has been APPROVED & CLOSED by Manager.`,
              createdAt: new Date(t.createdAt.getTime() + 10000),
            },
          });
        }
      }
      if (engId) {
        const existingClosedEng = await prisma.notification.findFirst({
          where: { userId: engId, ticketId: t.id, message: { contains: 'APPROVED & CLOSED' } },
        });
        if (!existingClosedEng) {
          await prisma.notification.create({
            data: {
              userId: engId,
              ticketId: t.id,
              message: `Ticket #${tNum} for ${mName} has been APPROVED & CLOSED by Manager.`,
              createdAt: new Date(t.createdAt.getTime() + 11000),
            },
          });
        }
      }
    }

    if (t.status === 'NEEDS_REWORK') {
      if (engId) {
        const existingRework = await prisma.notification.findFirst({
          where: { userId: engId, ticketId: t.id, message: { contains: 'rework' } },
        });
        if (!existingRework) {
          await prisma.notification.create({
            data: {
              userId: engId,
              ticketId: t.id,
              message: `REJECTION NOTICE: Ticket #${tNum} for ${mName} returned for rework by Manager.`,
              createdAt: new Date(t.createdAt.getTime() + 8000),
            },
          });
        }
      }
    }
  }

  // Also add system governance notifications for Admin
  if (admin) {
    const adminNotifCount = await prisma.notification.count({ where: { userId: admin.id } });
    if (adminNotifCount === 0) {
      await prisma.notification.createMany({
        data: [
          {
            userId: admin.id,
            message: 'System initialization complete. Department codes MCH, ASM, STMP, QUAL synchronized.',
            createdAt: new Date(Date.now() - 3600000 * 24),
          },
          {
            userId: admin.id,
            message: 'New plant user account "roy" provisioned successfully.',
            createdAt: new Date(Date.now() - 3600000 * 12),
          },
        ],
      });
    }
  }

  const totalNotifs = await prisma.notification.count();
  console.log(`Finished seeding notifications! Total in DB: ${totalNotifs}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
