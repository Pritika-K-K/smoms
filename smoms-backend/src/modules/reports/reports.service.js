import prisma from '../../config/db.js';

export const getReportAnalytics = async () => {
  // Machine status distribution
  const machines = await prisma.machine.findMany({
    include: { department: true },
  });

  const departmentHealthMap = {};
  machines.forEach((m) => {
    const dName = m.department.name;
    if (!departmentHealthMap[dName]) {
      departmentHealthMap[dName] = { department: dName, total: 0, sumHealth: 0, running: 0, down: 0 };
    }
    departmentHealthMap[dName].total += 1;
    
    departmentHealthMap[dName].running += 1;
    
  });

  const departmentHealth = Object.values(departmentHealthMap).map((d) => ({
    department: d.department,
    avgHealth: parseFloat((d.sumHealth / d.total).toFixed(1)),
    running: d.running,
    down: d.down,
  }));

  // Tickets breakdown by priority
  const ticketsByPriority = await prisma.ticket.groupBy({
    by: ['priority'],
    _count: { id: true },
  });

  // Tickets breakdown by status
  const ticketsByStatus = await prisma.ticket.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  // Recent 10 tickets for detailed analysis
  const recentTickets = await prisma.ticket.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      machine: { select: { name: true } },
      assignedEngineer: { select: { name: true } },
      raisedBy: { select: { name: true } },
    },
  });

  return {
    departmentHealth,
    ticketsByPriority: ticketsByPriority.map((t) => ({ priority: t.priority, count: t._count.id })),
    ticketsByStatus: ticketsByStatus.map((t) => ({ status: t.status, count: t._count.id })),
    recentTickets,
  };
};

export const generateTicketsCSV = async () => {
  const tickets = await prisma.ticket.findMany({
    include: {
      machine: { include: { department: true } },
      raisedBy: { select: { name: true, email: true } },
      assignedEngineer: { select: { name: true, email: true } },
      workOrder: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'Ticket ID',
    'Machine Name',
    'Department',
    'Priority',
    'Status',
    'Raised By',
    'Assigned Engineer',
    'Description',
    'Created At',
    'Resolution Notes',
  ];

  const rows = tickets.map((t) => [
    t.id,
    `"${t.machine.name.replace(/"/g, '""')}"`,
    `"${t.machine.department.name.replace(/"/g, '""')}"`,
    t.priority,
    t.status,
    `"${t.raisedBy.name.replace(/"/g, '""')}"`,
    `"${(t.assignedEngineer?.name || 'Unassigned').replace(/"/g, '""')}"`,
    `"${t.description.replace(/"/g, '""')}"`,
    t.createdAt.toISOString(),
    `"${(t.workOrder?.resolutionNotes || 'N/A').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
};
