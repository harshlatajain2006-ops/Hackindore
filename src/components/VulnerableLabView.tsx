/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  Terminal,
  FileCode,
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import { BUILTIN_PROBES } from '../data/sandboxTests';
import { ProbeTest } from '../types/security';

interface VulnerableLabViewProps {
  onRefreshGraph?: () => void;
}

export const VulnerableLabView: React.FC<VulnerableLabViewProps> = () => {
  const [selectedProbe, setSelectedProbe] = useState<ProbeTest>(BUILTIN_PROBES[0]);
  const [tamperedBody, setTamperedBody] = useState<string>(
    selectedProbe.sampleBody || selectedProbe.tamperPayload || ''
  );
  const [targetEndpoint, setTargetEndpoint] = useState<string>(selectedProbe.endpoint);

  const [loading, setLoading] = useState<boolean>(false);
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  const [responseResult, setResponseResult] = useState<{
    status: number;
    latencyMs: number;
    headers: Record<string, string>;
    body: any;
    vulnerabilityTriggered?: string;
  } | null>(null);

  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSelectProbe = (probe: ProbeTest) => {
    setSelectedProbe(probe);
    setTargetEndpoint(probe.endpoint);
    setTamperedBody(probe.sampleBody || probe.tamperPayload || '');
    setResponseResult(null);
    setResetMessage(null);
  };

  const handleExecuteProbe = async () => {
    setLoading(true);
    setResetMessage(null);
    const start = performance.now();

    try {
      let options: RequestInit = {
        method: selectedProbe.method,
        headers: {
          'Content-Type': 'application/json',
          ...selectedProbe.sampleHeaders
        }
      };

      if (selectedProbe.method !== 'GET' && tamperedBody.trim()) {
        try {
          options.body = JSON.stringify(JSON.parse(tamperedBody));
        } catch {
          options.body = tamperedBody;
        }
      }

      const res = await fetch(targetEndpoint, options);
      const latencyMs = Math.round(performance.now() - start);

      const respHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        respHeaders[key] = val;
      });

      let respBody: any;
      try {
        respBody = await res.json();
      } catch {
        respBody = await res.text();
      }

      setResponseResult({
        status: res.status,
        latencyMs,
        headers: respHeaders,
        body: respBody,
        vulnerabilityTriggered: respBody?.vulnerabilityTriggered
      });
    } catch (err: any) {
      setResponseResult({
        status: 500,
        latencyMs: Math.round(performance.now() - start),
        headers: { 'error': 'execution-failed' },
        body: { error: err.message || 'Failed to connect to local sandboxed backend.' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSandbox = async () => {
    setResetLoading(true);
    try {
      const res = await fetch('/api/sandbox/reset', { method: 'POST' });
      const data = await res.json();
      setResetMessage('Sandbox restored to clean factory baseline.');
      setResponseResult(null);
      setTimeout(() => setResetMessage(null), 3000);
    } catch {
      setResetMessage('Reset request failed.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Info Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-400">
              <FlaskConical className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              Sandboxed Vulnerable API Testing Lab
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Live local testing environment simulating <strong>Apex Banking Corp</strong>, <strong>MedSecure Health Systems</strong>, and <strong>OmniLogistics E-Commerce</strong>. Replay authentic OWASP API Top 10 exploits, tamper with payloads, and inspect live response diffs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {resetMessage && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{resetMessage}</span>
            </span>
          )}

          <button
            onClick={handleResetSandbox}
            disabled={resetLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetLoading ? 'animate-spin' : ''}`} />
            <span>Reset Lab State</span>
          </button>
        </div>
      </div>

      {/* Target Probe Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {BUILTIN_PROBES.map((probe) => {
          const isSelected = selectedProbe.id === probe.id;

          return (
            <div
              key={probe.id}
              onClick={() => handleSelectProbe(probe)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-500 bg-slate-900 shadow-md ring-1 ring-indigo-500/30'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="font-semibold text-slate-300">{probe.targetApi}</span>
                  <span className="text-indigo-400">{probe.owaspId}</span>
                </div>
                <h4 className="text-xs font-bold text-white leading-snug">
                  {probe.name}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {probe.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">{probe.method} {probe.endpoint}</span>
                <span className={isSelected ? 'text-indigo-400 font-bold' : 'text-slate-600'}>
                  {isSelected ? '● Active' : 'Select →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Request Tamperer & Response Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: HTTP Request Crafting / Tampering (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">HTTP Request Probe</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Sandboxed Route
              </span>
            </div>

            {/* Method + Path URL Bar */}
            <div className="flex items-center gap-2">
              <span className="px-2 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-800 text-slate-200 shrink-0">
                {selectedProbe.method}
              </span>
              <input
                type="text"
                value={targetEndpoint}
                onChange={(e) => setTargetEndpoint(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Request Headers Preview */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Request Headers</span>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                {Object.entries(selectedProbe.sampleHeaders).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}:</span>
                    <span className="text-slate-300 truncate max-w-[240px]">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Request Body Tampering Editor */}
            {selectedProbe.method !== 'GET' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Tamper Request Payload (JSON)
                  </span>
                  <button
                    onClick={() => setTamperedBody(selectedProbe.tamperPayload || selectedProbe.sampleBody || '')}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    Reset Payload
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={tamperedBody}
                  onChange={(e) => setTamperedBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={handleExecuteProbe}
              disabled={loading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Send className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
              <span>{loading ? 'Dispatching Probe...' : 'Execute Live HTTP Probe'}</span>
            </button>
          </div>
        </div>

        {/* Right: HTTP Response Inspector (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Live HTTP Response Inspector</span>
              </div>
              {responseResult && (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      responseResult.status === 200
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-950 text-red-300 border border-red-500/30'
                    }`}
                  >
                    HTTP {responseResult.status}
                  </span>
                  <span className="text-slate-500">{responseResult.latencyMs}ms</span>
                </div>
              )}
            </div>

            {responseResult ? (
              <div className="space-y-3 text-xs">
                {/* Vulnerability Banner if triggered */}
                {responseResult.vulnerabilityTriggered && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 space-y-1">
                    <div className="flex items-center gap-1.5 text-red-300 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>Observable Exploit Verification</span>
                    </div>
                    <p className="text-[11px] text-red-200/90 leading-relaxed font-mono">
                      {responseResult.vulnerabilityTriggered}
                    </p>
                  </div>
                )}

                {/* Formatted Response Body */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400">Response Body</span>
                  <pre className="bg-slate-950 text-slate-200 p-3 rounded-lg border border-slate-800 font-mono text-[11px] overflow-x-auto max-h-72 leading-relaxed">
                    {typeof responseResult.body === 'object'
                      ? JSON.stringify(responseResult.body, null, 2)
                      : responseResult.body}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                <FlaskConical className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Click &quot;Execute Live HTTP Probe&quot; to dispatch requests to the local testing lab.</p>
              </div>
            )}
          </div>

          {responseResult && (
            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Observable Evidence Confirmed</span>
              <span className="font-mono text-emerald-400">Status 200 OK</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
