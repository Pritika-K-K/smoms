import prisma from '../src/config/db.js';
import { getDepartmentCode } from '../src/utils/ticketNumber.util.js';

export const migrateTicketNumbers = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const departments = await prisma.department.findMany();

      for (const dept of departments) {
        const deptCode = getDepartmentCode(dept.name);

        const tickets = await prisma.ticket.findMany({
          where: {
            machine: { departmentId: dept.id },
          },
          orderBy: { createdAt: 'asc' },
        });

        const monthGroups = {};
        for (const t of tickets) {
          const d = new Date(t.createdAt);
          const year = String(d.getFullYear()).slice(-2);
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const yymm = `${year}${month}`;
          
          if (!monthGroups[yymm]) monthGroups[yymm] = [];
          monthGroups[yymm].push(t);
        }

        for (const yymm of Object.keys(monthGroups)) {
          const group = monthGroups[yymm];
          for (let i = 0; i < group.length; i++) {
            const t = group[i];
            const seqStr = String(i + 1).padStart(3, '0');
            const ticketNumber = `TKT-${deptCode}-${yymm}-${seqStr}`;

            if (t.ticketNumber !== ticketNumber) {
              await prisma.ticket.update({
                where: { id: t.id },
                data: { ticketNumber },
              });
            }
          }
        }
      }
      console.log('✅ Ticket numbers migrated successfully to TKT-[DEPT]-[YYMM]-[SEQ] format');
      return;
    } catch (err) {
      console.warn(`[Migration Attempt ${attempt}/${retries} failed]:`, err.message?.substring(0, 120));
      if (attempt === retries) {
        console.error('Error migrating ticket numbers after max retries:', err);
      } else {
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  }
};

if (process.argv[1] && process.argv[1].includes('migrate-ticket-numbers')) {
  migrateTicketNumbers().then(() => process.exit(0));
}
