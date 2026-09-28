/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sparkles, Zap, Award, CheckCircle2, Copy, Check } from 'lucide-react';

interface PitchExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PitchExplainerModal: React.FC<PitchExplainerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = React.useState<boolean>(false);

  if (!isOpen) return null;

  const pitchText = `Challenge 1: API Attack Path & Choke Point Discovery

Problem with Traditional Scanners:
Traditional DAST/SAST scanners (Burp, ZAP, StackHawk) output a flat list of 100+ isolated findings without context. Security teams drown in triage because they treat all vulnerabilities equally.

Our Breakthrough: State-Graph & Choke Point Validator
1. State Graph Representation: We model API endpoints as nodes and stateful transitions (token propagation, ID exfiltration, session hopping) as directed edges.
2. Attack Chain Traversal: Using DFS traversal, we trace end-to-end multi-hop exploit paths from unauthenticated entry points to high-value exploit targets (financial drain, PII exfiltration).
3. Evidence-Based Validation: We classify paths into VALIDATED (hard parameter binding confirmed) vs SUSPECTED (heuristic progression) with confidence scores per hop.
4. Choke Point Algorithm:
   - For every node N, we compute its Path Coverage (number of critical attack chains crossing it).
   - Weighted Risk Reduction Formula:
     Risk Reduction % = (Sum of weights of paths passing through N) / (Sum of weights of all attack paths) * 100
   - Critical Risk Reduction % = (Critical paths containing N) / (Total critical paths) * 100
5. What-If Remediation Sandbox: Analysts can test patches interactively. One click proves how a single fix (e.g. rate-limiting password reset) instantly breaks 80% of multi-step attack chains!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pitchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Hackathon Presentation &amp; Algorithm Guide
              </h2>
              <p className="text-xs text-slate-400">
                How we solved PS3 Challenge 1 · Ready-to-Pitch Explanation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-xs text-slate-300">
          {/* Section 1: The Core Pitch / Why Unique */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              1. Why This Dominates Traditional Scanners (The Pitch Hook)
            </span>
            <p className="text-slate-300 leading-relaxed">
              &quot;Traditional scanners merely output flat tables with dozens of disjointed findings. Security engineers have no idea which bug actually matters in combination. Our system connects vulnerabilities into <strong>validated stateful attack chains</strong> and identifies the <strong>Choke Points</strong>: one strategic fix that dismantles multiple attack paths at once.&quot;
            </p>
          </div>

          {/* Section 2: Algorithm & Math Formula */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
              2. The Choke Point Algorithm &amp; Risk Reduction Formula
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <span className="font-semibold text-white block">A. Graph Path Coverage</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Each attack path is modeled as a directed node sequence <code className="text-cyan-300 font-mono">[N1, N2, ..., Nk]</code>. For each node, we compute its frequency across all paths, weighted by severity (Critical = 3x, High = 2x, Medium = 1x).
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <span className="font-semibold text-white block">B. Mathematical Formula</span>
                <div className="font-mono text-emerald-400 bg-slate-900/90 p-2 rounded border border-slate-800 text-[11px]">
                  Risk Reduction % = (Broken Paths Weight / Total Paths Weight) × 100
                </div>
                <div className="font-mono text-cyan-400 bg-slate-900/90 p-2 rounded border border-slate-800 text-[11px]">
                  Critical Reduction % = (Critical Paths Broken / Total Critical Paths) × 100
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: 5 Key Differentiation Pillars */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
              3. The 5 Differentiation Pillars
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Choke Point ROI</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Ranks fixes by Impact vs Effort quadrant. Quick wins give immediate 50%+ reduction.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-cyan-400" />
                  <span>What-If Sandbox</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Interactive simulation showing attack paths disappear in real time as nodes are patched.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Evidence Validation</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Separates VALIDATED exploits from SUSPECTED paths with confidence scores per hop.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: 1-Click Copy Pitch Script */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Full Pitch Script &amp; Hackathon Summary</span>
              <button
                onClick={handleCopy}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Pitch Script'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-400 bg-slate-900/80 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 border border-slate-800/80">
              {pitchText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
