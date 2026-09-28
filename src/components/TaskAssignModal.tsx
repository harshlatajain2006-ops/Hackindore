/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, UserCheck, Check, AlertCircle } from 'lucide-react';
import { RoiItem, UserPersona } from '../types/security';

interface TaskAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  roiItem: RoiItem | null;
  users: UserPersona[];
  onTaskAssigned: () => void;
}

export const TaskAssignModal: React.FC<TaskAssignModalProps> = ({
  isOpen,
  onClose,
  roiItem,
  users,
  onTaskAssigned
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !roiItem) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/tasks/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEndpoint: roiItem.path,
          method: roiItem.method,
          title: `Remediate ${roiItem.method} ${roiItem.path}`,
          riskReduction: roiItem.riskReductionPercent,
          effortScore: roiItem.effortScore,
          quadrant: roiItem.quadrant,
          assignedToUserId: selectedUserId,
          notes: notes || `Prioritized fix from ${roiItem.quadrantLabel}`
        })
      });

      const data = await res.json();
      if (data.success) {
        onTaskAssigned();
        onClose();
      } else {
        setErrorMsg(data.message || 'Failed to assign task');
      }
    } catch (err: unknown) {
      setErrorMsg('Could not reach backend database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Assign Remediation Task
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleAssign} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-lg text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">
              Target Endpoint
            </span>
            <div className="font-mono font-bold text-white text-xs">
              {roiItem.method} {roiItem.path}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono">
              -{roiItem.riskReductionPercent}% Risk Drop · Effort: {roiItem.effortScore}/10
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Assign To Analyst</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.roleTitle} ({u.department})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Remediation Sprint Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Schedule for Sprint 42. Coordinate with backend team to implement JWT role-checking."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{loading ? 'Assigning...' : 'Confirm Assignment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
