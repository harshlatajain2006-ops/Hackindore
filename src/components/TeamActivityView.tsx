/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertOctagon,
  ListTodo,
  TrendingUp,
  ShieldCheck,
  Plus,
  ArrowRight,
  Filter,
  Check,
  AlertCircle,
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { RemediationTask, TaskStatus, UserPersona } from '../types/security';

interface TeamActivityViewProps {
  tasks: RemediationTask[];
  allUsers: UserPersona[];
  currentUser: UserPersona | null;
  onRefreshTasks: () => void;
  onOpenAssignModalWithEmpty?: () => void;
  onOpenLoginModal: () => void;
}

export const TeamActivityView: React.FC<TeamActivityViewProps> = ({
  tasks,
  allUsers,
  currentUser,
  onRefreshTasks,
  onOpenLoginModal
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Status Counts
  const statusStats = useMemo(() => {
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const blocked = tasks.filter(t => t.status === 'BLOCKED').length;
    const resolved = tasks.filter(t => t.status === 'RESOLVED').length;
    const todo = tasks.filter(t => t.status === 'TODO').length;
    const totalRiskMitigated = tasks
      .filter(t => t.status === 'RESOLVED')
      .reduce((acc, t) => acc + (t.riskReduction || 0), 0);

    return { inProgress, blocked, resolved, todo, total: tasks.length, totalRiskMitigated };
  }, [tasks]);

  // Aggregate Assignee Workload Data for Recharts Bar Chart
  const assigneeWorkloadData = useMemo(() => {
    return allUsers.map(user => {
      const userTasks = tasks.filter(t => t.assignedToUserId === user.id);
      const inProgress = userTasks.filter(t => t.status === 'IN_PROGRESS').length;
      const blocked = userTasks.filter(t => t.status === 'BLOCKED').length;
      const resolved = userTasks.filter(t => t.status === 'RESOLVED').length;
      const todo = userTasks.filter(t => t.status === 'TODO').length;
      const total = userTasks.length;

      return {
        name: user.name.split(' ')[0], // First name for clean axis
        fullName: user.name,
        role: user.roleTitle,
        'In Progress': inProgress,
        'Blocked': blocked,
        'Resolved': resolved,
        'To Do': todo,
        totalTasks: total
      };
    });
  }, [allUsers, tasks]);

  // Status Distribution Data for Bar Chart
  const statusDistributionData = useMemo(() => {
    return [
      {
        status: 'In Progress',
        count: statusStats.inProgress,
        fill: '#38bdf8' // Cyan-400
      },
      {
        status: 'Blocked',
        count: statusStats.blocked,
        fill: '#f43f5e' // Rose-500
      },
      {
        status: 'Resolved',
        count: statusStats.resolved,
        fill: '#10b981' // Emerald-500
      },
      {
        status: 'To Do',
        count: statusStats.todo,
        fill: '#94a3b8' // Slate-400
      }
    ];
  }, [statusStats]);

  // Filtered Task List
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (assigneeFilter !== 'ALL' && t.assignedToUserId !== assigneeFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, assigneeFilter]);

  // Update Task Status via backend API
  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        onRefreshTasks();
      }
    } catch (e) {
      console.error('Failed to update task status:', e);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Custom Chart Tooltip
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1 z-50">
          <p className="font-bold text-white border-b border-slate-800 pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color || entry.fill }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-950/60 border border-red-500/30 text-red-400">
              <Users className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              Remediation Team Activity &amp; Workload
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time tracking of security remediation sprints. Monitor task velocity, clear blocker bottlenecks, and view workload allocation across application security analysts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenLoginModal}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Add Team Member</span>
          </button>
          <div className="text-xs text-slate-400 hidden sm:block">
            <span>Logged in as: </span>
            <button
              onClick={onOpenLoginModal}
              className="font-bold text-indigo-300 hover:underline"
            >
              {currentUser?.name || 'Authorized User'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* In Progress */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Active In Progress</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-cyan-400 tracking-tight">
              {statusStats.inProgress}
            </span>
            <span className="text-xs text-slate-400">tasks</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Under active engineering fix
          </div>
        </div>

        {/* Blocked */}
        <div className="bg-slate-900/60 border border-rose-500/30 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-300 text-xs">
            <span className="font-medium">Blocked Items</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-rose-400 tracking-tight">
              {statusStats.blocked}
            </span>
            <span className="text-xs text-slate-400">bottlenecks</span>
          </div>
          <div className="text-[11px] text-rose-300/80 font-mono">
            Requires architecture/compliance input
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300 text-xs">
            <span className="font-medium">Resolved &amp; Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {statusStats.resolved}
            </span>
            <span className="text-xs text-slate-400">remediated</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {statusStats.totalRiskMitigated}% cumulative risk mitigated
          </div>
        </div>

        {/* Backlog / To Do */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Ready in Backlog</span>
            <ListTodo className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-200 tracking-tight">
              {statusStats.todo}
            </span>
            <span className="text-xs text-slate-400">assigned</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Next up for engineering sprints
          </div>
        </div>
      </div>

      {/* Visual Analytics Section: Recharts Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Assignee Workload Chart (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Assignee Workload by Task Status</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Breakdown of active, blocked, and resolved remediation assignments per analyst
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">Total Assigned: <strong className="text-white">{statusStats.total}</strong></span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={assigneeWorkloadData}
                margin={{ top: 10, right: 15, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  tick={{ fill: '#cbd5e1', fontSize: 11 }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={{ stroke: '#334155' }}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                  iconType="circle"
                />
                <Bar dataKey="In Progress" fill="#38bdf8" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Blocked" fill="#f43f5e" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Resolved" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="To Do" fill="#64748b" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Volume Chart (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Remediation Pipeline Velocity</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Task count distribution across sprint stages
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusDistributionData}
                layout="vertical"
                margin={{ top: 10, right: 25, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  dataKey="status"
                  type="category"
                  stroke="#64748b"
                  tick={{ fill: '#e2e8f0', fontSize: 11 }}
                  width={80}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" name="Tasks Count" radius={[0, 4, 4, 0]}>
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Task Execution Table with Status Lifecycle Updates */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              Remediation Action Items
            </h3>
            <p className="text-xs text-slate-400">
              Update task state directly to simulate sprint workflow and resolve bottlenecks
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === 'ALL' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                onClick={() => setStatusFilter('IN_PROGRESS')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === 'IN_PROGRESS' ? 'bg-cyan-950 text-cyan-300 font-medium border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setStatusFilter('BLOCKED')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === 'BLOCKED' ? 'bg-rose-950 text-rose-300 font-medium border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Blocked
              </button>
              <button
                onClick={() => setStatusFilter('RESOLVED')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  statusFilter === 'RESOLVED' ? 'bg-emerald-950 text-emerald-300 font-medium border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Resolved
              </button>
            </div>

            {/* Assignee Filter Dropdown */}
            <div className="relative">
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 pr-6 focus:outline-none focus:border-red-500 appearance-none"
              >
                <option value="ALL">All Assignees</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400 text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
              No remediation tasks found matching the selected filter.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const assignedUser = allUsers.find(u => u.id === task.assignedToUserId);

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all ${
                    task.status === 'BLOCKED'
                      ? 'border-rose-500/40 bg-rose-950/10'
                      : task.status === 'RESOLVED'
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : task.status === 'IN_PROGRESS'
                      ? 'border-cyan-500/40 bg-cyan-950/10'
                      : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Target, Title, Notes */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200">
                          {task.method}
                        </span>
                        <span className="font-mono text-xs font-bold text-white break-all">
                          {task.targetEndpoint}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          -{task.riskReduction}% Risk Drop
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Effort: {task.effortScore}/10
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-200">
                        {task.title}
                      </h4>

                      {task.notes && (
                        <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/80 font-mono">
                          {task.notes}
                        </p>
                      )}
                    </div>

                    {/* Right: Assignee & Status Changer */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Assignee Card */}
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${assignedUser?.avatarColor || 'bg-slate-700'} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                          {task.assignedToName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-semibold text-white">
                            {task.assignedToName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {assignedUser?.roleTitle || 'Security Analyst'}
                          </div>
                        </div>
                      </div>

                      {/* Status Selector dropdown */}
                      <div className="flex items-center gap-1.5">
                        <select
                          disabled={updatingTaskId === task.id}
                          value={task.status}
                          onChange={(e) => handleUpdateStatus(task.id, e.target.value as TaskStatus)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-colors focus:outline-none cursor-pointer ${
                            task.status === 'RESOLVED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                              : task.status === 'BLOCKED'
                              ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          <option value="IN_PROGRESS">● In Progress</option>
                          <option value="BLOCKED">✕ Blocked</option>
                          <option value="RESOLVED">✓ Resolved</option>
                          <option value="TODO">○ To Do</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
