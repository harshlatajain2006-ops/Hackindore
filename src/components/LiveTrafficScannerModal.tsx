/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Zap,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Shield,
  FileCode,
  Upload,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  Search,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { ApiEndpoint, Finding, TrafficLogEntry, TrafficScanResult } from '../types/security';
import { scanTrafficLogs } from '../engine/trafficScannerEngine';
import { SAMPLE_TRAFFIC_LOGS, SampleTrafficLogSet } from '../data/sampleTrafficLogs';

interface LiveTrafficScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingEndpoints: ApiEndpoint[];
  onApplyFindings: (newFindings: Finding[], discoveredEndpoints: ApiEndpoint[]) => void;
  onNavigateToGraph: () => void;
}

export const LiveTrafficScannerModal: React.FC<LiveTrafficScannerModalProps> = ({
  isOpen,
  onClose,
  existingEndpoints,
  onApplyFindings,
  onNavigateToGraph
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('crapi-attack-traffic');
  const [rawJsonText, setRawJsonText] = useState<string>(() => {
    return JSON.stringify(SAMPLE_TRAFFIC_LOGS[0].entries, null, 2);
  });
  const [parseError, setParseError] = useState<string | null>(null);

  // Streaming / Simulation State
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamIndex, setStreamIndex] = useState<number>(0);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scan Results
  const [scanResult, setScanResult] = useState<TrafficScanResult | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ANOMALIES_ONLY'>('ALL');
  const [appliedCount, setAppliedCount] = useState<number>(0);

  // Load preset logs
  const handleLoadPreset = (preset: SampleTrafficLogSet) => {
    setSelectedPresetId(preset.id);
    setRawJsonText(JSON.stringify(preset.entries, null, 2));
    setParseError(null);
    setScanResult(null);
    setIsStreaming(false);
    setStreamIndex(0);
  };

  // Run instant batch scan
  const handleRunBatchScan = () => {
    try {
      const parsedLogs: TrafficLogEntry[] = JSON.parse(rawJsonText);
      if (!Array.isArray(parsedLogs)) {
        setParseError('JSON log input must be an array of API request log objects [ { method, path, ... } ].');
        return;
      }
      setParseError(null);
      const result = scanTrafficLogs(parsedLogs, existingEndpoints);
      setScanResult(result);

      // Automatically add new findings to graph
      if (result.findings.length > 0 || result.discoveredEndpoints.length > 0) {
        onApplyFindings(result.findings, result.discoveredEndpoints);
        setAppliedCount(result.findings.length);
      }
    } catch (e: any) {
      setParseError(e.message || 'Invalid JSON syntax. Please verify JSON formatting.');
    }
  };

  // Real-time stream simulation
  const toggleStreaming = () => {
    if (isStreaming) {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      setIsStreaming(false);
    } else {
      try {
        const parsedLogs: TrafficLogEntry[] = JSON.parse(rawJsonText);
        if (!Array.isArray(parsedLogs) || parsedLogs.length === 0) {
          setParseError('Please provide a valid JSON array of logs to start streaming.');
          return;
        }
        setParseError(null);
        setIsStreaming(true);
        setStreamIndex(0);
        setScanResult(null);
      } catch (e: any) {
        setParseError(e.message);
      }
    }
  };

  // Stream ticker effect
  useEffect(() => {
    if (!isStreaming) return;

    let parsedLogs: TrafficLogEntry[] = [];
    try {
      parsedLogs = JSON.parse(rawJsonText);
    } catch {
      setIsStreaming(false);
      return;
    }

    streamTimerRef.current = setInterval(() => {
      setStreamIndex((prevIdx) => {
        const nextIdx = prevIdx + 1;
        const currentSlice = parsedLogs.slice(0, nextIdx);
        const result = scanTrafficLogs(currentSlice, existingEndpoints);
        setScanResult(result);

        if (result.findings.length > 0 || result.discoveredEndpoints.length > 0) {
          onApplyFindings(result.findings, result.discoveredEndpoints);
          setAppliedCount(result.findings.length);
        }

        if (nextIdx >= parsedLogs.length) {
          if (streamTimerRef.current) clearInterval(streamTimerRef.current);
          setIsStreaming(false);
          return parsedLogs.length;
        }
        return nextIdx;
      });
    }, 600);

    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, [isStreaming, rawJsonText, existingEndpoints, onApplyFindings]);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawJsonText(content);
      setParseError(null);
      setSelectedPresetId('custom');
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
              <Radio className="w-5 h-5 animate-pulse text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Live Traffic Security Scanner
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-semibold uppercase">
                  Real-Time Heuristics
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ingest API gateway request/response JSON logs to run real-time security heuristics and automatically populate the State-Graph.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:px-6 overflow-y-auto space-y-4 flex-1">
          {/* Preset Selector Strip */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Preloaded Attack Traces &amp; Traffic Logs:</span>
              </span>
              <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1 font-medium">
                <Upload className="w-3 h-3" />
                <span>Upload .json log file</span>
                <input
                  type="file"
                  accept=".json,.log"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_TRAFFIC_LOGS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/60 shadow-sm shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center justify-between">
                        <span>{preset.name}</span>
                        <span className="text-[10px] font-mono text-cyan-400">
                          {preset.entries.length} reqs
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                        {preset.description}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-2">
                      Target: {preset.targetApi}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* JSON Log Input Editor & Action Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>API Traffic Log (JSON Array)</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Format: [ &#123; method, path, headers, requestBody, responseStatus, responseBody &#125; ]
              </span>
            </div>

            <div className="relative">
              <textarea
                value={rawJsonText}
                onChange={(e) => {
                  setRawJsonText(e.target.value);
                  setParseError(null);
                }}
                rows={7}
                placeholder="Paste API traffic JSON logs here..."
                className="w-full bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all resize-y selection:bg-cyan-500/20"
              />
            </div>

            {parseError && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Scan Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunBatchScan}
                  disabled={isStreaming}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-sm shadow-cyan-600/20"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Run Heuristic Scan Now</span>
                </button>

                <button
                  onClick={toggleStreaming}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 border ${
                    isStreaming
                      ? 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  {isStreaming ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Streaming Logs ({streamIndex} ingesting...)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Simulate Real-Time Stream</span>
                    </>
                  )}
                </button>
              </div>

              {appliedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>+{appliedCount} Findings Injected into State Graph</span>
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToGraph();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <span>View Attack Graph</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Summary & Live Stream Output */}
          {scanResult && (
            <div className="space-y-4 pt-3 border-t border-slate-800">
              {/* Telemetry Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 font-medium">Requests Scanned</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {scanResult.totalScanned}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">HTTP Log Events</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 font-medium">Anomalies Detected</div>
                  <div className="text-xl font-bold font-mono text-red-400 mt-1">
                    {scanResult.anomaliesDetected}
                  </div>
                  <div className="text-[10px] text-red-500/80 mt-0.5">OWASP Violations</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 font-medium">Graph Nodes Enriched</div>
                  <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                    {new Set(scanResult.findings.map(f => f.endpoint)).size}
                  </div>
                  <div className="text-[10px] text-cyan-500/80 mt-0.5">API State Transitions</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400 font-medium">Shadow Endpoints</div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                    {scanResult.discoveredEndpoints.length}
                  </div>
                  <div className="text-[10px] text-amber-500/80 mt-0.5">Discovered via Traffic</div>
                </div>
              </div>

              {/* Heuristics Breakdown Chips */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Security Heuristic Rule Matches</span>
                  <span className="text-[10px] font-mono text-slate-500">Live Analyzer v2.6</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Object.entries(scanResult.heuristicSummary).map(([rule, count]) => {
                    if (count === 0) return null;
                    return (
                      <span
                        key={rule}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-red-950/60 text-red-300 border border-red-500/30 flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>{rule}</span>
                        <span className="px-1.5 py-0.2 bg-red-900/60 text-red-200 rounded font-bold">
                          {count}
                        </span>
                      </span>
                    );
                  })}
                  {scanResult.anomaliesDetected === 0 && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>All requests nominal. No heuristic violations detected.</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Discovered Findings List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Real-Time Findings Stream ({scanResult.findings.length})</span>
                  </span>
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      onClick={() => setFilterMode('ALL')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        filterMode === 'ALL'
                          ? 'bg-slate-800 text-white font-medium'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All Findings
                    </button>
                    <button
                      onClick={() => setFilterMode('ANOMALIES_ONLY')}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        filterMode === 'ANOMALIES_ONLY'
                          ? 'bg-red-950 text-red-300 font-medium'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Critical Only
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {scanResult.findings
                    .filter(f => filterMode === 'ALL' || f.severity === 'CRITICAL')
                    .map((f) => {
                      const isExpanded = expandedLogId === f.id;
                      return (
                        <div
                          key={f.id}
                          className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-2 hover:border-slate-700 transition-colors"
                        >
                          <div
                            onClick={() => setExpandedLogId(isExpanded ? null : f.id)}
                            className="flex items-start justify-between gap-3 cursor-pointer"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    f.severity === 'CRITICAL'
                                      ? 'bg-red-950 text-red-400 border border-red-500/30'
                                      : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                  }`}
                                >
                                  {f.severity}
                                </span>
                                <span className="font-mono font-bold text-slate-300">
                                  {f.method} {f.endpoint}
                                </span>
                                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-500/20">
                                  {f.owaspId}
                                </span>
                              </div>
                              <div className="font-semibold text-slate-200">{f.title}</div>
                            </div>
                            <button className="text-slate-500 hover:text-white pt-1">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                            {f.evidence}
                          </p>

                          {/* Expanded Evidence & Payload Inspector */}
                          {isExpanded && (
                            <div className="pt-2 border-t border-slate-800/80 space-y-2 text-[11px] font-mono">
                              <div className="text-slate-400">
                                <span className="text-slate-500">CWE:</span> {f.cwe} ·{' '}
                                <span className="text-slate-500">Effort:</span> {f.remediationEffort}
                              </div>

                              {f.rawRequest && (
                                <div className="bg-slate-900 p-2 rounded-lg space-y-1">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                                    Captured Request:
                                  </div>
                                  <div className="text-slate-300">
                                    {f.rawRequest.method} {f.rawRequest.path}
                                  </div>
                                  {f.rawRequest.body && (
                                    <pre className="text-[10px] text-slate-400 overflow-x-auto p-1 bg-slate-950 rounded">
                                      {f.rawRequest.body}
                                    </pre>
                                  )}
                                </div>
                              )}

                              {f.rawResponse && (
                                <div className="bg-slate-900 p-2 rounded-lg space-y-1">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                                    Server Response (HTTP {f.rawResponse.status}):
                                  </div>
                                  <pre className="text-[10px] text-cyan-300 overflow-x-auto p-1 bg-slate-950 rounded max-h-32">
                                    {f.rawResponse.body}
                                  </pre>
                                </div>
                              )}

                              <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-[11px]">
                                <span className="font-semibold text-emerald-400">Remediation Guidance:</span>{' '}
                                {f.remediationGuidance}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Live Security Heuristic Scanner Active · Auto-Syncing with Attack Graph</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigateToGraph();
              }}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors flex items-center gap-1.5"
            >
              <span>View in Attack Graph</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
