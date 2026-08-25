import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { Sidebar, SidebarNavItem } from '../../components/common/Sidebar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TicketChatSection } from '../../components/chat/TicketChatSection';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { ProfileSection } from '../../components/common/ProfileSection';
import { getTicketsApi, updateTicketStatusApi, requestWithdrawalApi, assignEngineerApi } from '../../api/tickets';
import { getMachinesApi } from '../../api/machines';
import { getNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi } from '../../api/notifications';
import { Ticket, Machine, NotificationItem } from '../../types';
import { Filter, Calendar, LayoutDashboard, Wrench, LogOut, FileText, Cpu, Bell, CheckCircle2, Play, Activity, CheckCheck, User, Clock, Inbox, Upload, Paperclip, Image as ImageIcon, AlertTriangle, RefreshCw , MessageSquare , XCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export const EngineerPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [closedSectionFilter, setClosedSectionFilter] = useState<'ALL' | 'CLOSED' | 'REJECTED'>('ALL');
  const [closedDatePreset, setClosedDatePreset] = useState<string>('ALL');
  const [closedSingleDate, setClosedSingleDate] = useState<string>('');
  const [closedStartDate, setClosedStartDate] = useState<string>('');
  const [closedEndDate, setClosedEndDate] = useState<string>('');
  
  // Sub-tab inside Maintenance Jobs section: raised | start_work | close_resolve | closed_tickets
  const [jobSubTab, setJobSubTab] = useState<'raised' | 'start_work' | 'rework' | 'close_resolve' | 'closed_tickets'>('raised');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Selected Machine for Machine Records Inspection
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  // Accept Ticket Verification Modal State
  const [acceptingTicket, setAcceptingTicket] = useState<Ticket | null>(null);
  const [rejectingTicket, setRejectingTicket] = useState<Ticket | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [submittingRejection, setSubmittingRejection] = useState<boolean>(false);

  // Resolution Modal State
  const [resolvingTicket, setResolvingTicket] = useState<Ticket | null>(null);
  const [withdrawingTicket, setWithdrawingTicket] = useState<Ticket | null>(null);
  const [withdrawalReason, setWithdrawalReason] = useState<string>('Personal emergency');
  const [withdrawalComment, setWithdrawalComment] = useState<string>('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState<boolean>(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [repairProofFile, setRepairProofFile] = useState<File | null>(null);
  const [repairProofDataUrl, setRepairProofDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tList, mList, notifRes] = await Promise.all([
        getTicketsApi(),
        getMachinesApi(),
        getNotificationsApi(),
      ]);
      setTickets(tList);
      setMachines(mList);
      setNotifications(notifRes.notifications);
      setUnreadCount(notifRes.unreadCount);

      if (mList.length > 0 && !selectedMachine) {
        setSelectedMachine(mList[0]);
      }
    } catch (err: any) {
      console.error('Failed to load engineer portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectMachine = (m: Machine) => {
    setSelectedMachine(m);
  };

  const handleAssignSelf = async (ticketId: string) => {
    try {
      if (!user) return;
      await assignEngineerApi(ticketId, user.id);
      setToastMessage('Ticket accepted! Moved to "TO_START" section.');
      fetchData();
      setJobSubTab('start_work');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign ticket');
    }
  };

  const handleStartRepair = async (ticketId: string) => {
    try {
      await updateTicketStatusApi(ticketId, 'IN_PROGRESS');
      setToastMessage('Work started! Moved to "Resolve Work" section.');
      fetchData();
      setJobSubTab('close_resolve');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRepairProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRepairProofDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setRepairProofFile(null);
      setRepairProofDataUrl(null);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawingTicket) return;
    try {
      setIsSubmittingWithdrawal(true);
      await requestWithdrawalApi(withdrawingTicket.id, withdrawalReason, withdrawalComment);
      setToastMessage(`Withdrawal requested for Ticket #${withdrawingTicket.ticketNumber || withdrawingTicket.id.slice(0, 8)}. Awaiting manager approval.`);
      setWithdrawingTicket(null);
      setWithdrawalComment('');
      setWithdrawalReason('Personal emergency');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request withdrawal');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;
    try {
      setSubmitting(true);
      let engAttachment = repairProofDataUrl || undefined;
      if (repairProofFile && !engAttachment) {
        engAttachment = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.readAsDataURL(repairProofFile);
        });
      }
      
      if (engAttachment) {
        try {
          localStorage.setItem(`smoms_engineer_proof_${resolvingTicket.id}`, engAttachment);
          localStorage.setItem(`smoms_engineer_notes_${resolvingTicket.id}`, resolutionNotes);
        } catch (e) {
          console.warn('LocalStorage proof backup save warning:', e);
        }
      }

      await updateTicketStatusApi(resolvingTicket.id, 'RESOLVED', resolutionNotes, engAttachment);
      setToastMessage(`Ticket ${resolvingTicket.ticketNumber || `#${resolvingTicket.id.slice(0, 8)}`} resolved & work closed. Manager notified.`);
      setResolvingTicket(null);
      setResolutionNotes('');
      setRepairProofFile(null);
      setRepairProofDataUrl(null);
      fetchData();
      setJobSubTab('closed_tickets');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resolve ticket');
    } finally {
      setSubmitting(false);
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

  // Maintenance Job Categories
  const raisedOpenTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'PENDING_REASSIGNMENT');
  const startWorkTickets = tickets.filter((t) => t.status === 'ASSIGNED' && t.assignedEngineerId === user?.id);
  const closeResolveTickets = tickets.filter((t) => t.status === 'IN_PROGRESS' && t.assignedEngineerId === user?.id);
  const reworkTickets = tickets.filter((t) => t.status === 'NEEDS_REWORK' && t.assignedEngineerId === user?.id);
  const engineerClosedTickets = tickets.filter((t) => ['CLOSED', 'APPROVED', 'REJECTED'].includes(t.status) && t.assignedEngineerId === user?.id);

    // Helper function to check if closed ticket createdAt matches selected date preset / range
  const isClosedTicketInDatePreset = (createdAt: string | Date): boolean => {
    if (closedDatePreset === 'ALL') return true;

    const ticketDate = new Date(createdAt);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const ticketDayStart = new Date(ticketDate.getFullYear(), ticketDate.getMonth(), ticketDate.getDate());

    if (closedDatePreset === 'TODAY') {
      return ticketDayStart.getTime() === todayStart.getTime();
    }

    if (closedDatePreset === 'YESTERDAY') {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      return ticketDayStart.getTime() === yesterdayStart.getTime();
    }

    if (closedDatePreset === 'THIS_WEEK') {
      const dayOfWeek = todayStart.getDay();
      const distToMonday = (dayOfWeek + 6) % 7;
      const mondayThisWeek = new Date(todayStart);
      mondayThisWeek.setDate(mondayThisWeek.getDate() - distToMonday);
      return ticketDayStart >= mondayThisWeek && ticketDayStart <= todayStart;
    }

    if (closedDatePreset === 'LAST_WEEK') {
      const dayOfWeek = todayStart.getDay();
      const distToMonday = (dayOfWeek + 6) % 7;
      const mondayThisWeek = new Date(todayStart);
      mondayThisWeek.setDate(mondayThisWeek.getDate() - distToMonday);

      const mondayLastWeek = new Date(mondayThisWeek);
      mondayLastWeek.setDate(mondayLastWeek.getDate() - 7);
      const sundayLastWeek = new Date(mondayThisWeek);
      sundayLastWeek.setDate(sundayLastWeek.getDate() - 1);

      return ticketDayStart >= mondayLastWeek && ticketDayStart <= sundayLastWeek;
    }

    if (closedDatePreset === 'THIS_MONTH') {
      return ticketDate.getFullYear() === now.getFullYear() && ticketDate.getMonth() === now.getMonth();
    }

    if (closedDatePreset === 'LAST_MONTH') {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return ticketDate.getFullYear() === lastMonthDate.getFullYear() && ticketDate.getMonth() === lastMonthDate.getMonth();
    }

    if (closedDatePreset === 'LONG_TIME') {
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return ticketDayStart < thirtyDaysAgo;
    }

    if (closedDatePreset === 'CUSTOM_DATE') {
      if (!closedSingleDate) return true;
      const target = new Date(closedSingleDate);
      const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
      return ticketDayStart.getTime() === targetStart.getTime();
    }

    if (closedDatePreset === 'CUSTOM_RANGE') {
      if (!closedStartDate && !closedEndDate) return true;
      let valid = true;
      if (closedStartDate) {
        const start = new Date(closedStartDate);
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        if (ticketDayStart < startDay) valid = false;
      }
      if (closedEndDate) {
        const end = new Date(closedEndDate);
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        if (ticketDayStart > endDay) valid = false;
      }
      return valid;
    }

    return true;
  };

  const isClosedFiltered = closedSectionFilter !== 'ALL' || closedDatePreset !== 'ALL' || closedSingleDate !== '' || closedStartDate !== '' || closedEndDate !== '';
  const filteredClosedTickets = engineerClosedTickets.filter((t) => {
    if (closedSectionFilter === 'CLOSED') return ['CLOSED', 'APPROVED'].includes(t.status);
    if (closedSectionFilter === 'REJECTED') return t.status === 'REJECTED';
    return true;
  });

  const myWorkHistory = tickets.filter((t) => t.assignedEngineerId === user?.id);
  const pendingApprovalsCount = tickets.filter((t) => t.status === 'RESOLVED' && t.assignedEngineerId === user?.id).length;

  // Closed tickets for selected machine
  const selectedMachineClosedTickets = selectedMachine?.tickets?.filter(
    (t) => t.status === 'CLOSED' || t.status === 'APPROVED'
  ) || [];

  const sidebarItems: SidebarNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'maintenance_jobs', label: 'Maintenance Jobs', icon: Wrench, badgeCount: closeResolveTickets.length + startWorkTickets.length },
    { id: 'machine_records', label: 'Machine Records', icon: Cpu },
    { id: 'chat', label: 'Ticket Chat', icon: MessageSquare },
    
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          title="Engineer Station"
          navItems={sidebarItems}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-full md:max-w-6xl w-full space-y-6 overflow-x-hidden">
          {/* Toast */}
          {toastMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* PAGE 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h2 className="text-xl font-bold text-slate-900">Engineer Dashboard</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Overview of jobs handled, completed repairs, pending approvals, and active maintenance in progress.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Jobs Handled" value={myWorkHistory.length} icon={FileText} />
                <StatCard title="Completed & Resolved" value={engineerClosedTickets.length} icon={CheckCircle2} />
                <StatCard title="Pending Approvals" value={pendingApprovalsCount} icon={Clock} />
              </div>

              {/* In Progress Jobs Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Jobs Currently In Progress</h3>
                  <button
                    onClick={() => {
                      setActiveTab('maintenance_jobs');
                      setJobSubTab('close_resolve');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Go to Resolve Work &rarr;
                  </button>
                </div>

                {closeResolveTickets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                    No maintenance jobs currently in progress.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {closeResolveTickets.map((t) => (
                      <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex justify-between items-center">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-blue-600">{t.ticketNumber || `#${t.id.slice(0, 8)}`}</span>
                            <StatusBadge type="ticket" value={t.status} />
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">{t.machine.name}</h4>
                          <p className="text-xs text-slate-600">{t.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setResolvingTicket(t)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => {
                                setWithdrawingTicket(t);
                                setWithdrawalReason('Personal emergency');
                                setWithdrawalComment('');
                              }}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer"
                              title="Request Ticket Withdrawal"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              <span>Withdraw</span>
                            </button>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PAGE 2: MAINTENANCE JOBS */}
          {activeTab === 'maintenance_jobs' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h2 className="text-xl font-bold text-slate-900">Maintenance Work Execution Station</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage raised tickets, start maintenance work, submit resolution details, and inspect completed closed tickets.
                </p>
              </div>

              {/* Sub-Tabs Bar (Material Underline Style) */}
              <div className="border-b border-slate-200 overflow-x-auto scrollbar-none max-w-full">
                <nav className="-mb-px flex items-center gap-6 sm:gap-8 min-w-max pb-0.5">
                  <button
                    onClick={() => setJobSubTab('raised')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      jobSubTab === 'raised' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>RAISED</span>
                    <span className={`text-[11px] font-medium ${jobSubTab === 'raised' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {raisedOpenTickets.length}
                    </span>
                    {jobSubTab === 'raised' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setJobSubTab('start_work')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      jobSubTab === 'start_work' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>TO_START</span>
                    <span className={`text-[11px] font-medium ${jobSubTab === 'start_work' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {startWorkTickets.length}
                    </span>
                    {jobSubTab === 'start_work' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setJobSubTab('close_resolve')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      jobSubTab === 'close_resolve' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>RESOLVE</span>
                    <span className={`text-[11px] font-medium ${jobSubTab === 'close_resolve' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {closeResolveTickets.length}
                    </span>
                    {jobSubTab === 'close_resolve' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setJobSubTab('rework')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      jobSubTab === 'rework' ? 'text-amber-700' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>REWORK</span>
                    <span className={`text-[11px] font-medium ${jobSubTab === 'rework' ? 'text-amber-800 font-bold' : reworkTickets.length > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                      {reworkTickets.length}
                    </span>
                    {jobSubTab === 'rework' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-amber-600 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setJobSubTab('closed_tickets')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      jobSubTab === 'closed_tickets' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>CLOSED</span>
                    <span className={`text-[11px] font-medium ${jobSubTab === 'closed_tickets' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {engineerClosedTickets.length}
                    </span>
                    {jobSubTab === 'closed_tickets' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />
                    )}
                  </button>
                </nav>
              </div>

              {/* SUB-TAB 1: VIEWING RAISED TICKETS */}
              {jobSubTab === 'raised' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Open Raised Tickets (Pending Acceptance)
                  </h3>
                  
                  {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">Loading raised tickets...</div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                          <tr>
                            <th className="p-4 w-12 text-center">S.No</th>
                            <th className="p-4">Ticket Raised Date & Time</th>
                            <th className="p-4">Ticket ID</th>
                            <th className="p-4">Machine Name</th>
                            <th className="p-4">Operator Name & Station</th>
                            <th className="p-4">Reason for Raising Ticket</th>
                            <th className="p-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {raisedOpenTickets.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400">
                                No open raised tickets available for acceptance.
                              </td>
                            </tr>
                          ) : (
                            raisedOpenTickets.map((t, index) => (
                              <tr key={t.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                                <td className="p-4 text-slate-500 whitespace-nowrap">
                                  {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="p-4 font-mono font-bold text-blue-600">
                                  <div>{t.ticketNumber || `#${t.id.slice(0, 8)}`}</div>
                                  
                                </td>
                                <td className="p-4 font-bold text-slate-900">{t.machine.name}</td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-800">{t.raisedBy.name}</div>
                                  <div className="text-[11px] text-slate-500">{t.machine.department?.name || 'Shopfloor Division'}</div>
                                </td>
                                <td className="p-4 text-slate-700 max-w-xs">
                                  <div>{t.description}</div>
                                  
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => setAcceptingTicket(t)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>Accept</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRejectingTicket(t)}
                                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      <span>Reject</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

                            {/* SUB-TAB: NEEDS REWORK SECTION */}
              {jobSubTab === 'rework' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Tickets Returned for Rework & Manager Rejections</span>
                  </h3>
                  
                  {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">Loading rework tickets...</div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                          <tr>
                            <th className="p-4 w-12 text-center">S.No</th>
                            <th className="p-4">Ticket ID</th>
                            <th className="p-4">Machine Name</th>
                            <th className="p-4">Submission</th>
                            <th className="p-4">Manager Rejection Reason & Comment</th>
                            <th className="p-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reworkTickets.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400">
                                No tickets currently returned for rework.
                              </td>
                            </tr>
                          ) : (
                            reworkTickets.map((t, index) => {
                              const latestRejection = t.rejectionHistory && t.rejectionHistory.length > 0
                                ? t.rejectionHistory[t.rejectionHistory.length - 1]
                                : null;
                              return (
                                <tr key={t.id} className="hover:bg-amber-50/40 transition">
                                  <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                                  <td className="p-4 font-mono font-bold text-blue-600">
                                  <div>{t.ticketNumber || `#${t.id.slice(0, 8)}`}</div>
                                  
                                </td>
                                  <td className="p-4 font-bold text-slate-900">{t.machine.name}</td>
                                  <td className="p-4">
                                    <span className="px-2.5 py-1 rounded-full bg-slate-100 font-bold text-slate-700 text-[10px]">
                                      Submission #{t.submissionCount || 1}
                                    </span>
                                  </td>
                                  <td className="p-4 space-y-1 max-w-sm">
                                    {latestRejection ? (
                                      <>
                                        <div className="font-bold text-rose-700 flex items-center space-x-1">
                                          <AlertTriangle className="h-3.5 w-3.5" />
                                          <span>Reason: {latestRejection.reason}</span>
                                        </div>
                                        {latestRejection.comment && (
                                          <p className="text-slate-600 italic font-medium text-[11px]">
                                            "{latestRejection.comment}"
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-slate-500">Returned for rework by manager.</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center">
                                    <button
                                      onClick={() => {
                                        setResolvingTicket(t);
                                        setResolutionNotes(t.engineerNotes || '');
                                      }}
                                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center space-x-1.5 mx-auto"
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                      <span>Edit & Resubmit</span>
                                    </button>
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
              )}

              {/* SUB-TAB 2: START WORK SECTION */}
              {jobSubTab === 'start_work' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Accepted Tickets Pending Work Start
                  </h3>
                  
                  {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">Loading accepted tickets...</div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                          <tr>
                            <th className="p-4 w-12 text-center">S.No</th>
                            <th className="p-4">Ticket Raised Date & Time</th>
                            <th className="p-4">Ticket ID</th>
                            <th className="p-4">Machine Name</th>
                            <th className="p-4">Operator Name & Station</th>
                            <th className="p-4">Reason for Raising Ticket</th>
                            <th className="p-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {startWorkTickets.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400">
                                No accepted tickets pending work start.
                              </td>
                            </tr>
                          ) : (
                            startWorkTickets.map((t, index) => (
                              <tr key={t.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                                <td className="p-4 text-slate-500 whitespace-nowrap">
                                  {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="p-4 font-mono font-bold text-blue-600">
                                  <div>{t.ticketNumber || `#${t.id.slice(0, 8)}`}</div>
                                  
                                </td>
                                <td className="p-4 font-bold text-slate-900">{t.machine.name}</td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-800">{t.raisedBy?.name || 'Operator'}</div>
                                  <div className="text-[11px] text-slate-500">{t.machine.department?.name || 'Shopfloor Division'}</div>
                                </td>
                                <td className="p-4 text-slate-700 max-w-xs">
                                  <div>{t.description}</div>
                                  
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => handleStartRepair(t.id)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center space-x-1.5 mx-auto"
                                  >
                                    <Play className="h-3.5 w-3.5" />
                                    <span>Start Work</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 3: CLOSE / RESOLVE WORK SECTION */}
              {jobSubTab === 'close_resolve' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Maintenance Jobs Currently In Progress
                  </h3>
                  
                  {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">Loading active jobs...</div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                          <tr>
                            <th className="p-4 w-12 text-center">S.No</th>
                            <th className="p-4">Ticket Raised Date & Time</th>
                            <th className="p-4">Ticket ID</th>
                            <th className="p-4">Machine Name</th>
                            <th className="p-4">Operator Name & Station</th>
                            <th className="p-4">Reason for Raising Ticket</th>
                            <th className="p-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {closeResolveTickets.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400">
                                No active maintenance jobs in progress.
                              </td>
                            </tr>
                          ) : (
                            closeResolveTickets.map((t, index) => (
                              <tr key={t.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                                <td className="p-4 text-slate-500 whitespace-nowrap">
                                  {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="p-4 font-mono font-bold text-blue-600">
                                  <div>{t.ticketNumber || `#${t.id.slice(0, 8)}`}</div>
                                  
                                </td>
                                <td className="p-4 font-bold text-slate-900">{t.machine.name}</td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-800">{t.raisedBy?.name || 'Operator'}</div>
                                  <div className="text-[11px] text-slate-500">{t.machine.department?.name || 'Shopfloor Division'}</div>
                                </td>
                                <td className="p-4 text-slate-700 max-w-xs">
                                  <div>{t.description}</div>
                                  
                                </td>
                                <td className="p-4 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={() => setResolvingTicket(t)}
                                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                                    >
                                      Resolve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setWithdrawingTicket(t);
                                        setWithdrawalReason('Personal emergency');
                                        setWithdrawalComment('');
                                      }}
                                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer"
                                      title="Request Ticket Withdrawal"
                                    >
                                      <LogOut className="h-3.5 w-3.5" />
                                      <span>Withdraw</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 4: CLOSED TICKETS SECTION */}
              {jobSubTab === 'closed_tickets' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>Closed & Rejected Tickets History</span>
                    </h3>
                  </div>

                  {/* Filter Toolbar inside CLOSED subtab */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                        <Filter className="h-3.5 w-3.5 text-blue-600" />
                        <span>Filter Closed History:</span>
                      </div>

                      {/* Status Filter Dropdown */}
                      <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
                        <select
                          value={closedSectionFilter}
                          onChange={(e) => setClosedSectionFilter(e.target.value as any)}
                          className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
                        >
                          <option value="ALL">All History ({engineerClosedTickets.length})</option>
                          <option value="CLOSED">Closed / Approved Only ({engineerClosedTickets.filter(t => t.status !== 'REJECTED').length})</option>
                          <option value="REJECTED">Rejected Only ({engineerClosedTickets.filter(t => t.status === 'REJECTED').length})</option>
                        </select>
                      </div>

                      {/* Date Presets Dropdown */}
                      <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <select
                          value={closedDatePreset}
                          onChange={(e) => setClosedDatePreset(e.target.value)}
                          className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
                        >
                          <option value="ALL">All Dates</option>
                          <option value="TODAY">Today</option>
                          <option value="YESTERDAY">Yesterday</option>
                          <option value="THIS_WEEK">This Week</option>
                          <option value="LAST_WEEK">Last Week</option>
                          <option value="THIS_MONTH">This Month</option>
                          <option value="LAST_MONTH">Last Month</option>
                          <option value="LONG_TIME">Long Time Ago (&gt;30 Days)</option>
                          <option value="CUSTOM_DATE">Single Specific Date...</option>
                          <option value="CUSTOM_RANGE">Date Range (Start - End)...</option>
                        </select>
                      </div>

                      {/* Conditional Single Date Picker */}
                      {closedDatePreset === 'CUSTOM_DATE' && (
                        <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
                          <input
                            type="date"
                            value={closedSingleDate}
                            onChange={(e) => setClosedSingleDate(e.target.value)}
                            className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
                          />
                        </div>
                      )}

                      {/* Conditional Date Range Pickers */}
                      {closedDatePreset === 'CUSTOM_RANGE' && (
                        <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
                          <input
                            type="date"
                            value={closedStartDate}
                            onChange={(e) => setClosedStartDate(e.target.value)}
                            className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
                            placeholder="Start Date"
                          />
                          <span className="text-slate-400 font-bold text-[10px]">TO</span>
                          <input
                            type="date"
                            value={closedEndDate}
                            onChange={(e) => setClosedEndDate(e.target.value)}
                            className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
                            placeholder="End Date"
                          />
                        </div>
                      )}
                    </div>

                    {/* VIEW ALL Button */}
                    <button
                      onClick={() => {
                        setClosedSectionFilter('ALL');
                        setClosedDatePreset('ALL');
                        setClosedSingleDate('');
                        setClosedStartDate('');
                        setClosedEndDate('');
                      }}
                      className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isClosedFiltered
                          ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                      title="Clear all filters to view all closed history"
                    >
                      <span>VIEW ALL</span>
                      {!isClosedFiltered && <span className="text-[10px] text-slate-400 font-normal">(Active)</span>}
                    </button>
                  </div>
                  
                  {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">Loading closed tickets...</div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                          <tr>
                            <th className="p-4 w-12 text-center">S.No</th>
                            <th className="p-4">Ticket Raised Date & Time</th>
                            <th className="p-4">Ticket ID</th>
                            <th className="p-4">Machine Name</th>
                            <th className="p-4">Operator Name & Station</th>
                            <th className="p-4">Reason for Raising Ticket</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredClosedTickets.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400">
                                No closed or resolved tickets found in your history.
                              </td>
                            </tr>
                          ) : (
                            filteredClosedTickets.map((t, index) => (
                              <tr key={t.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                                <td className="p-4 text-slate-500 whitespace-nowrap">
                                  {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="p-4 font-mono font-bold text-blue-600">
                                  <div>{t.ticketNumber || `#${t.id.slice(0, 8)}`}</div>
                                  
                                </td>
                                <td className="p-4 font-bold text-slate-900">{t.machine.name}</td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-800">{t.raisedBy?.name || 'Operator'}</div>
                                  <div className="text-[11px] text-slate-500">{t.machine.department?.name || 'Shopfloor'}</div>
                                </td>
                                <td className="p-4 text-slate-700 max-w-xs">{t.description}</td>
                                <td className="p-4">
                                  <StatusBadge type="ticket" value={t.status} />

                                  {/* Rejection / Resolution Description alone (Clean text, no box, no title) */}
                                  {t.engineerNotes && (
                                    <div className="mt-1.5 text-xs text-slate-600 font-medium leading-normal">
                                      {t.engineerNotes}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PAGE 3: MACHINE RECORDS */}
          {activeTab === 'machine_records' && selectedMachine && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Platform Machine Records & Historical Issues</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete inventory of platform machines, historical faults, resolution notes, and resolved engineer details.
                  </p>
                </div>
                <select
                  value={selectedMachine.id}
                  onChange={(e) => {
                    const m = machines.find((x) => x.id === e.target.value);
                    if (m) handleSelectMachine(m);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600 shadow-xs"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.department?.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Machine Header Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedMachine.name}</h3>
                  <p className="text-xs text-slate-500">Department: {selectedMachine.department?.name}</p>
                </div>

                <div className="pt-2">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Closed Historical Issues</span>
                    <span className="text-lg font-bold text-slate-900">{selectedMachineClosedTickets.length} Tickets</span>
                  </div>
                </div>
              </div>

              {/* Closed Ticket Issues for Selected Machine */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Previous Ticket Issues & Resolution Records ({selectedMachine.name} - Closed Tickets Only)
                </h3>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-4 w-12 text-center">S.No</th>
                        <th className="p-4">Ticket Raised Date & Time</th>
                        <th className="p-4">Ticket ID</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Raised By (Operator)</th>
                        <th className="p-4">Fault Description</th>
                        <th className="p-4">Resolved Engineer</th>
                        <th className="p-4">Resolution Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedMachineClosedTickets.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-400">
                            No closed ticket records found for this machine.
                          </td>
                        </tr>
                      ) : (
                        selectedMachineClosedTickets.map((t, index) => (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                            <td className="p-4 text-slate-500 whitespace-nowrap">
                              {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="p-4 font-mono font-bold text-blue-600">
                                  <div>{t.ticketNumber || `#${t.id.slice(0, 8)}`}</div>
                                  
                                </td>
                            <td className="p-4">
                              <StatusBadge type="ticket" value={t.status} />
                            </td>
                            <td className="p-4 font-semibold text-slate-800">{t.raisedBy?.name || 'Operator'}</td>
                            <td className="p-4 text-slate-600 max-w-xs">{t.description}</td>
                            <td className="p-4 font-bold text-slate-900">
                              {t.assignedEngineer?.name ? t.assignedEngineer.name : 'Unassigned'}
                            </td>
                            <td className="p-4 text-slate-700 max-w-xs">
                              {t.workOrder?.resolutionNotes || 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 4: NOTIFICATIONS */}
                  {activeTab === 'chat' && <TicketChatSection userRole="ENGINEER" />}

        

          {/* PAGE 5: MY PROFILE */}
          {activeTab === 'profile' && <ProfileSection />}
        </main>
      </div>

      {/* Accept Ticket Verification Modal */}
      <Modal
        isOpen={Boolean(acceptingTicket)}
        onClose={() => setAcceptingTicket(null)}
        title="Accept Maintenance Ticket Verification"
      >
        {acceptingTicket && (
          <div className="space-y-4 text-xs">
            {/* Ticket Header & Metadata */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-mono font-bold text-blue-600 text-sm">{acceptingTicket.ticketNumber || `#${acceptingTicket.id.slice(0, 8)}`}</span>
                <span className="text-slate-500 font-medium text-[11px]">
                  Raised: {new Date(acceptingTicket.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Machine Name</span>
                  <span className="font-bold text-slate-900 text-sm">{acceptingTicket.machine.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] block">Operator Name & Station</span>
                  <span className="font-bold text-slate-800">{acceptingTicket.raisedBy?.name || 'Operator'}</span>
                  <span className="text-slate-500 text-[11px] block">{acceptingTicket.machine.department?.name || 'Shopfloor Division'}</span>
                </div>
              </div>
            </div>

            {/* Reason for Raising Ticket / Operator Description */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Operator Issue Description / Reason for Ticket
              </label>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium">
                {acceptingTicket.description}
              </div>
            </div>

            {/* Operator Uploaded Issue Proof Section */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Proof Uploaded by Operator
              </label>
              {acceptingTicket.attachment ? (
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-2">
                  <div className="font-bold text-blue-900 flex items-center space-x-1.5">
                    <ImageIcon className="h-4 w-4 text-blue-600" />
                    <span>Issue Proof Attachment:</span>
                  </div>
                  {acceptingTicket.attachment.startsWith('data:image/') ? (
                    <img
                      src={acceptingTicket.attachment}
                      alt="Operator Uploaded Proof"
                      className="max-h-52 rounded-lg border border-slate-200 shadow-xs object-cover w-full"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 text-blue-800 font-semibold bg-white p-2.5 rounded-lg border border-blue-200">
                      <Paperclip className="h-4 w-4 text-blue-600" />
                      <span>{acceptingTicket.attachment}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 italic text-center">
                  No proof photo or file was uploaded by the operator.
                </div>
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex justify-end items-center space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAcceptingTicket(null)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = acceptingTicket.id;
                  setAcceptingTicket(null);
                  await handleAssignSelf(id);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Accept Ticket</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Ticket Verification Modal */}
      <Modal
        isOpen={Boolean(rejectingTicket)}
        onClose={() => {
          setRejectingTicket(null);
          setRejectionReason('');
        }}
        title="Reject Maintenance Ticket Verification"
      >
        {rejectingTicket && (
          <div className="space-y-4">
            {/* Warning Banner */}
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold flex items-start space-x-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to reject this ticket?</p>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                  Rejecting this ticket indicates that no engineer maintenance intervention is required. The operator will be notified with your written reason.
                </p>
              </div>
            </div>

            {/* Ticket Details Summary Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-blue-600 text-xs">
                  {rejectingTicket.ticketNumber || `#${rejectingTicket.id.slice(0, 8)}`}
                </span>
                <StatusBadge type="priority" value={rejectingTicket.priority} />
              </div>
              <div>
                <span className="text-slate-500 font-medium">Machine: </span>
                <span className="font-bold text-slate-900">{rejectingTicket.machine.name}</span>
                <span className="text-slate-500 text-[11px] block">
                  {rejectingTicket.machine.department?.name || 'Shopfloor'} • Raised by: {rejectingTicket.raisedBy?.name || 'Operator'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Operator Problem Description:</span>
                <p className="font-medium text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 mt-1">
                  {rejectingTicket.description}
                </p>
              </div>
            </div>

            {/* Rejection Reason Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Reason for Rejection <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this ticket is being rejected (e.g. Not a serious issue, user operational query, minor adjustment)..."
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-xs"
              />
            </div>

            {/* Bottom Right Modal Action Buttons */}
            <div className="flex justify-end items-center space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setRejectingTicket(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim() || submittingRejection}
                onClick={async () => {
                  if (!rejectingTicket || !rejectionReason.trim()) return;
                  try {
                    setSubmittingRejection(true);
                    await updateTicketStatusApi(rejectingTicket.id, 'REJECTED', rejectionReason);
                    setToastMessage('Ticket rejected and operator notified successfully.');
                    setRejectingTicket(null);
                    setRejectionReason('');
                    fetchData();
                    setTimeout(() => setToastMessage(null), 4000);
                  } catch (err: any) {
                    alert(err.response?.data?.message || 'Failed to reject ticket');
                  } finally {
                    setSubmittingRejection(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs"
              >
                <XCircle className="h-4 w-4" />
                <span>{submittingRejection ? 'Rejecting...' : 'Reject Ticket'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>


      {/* Resolution Modal (With Optional Repair Proof Photo/PDF Upload) */}
      <Modal isOpen={Boolean(resolvingTicket)} onClose={() => setResolvingTicket(null)} title={resolvingTicket?.status === 'NEEDS_REWORK' ? `Resubmit Ticket Repair (Submission #${(resolvingTicket?.submissionCount || 1) + 1})` : "Submit Repair Resolution"}>
        {resolvingTicket && (
          <form onSubmit={handleResolveSubmit} className="space-y-4">
            {resolvingTicket.rejectionHistory && resolvingTicket.rejectionHistory.length > 0 && (
              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-xs space-y-1.5">
                <div className="font-bold text-rose-900 flex items-center space-x-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Manager Rejection Notice (Submission #{resolvingTicket.submissionCount || 1}):</span>
                </div>
                <div className="font-bold text-rose-800">
                  Reason: {resolvingTicket.rejectionHistory[resolvingTicket.rejectionHistory.length - 1].reason}
                </div>
                {resolvingTicket.rejectionHistory[resolvingTicket.rejectionHistory.length - 1].comment && (
                  <p className="text-slate-700 font-medium italic">
                    Comment: "{resolvingTicket.rejectionHistory[resolvingTicket.rejectionHistory.length - 1].comment}"
                  </p>
                )}
              </div>
            )}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{resolvingTicket.machine.name}</p>
              <p className="text-slate-600">{resolvingTicket.description}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Resolution & Repair Notes
              </label>
              <textarea
                required
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Detail root cause, parts replaced, calibration steps, and test run results..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              ></textarea>
            </div>

            {/* Optional Repair Proof Photo / PDF File Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex justify-between items-center">
                <span>Completion Proof Photo / Document (Optional)</span>
                <span className="text-[10px] text-slate-400 font-normal">Formats: JPG, PNG, PDF</span>
              </label>
              <div className="relative border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 rounded-xl p-3 text-center cursor-pointer transition">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleProofFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <span className="text-xs font-semibold text-slate-700 block">
                  {repairProofFile ? repairProofFile.name : 'Click to Upload Repair Proof Photo or PDF'}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold rounded-lg text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-lg text-white shadow-xs"
              >
                {submitting ? 'Submitting...' : 'Submit Resolution to Manager'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    

      {/* WITHDRAWAL REQUEST MODAL */}
      <Modal
        isOpen={Boolean(withdrawingTicket)}
        onClose={() => setWithdrawingTicket(null)}
        title={`Request Ticket Withdrawal - #${withdrawingTicket?.ticketNumber || withdrawingTicket?.id.slice(0, 8)}`}
      >
        <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-medium">
            <span className="font-bold block">Important Notice:</span>
            Submitting a withdrawal request will notify the manager for approval. You remain assigned to this ticket until the manager approves the request.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Reason for Withdrawal <span className="text-red-500">*</span>
            </label>
            <select
              value={withdrawalReason}
              onChange={(e) => setWithdrawalReason(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:border-amber-600 cursor-pointer shadow-xs"
            >
              <option value="Personal emergency">Personal emergency</option>
              <option value="Reassigned to critical task">Reassigned to critical task</option>
              <option value="Lack of parts/tools">Lack of parts/tools</option>
              <option value="Health issue">Health issue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={withdrawalComment}
              onChange={(e) => setWithdrawalComment(e.target.value)}
              placeholder="Provide additional details regarding your withdrawal request..."
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl p-2.5 focus:outline-none focus:border-amber-600 shadow-xs"
            ></textarea>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setWithdrawingTicket(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingWithdrawal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmittingWithdrawal ? 'Submitting...' : 'Submit Withdrawal Request'}
            </button>
          </div>
        </form>
      </Modal></div>
  );
};
