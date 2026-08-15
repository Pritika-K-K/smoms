export type UserRole = 'OPERATOR' | 'ENGINEER' | 'MANAGER' | 'ADMIN';
export type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'APPROVED' | 'REJECTED' | 'CLOSED' | 'NEEDS_REWORK' | 'NEEDS_ESCALATION' | 'WITHDRAWAL_REQUESTED' | 'PENDING_REASSIGNMENT';

export interface RejectionRecord {
  reason: string;
  comment?: string;
  rejectedAt: string;
  submissionCount: number;
  managerName?: string;
}
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Department {
  id: string;
  name: string;
  code?: string;
  _count?: {
    users?: number;
    machines?: number;
  };
}

export interface User {
  id: string;
  name: string;
  code?: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  departmentId?: string | null;
  department?: Department | null;
  createdAt?: string;
}



export interface Machine {
  id: string;
  name: string;
  code?: string;
  departmentId: string;
  department?: Department;
  tickets?: Ticket[];
  _count?: {
    tickets?: number;
  };
}

export interface WorkOrder {
  id: string;
  ticketId: string;
  resolutionNotes: string;
  closedAt: string;
}

export interface Ticket {
  ticketNumber?: string | null;
  id: string;
  machineId: string;
  machine: Machine;
  raisedById: string;
  raisedBy: User;
  assignedEngineerId?: string | null;
  assignedEngineer?: User | null;
  status: TicketStatus;
  priority: TicketPriority;
  description: string;
  engineerNotes?: string | null;
  engineerAttachment?: string | null;
  attachment?: string | null;
  submissionCount?: number;
  rejectionHistory?: RejectionRecord[];
  createdAt: string;
  updatedAt: string;
  workOrder?: WorkOrder | null;
  withdrawalReason?: string;
  withdrawalComment?: string;
  withdrawalRequestedAt?: string;
  withdrawalHistory?: any[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  ticketId?: string | null;
  message: string;
  readAt?: string | null;
  createdAt: string;
  ticket?: {
    id: string;
    status: TicketStatus;
    priority: TicketPriority;
  };
}

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  user?: User | null;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
}

export interface DashboardKPIs {
  totalMachines: number;
  runningMachines: number;
  maintenanceMachines: number;
  downMachines: number;
  openTickets: number;
  criticalAlerts: number;
  pendingApprovals: number;
  downtimeEstimateHours: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  myTickets?: Ticket[];
  assignedTickets?: Ticket[];
  recentDowntimeEvents?: Ticket[];
  ticketsByStatus?: { status: TicketStatus; _count: number }[];
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
  sender?: { id: string; name: string; role: string };
}

export interface ChatTicket {
  id: string;
  ticketNumber: string;
  status: TicketStatus;
  priority: TicketPriority;
  description: string;
  machineName: string;
  departmentName: string;
  operator?: { id: string; name: string; email: string };
  engineer?: { id: string; name: string; email: string };
  lastMessage?: { message: string; createdAt: string; senderId: string } | null;
}
