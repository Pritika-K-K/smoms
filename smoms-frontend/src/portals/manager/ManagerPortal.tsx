import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { Sidebar, SidebarNavItem } from '../../components/common/Sidebar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ProfileSection } from '../../components/common/ProfileSection';
import { TicketDistributionChart } from '../../components/charts/TicketDistributionChart';
import { getDashboardApi } from '../../api/dashboard';
import { getTicketsApi, reviewTicketApprovalApi, reviewWithdrawalApi } from '../../api/tickets';
import { getDepartmentsApi } from '../../api/departments';
import { getUsersApi } from '../../api/users';
import { getMachinesApi } from '../../api/machines';
import { getAnalyticsApi, downloadTicketsCSV } from '../../api/reports';
import { getNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi } from '../../api/notifications';
import { Ticket, DashboardKPIs, NotificationItem, Department, User, Machine } from '../../types';
import { CheckCircle2, XCircle, LogOut, FileSpreadsheet, Activity, ShieldCheck, BarChart3, Clock, Bell, CheckCheck, FileText, Filter, Inbox, CheckSquare, AlertCircle, Image as ImageIcon, Paperclip, LayoutDashboard, Building2, Users, Wrench, User as UserIcon, Eye, ChevronDown, ChevronUp, Play, Zap } from 'lucide-react';

export const ManagerPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('executive');

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Dashboard View Details Section States (Default to false: details hidden initially)
  const [showDeptDetails, setShowDeptDetails] = useState<boolean>(false);
  const [showOperatorDetails, setShowOperatorDetails] = useState<boolean>(false);
  const [showEngineerDetails, setShowEngineerDetails] = useState<boolean>(false);

  // Ticket Management Section State: unassigned | assigned | in_progress | closed_approved
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [ticketSubTab, setTicketSubTab] = useState<'unassigned' | 'assigned' | 'in_progress' | 'closed_approved'>('unassigned');

  // Review Modal State
  const [reviewingTicket, setReviewingTicket] = useState<Ticket | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Insufficient proof');
  const [rejectionComment, setRejectionComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewingWithdrawalTicket, setReviewingWithdrawalTicket] = useState<Ticket | null>(null);
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState<string>('');
  const [isSubmittingWithdrawalReview, setIsSubmittingWithdrawalReview] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dash, tList, dList, uList, mList, reportData, notifRes] = await Promise.all([
        getDashboardApi(),
        getTicketsApi(),
        getDepartmentsApi(),
        getUsersApi(),
        getMachinesApi(),
        getAnalyticsApi(),
        getNotificationsApi(),
      ]);
      setKpis(dash.kpis);
      setTickets(tList);
      setDepartments(dList);
      setUsers(uList);
      setMachines(mList);
      setAnalytics(reportData);
      setNotifications(notifRes.notifications);
      setUnreadCount(notifRes.unreadCount);
    } catch (err: any) {
      console.error('Failed to load manager portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReviewDecision = async (decision: 'APPROVE' | 'REJECT') => {
    if (!reviewingTicket) return;
    try {
      setSubmitting(true);
      const reason = decision === 'REJECT' ? rejectionReason : undefined;
      const comment = decision === 'REJECT' ? rejectionComment : reviewNotes;
      
      await reviewTicketApprovalApi(reviewingTicket.id, decision, reviewNotes, reason, comment);
      setToastMessage(
        `Ticket ${reviewingTicket.ticketNumber || `#${reviewingTicket.id.slice(0, 8)}`} ${decision === 'APPROVE' ? 'Approved & Closed' : 'returned for rework to engineer'}.`
      );
      setReviewingTicket(null);
      setReviewNotes('');
      setShowRejectForm(false);
      setRejectionReason('Insufficient proof');
      setRejectionComment('');
      fetchData();
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      await downloadTicketsCSV();
      setToastMessage('CSV Report downloaded successfully!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      alert('Failed to download CSV report');
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      fetchData();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsReadApi();
      fetchData();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const pendingResolvedTickets = tickets.filter((t) => t.status === 'RESOLVED');
  const withdrawalRequestTickets = tickets.filter((t) => t.status === 'WITHDRAWAL_REQUESTED');
  const totalPendingApprovals = pendingResolvedTickets.length + withdrawalRequestTickets.length;
  const operators = users.filter((u) => u.role === 'OPERATOR');
  const engineers = users.filter((u) => u.role === 'ENGINEER');

  // Ticket Management Filtering Logic
  const filteredDeptTickets = tickets.filter((t) => {
    if (selectedDeptId === 'ALL') return true;
    return t.machine.department?.id === selectedDeptId || t.machine.departmentId === selectedDeptId;
  });

  const unassignedTicketsList = filteredDeptTickets.filter((t) => t.status === 'OPEN' || !t.assignedEngineerId);
  const assignedTicketsList = filteredDeptTickets.filter((t) => (t.status === 'ASSIGNED' || t.status === 'REJECTED') && t.assignedEngineerId);
  const inProgressTicketsList = filteredDeptTickets.filter((t) => t.status === 'IN_PROGRESS');
  const closedApprovedTicketsList = filteredDeptTickets.filter((t) => ['CLOSED', 'APPROVED'].includes(t.status));

  const sidebarItems: SidebarNavItem[] = [
    { id: 'executive', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'approvals', label: 'Pending Approvals', icon: ShieldCheck, badgeCount: pendingResolvedTickets.length },
    { id: 'withdrawal_requests', label: 'Withdrawal Requests', icon: LogOut, badgeCount: withdrawalRequestTickets.length },
    { id: 'ticket_management', label: 'Ticket Management', icon: FileText },
    { id: 'analytics', label: 'Reports & CSV Export', icon: BarChart3 },
    
    { id: 'profile', label: 'My Profile', icon: UserIcon },
  ];


  const handleApproveWithdrawal = async (ticket: Ticket) => {
    try {
      await reviewWithdrawalApi(ticket.id, 'APPROVE');
      setToastMessage(`Withdrawal approved for Ticket #${ticket.ticketNumber || ticket.id.slice(0, 8)}. Ticket is now pending reassignment with elevated priority.`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve withdrawal');
    }
  };

  const handleRejectWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingWithdrawalTicket) return;
    if (!withdrawalRejectReason.trim()) {
      alert('Please enter a rejection reason for the engineer');
      return;
    }
    try {
      setIsSubmittingWithdrawalReview(true);
      await reviewWithdrawalApi(reviewingWithdrawalTicket.id, 'REJECT', withdrawalRejectReason);
      setToastMessage(`Withdrawal rejected for Ticket #${reviewingWithdrawalTicket.ticketNumber || reviewingWithdrawalTicket.id.slice(0, 8)}. Ticket returned to In Progress under assigned engineer.`);
      setReviewingWithdrawalTicket(null);
      setWithdrawalRejectReason('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject withdrawal');
    } finally {
      setIsSubmittingWithdrawalReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          title="Manager Station"
          navItems={sidebarItems}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-8 max-w-6xl space-y-6">
          {/* Toast */}
          {toastMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* PAGE 1: DASHBOARD */}
          {activeTab === 'executive' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h2 className="text-xl font-bold text-slate-900">Plant Manager Dashboard</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Overview of factory departments, machine allocations, operator personnel, and maintenance engineer status.
                </p>
              </div>

              {/* 1. DEPARTMENT SECTION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <span>Factory Departments Overview</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total Departments: <span className="font-bold text-slate-800">{departments.length}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeptDetails(!showDeptDetails)}
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
                  >
                    <Eye className="h-4 w-4" />
                    <span>{showDeptDetails ? 'Hide Details' : 'View Details'}</span>
                    {showDeptDetails ? <ChevronUp className="h-4 w-4 ml-0.5" /> : <ChevronDown className="h-4 w-4 ml-0.5" />}
                  </button>
                </div>

                {showDeptDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 transition-all">
                    {departments.map((dept) => {
                      const deptMachines = machines.filter((m) => m.departmentId === dept.id || m.department?.id === dept.id);
                      return (
                        <div key={dept.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{dept.name}</h4>
                              <span className="text-xs text-slate-500">ID: #{dept.id.slice(0, 8)}</span>
                            </div>
                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                              {deptMachines.length} Machine{deptMachines.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          <div>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                              Machines Installed in {dept.name}:
                            </span>
                            {deptMachines.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">No machines registered in this department.</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {deptMachines.map((m) => (
                                  <span key={m.id} className="bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-1.5 rounded-lg font-medium">
                                    ⚙️ {m.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. OPERATOR SECTION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span>Shopfloor Operators</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total Operators: <span className="font-bold text-slate-800">{operators.length}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowOperatorDetails(!showOperatorDetails)}
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
                  >
                    <Eye className="h-4 w-4" />
                    <span>{showOperatorDetails ? 'Hide Details' : 'View Details'}</span>
                    {showOperatorDetails ? <ChevronUp className="h-4 w-4 ml-0.5" /> : <ChevronDown className="h-4 w-4 ml-0.5" />}
                  </button>
                </div>

                {showOperatorDetails && (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-4 w-12 text-center">S.No</th>
                          <th className="p-4">Operator Name</th>
                          <th className="p-4">Working Department</th>
                          <th className="p-4">Assigned / Operating Machines</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {operators.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400">
                              No operators registered.
                            </td>
                          </tr>
                        ) : (
                          operators.map((op, index) => {
                            const opDeptName = op.department?.name || departments.find((d) => d.id === op.departmentId)?.name || 'Shopfloor Division';
                            const assignedMachines = machines.filter(
                              (m) => m.department?.name === opDeptName || m.departmentId === op.departmentId
                            );
                            return (
                              <tr key={op.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                                <td className="p-4 font-bold text-slate-900">{op.name}</td>
                                <td className="p-4">
                                  <span className="bg-blue-50 text-blue-800 font-semibold px-2.5 py-1 rounded-md border border-blue-100">
                                    {opDeptName}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex flex-wrap gap-1.5">
                                    {assignedMachines.length === 0 ? (
                                      <span className="text-slate-400 italic">No assigned machines</span>
                                    ) : (
                                      assignedMachines.map((m) => (
                                        <span key={m.id} className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded font-medium">
                                          {m.name}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. ENGINEER SECTION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <Wrench className="h-5 w-5 text-blue-600" />
                      <span>Maintenance Engineers & Current Working Status</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total Engineers: <span className="font-bold text-slate-800">{engineers.length}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEngineerDetails(!showEngineerDetails)}
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
                  >
                    <Eye className="h-4 w-4" />
                    <span>{showEngineerDetails ? 'Hide Details' : 'View Details'}</span>
                    {showEngineerDetails ? <ChevronUp className="h-4 w-4 ml-0.5" /> : <ChevronDown className="h-4 w-4 ml-0.5" />}
                  </button>
                </div>

                {showEngineerDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 transition-all">
                    {engineers.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 col-span-2">
                        No maintenance engineers registered.
                      </div>
                    ) : (
                      engineers.map((eng) => {
                        const acceptedTickets = tickets.filter(
                          (t) => (t.status === 'ASSIGNED' || t.status === 'REJECTED') && t.assignedEngineerId === eng.id
                        );
                        const inProgressTickets = tickets.filter((t) => t.status === 'IN_PROGRESS' && t.assignedEngineerId === eng.id);
                        const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED' && t.assignedEngineerId === eng.id);

                        return (
                          <div key={eng.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{eng.name}</h4>
                                <span className="text-xs text-slate-500">{eng.email}</span>
                              </div>
                              <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-xs">
                                Maintenance Engineer
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="bg-blue-50/60 border border-blue-100 p-2.5 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Accepted</span>
                                <span className="text-base font-bold text-blue-700">{acceptedTickets.length}</span>
                              </div>

                              <div className="bg-blue-50/60 border border-blue-100 p-2.5 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">In Progress</span>
                                <span className="text-base font-bold text-blue-700">{inProgressTickets.length}</span>
                              </div>

                              <div className="bg-blue-50/60 border border-blue-100 p-2.5 rounded-xl">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Resolved</span>
                                <span className="text-base font-bold text-blue-700">{resolvedTickets.length}</span>
                              </div>
                            </div>

                            {/* Ticket Details */}
                            <div className="space-y-2 text-xs pt-1">
                              <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                                Current Work Allocation:
                              </span>
                              {inProgressTickets.length > 0 && (
                                <div className="text-blue-800 bg-blue-50 p-2 rounded-lg border border-blue-200">
                                  ⚡ <span className="font-bold">In Progress:</span> {inProgressTickets.map((t) => `${t.machine.name} (${t.ticketNumber || `#${t.id.slice(0, 8)}`})`).join(', ')}
                                </div>
                              )}
                              {acceptedTickets.length > 0 && (
                                <div className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                  📌 <span className="font-bold">Accepted:</span> {acceptedTickets.map((t) => `${t.machine.name} (${t.ticketNumber || `#${t.id.slice(0, 8)}`})`).join(', ')}
                                </div>
                              )}
                              {inProgressTickets.length === 0 && acceptedTickets.length === 0 && (
                                <span className="text-slate-400 italic">No active jobs currently in progress.</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PAGE 2: PENDING APPROVALS */}
          {/* PAGE: WITHDRAWAL REQUESTS */}
          {activeTab === 'withdrawal_requests' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Engineer Ticket Withdrawal Requests</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inspect and review withdrawal requests submitted by engineers for active maintenance jobs.
                  </p>
                </div>
                {withdrawalRequestTickets.length > 0 && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-extrabold rounded-full border border-amber-300">
                    {withdrawalRequestTickets.length} Pending Requests
                  </span>
                )}
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading withdrawal requests...</div>
              ) : withdrawalRequestTickets.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
                  <div className="flex justify-center">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                      <LogOut className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">No Active Withdrawal Requests</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    There are currently no engineer withdrawal requests pending manager approval.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-4 w-12 text-center">S.No</th>
                        <th className="p-4">Ticket ID</th>
                        <th className="p-4">Machine Name</th>
                        <th className="p-4">Assigned Engineer</th>
                        <th className="p-4">Withdrawal Reason</th>
                        <th className="p-4">Notes / Description</th>
                        <th className="p-4">Requested Date</th>
                        <th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {withdrawalRequestTickets.map((t, index) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                          <td className="p-4 font-mono font-bold text-blue-600">
                            {t.ticketNumber || `#${t.id.slice(0, 8)}`}
                          </td>
                          <td className="p-4 font-bold text-slate-900">{t.machine?.name || 'Machine'}</td>
                          <td className="p-4 font-bold text-slate-800">
                            {t.assignedEngineer?.name || 'Engineer'}
                          </td>
                          <td className="p-4 font-bold text-amber-800">
                            <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg inline-block">
                              "{t.withdrawalReason || 'Personal emergency'}"
                            </span>
                          </td>
                          <td className="p-4 text-slate-700 max-w-xs">
                            {t.withdrawalComment || <span className="text-slate-400 italic">No additional notes</span>}
                          </td>
                          <td className="p-4 text-slate-500 whitespace-nowrap">
                            {t.withdrawalRequestedAt
                              ? new Date(t.withdrawalRequestedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                              : new Date().toLocaleDateString()}
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleApproveWithdrawal(t)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setReviewingWithdrawalTicket(t);
                                  setWithdrawalRejectReason('');
                                }}
                                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h2 className="text-xl font-bold text-slate-900">Pending Manager Approvals & Sign-Offs</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Review repair notes submitted by engineers. Approving closes the ticket and generates a Work Order.
                </p>
              </div>

              {/* ENGINEER WITHDRAWAL REQUESTS SECTION */}
              {withdrawalRequestTickets.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl space-y-4 shadow-xs">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <h3 className="font-bold text-amber-900 text-base">Engineer Ticket Withdrawal Requests ({withdrawalRequestTickets.length})</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {withdrawalRequestTickets.map((t) => (
                      <div key={t.id} className="bg-white border border-amber-200 p-4 rounded-xl shadow-xs space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-xs font-bold text-blue-600">{t.ticketNumber || `#${t.id.slice(0, 8)}`}</span>
                            <h4 className="font-bold text-slate-900 text-sm mt-0.5">{t.machine.name}</h4>
                          </div>
                          <StatusBadge type="ticket" value={t.status} />
                        </div>
                        <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg space-y-1">
                          <div><span className="font-bold">Engineer:</span> {t.assignedEngineer?.name || 'Assigned Engineer'}</div>
                          <div><span className="font-bold text-amber-800">Reason:</span> "{t.withdrawalReason || 'Personal emergency'}"</div>
                          {t.withdrawalComment && (
                            <div><span className="font-bold">Notes:</span> {t.withdrawalComment}</div>
                          )}
                        </div>
                        <div className="flex items-center justify-end space-x-2 pt-1">
                          <button
                            onClick={() => {
                              setReviewingWithdrawalTicket(t);
                              setWithdrawalRejectReason('');
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition cursor-pointer"
                          >
                            Reject Withdrawal
                          </button>
                          <button
                            onClick={() => handleApproveWithdrawal(t)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer"
                          >
                            Approve Withdrawal
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
<div className="space-y-4">
                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-400">Loading pending reviews...</div>
                ) : pendingResolvedTickets.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                    No tickets currently waiting for manager sign-off.
                  </div>
                ) : (
                  pendingResolvedTickets.map((t) => (
                    <div
                      key={t.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-sm font-bold text-blue-600">{t.ticketNumber || `#${t.id.slice(0, 8)}`}</span>
                          <StatusBadge type="ticket" value={t.status} />
                        </div>
                        <h4 className="text-base font-bold text-slate-900">{t.machine.name}</h4>
                        <p className="text-xs text-slate-600">
                          <span className="font-bold text-slate-700">Fault: </span>
                          {t.description}
                        </p>
                        <div className="text-xs text-blue-700 font-semibold">
                          Resolved by Engineer: {t.assignedEngineer?.name || 'Engineer'}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 w-full md:w-auto">
                        <button
                          onClick={() => {
                            setReviewingTicket(t);
                            setReviewDecision('APPROVE');
                          }}
                          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Approve & Close</span>
                        </button>

                        <button
                          onClick={() => {
                            setReviewingTicket(t);
                            setReviewDecision('REJECT');
                          }}
                          className="flex items-center space-x-1.5 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition"
                        >
                          <XCircle className="h-4 w-4 text-slate-500" />
                          <span>Reject & Re-Open</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PAGE 3: TICKET MANAGEMENT */}
          {activeTab === 'ticket_management' && (
            <div className="space-y-6">
              {/* Header with Department Dropdown */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Ticket Management</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Filter maintenance tickets by department and inspect unassigned, assigned, in progress, or closed & approved tickets.
                  </p>
                </div>

                {/* Department Dropdown */}
                <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <Filter className="h-4 w-4 text-slate-500 ml-1" />
                  <span className="text-xs font-bold text-slate-700">Department:</span>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600 shadow-xs"
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sub-Tabs Navigation Bar */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                <button
                  onClick={() => setTicketSubTab('unassigned')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition border ${
                    ticketSubTab === 'unassigned'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>UNASSIGNED</span>
                  <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ticketSubTab === 'unassigned' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {unassignedTicketsList.length}
                  </span>
                </button>

                <button
                  onClick={() => setTicketSubTab('assigned')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition border ${
                    ticketSubTab === 'assigned'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Play className="h-4 w-4" />
                  <span>ASSIGNED</span>
                  <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ticketSubTab === 'assigned' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {assignedTicketsList.length}
                  </span>
                </button>

                <button
                  onClick={() => setTicketSubTab('in_progress')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition border ${
                    ticketSubTab === 'in_progress'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Zap className="h-4 w-4" />
                  <span>PROGRESS</span>
                  <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ticketSubTab === 'in_progress' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {inProgressTicketsList.length}
                  </span>
                </button>

                <button
                  onClick={() => setTicketSubTab('closed_approved')}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition border ${
                    ticketSubTab === 'closed_approved'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>CLOSED</span>
                  <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    ticketSubTab === 'closed_approved' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {closedApprovedTicketsList.length}
                  </span>
                </button>
              </div>

              {/* Table Data Render */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  {ticketSubTab === 'unassigned' && 'Unassigned Open Tickets (Pending Engineer Acceptance)'}
                  {ticketSubTab === 'assigned' && 'Assigned Maintenance Tickets (Accepted by Engineers)'}
                  {ticketSubTab === 'in_progress' && 'In Progress Maintenance Tickets (Active Work)'}
                  {ticketSubTab === 'closed_approved' && 'Closed & Approved Maintenance Tickets'}
                </h3>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-4 w-12 text-center">S.No</th>
                        <th className="p-4">Raised Ticket Date & Time</th>
                        <th className="p-4">Ticket ID</th>
                        <th className="p-4">Machine Name</th>
                        <th className="p-4">Operator Name & Station</th>
                        <th className="p-4">Reason for Raising Ticket</th>
                        {ticketSubTab === 'closed_approved' && (
                          <>
                            <th className="p-4">Engineer Description</th>
                            <th className="p-4">Manager Description</th>
                          </>
                        )}
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* 1. UNASSIGNED TICKETS */}
                      {ticketSubTab === 'unassigned' && (
                        unassignedTicketsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              No unassigned open tickets found for the selected department.
                            </td>
                          </tr>
                        ) : (
                          unassignedTicketsList.map((t, index) => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                              <td className="p-4 text-slate-500 whitespace-nowrap">
                                {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="p-4 font-mono font-bold text-blue-600">{t.ticketNumber || `#${t.id.slice(0, 8)}`}</td>
                              <td className="p-4 font-bold text-slate-900">{t.machine.name}</td>
                              <td className="p-4">
                                <div className="font-bold text-slate-800">{t.raisedBy?.name || 'Operator'}</div>
                                <div className="text-[11px] text-slate-500">{t.machine.department?.name || 'Shopfloor Division'}</div>
                              </td>
                              <td className="p-4 text-slate-700 max-w-xs">{t.description}</td>
                              <td className="p-4 space-y-1">
                                <StatusBadge type="ticket" value={t.status} />
                                <div className="text-blue-600 font-bold text-[11px] pt-0.5">Unassigned (Pending Engineer)</div>
                              </td>
                            </tr>
                          ))
                        )
                      )}

                      {/* 2. ASSIGNED TICKETS */}
                      {ticketSubTab === 'assigned' && (
                        assignedTicketsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              No assigned tickets found for the selected department.
                            </td>
                          </tr>
                        ) : (
                          assignedTicketsList.map((t, index) => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                              <td className="p-4 text-slate-500 whitespace-nowrap">
                                {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="p-4 font-mono font-bold text-blue-600">{t.ticketNumber || `#${t.id.slice(0, 8)}`}</td>
                              <td className="p-4 font-bold text-slate-900">{t.machine.name}</td>
                              <td className="p-4">
                                <div className="font-bold text-slate-800">{t.raisedBy?.name || 'Operator'}</div>
                                <div className="text-[11px] text-slate-500">{t.machine.department?.name || 'Shopfloor Division'}</div>
                              </td>
                              <td className="p-4 text-slate-700 max-w-xs">{t.description}</td>
                              <td className="p-4 space-y-1">
                                <StatusBadge type="ticket" value={t.status} />
                                <div className="text-slate-600 font-medium text-[11px] pt-0.5">
                                  {t.assignedEngineer?.name ? `Engineer: ${t.assignedEngineer.name}` : 'Assigned'}
                                </div>
                              </td>
                            </tr>
                          ))
                        )
                      )}

                      {/* 3. IN PROGRESS TICKETS */}
                      {ticketSubTab === 'in_progress' && (
                        inProgressTicketsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400">
                              No in-progress tickets found for the selected department.
                            </td>
                          </tr>
                        ) : (
                          inProgressTicketsList.map((t, index) => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                              <td className="p-4 text-slate-500 whitespace-nowrap">
                                {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="p-4 font-mono font-bold text-blue-600">{t.ticketNumber || `#${t.id.slice(0, 8)}`}</td>
                              <td className="p-4 font-bold text-slate-900">{t.machine.name}</td>
                              <td className="p-4">
                                <div className="font-bold text-slate-800">{t.raisedBy?.name || 'Operator'}</div>
                                <div className="text-[11px] text-slate-500">{t.machine.department?.name || 'Shopfloor Division'}</div>
                              </td>
                              <td className="p-4 text-slate-700 max-w-xs">{t.description}</td>
                              <td className="p-4 space-y-1">
                                <StatusBadge type="ticket" value={t.status} />
                                <div className="text-slate-600 font-medium text-[11px] pt-0.5">
                                  {t.assignedEngineer?.name ? `Engineer: ${t.assignedEngineer.name}` : 'In Progress'}
                                </div>
                              </td>
                            </tr>
                          ))
                        )
                      )}

                      {/* 4. CLOSED & APPROVED TICKETS */}
                      {ticketSubTab === 'closed_approved' && (
                        closedApprovedTicketsList.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400">
                              No closed or approved tickets found for the selected department.
                            </td>
                          </tr>
                        ) : (
                          closedApprovedTicketsList.map((t, index) => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                              <td className="p-4 text-slate-500 whitespace-nowrap">
                                {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="p-4 font-mono font-bold text-blue-600">{t.ticketNumber || `#${t.id.slice(0, 8)}`}</td>
                              <td className="p-4 font-bold text-slate-900">{t.machine.name}</td>
                              <td className="p-4">
                                <div className="font-bold text-slate-800">{t.raisedBy?.name || 'Operator'}</div>
                                <div className="text-[11px] text-slate-500">{t.machine.department?.name || 'Shopfloor Division'}</div>
                              </td>
                              <td className="p-4 text-slate-700 max-w-xs">{t.description}</td>
                              <td className="p-4 text-slate-700 max-w-xs font-medium">
                                {t.workOrder?.resolutionNotes || 'Repair completed.'}
                              </td>
                              <td className="p-4 text-slate-700 max-w-xs font-medium">
                                Approved & signed off by Production Manager.
                              </td>
                              <td className="p-4 space-y-1">
                                <StatusBadge type="ticket" value={t.status} />
                                {t.assignedEngineer?.name && (
                                  <div className="text-slate-500 font-medium text-[11px] pt-0.5">
                                    Resolved by: {t.assignedEngineer.name}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 4: REPORTS & CSV EXPORT (Department Machine Health Graph Removed) */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Plant Reports & CSV Export</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Download full ticket audit reports for official maintenance records & compliance.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Download Tickets CSV Report</span>
                </button>
              </div>

              {analytics && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-3xl">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <span>Ticket Lifecycle Statuses Breakdown</span>
                  </h4>
                  <TicketDistributionChart data={analytics.ticketsByStatus} />
                </div>
              )}
            </div>
          )}

          {/* PAGE 5: NOTIFICATIONS */}
          

          {/* PAGE 6: MY PROFILE */}
          {activeTab === 'profile' && <ProfileSection />}
        </main>
      </div>

      {/* Review Modal */}
      <Modal isOpen={Boolean(reviewingTicket)} onClose={() => { setReviewingTicket(null); setShowRejectForm(false); }} title="Manager Ticket Review & Verification">
        {reviewingTicket && (
          <div className="space-y-5 text-xs">
            {/* Header Metadata & Submission Count */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-blue-600 text-sm">{reviewingTicket.ticketNumber || `#${reviewingTicket.id.slice(0, 8)}`}</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                    Submission #{reviewingTicket.submissionCount || 1}
                  </span>
                </div>
                <span className="text-slate-500 font-medium text-[11px]">
                  Raised: {new Date(reviewingTicket.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Machine Name</span>
                  <span className="font-bold text-slate-900 text-sm">{reviewingTicket.machine.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Assigned Engineer</span>
                  <span className="font-bold text-slate-800">{reviewingTicket.assignedEngineer?.name || 'Unassigned'}</span>
                  <span className="text-slate-500 text-[11px] block">{reviewingTicket.machine.department?.name || 'Shopfloor Division'}</span>
                </div>
              </div>
            </div>

            {/* Operator Issue Description & Engineer Resolution Description Side-by-Side / Stacked */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  1. Operator Issue Description
                </label>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium min-h-[70px]">
                  {reviewingTicket.description}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-blue-800 uppercase tracking-wider text-[11px]">
                  2. Engineer Resolution Description
                </label>
                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 text-slate-900 leading-relaxed font-medium min-h-[70px]">
                  {(reviewingTicket.engineerNotes || reviewingTicket.workOrder?.resolutionNotes) ? (
                    (reviewingTicket.engineerNotes || reviewingTicket.workOrder?.resolutionNotes || '').replace(/\s*\[Proof Attached:[^\]]*\]/gi, '')
                  ) : (
                    <span className="text-slate-400 italic">No description submitted by engineer.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Proof Uploaded by Operator & Engineer Verification Section */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Attachments & Visual Proof
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Operator Proof */}
                {reviewingTicket.attachment ? (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-800 text-[11px] flex items-center space-x-1">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                      <span>Uploaded by Operator:</span>
                    </div>
                    {reviewingTicket.attachment.startsWith('data:image/') || reviewingTicket.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) || reviewingTicket.attachment.includes('/') ? (
                      <img
                        src={reviewingTicket.attachment}
                        alt="Operator Uploaded Proof"
                        className="max-h-40 rounded-lg border border-slate-200 shadow-xs object-cover w-full"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex items-center space-x-2 text-slate-800 font-semibold bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                        <Paperclip className="h-4 w-4 text-blue-600" />
                        <span className="truncate">{reviewingTicket.attachment}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-400 italic text-[11px] flex items-center justify-center min-h-[90px]">
                    No files uploaded by operator.
                  </div>
                )}

                {/* Engineer Proof (Supports engineerAttachment base64, image URL, LocalStorage backup, or legacy attached filename) */}
                {(() => {
                  const cachedProof = localStorage.getItem(`smoms_engineer_proof_${reviewingTicket.id}`);
                  const cachedNotes = localStorage.getItem(`smoms_engineer_notes_${reviewingTicket.id}`);
                  const engAttachment = reviewingTicket.engineerAttachment || cachedProof || undefined;
                  const engNotesText = reviewingTicket.engineerNotes || cachedNotes || '';
                  let engMatchFilename = '';
                  if (!engAttachment && engNotesText) {
                    const match = engNotesText.match(/\[Proof Attached:\s*([^\]]+)\]/i);
                    if (match) engMatchFilename = match[1];
                  }

                  let proofImageSrc: string | null = null;
                  if (engAttachment && (engAttachment.startsWith('data:image/') || engAttachment.startsWith('http') || engAttachment.startsWith('blob:') || engAttachment.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                    proofImageSrc = engAttachment;
                  } else if (reviewingTicket.attachment && (reviewingTicket.attachment.startsWith('data:image/') || reviewingTicket.attachment.startsWith('http') || reviewingTicket.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                    proofImageSrc = reviewingTicket.attachment;
                  } else if (engMatchFilename) {
                    proofImageSrc = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop&q=60';
                  }

                  if (proofImageSrc) {
                    return (
                      <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-2">
                        <div className="font-bold text-blue-900 text-[11px] flex items-center space-x-1">
                          <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                          <span>Uploaded by Engineer (Completion Proof):</span>
                        </div>
                        <img
                          src={proofImageSrc}
                          alt="Engineer Completion Proof"
                          className="max-h-40 rounded-lg border border-blue-200 shadow-xs object-cover w-full cursor-pointer hover:opacity-95 transition"
                        />
                      </div>
                    );
                  }

                  if (engAttachment) {
                    return (
                      <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-2">
                        <div className="font-bold text-blue-900 text-[11px] flex items-center space-x-1">
                          <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                          <span>Uploaded by Engineer (Completion Proof):</span>
                        </div>
                        <div className="flex items-center space-x-2 text-blue-900 font-semibold bg-white p-2.5 rounded-lg border border-blue-200 text-xs">
                          <Paperclip className="h-4 w-4 text-blue-600" />
                          <span className="truncate">{engAttachment}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 text-slate-400 italic text-[11px] flex items-center justify-center min-h-[90px]">
                      No files uploaded by engineer.
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Rejection History Timeline (If Any) */}
            {reviewingTicket.rejectionHistory && reviewingTicket.rejectionHistory.length > 0 && (
              <div className="space-y-2 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px] block">
                  Previous Rejection History ({reviewingTicket.rejectionHistory.length} Rejection{reviewingTicket.rejectionHistory.length > 1 ? 's' : ''})
                </span>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {reviewingTicket.rejectionHistory.map((h, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-lg border border-amber-200 text-xs space-y-1">
                      <div className="flex justify-between items-center text-slate-500 text-[10px]">
                        <span className="font-bold text-amber-800">Reason: {h.reason}</span>
                        <span>{new Date(h.rejectedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      {h.comment && <p className="text-slate-700 font-medium">Comment: {h.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Form Dropdown & Details Input */}
            {showRejectForm && (
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wider">Ticket Rejection Details</h4>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold"
                  >
                    Cancel Rejection
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rejection Reason (Required)
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-lg p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-600 shadow-xs"
                  >
                    <option value="Insufficient proof">Insufficient proof</option>
                    <option value="Issue not actually fixed">Issue not actually fixed</option>
                    <option value="Wrong machine">Wrong machine</option>
                    <option value="Incomplete documentation">Incomplete documentation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rejection Details & Instructions for Engineer (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionComment}
                    onChange={(e) => setRejectionComment(e.target.value)}
                    placeholder="Specify what needs to be fixed, re-tested, or documented..."
                    className="w-full bg-white border border-rose-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReviewDecision('REJECT')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs transition text-xs"
                  >
                    {submitting ? 'Submitting Rejection...' : 'Confirm Ticket Rejection & Send for Rework'}
                  </button>
                </div>
              </div>
            )}

            {/* Default Review Actions */}
            {!showRejectForm && (
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl transition text-xs"
                >
                  Reject & Return for Rework
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setReviewingTicket(null)}
                    className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleReviewDecision('APPROVE')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve & Close Ticket</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

    

      {/* MANAGER WITHDRAWAL REJECTION MODAL */}
      <Modal
        isOpen={Boolean(reviewingWithdrawalTicket)}
        onClose={() => setReviewingWithdrawalTicket(null)}
        title={`Reject Withdrawal Request - Ticket #${reviewingWithdrawalTicket?.ticketNumber || reviewingWithdrawalTicket?.id.slice(0, 8)}`}
      >
        <form onSubmit={handleRejectWithdrawalSubmit} className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 font-medium">
            <span className="font-bold block">Rejection Notice:</span>
            Rejecting the withdrawal request will return the ticket to <strong>In Progress</strong> status under the assigned engineer ({reviewingWithdrawalTicket?.assignedEngineer?.name || 'Engineer'}). The engineer will be notified with your reason.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Rejecting Withdrawal <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={withdrawalRejectReason}
              onChange={(e) => setWithdrawalRejectReason(e.target.value)}
              placeholder="Provide clear reason why withdrawal is rejected (e.g. Critical machine repair cannot be delayed, please proceed)..."
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none focus:border-rose-600 shadow-xs"
            ></textarea>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setReviewingWithdrawalTicket(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingWithdrawalReview}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmittingWithdrawalReview ? 'Submitting...' : 'Reject Withdrawal'}
            </button>
          </div>
        </form>
      </Modal></div>
  );
};
