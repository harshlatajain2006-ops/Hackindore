/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, Shield } from 'lucide-react';
import { AttackPath, ChokePoint, Finding } from '../types/security';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  specName: string;
  specVersion: string;
  findings: Finding[];
  attackPaths: AttackPath[];
  chokePoints: ChokePoint[];
  simulatedNodeIds: string[];
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  specName,
  specVersion,
  findings,
  attackPaths,
  chokePoints,
  simulatedNodeIds
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const topChoke = chokePoints[0];
  const criticalFindings = findings.filter(f => f.severity === 'CRITICAL').length;
  const highFindings = findings.filter(f => f.severity === 'HIGH').length;

  const reportData = {
    reportTitle: `API Attack Path & Choke Point Discovery Report - ${specName}`,
    generatedAt: new Date().toISOString(),
    targetSpecification: {
      name: specName,
      version: specVersion
    },
    executiveSummary: {
      totalEndpointsAudited: chokePoints.length,
      totalVulnerabilitiesDetected: findings.length,
      criticalFindings,
      highFindings,
      totalAttackChains: attackPaths.length,
      topRecommendedChokePoint: topChoke
        ? {
            endpoint: `${topChoke.method} ${topChoke.path}`,
            riskReductionPercent: `${topChoke.riskReductionPercent}%`,
            pathsDismantled: topChoke.pathsCoveredCount,
            criticalPathsBroken: topChoke.criticalPathsCoveredCount,
            remediationAction: topChoke.recommendedAction
          }
        : null
    },
    rankedChokePoints: chokePoints.map(cp => ({
      endpoint: `${cp.method} ${cp.path}`,
      riskReduction: `${cp.riskReductionPercent}%`,
      criticalReduction: `${cp.criticalReductionPercent}%`,
      roiScore: cp.roiScore,
      category: cp.roiCategory,
      remediationEffort: cp.remediationEffort,
      action: cp.recommendedAction
    })),
    attackChains: attackPaths.map(p => ({
      id: p.id,
      title: p.title,
      severity: p.severity,
      validationStatus: p.status,
      confidence: `${p.confidenceScore}%`,
      hops: p.hops.map(h => `${h.method} ${h.path} (${h.evidence})`)
    })),
    findingsCatalog: findings.map(f => ({
      id: f.id,
      title: f.title,
      severity: f.severity,
      owasp: f.owaspId,
      endpoint: `${f.method} ${f.endpoint}`,
      evidence: f.evidence,
      remediation: f.remediationGuidance
    }))
  };

  const jsonString = JSON.stringify(reportData, null, 2);

  const downloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-attack-chokepoint-report-${specName.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyReport = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Export Security Remediation Report
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Executive Overview preview */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="font-semibold text-white block">Executive Summary Preview</span>
            <div className="text-slate-300 leading-relaxed space-y-1">
              <p>
                <strong>Target:</strong> {specName} ({specVersion})
              </p>
              <p>
                <strong>Identified Vulnerabilities:</strong> {findings.length} ({criticalFindings} Critical, {highFindings} High)
              </p>
              <p>
                <strong>Discovered Attack Paths:</strong> {attackPaths.length} multi-hop exploit sequences
              </p>
              {topChoke && (
                <p className="text-amber-300 pt-1">
                  <strong>Primary Strategic Recommendation:</strong> Patch{' '}
                  <code className="bg-slate-900 px-1.5 py-0.5 rounded font-mono text-white">
                    {topChoke.method} {topChoke.path}
                  </code>{' '}
                  to eliminate <strong>{topChoke.riskReductionPercent}%</strong> of all validated attack chains with minimal engineering overhead.
                </p>
              )}
            </div>
          </div>

          {/* JSON raw output */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-400">Structured JSON Artifact</span>
              <button
                onClick={copyReport}
                className="text-slate-400 hover:text-white flex items-center gap-1 font-mono text-[11px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 text-slate-300 p-4 rounded-xl border border-slate-800 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
              {jsonString}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Close
            </button>
            <button
              onClick={downloadJson}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
