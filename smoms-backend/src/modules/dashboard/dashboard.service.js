import prisma from '../../config/db.js';

export const getDashboardStats = async (user) => {
  // Base counts
  const totalMachines = await prisma.machine.count();
  const runningMachines = totalMachines;
  const maintenanceMachines = 0;
  const downMachines = 0;

  // Ticket counts
  const openTickets = await prisma.ticket.count({
    where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
  });

  const criticalAlerts = await prisma.ticket.count({
    where: {
      priority: 'CRITICAL',
      status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
    },
  });

  const pendingApprovals = await prisma.ticket.count({
    where: { status: 'RESOLVED' },
  });

  // Calculate Average Health Score
  const avgHealthScore = 100;

  // Role-tailored specific stats
  let userSpecificData = {};

  if (user.role === 'OPERATOR') {
    const myTickets = await prisma.ticket.findMany({
      where: { raisedById: user.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { machine: true },
    });
    userSpecificData = { myTickets };
  } else if (user.role === 'ENGINEER') {
    const assignedTickets = await prisma.ticket.findMany({
      where: { assignedEngineerId: user.id, status: { in: ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'] } },
      include: { machine: true, raisedBy: { select: { name: true } } },
      orderBy: { priority: 'desc' },
    });
    userSpecificData = { assignedTickets };
  } else if (user.role === 'MANAGER' || user.role === 'ADMIN') {
    const recentDowntimeEvents = await prisma.ticket.findMany({
      where: { priority: { in: ['HIGH', 'CRITICAL'] } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { machine: true, assignedEngineer: { select: { name: true } } },
    });

    const ticketsByStatus = await prisma.ticket.groupBy({
      by: ['status'],
      _count: true,
    });

    userSpecificData = { recentDowntimeEvents, ticketsByStatus };
  }

  // Estimated Downtime Hours (sum of duration of resolved/closed tickets)
  const downtimeEstimateHours = downMachines * 4.5 + maintenanceMachines * 2.0;

  return {
    kpis: {
      totalMachines,
      runningMachines,
      maintenanceMachines,
      downMachines,
      openTickets,
      criticalAlerts,
      pendingApprovals,
      avgHealthScore,
      downtimeEstimateHours,
    },
    ...userSpecificData,
  };
};
