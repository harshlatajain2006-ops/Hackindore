/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Sparkles,
  Zap,
  Target,
  Clock,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Sliders,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { RemediationTask, RoiItem, RoiQuadrant, UserPersona } from '../types/security';

interface RoiRankingViewProps {
  roiItems: RoiItem[];
  simulatedNodeIds: string[];
  onToggleSimulateNode: (nodeId: string) => void;
  currentUser: UserPersona | null;
  tasks: RemediationTask[];
  onOpenAssignModal: (item: RoiItem) => void;
  onOpenLoginModal: () => void;
}

export const RoiRankingView: React.FC<RoiRankingViewProps> = ({
  roiItems,
  simulatedNodeIds,
  onToggleSimulateNode,
  currentUser,
  tasks,
  onOpenAssignModal,
  onOpenLoginModal
}) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<'ALL' | RoiQuadrant>('ALL');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(roiItems[0]?.id || null);

  const simulatedSet = new Set(simulatedNodeIds);

  // Map tasks by target endpoint
  const taskMap = useMemo(() => {
    const map = new Map<string, RemediationTask>();
    tasks.forEach(t => map.set(t.targetEndpoint, t));
    return map;
  }, [tasks]);

  const filteredItems = useMemo(() => {
    if (selectedQuadrant === 'ALL') return roiItems;
    return roiItems.filter(item => item.quadrant === selectedQuadrant);
  }, [roiItems, selectedQuadrant]);

  const activeSelectedItem = useMemo(() => {
    return roiItems.find(item => item.id === selectedItemId) || roiItems[0] || null;
  }, [roiItems, selectedItemId]);

  // Quadrant counts
  const counts = useMemo(() => {
    return {
      QUICK_WINS: roiItems.filter(i => i.quadrant === 'QUICK_WINS').length,
      STRATEGIC: roiItems.filter(i => i.quadrant === 'STRATEGIC').length,
      LOW_HANGING: roiItems.filter(i => i.quadrant === 'LOW_HANGING').length,
      DE_PRIORITIZED: roiItems.filter(i => i.quadrant === 'DE_PRIORITIZED').length
    };
  }, [roiItems]);

  const getQuadrantColor = (quadrant: RoiQuadrant) => {
    switch (quadrant) {
      case 'QUICK_WINS':
        return {
          border: 'border-emerald-500/50',
          bg: 'bg-emerald-950/20',
          badge: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
          text: 'text-emerald-400'
        };
      case 'STRATEGIC':
        return {
          border: 'border-amber-500/50',
          bg: 'bg-amber-950/20',
          badge: 'bg-amber-950 text-amber-300 border-amber-500/40',
          text: 'text-amber-400'
        };
      case 'LOW_HANGING':
        return {
          border: 'border-cyan-500/50',
          bg: 'bg-cyan-950/20',
          badge: 'bg-cyan-950 text-cyan-300 border-cyan-500/40',
          text: 'text-cyan-400'
        };
      case 'DE_PRIORITIZED':
        return {
          border: 'border-slate-700',
          bg: 'bg-slate-900/30',
          badge: 'bg-slate-800 text-slate-400 border-slate-700',
          text: 'text-slate-400'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              Remediation ROI Prioritization Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Optimizes security sprint allocation by evaluating <strong>Risk Reduction % (Impact)</strong> against <strong>Engineering Effort Score (1-10)</strong>. Prioritize Quick Wins to eliminate the highest volume of attack paths with the lowest developer overhead.
          </p>
        </div>

        {/* Filter Tabs by Quadrant */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setSelectedQuadrant('ALL')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              selectedQuadrant === 'ALL'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({roiItems.length})
          </button>
          <button
            onClick={() => setSelectedQuadrant('QUICK_WINS')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              selectedQuadrant === 'QUICK_WINS'
                ? 'bg-emerald-950 text-emerald-300 font-medium border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Quick Wins</span>
            <span className="font-mono text-[10px]">({counts.QUICK_WINS})</span>
          </button>
          <button
            onClick={() => setSelectedQuadrant('STRATEGIC')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              selectedQuadrant === 'STRATEGIC'
                ? 'bg-amber-950 text-amber-300 font-medium border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Strategic</span>
            <span className="font-mono text-[10px]">({counts.STRATEGIC})</span>
          </button>
          <button
            onClick={() => setSelectedQuadrant('LOW_HANGING')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              selectedQuadrant === 'LOW_HANGING'
                ? 'bg-cyan-950 text-cyan-300 font-medium border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Low-Hanging</span>
            <span className="font-mono text-[10px]">({counts.LOW_HANGING})</span>
          </button>
          <button
            onClick={() => setSelectedQuadrant('DE_PRIORITIZED')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              selectedQuadrant === 'DE_PRIORITIZED'
                ? 'bg-slate-800 text-slate-300 font-medium'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>De-prioritized</span>
            <span className="font-mono text-[10px]">({counts.DE_PRIORITIZED})</span>
          </button>
        </div>
      </div>

      {/* 2x2 Matrix Visual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quadrant I: Quick Wins */}
        <div className="border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-slate-900/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="text-xs font-bold text-emerald-300 font-mono tracking-wide uppercase">
                Quadrant I: Quick Wins (Easy Fix · High Impact)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              Immediate Sprint
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            High risk-reduction potential (≥ 50%) achievable with minimal configuration (Effort ≤ 4).
          </p>

          <div className="space-y-2">
            {roiItems.filter(i => i.quadrant === 'QUICK_WINS').map((item, idx) => {
              const isSimulated = simulatedSet.has(item.nodeId);
              const assignedTask = taskMap.get(item.path);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedItemId === item.id
                      ? 'border-emerald-500 bg-emerald-950/40'
                      : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200">
                          {item.method}
                        </span>
                        <span className="text-xs font-mono font-bold text-white break-all">
                          {item.path}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-emerald-400 font-mono font-bold">
                          -{item.riskReductionPercent}% Risk
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-300">
                          Effort: {item.effortScore}/10 ({item.developerHoursEstimate})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSimulateNode(item.nodeId);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                          isSimulated
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isSimulated ? 'Revert' : 'Simulate'}
                      </button>
                    </div>
                  </div>

                  {assignedTask && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 text-cyan-300">
                        <UserCheck className="w-3 h-3" />
                        <span>Assigned to: {assignedTask.assignedToName}</span>
                      </span>
                      <span className="font-mono text-emerald-400">[{assignedTask.status}]</span>
                    </div>
                  )}
                </div>
              );
            })}
            {roiItems.filter(i => i.quadrant === 'QUICK_WINS').length === 0 && (
              <div className="text-xs text-slate-500 p-4 text-center">
                No items currently in this quadrant.
              </div>
            )}
          </div>
        </div>

        {/* Quadrant II: Strategic Projects */}
        <div className="border border-amber-500/40 bg-gradient-to-br from-amber-950/20 to-slate-900/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <h3 className="text-xs font-bold text-amber-300 font-mono tracking-wide uppercase">
                Quadrant II: Strategic Projects (Difficult Fix · High Impact)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
              Architecture Spike
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Critical exploit severing (≥ 50% impact), but requires deep data model or authorization redesign (Effort &gt; 4).
          </p>

          <div className="space-y-2">
            {roiItems.filter(i => i.quadrant === 'STRATEGIC').map((item) => {
              const isSimulated = simulatedSet.has(item.nodeId);
              const assignedTask = taskMap.get(item.path);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedItemId === item.id
                      ? 'border-amber-500 bg-amber-950/40'
                      : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200">
                          {item.method}
                        </span>
                        <span className="text-xs font-mono font-bold text-white break-all">
                          {item.path}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-amber-400 font-mono font-bold">
                          -{item.riskReductionPercent}% Risk
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-300">
                          Effort: {item.effortScore}/10 ({item.developerHoursEstimate})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSimulateNode(item.nodeId);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                          isSimulated
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                        }`}
                      >
                        {isSimulated ? 'Revert' : 'Simulate'}
                      </button>
                    </div>
                  </div>

                  {assignedTask && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 text-cyan-300">
                        <UserCheck className="w-3 h-3" />
                        <span>Assigned to: {assignedTask.assignedToName}</span>
                      </span>
                      <span className="font-mono text-amber-400">[{assignedTask.status}]</span>
                    </div>
                  )}
                </div>
              );
            })}
            {roiItems.filter(i => i.quadrant === 'STRATEGIC').length === 0 && (
              <div className="text-xs text-slate-500 p-4 text-center">
                No items currently in this quadrant.
              </div>
            )}
          </div>
        </div>

        {/* Quadrant III: Low-Hanging Fruit */}
        <div className="border border-cyan-500/40 bg-gradient-to-br from-cyan-950/20 to-slate-900/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h3 className="text-xs font-bold text-cyan-300 font-mono tracking-wide uppercase">
                Quadrant III: Low-Hanging Fruit (Easy Fix · Low Impact)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              Routine Hardening
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Straightforward localized fixes (Effort ≤ 4) with lower aggregate chain coverage (&lt; 50%).
          </p>

          <div className="space-y-2">
            {roiItems.filter(i => i.quadrant === 'LOW_HANGING').map((item) => {
              const isSimulated = simulatedSet.has(item.nodeId);
              const assignedTask = taskMap.get(item.path);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedItemId === item.id
                      ? 'border-cyan-500 bg-cyan-950/40'
                      : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200">
                          {item.method}
                        </span>
                        <span className="text-xs font-mono font-bold text-white break-all">
                          {item.path}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-cyan-400 font-mono font-bold">
                          -{item.riskReductionPercent}% Risk
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-300">
                          Effort: {item.effortScore}/10 ({item.developerHoursEstimate})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSimulateNode(item.nodeId);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                          isSimulated
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        }`}
                      >
                        {isSimulated ? 'Revert' : 'Simulate'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {roiItems.filter(i => i.quadrant === 'LOW_HANGING').length === 0 && (
              <div className="text-xs text-slate-500 p-4 text-center">
                No items currently in this quadrant.
              </div>
            )}
          </div>
        </div>

        {/* Quadrant IV: De-prioritized */}
        <div className="border border-slate-700 bg-slate-900/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wide uppercase">
                Quadrant IV: De-prioritized (Difficult Fix · Low Impact)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Accept Risk / Backlog
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Disproportionate effort required for isolated endpoints. Address only after completing Quick Wins.
          </p>

          <div className="space-y-2">
            {roiItems.filter(i => i.quadrant === 'DE_PRIORITIZED').map((item) => {
              const isSimulated = simulatedSet.has(item.nodeId);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedItemId === item.id
                      ? 'border-slate-500 bg-slate-800/40'
                      : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200">
                          {item.method}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-300 break-all">
                          {item.path}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono">-{item.riskReductionPercent}% Risk</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">Effort: {item.effortScore}/10</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {roiItems.filter(i => i.quadrant === 'DE_PRIORITIZED').length === 0 && (
              <div className="text-xs text-slate-500 p-4 text-center">
                No items currently in this quadrant.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Item Detail & Assignment Drawer */}
      {activeSelectedItem && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getQuadrantColor(activeSelectedItem.quadrant).badge}`}>
                  {activeSelectedItem.quadrantLabel}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ROI Score: <strong className="text-white">{activeSelectedItem.roiScore}</strong>
                </span>
              </div>
              <h3 className="text-base font-bold font-mono text-white mt-1">
                {activeSelectedItem.method} {activeSelectedItem.path}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleSimulateNode(activeSelectedItem.nodeId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  simulatedSet.has(activeSelectedItem.nodeId)
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {simulatedSet.has(activeSelectedItem.nodeId) ? 'Revert Simulation' : 'Simulate Fix Live'}
                </span>
              </button>

              <button
                onClick={() => onOpenAssignModal(activeSelectedItem)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assign to Team Member</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold block text-[11px]">Impact Breakdown</span>
              <div className="text-emerald-400 text-lg font-mono font-bold">
                -{activeSelectedItem.riskReductionPercent}% Risk Drop
              </div>
              <p className="text-slate-400 text-[11px]">
                Impact score: {activeSelectedItem.impactScore} / 10
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold block text-[11px]">Effort Estimation</span>
              <div className="text-white text-lg font-mono font-bold">
                {activeSelectedItem.effortScore} / 10
              </div>
              <p className="text-slate-400 text-[11px]">
                Estimated time: {activeSelectedItem.developerHoursEstimate}
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-500 font-semibold block text-[11px]">Strategic Guidance</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {activeSelectedItem.quadrantDescription}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-xs">
            <span className="font-semibold text-slate-300">Recommended Implementation Action:</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {activeSelectedItem.recommendedAction}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
