/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  GitFork,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Eye,
  Filter
} from 'lucide-react';
import { AttackPath, ValidationStatus } from '../types/security';

interface AttackPathsViewProps {
  attackPaths: AttackPath[];
  simulatedNodeIds: string[];
  onSelectNode: (nodeId: string) => void;
  onHighlightPath: (pathId: string) => void;
  onNavigateToGraph: () => void;
  onOpenEvidenceReplay: (pathId: string) => void;
}

export const AttackPathsView: React.FC<AttackPathsViewProps> = ({
  attackPaths,
  simulatedNodeIds,
  onSelectNode,
  onHighlightPath,
  onNavigateToGraph,
  onOpenEvidenceReplay
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALIDATED' | 'SUSPECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedPathId, setExpandedPathId] = useState<string | null>(null);

  const simulatedSet = new Set(simulatedNodeIds);

  const toggleExpand = (id: string) => {
    setExpandedPathId(prev => (prev === id ? null : id));
  };

  // Filter paths
  const filteredPaths = attackPaths.filter(path => {
    if (statusFilter !== 'ALL' && path.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = path.title.toLowerCase().includes(q);
      const matchImpact = path.targetImpact.toLowerCase().includes(q);
      const matchNode = path.hops.some(h => 
        h.path.toLowerCase().includes(q) ||
        (h.vulnerability && (
          h.vulnerability.title.toLowerCase().includes(q) ||
          h.vulnerability.category.toLowerCase().includes(q) ||
          h.vulnerability.owaspId.toLowerCase().includes(q) ||
          h.vulnerability.cwe.toLowerCase().includes(q)
        ))
      );
      if (!matchTitle && !matchImpact && !matchNode) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search attack paths, endpoints, or impacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Validated vs Suspected Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-md transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Chains ({attackPaths.length})
          </button>
          <button
            onClick={() => setStatusFilter('VALIDATED')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              statusFilter === 'VALIDATED'
                ? 'bg-emerald-950/80 text-emerald-300 font-medium border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Validated</span>
          </button>
          <button
            onClick={() => setStatusFilter('SUSPECTED')}
            className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              statusFilter === 'SUSPECTED'
                ? 'bg-amber-950/80 text-amber-300 font-medium border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Suspected</span>
          </button>
        </div>
      </div>

      {/* Path List */}
      <div className="space-y-3">
        {filteredPaths.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-500 text-xs">
            No attack paths match the current filter criteria.
          </div>
        ) : (
          filteredPaths.map((path) => {
            // Check if broken by What-If simulation
            const breakingNode = path.hops.find(h => simulatedSet.has(h.nodeId));
            const isBroken = Boolean(breakingNode);
            const isExpanded = expandedPathId === path.id;

            return (
              <div
                key={path.id}
                className={`border rounded-xl transition-all ${
                  isBroken
                    ? 'border-slate-800/60 bg-slate-950/40 opacity-70'
                    : path.status === 'VALIDATED'
                    ? 'border-red-900/40 bg-slate-900/60 hover:border-red-500/40'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(path.id)}
                  className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">
                        {path.id}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          path.severity === 'CRITICAL'
                            ? 'bg-red-950 text-red-400 border border-red-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {path.severity}
                      </span>

                      {/* Validated vs Suspected Status Badge */}
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          path.status === 'VALIDATED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {path.status === 'VALIDATED' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <HelpCircle className="w-3 h-3 text-amber-400" />
                        )}
                        <span>{path.status}</span>
                      </span>

                      {/* Broken Badge in What-If mode */}
                      {isBroken && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>NEUTRALIZED at {breakingNode?.method} {breakingNode?.path}</span>
                        </span>
                      )}
                    </div>

                    <h4 className={`text-sm font-bold text-white ${isBroken ? 'line-through text-slate-400' : ''}`}>
                      {path.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-1">
                      {path.targetImpact}
                    </p>
                  </div>

                  {/* Right side stats & trigger */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {path.hops.length} Hops
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {path.confidenceScore}% Evidence Conf.
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onHighlightPath(path.id);
                          onNavigateToGraph();
                        }}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                        title="View on Attack Graph"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEvidenceReplay(path.id);
                        }}
                        className="px-2 py-1 text-[10px] font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 rounded-md hover:bg-cyan-900/40 transition-colors"
                      >
                        Replay Evidence
                      </button>

                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Hop Progression */}
                {isExpanded && (
                  <div className="border-t border-slate-800 p-4 bg-slate-950/70 space-y-4 rounded-b-xl">
                    <div className="text-xs font-semibold text-slate-300">
                      Multi-Hop Attack Execution Chain
                    </div>

                    {/* Sequential Hops */}
                    <div className="space-y-3">
                      {path.hops.map((hop, hopIdx) => {
                        const isNodeSimulated = simulatedSet.has(hop.nodeId);

                        return (
                          <div
                            key={hop.nodeId + hopIdx}
                            className={`p-3 rounded-lg border flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs ${
                              isNodeSimulated
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-mono font-bold text-[10px] text-slate-300 shrink-0">
                                {hopIdx + 1}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-200">
                                    {hop.method} {hop.path}
                                  </span>
                                  {isNodeSimulated && (
                                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                      [FIXED / SEVERED]
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {hop.action}
                                </div>
                                <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80 mt-1 font-mono">
                                  <strong className="text-slate-400">State Transition Evidence: </strong>
                                  {hop.evidence}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 md:pl-4">
                              <span className="text-[10px] font-mono text-slate-400 block">
                                Hop Confidence:
                              </span>
                              <span className="font-mono font-bold text-cyan-400">
                                {Math.round(hop.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
