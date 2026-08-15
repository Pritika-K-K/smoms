import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SMOMS Database Seeding...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // 1. Create Departments
  const deptMachining = await prisma.department.create({ data: { name: 'Machining & Milling' } });
  const deptRobotics = await prisma.department.create({ data: { name: 'Assembly & Robotics' } });
  const deptStamping = await prisma.department.create({ data: { name: 'Stamping & Metalwork' } });
  const deptQuality = await prisma.department.create({ data: { name: 'Quality Control' } });

  console.log('✅ Departments created');

  // Common password hash for demo accounts
  const passAdmin = await bcrypt.hash('admin123', 10);
  const passManager = await bcrypt.hash('manager123', 10);
  const passEngineer = await bcrypt.hash('engineer123', 10);
  const passOperator = await bcrypt.hash('operator123', 10);

  // 2. Create Users
  const adminUser = await prisma.user.create({
    data: {
      name: 'Alex Vance (Admin)',
      email: 'admin@smoms.com',
      passwordHash: passAdmin,
      role: 'ADMIN',
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      name: 'Marcus Brody (Prod. Manager)',
      email: 'manager@smoms.com',
      passwordHash: passManager,
      role: 'MANAGER',
      departmentId: deptMachining.id,
    },
  });

  const engineer1 = await prisma.user.create({
    data: {
      name: 'Elena Rostova (Lead Eng.)',
      email: 'engineer@smoms.com',
      passwordHash: passEngineer,
      role: 'ENGINEER',
      departmentId: deptMachining.id,
    },
  });

  const engineer2 = await prisma.user.create({
    data: {
      name: 'Sarah Connor (Sr. Eng.)',
      email: 'eng_sarah@smoms.com',
      passwordHash: passEngineer,
      role: 'ENGINEER',
      departmentId: deptRobotics.id,
    },
  });

  const engineer3 = await prisma.user.create({
    data: {
      name: 'David Miller (Maintenance Eng.)',
      email: 'eng_david@smoms.com',
      passwordHash: passEngineer,
      role: 'ENGINEER',
      departmentId: deptStamping.id,
    },
  });

  const operator1 = await prisma.user.create({
    data: {
      name: 'John Doe (Operator)',
      email: 'operator@smoms.com',
      passwordHash: passOperator,
      role: 'OPERATOR',
      departmentId: deptMachining.id,
    },
  });

  const operator2 = await prisma.user.create({
    data: {
      name: 'Lisa Ray (Operator)',
      email: 'op_lisa@smoms.com',
      passwordHash: passOperator,
      role: 'OPERATOR',
      departmentId: deptRobotics.id,
    },
  });

  console.log('✅ Users seeded for all 4 roles');

  // 3. Create Machines
  const machine1 = await prisma.machine.create({
    data: { name: 'CNC Lathe Alpha-01', departmentId: deptMachining.id, status: 'RUNNING', healthScore: 98.5 },
  });
  const machine2 = await prisma.machine.create({
    data: { name: 'Vertical Milling VMC-02', departmentId: deptMachining.id, status: 'UNDER_MAINTENANCE', healthScore: 72.0 },
  });
  const machine3 = await prisma.machine.create({
    data: { name: 'Robotic Arm KUKA-R1', departmentId: deptRobotics.id, status: 'RUNNING', healthScore: 94.0 },
  });
  const machine4 = await prisma.machine.create({
    data: { name: 'Mainline Conveyor B2', departmentId: deptRobotics.id, status: 'RUNNING', healthScore: 89.0 },
  });
  const machine5 = await prisma.machine.create({
    data: { name: 'Hydraulic Press H-500', departmentId: deptStamping.id, status: 'DOWN', healthScore: 41.5 },
  });
  const machine6 = await prisma.machine.create({
    data: { name: 'Pneumatic Puncher P-10', departmentId: deptStamping.id, status: 'RUNNING', healthScore: 87.0 },
  });
  const machine7 = await prisma.machine.create({
    data: { name: 'Optical Inspector AOI-03', departmentId: deptQuality.id, status: 'RUNNING', healthScore: 99.0 },
  });
  const machine8 = await prisma.machine.create({
    data: { name: 'High-Speed Drill D-40', departmentId: deptMachining.id, status: 'UNDER_MAINTENANCE', healthScore: 64.0 },
  });

  console.log('✅ 8 Machines created');

  // 4. Create Mock Sensor Readings
  const machines = [machine1, machine2, machine3, machine4, machine5, machine6, machine7, machine8];
  for (const m of machines) {
    for (let i = 0; i < 5; i++) {
      await prisma.sensorReading.create({
        data: {
          machineId: m.id,
          temperature: parseFloat((60 + Math.random() * 20).toFixed(1)),
          vibration: parseFloat((2 + Math.random() * 4).toFixed(2)),
          runtimeHours: parseFloat((1100 + i * 5).toFixed(1)),
          recordedAt: new Date(Date.now() - (5 - i) * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log('✅ Sensor readings generated');

  // 5. Create Tickets across different lifecycle states
  const ticket1 = await prisma.ticket.create({
    data: {
      machineId: machine5.id,
      raisedById: operator1.id,
      assignedEngineerId: engineer1.id,
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      description: 'Hydraulic seal leak detected. Fluid pressure dropping rapidly.',
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      machineId: machine2.id,
      raisedById: operator2.id,
      assignedEngineerId: engineer2.id,
      status: 'RESOLVED',
      priority: 'HIGH',
      description: 'Spindle noise detected during high-speed milling operation.',
    },
  });

  const ticket3 = await prisma.ticket.create({
    data: {
      machineId: machine8.id,
      raisedById: operator1.id,
      assignedEngineerId: engineer3.id,
      status: 'ASSIGNED',
      priority: 'MEDIUM',
      description: 'Coolant spray nozzles misaligned and clogging.',
    },
  });

  const ticket4 = await prisma.ticket.create({
    data: {
      machineId: machine4.id,
      raisedById: operator2.id,
      status: 'OPEN',
      priority: 'LOW',
      description: 'Conveyor belt speed sensor intermittent pulse warning.',
    },
  });

  // Approved ticket with WorkOrder
  const ticket5 = await prisma.ticket.create({
    data: {
      machineId: machine1.id,
      raisedById: operator1.id,
      assignedEngineerId: engineer1.id,
      status: 'CLOSED',
      priority: 'MEDIUM',
      description: 'Routine quarterly lube replacement & bearing alignment.',
    },
  });

  await prisma.workOrder.create({
    data: {
      ticketId: ticket5.id,
      resolutionNotes: 'Replaced ISO VG 68 gear oil, aligned drive shaft within 0.02mm tolerance.',
      closedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ Demo tickets and work order created');

  // 6. Create Initial Notifications
  await prisma.notification.create({
    data: {
      userId: managerUser.id,
      ticketId: ticket2.id,
      message: `Ticket #${ticket2.id.slice(0, 8)} for Vertical Milling VMC-02 marked RESOLVED by Sarah Connor. Pending approval.`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: engineer1.id,
      ticketId: ticket1.id,
      message: `CRITICAL TICKET ASSIGNED: Hydraulic Press H-500 fluid pressure failure.`,
    },
  });

  // 7. Log Initial Audit Entry
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_DATABASE_SEED',
      entityType: 'System',
      entityId: 'ROOT',
    },
  });

  console.log('🎉 Seeding complete! Log in with:');
  console.log('   Admin:    admin@smoms.com / admin123');
  console.log('   Manager:  manager@smoms.com / manager123');
  console.log('   Engineer: engineer@smoms.com / engineer123');
  console.log('   Operator: operator@smoms.com / operator123');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
