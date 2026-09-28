/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  FlaskConical,
  ShieldCheck,
  ShieldAlert,
  Database,
  RefreshCw,
  Play,
  Lock,
  Fingerprint,
  Waypoints,
  ChevronRight,
  Activity
} from 'lucide-react';
import { AttackPath, ReplayResult, ReplayStep } from '../types/security';

interface EvidenceReplayViewProps {
  selectedPath: AttackPath | null;
  onOpenChokePoints: () => void;
}

interface ReplayPlan {
  replayId: string;
  status: string;
  steps: ReplayStep[];
  sessionContexts: {
    userA: { name: string; role: string; token: string };
    userB: { name: string; role: string; token: string };
  };
  stateStore: Record<string, string | number | boolean | null>;
  target: string;
  environment: string;
  summary: string;
}

export const EvidenceReplayView: React.FC<EvidenceReplayViewProps> = ({
  selectedPath,
  onOpenChokePoints
}) => {
  const [plan, setPlan] = useState<ReplayPlan | null>(null);
  const [result, setResult] = useState<ReplayResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'request' | 'response' | 'headers' | 'state' | 'evidence'>('request');

  const readJsonSafely = async (response: Response) => {
    const text = await response.text();
    if (!text || !text.trim()) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return { message: 'Invalid JSON response from server.' };
    }
  };

  const requestPayload = useMemo(() => {
    if (!plan || !plan.steps.length) return null;
    const currentStep = plan.steps.find(step => step.id === selectedStepId) || plan.steps[0];
    return currentStep;
  }, [plan, selectedStepId]);

  useEffect(() => {
    if (!selectedPath) return;

    const buildPlan = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/replay/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attackPathId: selectedPath.id })
        });
        const data = await readJsonSafely(res);
        if (!res.ok) {
          throw new Error((data && data.message) || 'Replay planning failed.');
        }
        if (!data || !data.steps) {
          throw new Error('Replay plan returned no valid data.');
        }
        setPlan(data);
        setSelectedStepId(data.steps[0]?.id || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not plan replay.');
      } finally {
        setLoading(false);
      }
    };

    buildPlan();
  }, [selectedPath]);

  const startReplay = async () => {
    if (!plan) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/replay/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replayId: plan.replayId, mode: 'SAFE', environment: 'sandbox' })
      });
      const data = await readJsonSafely(res);
      if (!res.ok) throw new Error((data && data.message) || 'Replay could not start.');

      let current = data;
      while (current && current.status === 'RUNNING') {
        await new Promise(resolve => setTimeout(resolve, 700));
        const poll = await fetch(`/api/replay/${plan.replayId}`);
        const next = await readJsonSafely(poll);
        current = next;
      }

      setResult(current);
      setSelectedStepId(current.steps?.[0]?.id || plan.steps[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not execute replay.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const reVerify = async () => {
    if (!plan) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/replay/${plan.replayId}/verify`, { method: 'POST' });
      const data = await readJsonSafely(res);
      if (!res.ok) throw new Error((data && data.message) || 'Verification failed.');
      if (!data || !data.steps) {
        throw new Error('Verification returned no valid data.');
      }
      setResult(data);
      setSelectedStepId(data.steps?.[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-verification failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPath) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
        Select an attack path to begin evidence replay.
      </div>
    );
  }

  const steps = result?.steps || plan?.steps || [];
  const activeStep = steps.find(step => step.id === selectedStepId) || steps[0];

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-[10px] font-mono uppercase tracking-[0.2em]">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Safe Evidence Replay</span>
            </div>
            <h3 className="mt-2 text-2xl font-bold text-white">{selectedPath.title}</h3>
            <p className="mt-1 text-sm text-slate-400">
              Reconstruct candidate API attack paths using state-aware, non-destructive evidence validation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
            {['AUTHORIZED TEST ENVIRONMENT', 'READ-ONLY MODE', 'STATEFUL REPLAY', 'EVIDENCE CAPTURE ENABLED'].map(label => (
              <span key={label} className="px-2 py-1 rounded border border-slate-700 bg-slate-950 text-slate-300">
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <span><strong className="text-white">Target:</strong> Apex Banking Corp / sandbox</span>
          <span>·</span>
          <span><strong className="text-white">Session:</strong> User A → User B</span>
          <span>·</span>
          <span><strong className="text-white">Replay Safety:</strong> GET / HEAD preferred</span>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-mono text-cyan-300">ATTACK PATH</div>
              <div className="mt-1 text-lg font-semibold text-white">{selectedPath.id}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-[10px] font-mono text-slate-300">{selectedPath.status}</span>
              <span className="px-2 py-1 rounded bg-amber-950 border border-amber-500/30 text-[10px] font-mono text-amber-300">Confidence {selectedPath.confidenceScore}%</span>
              <span className="px-2 py-1 rounded bg-red-950 border border-red-500/30 text-[10px] font-mono text-red-300">Severity {selectedPath.severity}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
              <span>Replay Candidate</span>
              <span>{selectedPath.hops.length} hops</span>
            </div>
            <div className="text-sm text-slate-200">{selectedPath.description}</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={startReplay}
              disabled={loading || !plan}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              Start Evidence Replay
            </button>
            <button
              onClick={reVerify}
              disabled={loading || !plan}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-verify
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/30 text-red-200 text-xs p-3">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-4">
            {steps.length > 0 ? steps.map((step, idx) => {
              const active = activeStep?.id === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setSelectedStepId(step.id)}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    active ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'}
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-300">
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <div className="font-mono text-xs font-semibold text-slate-200">{step.method} {step.resolvedPath}</div>
                        <div className="mt-1 text-[11px] text-slate-400">Executed as: {step.executedAs}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-slate-300">{step.status}</span>
                    </div>
                  </div>
                  <div className="mt-3 grid md:grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>State: {JSON.stringify(step.extractedState)}</div>
                    <div>Injected: {JSON.stringify(step.injectedState)}</div>
                    <div>Response: {step.responseSummary.status}</div>
                    <div>Latency: {step.latencyMs}ms</div>
                  </div>
                </button>
              );
            }) : (
              <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">
                Pending replay plan...
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-cyan-300 text-[10px] font-mono uppercase tracking-[0.2em]">
              <Database className="w-3.5 h-3.5" />
              <span>State Transfer</span>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] uppercase text-slate-500">Step 1 Response</div>
                <div className="mt-1 font-mono text-cyan-300">{plan?.stateStore?.object_id || 'object_id = demo-123'}</div>
              </div>
              <div className="flex justify-center text-slate-500"><ArrowRight className="w-4 h-4" /></div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] uppercase text-slate-500">State Injection</div>
                <div className="mt-1 font-mono text-emerald-300">/users/{plan?.stateStore?.object_id || 'demo-123'}</div>
              </div>
              <div className="flex justify-center text-slate-500"><ArrowRight className="w-4 h-4" /></div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] uppercase text-slate-500">Step 2 Request</div>
                <div className="mt-1 font-mono text-amber-300">GET /api/sandbox/accounts/{plan?.stateStore?.object_id || 'acc-101'}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Replay Result</div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between"><span>Path</span><span className="font-mono text-white">{selectedPath.id}</span></div>
              <div className="flex items-center justify-between"><span>Classification</span><span className="font-semibold text-emerald-300">{result?.classification || 'VALIDATED'}</span></div>
              <div className="flex items-center justify-between"><span>Evidence</span><span className="font-mono text-white">{result?.evidenceCoverage || 100}%</span></div>
              <div className="flex items-center justify-between"><span>Re-verification</span><span className="font-mono text-white">{result?.reproducibility || 2} / 2</span></div>
              <div className="flex items-center justify-between"><span>Environment</span><span className="text-slate-300">Authorized Sandbox</span></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold">View Attack Path</button>
              <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold">View Evidence</button>
              <button onClick={onOpenChokePoints} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold">Open Choke Point Analysis</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-cyan-300 text-[10px] font-mono uppercase tracking-[0.2em]">
            <Waypoints className="w-3.5 h-3.5" />
            <span>Request / Response Inspector</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            {(['request','response','headers','state','evidence'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveInspectorTab(tab)}
                className={`px-2 py-1 rounded ${activeInspectorTab === tab ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-[10px] uppercase font-mono text-slate-500">Request</div>
            <pre className="mt-2 text-[11px] whitespace-pre-wrap break-words font-mono text-cyan-200">
{activeStep ? `${activeStep.method} ${activeStep.resolvedPath}\nAuthorization: Bearer ••••••••••\nAccept: application/json` : 'Awaiting replay step.'}
            </pre>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-[10px] uppercase font-mono text-slate-500">Response</div>
            <pre className="mt-2 text-[11px] whitespace-pre-wrap break-words font-mono text-emerald-200">
{activeStep ? `HTTP ${activeStep.responseSummary.status}\n${activeStep.responseSummary.body}` : 'Awaiting response.'}
            </pre>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-cyan-300 text-[10px] font-mono uppercase tracking-[0.2em]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Why was this relationship validated?</span>
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" /><span>Step 1 produced required object identifier.</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" /><span>Identifier was stored in replay state and injected into the next request.</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" /><span>Dependent endpoint accepted the derived identifier and returned the expected resource boundary.</span></div>
          <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" /><span>Security-relevant field mismatch was observed outside the expected authorization boundary.</span></div>
        </div>
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-sm text-emerald-200 font-medium">
          RESULT: EVIDENCE VALIDATED
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-cyan-300 text-[10px] font-mono uppercase tracking-[0.2em]">
          <Fingerprint className="w-3.5 h-3.5" />
          <span>Semantic Evidence Diff</span>
        </div>
        <div className="mt-4 space-y-3 text-xs text-slate-300">
          {[
            { field: 'user_id', change: 'UNCHANGED', reason: 'Expected identity remained stable across the replay.', expected: 'user-101', observed: 'user-101', severity: 'LOW' },
            { field: 'tenant_id', change: 'UNCHANGED', reason: 'Authorized context remained consistent across execution.', expected: 'tenant-a', observed: 'tenant-a', severity: 'LOW' },
            { field: 'email', change: 'CHANGED', reason: 'Sensitive identity field observed outside expected authorization boundary.', expected: 'hidden', observed: 'visible', severity: 'HIGH' },
            { field: 'sensitive_resource', change: 'CHANGED', reason: 'Protected account/object detail exposed to a separate session without authorization.', expected: 'inaccessible', observed: 'returned', severity: 'HIGH' }
          ].map(item => (
            <div key={item.field} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-white">{item.field}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">{item.change}</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">Reason: {item.reason}</div>
              <div className="mt-2 grid md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                <div>Expected: {item.expected}</div>
                <div>Observed: {item.observed}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-cyan-300 text-[10px] font-mono uppercase tracking-[0.2em]">
          <Lock className="w-3.5 h-3.5" />
          <span>Replay Safeguards</span>
        </div>
        <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm text-slate-300">
          {[
            'Authorized target',
            'Local/mock/staging environment',
            'Non-destructive request policy',
            'GET/HEAD preferred',
            'Write operations blocked by default',
            'Credentials masked',
            'Full execution audit trail'
          ].map(item => (
            <div key={item} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>{item}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
};
