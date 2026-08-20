import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Activity,
  PlusCircle,
  ArrowRight,
  Plus,
  Users,
  Cpu,
  Building,
  ShieldCheck,
  Trash2,
  Download,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Building2,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText
} from 'lucide-react';
import { User, Machine, Department, AuditLogItem, NotificationItem } from '../../types';
import { Sidebar, SidebarNavItem } from '../../components/common/Sidebar';
import { Navbar } from '../../components/common/Navbar';
import { Modal } from '../../components/common/Modal';
import { ProfileSection } from '../../components/common/ProfileSection';

import { getUsersApi, createUserApi, deleteUserApi } from '../../api/users';
import { getMachinesApi, createMachineApi, deleteMachineApi } from '../../api/machines';
import { getDepartmentsApi, createDepartmentApi } from '../../api/departments';
import { getAuditLogsApi } from '../../api/auditLogs';
import { getNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi } from '../../api/notifications';

export const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'OPERATOR' | 'ENGINEER' | 'MANAGER' | 'ADMIN'>('OPERATOR');
  const [userDeptId, setUserDeptId] = useState('');

  // Machine Modal State
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [machineName, setMachineName] = useState('');
  const [selectedMachineDeptId, setSelectedMachineDeptId] = useState<string>('ALL');
  const [machineDeptId, setMachineDeptId] = useState('');

  // Dept Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');

  // System Audit Trail States
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [auditEntityFilter, setAuditEntityFilter] = useState('ALL');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const AUDIT_PER_PAGE = 10;

  // Helper for Audit Action Color Coding
  const getActionBadgeStyle = (action: string) => {
    const upper = action.toUpperCase();
    if (upper.includes('LOGIN')) {
      return 'bg-slate-100 text-slate-700 border-slate-200';
    }
    if (upper.includes('REJECT') || upper.includes('WITHDRAW') || upper.includes('REWORK')) {
      return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    }
    if (upper.includes('DELETE') || upper.includes('ESCALAT')) {
      return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    }
    if (upper.includes('APPROV') || upper.includes('RESOLV') || upper.includes('CREATE')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200 font-semibold';
  };

  // Helper for Audit Action Details
  const getAuditDetailsText = (log: any) => {
    const action = log.action || '';
    if (action === 'USER_LOGIN') return 'User authenticated successfully';
    if (action === 'CREATE_TICKET') return 'New maintenance ticket raised';
    if (action === 'ASSIGN_TICKET') return 'Engineer assigned to ticket';
    if (action === 'UPDATE_STATUS_IN_PROGRESS') return 'Status: Raised/Assigned → In Progress';
    if (action === 'UPDATE_STATUS_RESOLVED') return 'Status: In Progress → Resolved';
    if (action === 'REVIEW_TICKET_APPROVED') return 'Status: Resolved → Approved & Closed';
    if (action === 'REVIEW_TICKET_REJECTED') return 'Status: Resolved → Needs Rework';
    if (action === 'REQUEST_WITHDRAWAL') return 'Engineer requested ticket withdrawal';
    if (action === 'REVIEW_WITHDRAWAL_APPROVED') return 'Status: Withdrawal Approved → Reassigned';
    if (action === 'REVIEW_WITHDRAWAL_REJECTED') return 'Status: Withdrawal Rejected → In Progress';
    if (action === 'CREATE_USER') return 'New user account provisioned';
    if (action === 'UPDATE_USER') return 'User account details updated';
    if (action === 'DELETE_USER') return 'User account deleted';
    if (action === 'CREATE_MACHINE') return 'New machine asset registered';
    if (action === 'UPDATE_MACHINE') return 'Machine details updated';
    if (action === 'DELETE_MACHINE') return 'Machine asset removed';
    if (action === 'CREATE_DEPARTMENT') return 'New department created';
    if (action === 'UPDATE_DEPARTMENT') return 'Department details updated';
    if (action === 'DELETE_DEPARTMENT') return 'Department deleted';
    
    return log.details || `${log.entityType || 'Entity'} ${action.toLowerCase().replace(/_/g, ' ')}`;
  };

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    // Search Filter
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      const userName = (log.user?.name || 'System Auto').toLowerCase();
      const actionStr = (log.action || '').toLowerCase();
      const targetId = (log.entityId || '').toLowerCase();
      const entityType = (log.entityType || '').toLowerCase();
      if (!userName.includes(q) && !actionStr.includes(q) && !targetId.includes(q) && !entityType.includes(q)) {
        return false;
      }
    }
    // Action Filter
    if (auditActionFilter !== 'ALL' && log.action !== auditActionFilter) {
      return false;
    }
    // Entity Filter
    if (auditEntityFilter !== 'ALL' && log.entityType !== auditEntityFilter) {
      return false;
    }
    // Date Range Filter
    if (auditStartDate) {
      const logDate = new Date(log.timestamp);
      const startDate = new Date(auditStartDate);
      startDate.setHours(0, 0, 0, 0);
      if (logDate < startDate) return false;
    }
    if (auditEndDate) {
      const logDate = new Date(log.timestamp);
      const endDate = new Date(auditEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (logDate > endDate) return false;
    }
    return true;
  });

  // Audit Pagination Calculations
  const auditTotalPages = Math.ceil(filteredAuditLogs.length / AUDIT_PER_PAGE) || 1;
  const auditPaginatedLogs = filteredAuditLogs.slice(
    (auditCurrentPage - 1) * AUDIT_PER_PAGE,
    auditCurrentPage * AUDIT_PER_PAGE
  );

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredAuditLogs.length === 0) {
      alert('No audit logs available to export');
      return;
    }
    const headers = ['Timestamp', 'User Name', 'User Email', 'Action', 'Entity Type', 'Target ID', 'Details'];
    const rows = filteredAuditLogs.map((log) => [
      new Date(log.timestamp).toLocaleString(),
      log.user?.name || 'System Auto',
      log.user?.email || 'N/A',
      log.action,
      log.entityType,
      log.action === 'USER_LOGIN' || (log.entityType === 'User' && log.action === 'USER_LOGIN') ? '-' : log.entityId,
      getAuditDetailsText(log),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `system_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uList, mList, dList, logs, notifRes] = await Promise.all([
        getUsersApi(),
        getMachinesApi(),
        getDepartmentsApi(),
        getAuditLogsApi(100),
        getNotificationsApi(),
      ]);
      setUsers(uList);
      setMachines(mList);
      setDepartments(dList);
      setAuditLogs(logs);
      setNotifications(notifRes.notifications);
      setUnreadCount(notifRes.unreadCount);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredMachinesList = machines.filter((m) => {
    if (selectedMachineDeptId !== 'ALL' && m.departmentId !== selectedMachineDeptId) {
      return false;
    }
    return true;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUserApi({ name: userName, email: userEmail, password: userPassword, role: userRole, departmentId: userDeptId });
      setToastMessage('User created successfully');
      setIsUserModalOpen(false);
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      fetchData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUserApi(id);
      setToastMessage('User deleted');
      fetchData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert('Failed to delete user');
    }
  };

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMachineApi({ name: machineName, departmentId: machineDeptId });
      setToastMessage('Machine created');
      setIsMachineModalOpen(false);
      setMachineName('');
      fetchData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create machine');
    }
  };

  const handleDeleteMachine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this machine?')) return;
    try {
      await deleteMachineApi(id);
      setToastMessage('Machine deleted');
      fetchData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert('Failed to delete machine');
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDepartmentApi(deptName);
      setToastMessage('Department created');
      setIsDeptModalOpen(false);
      setDeptName('');
      fetchData();
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create department');
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

  const sidebarItems: SidebarNavItem[] = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Accounts', icon: Users, badgeCount: users.length },
    { id: 'machines', label: 'Machine Inventory', icon: Cpu, badgeCount: machines.length },
    { id: 'departments', label: 'Departments', icon: Building2, badgeCount: departments.length },
    { id: 'audit_logs', label: 'System Audit Trail', icon: FileText, badgeCount: auditLogs.length },
    
    { id: 'profile', label: 'My Profile', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          title="Admin Station"
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

          {/* PAGE 1: USER ACCOUNTS */}
          {/* PAGE 0: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-slate-900">Plant Administration & Governance</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      System Operational
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Real-time monitoring of user access, machinery assets, plant departments, and security compliance trail.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsUserModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>User</span>
                  </button>
                  <button
                    onClick={() => setIsMachineModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Machine</span>
                  </button>
                </div>
              </div>

              {/* 4 KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900">{users.length}</span>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      {users.filter(u => u.role === 'OPERATOR').length} Ops • {users.filter(u => u.role === 'ENGINEER').length} Engs • {users.filter(u => u.role === 'MANAGER').length} Mgrs
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Machinery Assets</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <Cpu className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900">{machines.length}</span>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Registered across {departments.length} departments
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departments</span>
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900">{departments.length}</span>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Plant divisions configured
                    </p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audit Events</span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold text-slate-900">{auditLogs.length}</span>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Governance actions recorded
                    </p>
                  </div>
                </div>
              </div>

              {/* Two-Column Detail Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Role Distribution Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>User Role Breakdown</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('users')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Manage Users</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {[
                      { role: 'OPERATOR', label: 'Operators', color: 'bg-blue-600', text: 'text-blue-700', count: users.filter(u => u.role === 'OPERATOR').length },
                      { role: 'ENGINEER', label: 'Maintenance Engineers', color: 'bg-emerald-600', text: 'text-emerald-700', count: users.filter(u => u.role === 'ENGINEER').length },
                      { role: 'MANAGER', label: 'Production Managers', color: 'bg-purple-600', text: 'text-purple-700', count: users.filter(u => u.role === 'MANAGER').length },
                      { role: 'ADMIN', label: 'System Administrators', color: 'bg-slate-900', text: 'text-slate-800', count: users.filter(u => u.role === 'ADMIN').length },
                    ].map((item) => {
                      const pct = users.length > 0 ? Math.round((item.count / users.length) * 100) : 0;
                      return (
                        <div key={item.role} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700">{item.label}</span>
                            <span className={item.text}>{item.count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`${item.color} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Machine Distribution by Department Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-purple-600" />
                      <span>Department Machine Allocation</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('machines')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Inventory</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {departments.map((dept) => {
                      const deptMachines = machines.filter(m => m.departmentId === dept.id || m.department?.id === dept.id);
                      const pct = machines.length > 0 ? Math.round((deptMachines.length / machines.length) * 100) : 0;
                      return (
                        <div key={dept.id} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700">{dept.name} ({dept.code})</span>
                            <span className="text-slate-900">{deptMachines.length} machines</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {departments.length === 0 && (
                      <p className="text-xs text-slate-400 font-medium py-2">No departments configured yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Audit & Compliance Stream */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Recent System Activity & Compliance Logs</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Real-time trail of administrative actions, user logins, and machine modifications.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('audit_logs')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View All ({auditLogs.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold flex-shrink-0 text-xs uppercase">
                          {log.user?.name?.slice(0, 2) || 'AD'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {log.user?.name || 'System User'} <span className="text-slate-400 font-normal">({log.user?.email || 'N/A'})</span>
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium truncate">{`Entity: ${log.entityType} (${log.entityId || '-'})`}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                          {log.action}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <p className="text-xs text-slate-400 font-medium py-4 text-center">No system activity logged yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">User Accounts & Role Permissions</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage system access, assign user roles, and allocate plant departments.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (departments.length > 0) setUserDeptId(departments[0].id);
                    setIsUserModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add User</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Department</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-bold text-slate-900">{u.name}</td>
                        <td className="p-4 text-slate-600 font-mono">{u.email}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-200 bg-blue-50 text-blue-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600">{u.department?.name || 'Global System'}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAGE 2: MACHINE INVENTORY */}
          {activeTab === 'machines' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Machine Inventory Management</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Register new equipment, inspect health scores, and assign department locations.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (departments.length > 0) setMachineDeptId(departments[0].id);
                    setIsMachineModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Machine</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-4 w-12 text-center">S.No</th>
                        <th className="p-4">Machine Name</th>
                        <th className="p-4">Department & Code</th>
                        <th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMachinesList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">
                            No machines found for the selected department.
                          </td>
                        </tr>
                      ) : (
                        filteredMachinesList.map((m, index) => (
                          <tr key={m.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-4 font-bold text-slate-400 text-center">{index + 1}</td>
                            <td className="p-4 font-bold text-slate-900">{m.name}</td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-800">{m.department?.name || 'Shopfloor'}</span>
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono font-bold text-[11px] rounded-md border border-blue-200">
                                  {m.department?.code || 'DEPT'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteMachine(m.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                title="Delete Machine"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </table>
              </div>
            </div>
          )}

          {/* PAGE 3: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Plant Departments</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage operational sections and shopfloor divisions.
                  </p>
                </div>
                <button
                  onClick={() => setIsDeptModalOpen(true)}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Department</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {departments.map((d) => (
                  <div key={d.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-base">{d.name}</h4>
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded-lg border border-blue-200 shadow-xs">
                        {d.code || 'DEPT'}
                      </span>
                    </div>
                    <div className="flex space-x-4 text-xs text-slate-500 font-medium">
                      <span>Users: {d._count?.users || 0}</span>
                      <span>Machines: {d._count?.machines || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAGE 4: SYSTEM AUDIT LOGS */}
          {activeTab === 'audit_logs' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">System Audit & Compliance Trail</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Immutable record of user logins, machine updates, ticket lifecycle events, and administrative activities.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer self-start md:self-auto"
                  title="Export filtered audit log to CSV"
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Filter Controls Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-700">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span>Filter Audit Logs</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search user, target, action..."
                      value={auditSearch}
                      onChange={(e) => {
                        setAuditSearch(e.target.value);
                        setAuditCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Action Type Dropdown */}
                  <div>
                    <select
                      value={auditActionFilter}
                      onChange={(e) => {
                        setAuditActionFilter(e.target.value);
                        setAuditCurrentPage(1);
                      }}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="ALL">All Action Types</option>
                      <option value="USER_LOGIN">USER_LOGIN</option>
                      <option value="CREATE_TICKET">CREATE_TICKET</option>
                      <option value="ASSIGN_TICKET">ASSIGN_TICKET</option>
                      <option value="UPDATE_STATUS_IN_PROGRESS">UPDATE_STATUS_IN_PROGRESS</option>
                      <option value="UPDATE_STATUS_RESOLVED">UPDATE_STATUS_RESOLVED</option>
                      <option value="REVIEW_TICKET_APPROVED">REVIEW_TICKET_APPROVED</option>
                      <option value="REVIEW_TICKET_REJECTED">REVIEW_TICKET_REJECTED</option>
                      <option value="REQUEST_WITHDRAWAL">REQUEST_WITHDRAWAL</option>
                      <option value="REVIEW_WITHDRAWAL_APPROVED">REVIEW_WITHDRAWAL_APPROVED</option>
                      <option value="REVIEW_WITHDRAWAL_REJECTED">REVIEW_WITHDRAWAL_REJECTED</option>
                      <option value="CREATE_USER">CREATE_USER</option>
                      <option value="UPDATE_USER">UPDATE_USER</option>
                      <option value="DELETE_USER">DELETE_USER</option>
                      <option value="CREATE_MACHINE">CREATE_MACHINE</option>
                      <option value="UPDATE_MACHINE">UPDATE_MACHINE</option>
                      <option value="DELETE_MACHINE">DELETE_MACHINE</option>
                      <option value="CREATE_DEPARTMENT">CREATE_DEPARTMENT</option>
                      <option value="UPDATE_DEPARTMENT">UPDATE_DEPARTMENT</option>
                      <option value="DELETE_DEPARTMENT">DELETE_DEPARTMENT</option>
                    </select>
                  </div>

                  {/* Entity Type Dropdown */}
                  <div>
                    <select
                      value={auditEntityFilter}
                      onChange={(e) => {
                        setAuditEntityFilter(e.target.value);
                        setAuditCurrentPage(1);
                      }}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="ALL">All Entity Types</option>
                      <option value="Ticket">Ticket</option>
                      <option value="Machine">Machine</option>
                      <option value="User">User</option>
                      <option value="Department">Department</option>
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <input
                      type="date"
                      value={auditStartDate}
                      onChange={(e) => {
                        setAuditStartDate(e.target.value);
                        setAuditCurrentPage(1);
                      }}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      title="Start Date"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <input
                      type="date"
                      value={auditEndDate}
                      onChange={(e) => {
                        setAuditEndDate(e.target.value);
                        setAuditCurrentPage(1);
                      }}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      title="End Date"
                    />
                  </div>
                </div>

                {/* Reset Filters button */}
                {(auditSearch || auditActionFilter !== 'ALL' || auditEntityFilter !== 'ALL' || auditStartDate || auditEndDate) && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setAuditSearch('');
                        setAuditActionFilter('ALL');
                        setAuditEntityFilter('ALL');
                        setAuditStartDate('');
                        setAuditEndDate('');
                        setAuditCurrentPage(1);
                      }}
                      className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset All Filters</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Audit Trail Table */}
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">User</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Entity Type</th>
                      <th className="p-4">Target ID</th>
                      <th className="p-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          No audit events match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      auditPaginatedLogs.map((log) => {
                        const isLogin = log.action === 'USER_LOGIN' || (log.entityType === 'User' && log.action === 'USER_LOGIN');
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-4 text-slate-500 font-mono whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-4 font-bold text-slate-900">
                              <div>{log.user?.name || 'System Auto'}</div>
                              {log.user?.role && (
                                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                                  {log.user.role}
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-mono border uppercase tracking-wider ${getActionBadgeStyle(log.action)}`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-4 font-semibold text-slate-700">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 text-[11px]">
                                {log.entityType}
                              </span>
                            </td>
                            <td className="p-4 font-mono">
                              {isLogin ? (
                                <span className="text-slate-300 font-bold" title="Target ID hidden for Login actions as it duplicates User">-</span>
                              ) : (
                                <span className="text-slate-700 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                  {log.entityId}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-700 font-medium max-w-xs">
                              {getAuditDetailsText(log)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 gap-3">
                  <div>
                    Showing{' '}
                    <span className="font-bold text-slate-900">
                      {filteredAuditLogs.length === 0 ? 0 : (auditCurrentPage - 1) * AUDIT_PER_PAGE + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-bold text-slate-900">
                      {Math.min(auditCurrentPage * AUDIT_PER_PAGE, filteredAuditLogs.length)}
                    </span>{' '}
                    of <span className="font-bold text-slate-900">{filteredAuditLogs.length}</span> events
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setAuditCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={auditCurrentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-bold text-slate-800">
                      Page {auditCurrentPage} of {auditTotalPages}
                    </span>
                    <button
                      onClick={() => setAuditCurrentPage((prev) => Math.min(auditTotalPages, prev + 1))}
                      disabled={auditCurrentPage >= auditTotalPages}
                      className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 5: NOTIFICATIONS */}
          

          {/* PAGE 6: MY PROFILE */}
          {activeTab === 'profile' && <ProfileSection />}
        </main>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Create New User Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name</label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
            <input
              type="email"
              required
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              required
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">System Role</label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="OPERATOR">OPERATOR - Shopfloor operator</option>
              <option value="ENGINEER">ENGINEER - Maintenance engineer</option>
              <option value="MANAGER">MANAGER - Production manager</option>
              <option value="ADMIN">ADMIN - System administrator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Assigned Department</label>
            <select
              value={userDeptId}
              onChange={(e) => setUserDeptId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="">None (Global / Admin)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 border border-slate-300 bg-white text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-lg text-white shadow-xs"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Machine Modal */}
      <Modal isOpen={isMachineModalOpen} onClose={() => setIsMachineModalOpen(false)} title="Register New Machine">
        <form onSubmit={handleCreateMachine} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Machine Name / ID</label>
            <input
              type="text"
              required
              value={machineName}
              onChange={(e) => setMachineName(e.target.value)}
              placeholder="e.g. CNC Milling Machine M-09"
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Department</label>
            <select
              value={machineDeptId}
              onChange={(e) => setMachineDeptId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsMachineModalOpen(false)}
              className="px-4 py-2 border border-slate-300 bg-white text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-lg text-white shadow-xs"
            >
              Register Machine
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Department Modal */}
      <Modal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} title="Add Plant Department">
        <form onSubmit={handleCreateDept} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Laser Cutting & Assembly"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Department Code <span className="text-slate-400 font-normal">(e.g. MCH, ASM, ELEC)</span>
            </label>
            <input
              type="text"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
              placeholder="e.g. MCH"
              maxLength={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono uppercase"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              This code is embedded in ticket IDs raised for machines in this department (e.g. TKT-MCH-2608-001).
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDeptModalOpen(false)}
              className="px-4 py-2 border border-slate-300 bg-white text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-lg text-white shadow-xs"
            >
              Add Department
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
