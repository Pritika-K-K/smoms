import React from 'react';
import { TicketStatus, TicketPriority } from '../../types';

interface StatusBadgeProps {
  type: 'ticket' | 'priority';
  value: TicketStatus | TicketPriority | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, className = '' }) => {
  const getBadgeStyle = () => {
    if (type === 'priority') {
      const priorityStyles: Record<string, string> = {
        LOW: 'bg-slate-100 text-slate-700 border-slate-200',
        MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
        HIGH: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
        CRITICAL: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
      };
      return priorityStyles[value] || 'bg-slate-100 text-slate-700 border-slate-200';
    }

    const ticketStyles: Record<string, string> = {
      OPEN: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold',
      ASSIGNED: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold',
      IN_PROGRESS: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
      RESOLVED: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
      APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
      CLOSED: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
      REJECTED: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold',
      NEEDS_REWORK: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
      NEEDS_ESCALATION: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      WITHDRAWAL_REQUESTED: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
      PENDING_REASSIGNMENT: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    };
    return ticketStyles[value] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getLabel = () => {
    const labels: Record<string, string> = {
      IN_PROGRESS: 'In Progress',
      NEEDS_REWORK: 'Needs Rework',
      NEEDS_ESCALATION: 'Needs Escalation',
      WITHDRAWAL_REQUESTED: 'Withdrawal Requested',
      PENDING_REASSIGNMENT: 'Pending Reassignment',
    };
    return labels[value] || value;
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider ${getBadgeStyle()} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5 opacity-75"></span>
      {getLabel()}
    </span>
  );
};
