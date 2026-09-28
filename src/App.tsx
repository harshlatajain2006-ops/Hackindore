/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { SAMPLE_SPECS } from './data/sampleSpecs';
import {
  ApiEndpoint,
  Finding,
  AttackPath,
  ChokePoint,
  RoiItem,
  UserPersona,
  RemediationTask
} from './types/security';
import { parseOpenApiSpec, runSecurityAudit } from './engine/openApiParser';
import { buildStateGraph } from './engine/graphEngine';
import { analyzeChokePoints, simulateRemediation } from './engine/chokePointAnalyzer';
import { calculateRoiRankings } from './engine/roiEngine';
import { DEFAULT_USERS } from './data/teamMembers';
import { Header } from './components/Header';
import { MetricOverview } from './components/MetricOverview';
import { GraphVisualization } from './components/GraphVisualization';
import { ChokePointPanel } from './components/ChokePointPanel';
import { RoiRankingView } from './components/RoiRankingView';
import { TeamActivityView } from './components/TeamActivityView';
import { AttackPathsView } from './components/AttackPathsView';
import { FindingsTable } from './components/FindingsTable';
import { SpecUploadModal } from './components/SpecUploadModal';
import { ReportExportModal } from './components/ReportExportModal';
import { PitchExplainerModal } from './components/PitchExplainerModal';
import { LoginModal } from './components/LoginModal';
import { TaskAssignModal } from './components/TaskAssignModal';
import { LoginPortal } from './components/LoginPortal';
import { LiveTrafficScannerModal } from './components/LiveTrafficScannerModal';
import { EvidenceReplayView } from './components/EvidenceReplayView';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  Crown,
  Database,
  FileText,
  GitBranch,
  LayoutDashboard,
  Menu,
  Radio,
  Server,
  Shield,
  ShieldCheck,
  Target,
  TrendingUp,
  Workflow
} from 'lucide-react';

export default function App() {
  const [currentSpecKey, setCurrentSpecKey] = useState<string>('crapi');
  const [activeTab, setActiveTab] = useState<'graph' | 'chokepoints' | 'roi' | 'activity' | 'paths' | 'replay' | 'findings' | 'pitch' | 'portal'>('graph');
  const [selectedReplayPathId, setSelectedReplayPathId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customSpec, setCustomSpec] = useState<{
    id: string;
    name: string;
    version: string;
    industry: string;
    description: string;
    endpoints: ApiEndpoint[];
  } | null>(null);

  const [currentUser, setCurrentUser] = useState<UserPersona | null>(() => {
    try {
      const saved = localStorage.getItem('sarthi_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  const [allUsers, setAllUsers] = useState<UserPersona[]>(DEFAULT_USERS);
  const [tasks, setTasks] = useState<RemediationTask[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isPitchOpen, setIsPitchOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isTrafficScannerOpen, setIsTrafficScannerOpen] = useState<boolean>(false);
  const [assigningItem, setAssigningItem] = useState<RoiItem | null>(null);
  const [liveTrafficFindings, setLiveTrafficFindings] = useState<Finding[]>([]);
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedPathId, setHighlightedPathId] = useState<string | null>(null);
  const [simulatedNodeIds, setSimulatedNodeIds] = useState<string[]>([]);

  const refreshBackendData = async () => {
    try {
      const userRes = await fetch('/api/auth/users');
      if (userRes.ok) {
        const usersData = await userRes.json();
        if (Array.isArray(usersData) && usersData.length > 0) {
          setAllUsers(usersData);
          if (currentUser) {
            const updatedCurrent = usersData.find(u => u.id === currentUser.id);
            if (updatedCurrent) setCurrentUser(updatedCurrent);
          }
        }
      }

      const taskRes = await fetch('/api/tasks');
      if (taskRes.ok) {
        const tasksData = await taskRes.json();
        if (Array.isArray(tasksData)) {
          setTasks(tasksData);
        }
      }
    } catch (e) {
      console.log('Backend sync active with local fallback');
    }
  };

  useEffect(() => { refreshBackendData(); }, []);

  const handleLogout = () => {
    localStorage.removeItem('sarthi_auth_user');
    localStorage.removeItem('sarthi_auth_token');
    setCurrentUser(null);
    setActiveTab('graph');
  };

  const handleLoginSuccess = (user: UserPersona) => {
    setCurrentUser(user);
    localStorage.setItem('sarthi_auth_user', JSON.stringify(user));
    setActiveTab('graph');
  };

  const currentSpec = useMemo(() => {
    if (currentSpecKey === 'custom' && customSpec) {
      return customSpec;
    }
    return SAMPLE_SPECS[currentSpecKey] || SAMPLE_SPECS.crapi;
  }, [currentSpecKey, customSpec]);

  const allEndpoints = useMemo(() => {
    const map = new Map<string, ApiEndpoint>();
    currentSpec.endpoints.forEach(ep => map.set(`${ep.method}:${ep.path}`, ep));
    discoveredEndpoints.forEach(ep => {
      const key = `${ep.method}:${ep.path}`;
      if (!map.has(key)) {
        map.set(key, ep);
      }
    });
    return Array.from(map.values());
  }, [currentSpec.endpoints, discoveredEndpoints]);

  const baseFindings: Finding[] = useMemo(() => runSecurityAudit(allEndpoints), [allEndpoints]);
  const findings: Finding[] = useMemo(() => {
    const existingIds = new Set(baseFindings.map(f => f.id));
    const newFromTraffic = liveTrafficFindings.filter(f => !existingIds.has(f.id));
    return [...baseFindings, ...newFromTraffic];
  }, [baseFindings, liveTrafficFindings]);

  const graphModel = useMemo(() => buildStateGraph(allEndpoints, findings), [allEndpoints, findings]);
  const chokePoints: ChokePoint[] = useMemo(() => analyzeChokePoints(graphModel.nodes, graphModel.attackPaths), [graphModel.nodes, graphModel.attackPaths]);
  const roiItems: RoiItem[] = useMemo(() => calculateRoiRankings(chokePoints, graphModel.nodes), [chokePoints, graphModel.nodes]);
  const simulationResult = useMemo(() => simulateRemediation(simulatedNodeIds, graphModel.attackPaths), [simulatedNodeIds, graphModel.attackPaths]);

  const handleApplyTrafficFindings = (newFindings: Finding[], newEndpoints: ApiEndpoint[]) => {
    if (newEndpoints.length > 0) {
      setDiscoveredEndpoints(prev => {
        const map = new Map<string, ApiEndpoint>();
        prev.forEach(ep => map.set(`${ep.method}:${ep.path}`, ep));
        newEndpoints.forEach(ep => {
          const key = `${ep.method}:${ep.path}`;
          if (!map.has(key)) map.set(key, ep);
        });
        return Array.from(map.values());
      });
    }

    if (newFindings.length > 0) {
      setLiveTrafficFindings(prev => {
        const existing = new Set(prev.map(f => f.id));
        const fresh = newFindings.filter(f => !existing.has(f.id));
        return [...prev, ...fresh];
      });
    }
  };

  const handleSelectSpec = (key: string) => {
    setCurrentSpecKey(key);
    setLiveTrafficFindings([]);
    setDiscoveredEndpoints([]);
    setSimulatedNodeIds([]);
    setSelectedNodeId(null);
    setHighlightedPathId(null);
  };

  const handleLoadCustomSpec = (rawJson: string, title?: string) => {
    const parsed = parseOpenApiSpec(rawJson);
    setCustomSpec({
      id: 'custom',
      name: title || parsed.title,
      version: parsed.version,
      industry: 'Custom Specification',
      description: parsed.description,
      endpoints: parsed.endpoints
    });
    setCurrentSpecKey('custom');
    setSimulatedNodeIds([]);
    setSelectedNodeId(null);
    setHighlightedPathId(null);
  };

  const handleToggleSimulateNode = (nodeId: string) => {
    setSimulatedNodeIds(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
  };

  const handleApplyTopFix = () => {
    if (chokePoints.length > 0) {
      const topNodeId = chokePoints[0].nodeId;
      if (!simulatedNodeIds.includes(topNodeId)) {
        setSimulatedNodeIds(prev => [...prev, topNodeId]);
      }
    }
  };

  const handleApplyAllTopFixes = () => {
    const topTwoIds = chokePoints.slice(0, 2).map(c => c.nodeId);
    setSimulatedNodeIds(Array.from(new Set([...simulatedNodeIds, ...topTwoIds])));
  };

  const handleResetSimulation = () => setSimulatedNodeIds([]);

  const handleOpenEvidenceReplay = (pathId?: string) => {
    const nextPathId = pathId || selectedReplayPathId || graphModel.attackPaths[0]?.id || null;
    if (nextPathId) {
      setSelectedReplayPathId(nextPathId);
      setActiveTab('replay');
      const path = graphModel.attackPaths.find(p => p.id === nextPathId);
      if (path) setHighlightedPathId(path.id);
    }
  };

  const selectedReplayPath = graphModel.attackPaths.find(path => path.id === selectedReplayPathId) || graphModel.attackPaths[0] || null;

  if (!currentUser) {
    return <LoginPortal onLoginSuccess={handleLoginSuccess} allUsers={allUsers} onRefreshUsers={refreshBackendData} />;
  }

  const isAdmin = currentUser.role === 'ADMIN';

  const navItems = [
    { label: 'Overview', tab: 'graph', icon: LayoutDashboard },
    { label: 'API Inventory', tab: 'findings', icon: Server },
    { label: 'Findings', tab: 'findings', icon: AlertTriangle },
    { label: 'Attack Graph', tab: 'graph', icon: GitBranch },
    { label: 'Attack Paths', tab: 'paths', icon: Workflow },
    { label: 'Evidence Replay', tab: 'replay', icon: ArrowRight },
    { label: 'Choke Points', tab: 'chokepoints', icon: Target },
    { label: 'Remediation', tab: 'roi', icon: TrendingUp },
    { label: 'Traffic Scanner', tab: 'graph', icon: Radio, action: () => setIsTrafficScannerOpen(true) },
    { label: 'Security Tests', tab: 'findings', icon: ShieldCheck },
    { label: 'Reports', tab: 'pitch', icon: FileText, action: () => setIsReportOpen(true) },
    { label: 'Sandbox', tab: 'graph', icon: Database, action: () => setActiveTab('graph') }
  ];

  const lowerNav = [
    { label: 'Settings', icon: Building2 },
    { label: 'Environment', icon: Server },
    { label: 'Help', icon: Bell }
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)', color: 'var(--text-main)' }}>
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed inset-y-0 left-0 z-30 w-[260px] flex-col border-r px-4 py-5 transition-transform duration-200 md:static md:flex`} style={{ background: 'var(--bg-base)', borderColor: 'var(--border-soft)' }}>
        <div className="mb-8 flex items-center gap-3 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--border-strong)' }}>
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Sarthi AppSec</div>
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>State-Graph</div>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map(({ label, tab, icon: Icon, action }) => {
            const isActive = activeTab === tab && label !== 'Reports' && label !== 'Traffic Scanner' && label !== 'Sandbox';
            return (
              <button
                key={label}
                onClick={() => {
                  if (action) { action(); return; }
                  setActiveTab(tab as 'graph' | 'chokepoints' | 'roi' | 'activity' | 'paths' | 'replay' | 'findings' | 'pitch' | 'portal');
                  setSidebarOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition"
                style={
                  isActive
                    ? {
                        borderLeft: '2px solid var(--accent)',
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)'
                      }
                    : {
                        color: 'var(--text-soft)',
                        background: 'transparent'
                      }
                }
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                {label === 'Choke Points' && <span className="rounded-full bg-[#A60E35] px-1.5 py-0.5 text-[9px] font-semibold text-white">7</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <div className="mb-2 px-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">System</div>
          <div className="space-y-1">
            {lowerNav.map(({ label, icon: Icon }) => (
              <button key={label} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-[#068187]/8 hover:text-white">
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {sidebarOpen && <button className="fixed inset-0 z-20 md:hidden" style={{ background: 'rgba(3, 5, 25, 0.7)' }} onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" />}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          currentSpecKey={currentSpecKey}
          onSelectSpec={handleSelectSpec}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenReport={() => setIsReportOpen(true)}
          onOpenPitch={() => setIsPitchOpen(true)}
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenTrafficScanner={() => setIsTrafficScannerOpen(true)}
          onOpenEvidenceReplay={() => handleOpenEvidenceReplay()}
          onLogout={handleLogout}
          currentUser={currentUser}
          isSimulating={simulatedNodeIds.length > 0}
          onResetSimulation={handleResetSimulation}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {isAdmin && (
          <div className="border-b px-4 py-2 text-xs lg:px-6" style={{ borderColor: 'var(--border-soft)', background: 'var(--accent-soft)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                <Crown className="h-3.5 w-3.5" />
                <span className="font-medium" style={{ color: 'var(--text-main)' }}>Administrator clearance active</span>
                <span style={{ color: 'var(--text-muted)' }}>· Database storage connected</span>
              </div>
              <div className="flex items-center gap-3" style={{ color: 'var(--text-soft)' }}>
                <button onClick={() => setIsLoginOpen(true)} style={{ color: 'var(--accent)' }}>Manage personas</button>
                <span style={{ color: 'var(--border-strong)' }}>|</span>
                <span className="inline-flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Full audit override enabled
                </span>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6" style={{ background: 'var(--bg-base)' }}>
          <div className="mx-auto max-w-[1600px] space-y-5">
            <div className="flex flex-col gap-2 border-b pb-3 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-soft)' }}>
                <span className="font-medium" style={{ color: 'var(--text-main)' }}>{currentSpec.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span className="font-mono" style={{ color: 'var(--accent)' }}>{currentSpec.version}</span>
                <span style={{ color: 'var(--text-muted)' }}>·</span>
                <span>{currentSpec.industry}</span>
              </div>

              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-soft)' }}>
                <span>Analyst session:</span>
                <button onClick={() => setIsLoginOpen(true)} className="inline-flex items-center gap-2 font-medium" style={{ color: 'var(--accent)' }}>
                  <span>{currentUser.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>({currentUser.roleTitle})</span>
                </button>
              </div>
            </div>

            <MetricOverview
              endpointsCount={currentSpec.endpoints.length}
              findings={findings}
              attackPaths={graphModel.attackPaths}
              chokePoints={chokePoints}
              simulationResult={simulationResult}
              onApplyTopFix={handleApplyTopFix}
              onResetSimulation={handleResetSimulation}
              tasks={tasks}
              specKey={currentSpecKey}
            />

            {activeTab === 'graph' && (
              <div className="space-y-4">
                {liveTrafficFindings.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--border-strong)', background: 'var(--accent-soft)', color: 'var(--text-soft)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg border" style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)', color: 'var(--accent)' }}>
                        <Radio className="h-3.5 w-3.5 animate-pulse" />
                      </div>
                      <div>
                        <span className="font-semibold" style={{ color: 'var(--text-main)' }}>Live traffic ingestion active:</span>{' '}
                        <span style={{ color: 'var(--text-soft)' }}>
                          {liveTrafficFindings.length} heuristic finding{liveTrafficFindings.length > 1 ? 's' : ''} and {discoveredEndpoints.length} shadow endpoint{discoveredEndpoints.length > 1 ? 's' : ''} added to the graph.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsTrafficScannerOpen(true)} className="rounded-lg px-2.5 py-1.5 font-medium" style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}>Scan more logs</button>
                      <button onClick={() => { setLiveTrafficFindings([]); setDiscoveredEndpoints([]); }} className="rounded-lg border px-2.5 py-1.5" style={{ borderColor: 'var(--border-soft)', background: 'transparent', color: 'var(--text-soft)' }}>Clear traffic layer</button>
                    </div>
                  </div>
                )}

                <GraphVisualization
                  nodes={graphModel.nodes}
                  edges={graphModel.edges}
                  attackPaths={graphModel.attackPaths}
                  chokePoints={chokePoints}
                  simulatedNodeIds={simulatedNodeIds}
                  onToggleSimulateNode={handleToggleSimulateNode}
                  selectedNodeId={selectedNodeId}
                  onSelectNode={setSelectedNodeId}
                  highlightedPathId={highlightedPathId}
                  onHighlightPath={setHighlightedPathId}
                  endpoints={allEndpoints}
                  onOpenTrafficScanner={() => setIsTrafficScannerOpen(true)}
                  trafficFindingsCount={liveTrafficFindings.length}
                />
              </div>
            )}

            {activeTab === 'roi' && (
              <RoiRankingView
                roiItems={roiItems}
                simulatedNodeIds={simulatedNodeIds}
                onToggleSimulateNode={handleToggleSimulateNode}
                currentUser={currentUser}
                tasks={tasks}
                onOpenAssignModal={(item) => setAssigningItem(item)}
                onOpenLoginModal={() => setIsLoginOpen(true)}
              />
            )}

            {activeTab === 'activity' && (
              <TeamActivityView
                tasks={tasks}
                allUsers={allUsers}
                currentUser={currentUser}
                onRefreshTasks={refreshBackendData}
                onOpenLoginModal={() => setIsLoginOpen(true)}
              />
            )}

            {activeTab === 'chokepoints' && (
              <ChokePointPanel
                chokePoints={chokePoints}
                attackPaths={graphModel.attackPaths}
                simulatedNodeIds={simulatedNodeIds}
                onToggleSimulateNode={handleToggleSimulateNode}
                onApplyAllTopFixes={handleApplyAllTopFixes}
                onResetSimulation={handleResetSimulation}
              />
            )}

            {activeTab === 'paths' && (
              <AttackPathsView
                attackPaths={graphModel.attackPaths}
                simulatedNodeIds={simulatedNodeIds}
                onSelectNode={setSelectedNodeId}
                onHighlightPath={setHighlightedPathId}
                onNavigateToGraph={() => setActiveTab('graph')}
                onOpenEvidenceReplay={handleOpenEvidenceReplay}
              />
            )}

            {activeTab === 'replay' && (
              <EvidenceReplayView
                selectedPath={selectedReplayPath}
                onOpenChokePoints={() => setActiveTab('chokepoints')}
              />
            )}

            {activeTab === 'findings' && (
              <FindingsTable findings={findings} />
            )}

            {activeTab === 'pitch' && (
              <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border-soft)', background: 'var(--surface)' }}>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border" style={{ borderColor: 'var(--border-strong)', background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Algorithm &amp; Pitch Guide</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm" style={{ color: 'var(--text-soft)' }}>
                  Open the product story and the secure reasoning workflow behind the state-aware attack graph and evidence replay system.
                </p>
                <button onClick={() => setIsPitchOpen(true)} className="mt-5 rounded-xl px-5 py-2.5 text-xs font-semibold" style={{ background: 'var(--cta)', color: 'var(--bg-base)' }}>
                  Open pitch deck
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      <SpecUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onLoadCustomSpec={handleLoadCustomSpec} onSelectPreloaded={handleSelectSpec} />
      <ReportExportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} specName={currentSpec.name} specVersion={currentSpec.version} findings={findings} attackPaths={graphModel.attackPaths} chokePoints={chokePoints} simulatedNodeIds={simulatedNodeIds} />
      <PitchExplainerModal isOpen={isPitchOpen} onClose={() => setIsPitchOpen(false)} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} currentUser={currentUser} allUsers={allUsers} onSelectUser={handleLoginSuccess} onRefreshUsers={refreshBackendData} />
      <TaskAssignModal isOpen={Boolean(assigningItem)} onClose={() => setAssigningItem(null)} roiItem={assigningItem} users={allUsers} onTaskAssigned={refreshBackendData} />
      <LiveTrafficScannerModal isOpen={isTrafficScannerOpen} onClose={() => setIsTrafficScannerOpen(false)} existingEndpoints={allEndpoints} onApplyFindings={handleApplyTrafficFindings} onNavigateToGraph={() => { setActiveTab('graph'); setIsTrafficScannerOpen(false); }} />
    </div>
  );
}
