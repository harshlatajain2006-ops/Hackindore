/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Code2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Finding, Severity } from '../types/security';

interface FindingsTableProps {
  findings: Finding[];
}

export const FindingsTable: React.FC<FindingsTableProps> = ({ findings }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | Severity>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const copySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = findings.filter(f => {
    if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchEndpoint = f.endpoint.toLowerCase().includes(q);
      const matchCat = f.category.toLowerCase().includes(q);
      if (!matchTitle && !matchEndpoint && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search findings, endpoints, OWASP codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-3 py-1 rounded-md transition-colors ${
              severityFilter === 'ALL'
                ? 'bg-slate-800 text-white font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({findings.length})
          </button>
          <button
            onClick={() => setSeverityFilter('CRITICAL')}
            className={`px-3 py-1 rounded-md transition-colors ${
              severityFilter === 'CRITICAL'
                ? 'bg-red-950 text-red-300 font-medium border border-red-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Critical ({findings.filter(f => f.severity === 'CRITICAL').length})
          </button>
          <button
            onClick={() => setSeverityFilter('HIGH')}
            className={`px-3 py-1 rounded-md transition-colors ${
              severityFilter === 'HIGH'
                ? 'bg-amber-950 text-amber-300 font-medium border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            High ({findings.filter(f => f.severity === 'HIGH').length})
          </button>
          <button
            onClick={() => setSeverityFilter('MEDIUM')}
            className={`px-3 py-1 rounded-md transition-colors ${
              severityFilter === 'MEDIUM'
                ? 'bg-yellow-950 text-yellow-300 font-medium border border-yellow-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Medium ({findings.filter(f => f.severity === 'MEDIUM').length})
          </button>
        </div>
      </div>

      {/* Findings Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold">
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">OWASP Code</th>
                <th className="py-2.5 px-4">Endpoint</th>
                <th className="py-2.5 px-4">Vulnerability Title</th>
                <th className="py-2.5 px-4">Remediation Effort</th>
                <th className="py-2.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No findings match the current criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => {
                  const isExpanded = expandedId === f.id;

                  return (
                    <React.Fragment key={f.id}>
                      <tr
                        onClick={() => toggleExpand(f.id)}
                        className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <span
                            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                              f.severity === 'CRITICAL'
                                ? 'bg-red-950 text-red-400 border border-red-500/30'
                                : f.severity === 'HIGH'
                                ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                : 'bg-yellow-950 text-yellow-400 border border-yellow-500/30'
                            }`}
                          >
                            {f.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-cyan-400 font-medium whitespace-nowrap">
                          {f.owaspId}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">
                          <span className="font-bold text-slate-400 mr-1.5">{f.method}</span>
                          <span>{f.endpoint}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">
                          {f.title}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {f.remediationEffort}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-slate-400 hover:text-white p-1">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Evidence & Remediation Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={6} className="p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Evidence */}
                              <div className="space-y-1.5">
                                <span className="text-slate-400 font-semibold block text-[11px]">
                                  Security Evidence &amp; Detection Signature:
                                </span>
                                <p className="text-slate-300 text-xs bg-slate-900/60 p-2.5 rounded border border-slate-800 leading-relaxed font-mono">
                                  {f.evidence}
                                </p>
                                <div className="text-[10px] text-slate-500">
                                  <span>Reference: {f.cwe} · Category: {f.category}</span>
                                </div>
                              </div>

                              {/* Remediation & Code */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-emerald-400 font-semibold text-[11px]">
                                    Remediation Implementation:
                                  </span>
                                  {f.codeSnippet && (
                                    <button
                                      onClick={() => copySnippet(f.id, f.codeSnippet!)}
                                      className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1 font-mono"
                                    >
                                      {copiedId === f.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                      <span>{copiedId === f.id ? 'Copied' : 'Copy Code'}</span>
                                    </button>
                                  )}
                                </div>
                                <p className="text-slate-300 text-xs leading-relaxed">
                                  {f.remediationGuidance}
                                </p>
                                {f.codeSnippet && (
                                  <pre className="bg-slate-900/90 text-emerald-300 text-[11px] p-2.5 rounded border border-slate-800 font-mono overflow-x-auto">
                                    <code>{f.codeSnippet}</code>
                                  </pre>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
