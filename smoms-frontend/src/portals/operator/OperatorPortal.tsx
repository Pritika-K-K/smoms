import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { Sidebar, SidebarNavItem } from '../../components/common/Sidebar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TicketChatSection } from '../../components/chat/TicketChatSection';
import { ProfileSection } from '../../components/common/ProfileSection';
import { getTicketsApi, createTicketApi } from '../../api/tickets';
import { getMachinesApi } from '../../api/machines';
import { getNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi } from '../../api/notifications';
import { Ticket, Machine, NotificationItem } from '../../types';
import { PlusCircle, FileText, CheckCircle2, LayoutDashboard, Wrench, Bell, CheckCheck, Inbox, CheckSquare, AlertCircle, Image as ImageIcon, Paperclip, Play, Zap, User as UserIcon , MessageSquare , XCircle } from 'lucide-react';

export const OperatorPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // My Raised Tickets Filter Sub-Tab State: open | assigned | in_progress | resolved | closed
  const [ticketSubTab, setTicketSubTab] = useState<'open' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'closed'>('open');

  // Form State
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [description, setDescription] = useState('');
  const [issueProofFile, setIssueProofFile] = useState<string | null>(null);
  const [issueProofFileName, setIssueProofFileName] = useState<string | null>(null);
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
    } catch (err: any) {
      console.error('Failed to load operator data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIssueProofFileName(file.name);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIssueProofFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setIssueProofFile(`Document: ${file.name}`);
    }
  };

  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineId || !description) return;

    try {
      setSubmitting(true);
      await createTicketApi({
        machineId: selectedMachineId,
        description,
        attachment: issueProofFile || undefined,
      });

      setToastMessage('Maintenance Ticket raised successfully!');
      setSelectedMachineId('');
      setDescription('');
      setIssueProofFile(null);
      setIssueProofFileName(null);
      setActiveTab('tickets');
      setTicketSubTab('open');
      fetchData();

      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to raise ticket');
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

  // Sub-Tab Filtered Tickets lists
  const openTickets = tickets.filter((t) => t.status === 'OPEN');
  const assignedTickets = tickets.filter((t) => t.status === 'ASSIGNED');
  const rejectedTickets = tickets.filter((t) => t.status === 'REJECTED');
  const inProgressTickets = tickets.filter((t) => t.status === 'IN_PROGRESS');
  const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED');
  const closedTickets = tickets.filter((t) => t.status === 'CLOSED' || t.status === 'APPROVED');

  const sidebarItems: SidebarNavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'raise', label: 'Raise Ticket', icon: PlusCircle },
    { id: 'tickets', label: 'My Raised Tickets', icon: FileText, badgeCount: openTickets.length },
    { id: 'chat', label: 'Ticket Chat', icon: MessageSquare },
    
    { id: 'profile', label: 'My Profile', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          title="Operator Portal"
          navItems={sidebarItems}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-full md:max-w-6xl w-full space-y-6 overflow-x-hidden">
          {/* Toast Alert */}
          {toastMessage && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Total Raised Tickets Header Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Total Tickets Raised</h2>
                  <p className="text-xs text-slate-500 mt-1">Total maintenance tickets submitted by you across all assigned machines</p>
                </div>
                <div className="flex items-center space-x-3 bg-blue-50 border border-blue-100 px-6 py-3 rounded-2xl">
                  <Wrench className="h-8 w-8 text-blue-600" />
                  <div>
                    <span className="text-2xl font-bold text-blue-900">{tickets.length}</span>
                    <span className="block text-[10px] text-blue-700 font-bold uppercase tracking-wider">Tickets Total</span>
                  </div>
                </div>
              </div>

              {/* All Shopfloor Machines Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">All Shopfloor Machines</h3>

                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-400">Loading shopfloor machines...</div>
                ) : machines.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                    No shopfloor machines registered.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {machines.map((m) => (
                      <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
                          <p className="text-xs text-slate-500">{m.department?.name || 'Shopfloor Division'}</p>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedMachineId(m.id);
                            setActiveTab('raise');
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition shadow-xs"
                        >
                          Raise Ticket For Machine
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RAISE TICKET */}
          {activeTab === 'raise' && (
            <div className="space-y-6 max-w-2xl">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h2 className="text-xl font-bold text-slate-900">Raise Maintenance Ticket</h2>
                <p className="text-xs text-slate-500 mt-1">Submit a machine breakdown or maintenance request to the engineering team.</p>
              </div>

              <form onSubmit={handleRaiseTicket} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Select Machine *
                  </label>
                  <select
                    required
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="">-- Choose Machine --</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.department?.name || 'Shopfloor'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Reason for Raising Ticket / Issue Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the machine defect, error codes, unusual noise, or physical breakdown details..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  ></textarea>
                </div>

                {/* Upload Issue Proof Photo / File (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Issue Proof Photo / Document (Optional - JPG, PNG, PDF)
                  </label>
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-300 transition">
                      <ImageIcon className="h-4 w-4 text-blue-600" />
                      <span>Upload Proof File</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    {issueProofFileName && (
                      <span className="text-xs text-blue-700 font-semibold flex items-center space-x-1 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                        <Paperclip className="h-3.5 w-3.5" />
                        <span className="truncate max-w-xs">{issueProofFileName}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition disabled:opacity-50"
                  >
                    {submitting ? 'Submitting Ticket...' : 'Submit Maintenance Ticket'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: MY RAISED TICKETS (Categorized Sub-tabs) */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h2 className="text-xl font-bold text-slate-900">My Raised Tickets</h2>
                <p className="text-xs text-slate-500 mt-1">Track live status and assigned engineers for all tickets raised by you.</p>
              </div>

              {/* Status Sub-Tabs (Material Underline Style) */}
              <div className="border-b border-slate-200 overflow-x-auto scrollbar-none max-w-full">
                <nav className="-mb-px flex items-center gap-6 sm:gap-8 min-w-max pb-0.5">
                  <button
                    onClick={() => setTicketSubTab('open')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      ticketSubTab === 'open' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>OPEN</span>
                    <span className={`text-[11px] font-medium ${ticketSubTab === 'open' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {openTickets.length}
                    </span>
                    {ticketSubTab === 'open' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setTicketSubTab('assigned')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      ticketSubTab === 'assigned' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>ASSIGNED</span>
                    <span className={`text-[11px] font-medium ${ticketSubTab === 'assigned' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {assignedTickets.length}
                    </span>
                    {ticketSubTab === 'assigned' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setTicketSubTab('in_progress')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      ticketSubTab === 'in_progress' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>PROGRESS</span>
                    <span className={`text-[11px] font-medium ${ticketSubTab === 'in_progress' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {inProgressTickets.length}
                    </span>
                    {ticketSubTab === 'in_progress' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setTicketSubTab('resolved')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      ticketSubTab === 'resolved' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>SIGNOFF</span>
                    <span className={`text-[11px] font-medium ${ticketSubTab === 'resolved' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {resolvedTickets.length}
                    </span>
                    {ticketSubTab === 'resolved' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setTicketSubTab('rejected')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      ticketSubTab === 'rejected' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>REJECTED</span>
                    <span className={`text-[11px] font-medium ${ticketSubTab === 'rejected' ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                      {rejectedTickets.length}
                    </span>
                    {ticketSubTab === 'rejected' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-rose-600 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setTicketSubTab('closed')}
                    className={`relative pb-3 pt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus:outline-none ${
                      ticketSubTab === 'closed' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600 font-semibold'
                    }`}
                  >
                    <span>CLOSED</span>
                    <span className={`text-[11px] font-medium ${ticketSubTab === 'closed' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {closedTickets.length}
                    </span>
                    {ticketSubTab === 'closed' && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 rounded-full" />
                    )}
                  </button>
                </nav>
              </div>

              {/* Table Render Function */}
              {(() => {
                let currentList: Ticket[] = [];
                if (ticketSubTab === 'open') currentList = openTickets;
                if (ticketSubTab === 'assigned') currentList = assignedTickets;
                if (ticketSubTab === 'in_progress') currentList = inProgressTickets;
                if (ticketSubTab === 'resolved') currentList = resolvedTickets;
                if (ticketSubTab === 'rejected') currentList = rejectedTickets;
                if (ticketSubTab === 'closed') currentList = closedTickets;

                return (
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-4 w-12 text-center">S.No</th>
                          <th className="p-4">Raised Date & Time</th>
                          <th className="p-4">Ticket ID</th>
                          <th className="p-4">Machine Name</th>
                          <th className="p-4">Assigned Engineer</th>
                          <th className="p-4">Reason for Raising Ticket</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">Loading tickets...</td>
                          </tr>
                        ) : currentList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400">
                              No tickets found in this section.
                            </td>
                          </tr>
                        ) : (
                          currentList.map((t, index) => (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                              <td className="p-4 text-slate-500 whitespace-nowrap">
                                {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="p-4 font-mono font-bold text-blue-600">{t.ticketNumber || `#${t.id.slice(0, 8)}`}</td>
                              <td className="p-4 font-bold text-slate-900">{t.machine.name}</td>
                              <td className="p-4">
                                {t.assignedEngineer ? (
                                  <span className="font-semibold text-slate-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    {t.assignedEngineer.name}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Not Assigned</span>
                                )}
                              </td>
                              <td className="p-4 text-slate-700 max-w-xs">{t.description}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          

          {/* TAB 5: MY PROFILE */}
          {activeTab === 'chat' && <TicketChatSection userRole="OPERATOR" />}

        {activeTab === 'profile' && <ProfileSection />}
        </main>
      </div>
    </div>
  );
};
