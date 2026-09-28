/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ValidationStatus = 'VALIDATED' | 'SUSPECTED';

export type VerificationState = 'UNREVIEWED' | 'VALIDATED' | 'FALSE_POSITIVE' | 'REMEDIATED';

export type RemediationEffort = 'LOW' | 'MEDIUM' | 'HIGH';

export type RoiQuadrant = 'QUICK_WINS' | 'STRATEGIC' | 'LOW_HANGING' | 'DE_PRIORITIZED';

export interface Finding {
  id: string;
  endpoint: string;
  method: HttpMethod;
  category: string; // e.g. 'OWASP API1:2023 - Broken Object Level Auth (IDOR)'
  owaspId: 'API1:2023' | 'API2:2023' | 'API3:2023' | 'API4:2023' | 'API5:2023' | 'API6:2023' | 'API7:2023' | 'API8:2023' | 'API9:2023' | 'API10:2023' | string;
  title: string;
  severity: Severity;
  evidence: string;
  cwe: string;
  remediationEffort: RemediationEffort;
  remediationGuidance: string;
  codeSnippet?: string;
  falsePositiveLikelihood?: 'LOW' | 'MEDIUM' | 'HIGH';
  falseNegativeRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
  verificationStatus?: VerificationState;
  auditorNotes?: string;
  rawRequest?: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: string;
  };
  rawResponse?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
  remediationSnippets?: {
    nodejs: string;
    python: string;
    golang: string;
    waf: string;
  };
}

export interface ApiEndpoint {
  id: string;
  path: string;
  method: HttpMethod;
  summary: string;
  tags: string[];
  requiresAuth: boolean;
  authType?: 'Bearer' | 'ApiKey' | 'Basic' | 'None';
  pathParameters: string[];
  queryParameters: string[];
  requestBodyFields?: string[];
  responseFields?: string[];
  producesTokens?: string[];
  sensitiveDataExposed?: string[];
}

export interface GraphNode {
  id: string;
  endpointId: string;
  path: string;
  method: HttpMethod;
  label: string;
  findings: Finding[];
  maxSeverity: Severity | 'NONE';
  nodeType: 'ENTRY' | 'TRANSIT' | 'EXPLOIT_TARGET';
  requiresAuth: boolean;
  tags?: string[];
  x: number;
  y: number;
  isRemediated?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  confidenceScore: number; // 0.0 to 1.0 (e.g. 0.95 = 95%)
  status: ValidationStatus;
  evidence: string;
  propagatedData?: string[];
  isSevered?: boolean;
}

export interface AttackHop {
  nodeId: string;
  method: HttpMethod;
  path: string;
  action: string;
  confidence: number;
  evidence: string;
  vulnerability?: Finding;
}

export interface AttackPath {
  id: string;
  title: string;
  description: string;
  targetImpact: string;
  severity: Severity;
  status: ValidationStatus;
  confidenceScore: number;
  nodeIds: string[];
  hops: AttackHop[];
  isBroken?: boolean;
  brokenByNodeId?: string;
}

export interface ChokePoint {
  nodeId: string;
  method: HttpMethod;
  path: string;
  findingsCount: number;
  maxSeverity: Severity;
  pathsCoveredCount: number;
  criticalPathsCoveredCount: number;
  brokenPathIds: string[];
  riskReductionPercent: number; // 0 - 100
  criticalReductionPercent: number; // 0 - 100
  remediationEffort: RemediationEffort;
  roiScore: number; // Calculated ratio of Impact vs Effort
  roiCategory: 'Top Priority (Quick Win)' | 'High Strategic Impact' | 'Routine Hardening' | 'Isolated Fix';
  recommendedAction: string;
  multiLanguageRemediation?: {
    nodejs: string;
    python: string;
    golang: string;
    waf: string;
  };
}

export interface RoiItem {
  id: string;
  nodeId: string;
  title: string;
  method: HttpMethod;
  path: string;
  type: 'CHOKE_POINT' | 'VULNERABILITY';
  riskReductionPercent: number; // 0 - 100
  impactScore: number; // 1 - 10 scale
  effortScore: number; // 1 - 10 scale (1 = minimal config, 10 = massive architectural rewrite)
  effortCategory: RemediationEffort;
  developerHoursEstimate: string;
  roiScore: number; // Calculated ratio: (Impact / Effort) normalized
  quadrant: RoiQuadrant;
  quadrantLabel: string;
  quadrantDescription: string;
  recommendedAction: string;
  associatedFindings: Finding[];
  assignedTo?: string | null;
  status?: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'REMEDIATED';
}

export interface WhatIfSimulationResult {
  simulatedNodeIds: string[];
  totalPaths: number;
  remainingPaths: number;
  eliminatedPathsCount: number;
  overallRiskReductionPercent: number;
  criticalRiskReductionPercent: number;
  activePathIds: string[];
  brokenPathIds: string[];
  residualMaxSeverity: Severity | 'SECURED';
}

export interface ApiSpecMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  industry: string;
  endpointsCount: number;
  endpoints: ApiEndpoint[];
}

export interface UserPersona {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'APPSEC_LEAD' | 'PENTESTER' | 'DEVSECOPS' | 'CISO' | 'SECURITY_ENGINEER';
  roleTitle: string;
  department: string;
  avatarColor: string;
  createdAt: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'RESOLVED';

export interface RemediationTask {
  id: string;
  targetEndpoint: string;
  method: HttpMethod;
  title: string;
  riskReduction: number;
  effortScore: number;
  quadrant: RoiQuadrant;
  assignedToUserId: string;
  assignedToName: string;
  status: TaskStatus;
  notes: string;
  createdAt: string;
}

export interface ProbeTest {
  id: string;
  name: string;
  targetApi: 'Apex Banking Corp' | 'MedSecure Health Systems' | 'OmniLogistics E-Commerce';
  endpoint: string;
  method: HttpMethod;
  targetVulnerability: string;
  owaspId: string;
  description: string;
  sampleHeaders: Record<string, string>;
  sampleBody?: string;
  tamperPayload?: string;
  expectedVulnerabilityStatus: number;
}

export interface TrafficLogEntry {
  id?: string;
  timestamp?: string;
  method: HttpMethod | string;
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  requestBody?: any;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  durationMs?: number;
  clientIp?: string;
}

export interface TrafficScanResult {
  totalScanned: number;
  anomaliesDetected: number;
  newFindingsCount: number;
  findings: Finding[];
  discoveredEndpoints: ApiEndpoint[];
  scannedAt: string;
  heuristicSummary: Record<string, number>;
}

export type ReplayStatus = 'READY' | 'RUNNING' | 'VALIDATED' | 'NOT_VALIDATED' | 'INCONCLUSIVE' | 'BLOCKED' | 'FAILED';

export interface ReplayEvidence {
  id: string;
  type: string;
  description: string;
  source: string;
  expected: string;
  observed: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
}

export interface ReplayStep {
  id: string;
  order: number;
  method: HttpMethod | 'HEAD';
  originalPath: string;
  resolvedPath: string;
  executedAs: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'VALIDATED' | 'INCONCLUSIVE';
  latencyMs: number;
  extractedState: Record<string, string | number | boolean | null>;
  injectedState: Record<string, string | number | boolean | null>;
  responseSummary: {
    status: number;
    body: string;
  };
  evidence: ReplayEvidence[];
  validation: 'VALIDATED' | 'NOT_VALIDATED' | 'INCONCLUSIVE';
  timestamp: string;
}

export interface ReplayResult {
  replayId: string;
  attackPathId: string;
  status: ReplayStatus;
  classification: 'VALIDATED' | 'NOT_VALIDATED' | 'INCONCLUSIVE';
  confidenceScore: number;
  evidenceCoverage: number;
  reproducibility: number;
  sessionContexts: {
    userA: { name: string; role: string; token: string };
    userB: { name: string; role: string; token: string };
  };
  stateStore: Record<string, string | number | boolean | null>;
  semanticDiff: Array<{
    field: string;
    change: 'ADDED' | 'REMOVED' | 'CHANGED' | 'UNCHANGED';
    reason: string;
    expected: string;
    observed: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  steps: ReplayStep[];
  evidence: ReplayEvidence[];
  summary: string;
  environment: string;
  target: string;
  replayedAt: string;
}
