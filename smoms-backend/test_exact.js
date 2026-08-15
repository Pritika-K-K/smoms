import prisma from './src/config/db.js';

async function main() {
  try {
    const t = await prisma.ticket.findFirst();
    if (!t) {
      console.log('No ticket found in DB');
      return;
    }
    console.log('Found ticket ID:', t.id, 'current status:', t.status);
    
    console.log('Attempting status update to NEEDS_REWORK...');
    const res = await prisma.ticket.update({
      where: { id: t.id },
      data: {
        status: 'NEEDS_REWORK',
        rejectionHistory: [
          {
            reason: 'Insufficient proof',
            comment: 'Test comment',
            rejectedAt: new Date().toISOString(),
            submissionCount: 1,
            managerName: 'Manager'
          }
        ]
      }
    });
    console.log('SUCCESS UPDATE! New status:', res.status);
  } catch (err) {
    console.error('--- EXACT ERROR HANDLER ---');
    console.error('Name:', err.name);
    console.error('Code:', err.code);
    console.error('Message:', err.message);
    if (err.meta) console.error('Meta:', err.meta);
  } finally {
    await prisma.$disconnect();
  }
}

main();
