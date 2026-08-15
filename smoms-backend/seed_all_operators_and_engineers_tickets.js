import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ticket history for all operators and engineers...");

  const users = await prisma.user.findMany();
  const machines = await prisma.machine.findMany({ include: { department: true } });

  if (machines.length === 0) {
    console.log("No machines found to seed tickets.");
    return;
  }

  const operators = users.filter(u => u.role === 'OPERATOR');
  const engineers = users.filter(u => u.role === 'ENGINEER');

  console.log(`Found ${operators.length} operators and ${engineers.length} engineers.`);

  // Sample descriptions per status
  const sampleTickets = [
    {
      operatorEmail: 'operator@smoms.com', // John Doe
      engineerEmail: 'engineer@smoms.com', // Elena
      status: 'CLOSED',
      priority: 'HIGH',
      description: 'CNC Spindle overheating during heavy milling pass. Inspected and coolant line unblocked.',
      engineerNotes: 'Flushed coolant line, replaced filter element. Thermal test passed at 45°C.',
      deptCode: 'MCH',
    },
    {
      operatorEmail: 'operator@smoms.com', // John Doe
      engineerEmail: 'eng_sarah@smoms.com', // Sarah
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      description: 'Hydraulic pressure fluctuation on main clamp cylinder.',
      deptCode: 'MCH',
    },
    {
      operatorEmail: 'op_lisa@smoms.com', // Lisa Ray
      engineerEmail: 'eng_sarah@smoms.com', // Sarah
      status: 'RESOLVED',
      priority: 'HIGH',
      description: 'Robotic Arm axis 3 servo error E-304 on pick-and-place cell.',
      engineerNotes: 'Recalibrated encoder offsets and updated servo driver firmware v2.4.',
      deptCode: 'ASM',
    },
    {
      operatorEmail: 'op_lisa@smoms.com', // Lisa Ray
      engineerEmail: 'eng_david@smoms.com', // David
      status: 'CLOSED',
      priority: 'MEDIUM',
      description: 'Pneumatic gripper pressure drop causing part slippage.',
      engineerNotes: 'Replaced worn pneumatic seal ring on actuator 2.',
      deptCode: 'ASM',
    },
    {
      operatorEmail: 'suryaopr@smoms.com', // surya
      engineerEmail: 'eng_david@smoms.com', // David
      status: 'OPEN',
      priority: 'HIGH',
      description: 'Stamping die alignment pin sheared off during 200T press operation.',
      deptCode: 'STMP',
    },
    {
      operatorEmail: 'suryaopr@smoms.com', // surya
      engineerEmail: 'engineer@smoms.com', // Elena
      status: 'NEEDS_REWORK',
      priority: 'CRITICAL',
      description: 'Feed motor vibration exceeding limits on stamping line.',
      deptCode: 'STMP',
    },
    {
      operatorEmail: 'royopr@smoms.com', // roy
      engineerEmail: 'engineer@smoms.com', // Elena
      status: 'CLOSED',
      priority: 'MEDIUM',
      description: 'Quality inspection CMM probe calibration out of tolerance.',
      engineerNotes: 'Re-calibrated ruby stylus and ran ISO verification artifact test.',
      deptCode: 'QUAL',
    },
    {
      operatorEmail: 'royopr@smoms.com', // roy
      engineerEmail: 'eng_sarah@smoms.com', // Sarah
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      description: 'Optical scanner lens fogging in clean inspection room.',
      deptCode: 'QUAL',
    },
  ];

  for (const [idx, item] of sampleTickets.entries()) {
    const op = users.find(u => u.email === item.operatorEmail) || operators[0];
    const eng = users.find(u => u.email === item.engineerEmail) || engineers[0];
    
    // Find machine matching department code or fallback
    const machine = machines.find(m => m.department?.code === item.deptCode) || machines[idx % machines.length];

    const seq = String(idx + 1).padStart(3, '0');
    const ticketNumber = `TKT-${item.deptCode}-${new Date().toISOString().slice(2, 4)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${seq}`;

    // Check if ticket already exists
    const existing = await prisma.ticket.findFirst({
      where: {
        raisedById: op.id,
        description: item.description,
      },
    });

    if (!existing) {
      await prisma.ticket.create({
        data: {
          ticketNumber,
          machineId: machine.id,
          raisedById: op.id,
          assignedEngineerId: item.status === 'OPEN' ? null : eng.id,
          status: item.status,
          priority: item.priority,
          description: item.description,
          engineerNotes: item.engineerNotes || null,
          createdAt: new Date(Date.now() - (idx + 1) * 3600000 * 4),
        },
      });
      console.log(`Seeded ticket ${ticketNumber} (${item.status}) for ${op.name} -> ${eng.name}`);
    } else {
      console.log(`Ticket already exists for ${op.name}: ${item.description.slice(0, 30)}`);
    }
  }

  console.log("Finished seeding ticket history!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
