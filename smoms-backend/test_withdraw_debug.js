import { requestWithdrawal } from './src/modules/tickets/tickets.service.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: { status: { in: ['IN_PROGRESS', 'ASSIGNED', 'OPEN'] } },
      include: { assignedEngineer: true }
    });
    if (!ticket) {
      console.log("No ticket found to test");
      return;
    }
    console.log("Testing ticket ID:", ticket.id, "Status:", ticket.status, "AssignedEngId:", ticket.assignedEngineerId);
    
    const result = await requestWithdrawal(ticket.id, {
      engineerId: ticket.assignedEngineerId || '650000000000000000000001',
      reason: 'Personal emergency',
      comment: 'not well'
    });
    console.log("SUCCESS! Updated ticket:", result.id, result.status);
  } catch (err) {
    console.error("EXACT ERROR THROWN:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
