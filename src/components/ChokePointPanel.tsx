/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Zap,
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  Code2,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AttackPath, ChokePoint } from '../types/security';

interface ChokePointPanelProps {
  chokePoints: ChokePoint[];
  attackPaths: AttackPath[];
  simulatedNodeIds: string[];
  onToggleSimulateNode: (nodeId: string) => void;
  onApplyAllTopFixes: () => void;
  onResetSimulation: () => void;
}

export const ChokePointPanel: React.FC<ChokePointPanelProps> = ({
  chokePoints,
  attackPaths,
  simulatedNodeIds,
  onToggleSimulateNode,
  onApplyAllTopFixes,
  onResetSimulation
}) => {
  const [expandedGuidance, setExpandedGuidance] = useState<string | null>(null);
  const simulatedSet = new Set(simulatedNodeIds);

  const topChoke = chokePoints[0];

  const toggleGuidance = (nodeId: string) => {
    setExpandedGuidance(prev => (prev === nodeId ? null : nodeId));
  };

  return (
    <div className="space-y-6">
      {/* Hero Recommendation Card for #1 Choke Point */}
      {topChoke && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  TOP STRATEGIC CHOKE POINT #1
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {topChoke.roiCategory}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>{topChoke.method} {topChoke.path}</span>
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Remediating this single endpoint severs{' '}
                <strong className="text-amber-300 font-mono">{topChoke.pathsCoveredCount} of {attackPaths.length}</strong>{' '}
                attack chains ({topChoke.criticalPathsCoveredCount} critical chains), reducing total API attack surface by{' '}
                <strong className="text-emerald-400 font-mono font-bold text-sm">
                  {topChoke.riskReductionPercent}%
                </strong>
                .
              </p>
            </div>

            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0">
              <div className="text-right">
                <div className="text-3xl font-extrabold font-mono text-emerald-400">
                  -{topChoke.riskReductionPercent}%
                </div>
                <div className="text-[11px] text-slate-400 font-mono">Risk Reduction</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleSimulateNode(topChoke.nodeId)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shadow-sm ${
                    simulatedSet.has(topChoke.nodeId)
                      ? 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {simulatedSet.has(topChoke.nodeId) ? 'Revert Simulation' : 'Simulate Fix Live'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Bar inside Hero */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <div>
              <span className="text-slate-500 mr-1.5">Remediation Effort:</span>
              <span className="text-white font-medium font-mono">{topChoke.remediationEffort}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1.5">Critical Paths Broken:</span>
              <span className="text-red-400 font-medium font-mono">
                {topChoke.criticalPathsCoveredCount}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1.5">ROI Efficiency Score:</span>
              <span className="text-emerald-400 font-medium font-mono">{topChoke.roiScore} / 1000</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar & Simulation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">
            Prioritized Choke Points Matrix
          </h3>
          <p className="text-xs text-slate-400">
            Ranked by multi-path disruption efficiency. Fix high-leverage nodes to eliminate multiple exploits simultaneously.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {simulatedNodeIds.length > 0 && (
            <button
              onClick={onResetSimulation}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded-lg transition-colors"
            >
              Reset All Fixes
            </button>
          )}
          <button
            onClick={onApplyAllTopFixes}
            className="px-3.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/40 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Apply Top 2 Choke Points</span>
          </button>
        </div>
      </div>

      {/* Choke Points Table / Card Grid */}
      <div className="space-y-3">
        {chokePoints.map((cp, index) => {
          const isSimulated = simulatedSet.has(cp.nodeId);
          const isTop = index === 0;
          const isExpanded = expandedGuidance === cp.nodeId;

          return (
            <div
              key={cp.nodeId}
              className={`border rounded-xl transition-all ${
                isSimulated
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : isTop
                  ? 'border-amber-500/40 bg-slate-900/80'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Rank, Endpoint, Method */}
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                    isTop ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200">
                        {cp.method}
                      </span>
                      <span className="text-xs font-mono font-bold text-white break-all">
                        {cp.path}
                      </span>
                      {isSimulated && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                          SIMULATED FIX
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>Category: <strong className="text-slate-300">{cp.roiCategory}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Effort: <strong className="text-slate-300 font-mono">{cp.remediationEffort}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Chains Broken: <strong className="text-amber-400 font-mono">{cp.pathsCoveredCount}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right: Risk Reduction Progress & Action Button */}
                <div className="flex items-center gap-4">
                  {/* Progress Meter */}
                  <div className="w-36 text-right hidden sm:block">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400 text-[11px]">Risk Drop</span>
                      <span className="font-mono font-bold text-emerald-400">
                        -{cp.riskReductionPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${cp.riskReductionPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleGuidance(cp.nodeId)}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Guidance</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <button
                      onClick={() => onToggleSimulateNode(cp.nodeId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        isSimulated
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isSimulated ? 'Revert' : 'Simulate'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable Remediation Guidance */}
              {isExpanded && (
                <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 rounded-b-xl space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-300">Recommended Remediation Action:</span>
                    <p className="text-slate-300 mt-1 leading-relaxed">
                      {cp.recommendedAction}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-400">Attack Paths Rendered Inactive:</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {cp.brokenPathIds.map(pid => (
                        <span
                          key={pid}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-cyan-400"
                        >
                          {pid}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
