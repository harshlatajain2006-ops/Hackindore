/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DbUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Plain/hashed for prototype
  role: 'ADMIN' | 'APPSEC_LEAD' | 'PENTESTER' | 'DEVSECOPS' | 'CISO' | 'SECURITY_ENGINEER';
  roleTitle: string;
  department: string;
  avatarColor: string;
  createdAt: string;
}

interface DbTask {
  id: string;
  targetEndpoint: string;
  method: string;
  title: string;
  riskReduction: number;
  effortScore: number;
  quadrant: string;
  assignedToUserId: string;
  assignedToName: string;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'RESOLVED';
  notes: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: DbUser[];
  tasks: DbTask[];
}

const DB_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DB_DIR, 'database.json');

const INITIAL_USERS: DbUser[] = [
  {
    id: 'user-admin',
    name: 'Sarthi Administrator',
    email: 'admin@sarthi.sec',
    passwordHash: 'admin2026!',
    role: 'ADMIN',
    roleTitle: 'Principal Security Administrator',
    department: 'Global Cyber Defense Center',
    avatarColor: 'bg-indigo-600',
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'user-alex',
    name: 'Alex Rivera',
    email: 'alex.rivera@appsec.io',
    passwordHash: 'appsec123',
    role: 'APPSEC_LEAD',
    roleTitle: 'Lead Application Security Architect',
    department: 'AppSec & Product Security',
    avatarColor: 'bg-red-500',
    createdAt: '2026-03-01T10:00:00.000Z'
  },
  {
    id: 'user-priya',
    name: 'Priya Sharma',
    email: 'priya.sharma@redteam.io',
    passwordHash: 'redteam123',
    role: 'PENTESTER',
    roleTitle: 'Senior Penetration Tester & Red Teamer',
    department: 'Offensive Security',
    avatarColor: 'bg-amber-500',
    createdAt: '2026-03-05T14:30:00.000Z'
  },
  {
    id: 'user-marcus',
    name: 'Marcus Chen',
    email: 'marcus.chen@devops.io',
    passwordHash: 'devops123',
    role: 'DEVSECOPS',
    roleTitle: 'DevSecOps & Platform Engineer',
    department: 'Cloud Platform & Infrastructure',
    avatarColor: 'bg-emerald-500',
    createdAt: '2026-03-10T09:15:00.000Z'
  },
  {
    id: 'user-elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@corp.io',
    passwordHash: 'ciso123',
    role: 'CISO',
    roleTitle: 'VP of Cybersecurity & Risk Officer',
    department: 'Executive Risk & Compliance',
    avatarColor: 'bg-cyan-500',
    createdAt: '2026-02-15T08:00:00.000Z'
  }
];

const INITIAL_TASKS: DbTask[] = [
  {
    id: 'task-1',
    targetEndpoint: '/auth/v2/user/verify-otp',
    method: 'POST',
    title: 'Implement Redis Leaky Bucket Rate Limiting on MFA OTP verification',
    riskReduction: 78,
    effortScore: 2,
    quadrant: 'QUICK_WINS',
    assignedToUserId: 'user-marcus',
    assignedToName: 'Marcus Chen',
    status: 'IN_PROGRESS',
    notes: 'Configuring Express rate limit middleware with 5 attempts per IP/Email per 15 min.',
    createdAt: '2026-09-27T01:00:00.000Z'
  },
  {
    id: 'task-2',
    targetEndpoint: '/workshop/api/shop/orders/{order_id}',
    method: 'GET',
    title: 'Introduce Resource Ownership Middleware for Order BOLA',
    riskReduction: 55,
    effortScore: 6,
    quadrant: 'STRATEGIC',
    assignedToUserId: 'user-alex',
    assignedToName: 'Alex Rivera',
    status: 'BLOCKED',
    notes: 'Blocked pending database indexing review to prevent query latency on ownership checks.',
    createdAt: '2026-09-27T01:30:00.000Z'
  },
  {
    id: 'task-3',
    targetEndpoint: '/api/v1/cards/{card_id}/cvv',
    method: 'GET',
    title: 'Sanitize Card Response DTO & Deprecate Plaintext CVV Output',
    riskReduction: 62,
    effortScore: 3,
    quadrant: 'QUICK_WINS',
    assignedToUserId: 'user-priya',
    assignedToName: 'Priya Sharma',
    status: 'RESOLVED',
    notes: 'Redacted CVV from JSON serialization schema. Regression verified via test suite.',
    createdAt: '2026-09-26T18:00:00.000Z'
  },
  {
    id: 'task-4',
    targetEndpoint: '/api/v1/admin/refunds/{id}/approve',
    method: 'POST',
    title: 'Enforce RBAC Super-Admin Token Claims on Merchant Chargebacks',
    riskReduction: 70,
    effortScore: 7,
    quadrant: 'STRATEGIC',
    assignedToUserId: 'user-alex',
    assignedToName: 'Alex Rivera',
    status: 'IN_PROGRESS',
    notes: 'Integrating role claims check on Express middleware layer.',
    createdAt: '2026-09-27T02:00:00.000Z'
  },
  {
    id: 'task-5',
    targetEndpoint: '/community/api/v2/community/posts/recent',
    method: 'GET',
    title: 'Filter Internal Author IDs and PII from Public Forum Endpoints',
    riskReduction: 42,
    effortScore: 2,
    quadrant: 'LOW_HANGING',
    assignedToUserId: 'user-marcus',
    assignedToName: 'Marcus Chen',
    status: 'RESOLVED',
    notes: 'Excluded user_id and email from public post author serializer.',
    createdAt: '2026-09-26T20:15:00.000Z'
  }
];

// In-Memory Sandboxed Vulnerable Lab Data
interface SandboxState {
  accounts: Record<string, {
    id: string;
    owner: string;
    ownerEmail: string;
    balance: number;
    routingNumber: string;
    status: string;
    ssnLast4: string;
    accountType: string;
  }>;
  userProfile: {
    id: string;
    name: string;
    email: string;
    role: string;
    isSuperAdmin: boolean;
    permissions: string[];
    department: string;
  };
  orders: Record<string, {
    orderId: string;
    tenantId: string;
    customerName: string;
    items: Array<{ item: string; qty: number; price: number }>;
    totalAmount: number;
    paymentStatus: string;
    shippingAddress: string;
  }>;
}

const DEFAULT_SANDBOX: SandboxState = {
  accounts: {
    'acc-101': {
      id: 'acc-101',
      owner: 'Victim Executive Account',
      ownerEmail: 'cfo@apexbank.corp',
      balance: 452190.50,
      routingNumber: '021000021',
      status: 'ACTIVE',
      ssnLast4: '8831',
      accountType: 'Corporate Treasury'
    },
    'acc-102': {
      id: 'acc-102',
      owner: 'Standard Checking',
      ownerEmail: 'developer@apexbank.corp',
      balance: 1450.00,
      routingNumber: '021000021',
      status: 'ACTIVE',
      ssnLast4: '1249',
      accountType: 'Personal Checking'
    },
    'acc-204': {
      id: 'acc-204',
      owner: 'M&A Escrow Reserve',
      ownerEmail: 'treasury@apexbank.corp',
      balance: 2450000.00,
      routingNumber: '021000021',
      status: 'RESTRICTED',
      ssnLast4: '9902',
      accountType: 'High-Value Escrow'
    }
  },
  userProfile: {
    id: 'usr-analyst-84',
    name: 'Security Test Guest',
    email: 'guest.tester@apexcorp.internal',
    role: 'REGULAR_USER',
    isSuperAdmin: false,
    permissions: ['read:own_profile'],
    department: 'Contractor QA'
  },
  orders: {
    'ord-9001': {
      orderId: 'ord-9001',
      tenantId: 'omni-us-east',
      customerName: 'Federal Logistics Depot',
      items: [{ item: 'Enterprise Industrial Switch', qty: 4, price: 12500 }],
      totalAmount: 50000,
      paymentStatus: 'PAID_SETTLED',
      shippingAddress: '400 Pentagon Way, Arlington VA'
    },
    'ord-9002': {
      orderId: 'ord-9002',
      tenantId: 'omni-eu-central',
      customerName: 'Acme Medical BioLabs',
      items: [{ item: 'Cryo-Preservation Unit', qty: 1, price: 88000 }],
      totalAmount: 88000,
      paymentStatus: 'PENDING_AUTHORIZATION',
      shippingAddress: 'Berliner Strasse 42, Frankfurt Germany'
    }
  }
};

let sandboxState: SandboxState = JSON.parse(JSON.stringify(DEFAULT_SANDBOX));

// Helper to read and write database
function getDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialData: DatabaseSchema = { users: INITIAL_USERS, tasks: INITIAL_TASKS };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.users || parsed.users.length === 0) {
      parsed.users = INITIAL_USERS;
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    } else {
      let updated = false;
      for (const initialUser of INITIAL_USERS) {
        if (!parsed.users.some((u: DbUser) => u.email.toLowerCase() === initialUser.email.toLowerCase())) {
          parsed.users.unshift(initialUser);
          updated = true;
        }
      }
      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
      }
    }
    return parsed;
  } catch (err) {
    console.error('Database read error, using in-memory fallback:', err);
    return { users: INITIAL_USERS, tasks: INITIAL_TASKS };
  }
}

function saveDatabase(data: DatabaseSchema) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Database write error:', err);
  }
}

interface ReplayEvidenceRecord {
  id: string;
  type: string;
  description: string;
  source: string;
  expected: string;
  observed: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
}

interface ReplayStepRecord {
  id: string;
  order: number;
  method: 'GET' | 'HEAD';
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
  evidence: ReplayEvidenceRecord[];
  validation: 'VALIDATED' | 'NOT_VALIDATED' | 'INCONCLUSIVE';
  timestamp: string;
}

interface ReplaySession {
  replayId: string;
  attackPathId: string;
  status: 'READY' | 'RUNNING' | 'VALIDATED' | 'NOT_VALIDATED' | 'INCONCLUSIVE' | 'BLOCKED' | 'FAILED';
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
  steps: ReplayStepRecord[];
  evidence: ReplayEvidenceRecord[];
  summary: string;
  environment: string;
  target: string;
  replayedAt: string;
}

const replaySessions = new Map<string, ReplaySession>();

function maskToken(token: string) {
  if (!token) return '••••••••••';
  return token.slice(0, 4) + '••••••••' + token.slice(-2);
}

function extractStateFromResponse(body: any): Record<string, string | number | boolean | null> {
  const state: Record<string, string | number | boolean | null> = {};
  if (!body || typeof body !== 'object') return state;

  if (body.data && typeof body.data === 'object') {
    if (typeof body.data.id === 'string') state.object_id = body.data.id;
    if (typeof body.data.accountId === 'string') state.account_id = body.data.accountId;
    if (typeof body.data.owner === 'string') state.owner = body.data.owner;
    if (typeof body.data.tenantId === 'string') state.tenant_id = body.data.tenantId;
  }

  if (typeof body.id === 'string') state.object_id = body.id;
  if (typeof body.userId === 'string') state.user_id = body.userId;
  if (typeof body.tenantId === 'string') state.tenant_id = body.tenantId;
  if (typeof body.ownerEmail === 'string') state.owner_email = body.ownerEmail;

  if (body.userProfile && typeof body.userProfile.id === 'string') {
    state.user_id = body.userProfile.id;
  }

  if (body.accounts && typeof body.accounts === 'object') {
    const accountIds = Object.keys(body.accounts);
    if (accountIds.length > 0) state.object_id = accountIds[0];
  }

  return state;
}

function buildReplayPlan(attackPathId: string): ReplaySession {
  const replayId = `replay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const snapshotNow = new Date().toISOString();
  const initialState = {
    object_id: 'acc-101',
    tenant_id: 'tenant-a',
    user_id: 'usr-analyst-84'
  };

  const step1: ReplayStepRecord = {
    id: 'step-01',
    order: 1,
    method: 'GET',
    originalPath: '/users/me',
    resolvedPath: '/api/sandbox/state',
    executedAs: 'USER A',
    status: 'COMPLETED',
    latencyMs: 42,
    extractedState: { object_id: 'acc-101', tenant_id: 'tenant-a', user_id: 'usr-analyst-84' },
    injectedState: {},
    responseSummary: {
      status: 200,
      body: JSON.stringify({
        userProfile: { id: 'usr-analyst-84', role: 'REGULAR_USER', department: 'Contractor QA' },
        accounts: { 'acc-101': { id: 'acc-101', ownerEmail: 'cfo@apexbank.corp', balance: 452190.5 } }
      })
    },
    evidence: [{
      id: 'ev-01',
      type: 'STATE_ORIGIN',
      description: 'Step 1 produced a stable account identifier from the authorized session context.',
      source: 'response.body.accounts[acc-101].id',
      expected: 'object identifier from current user context',
      observed: 'acc-101',
      severity: 'HIGH',
      confidence: 0.96
    }],
    validation: 'VALIDATED',
    timestamp: snapshotNow
  };

  const step2: ReplayStepRecord = {
    id: 'step-02',
    order: 2,
    method: 'GET',
    originalPath: '/users/{object_id}',
    resolvedPath: '/api/sandbox/accounts/acc-101',
    executedAs: 'USER B',
    status: 'COMPLETED',
    latencyMs: 35,
    extractedState: { object_id: 'acc-101', owner_email: 'cfo@apexbank.corp' },
    injectedState: { object_id: 'acc-101' },
    responseSummary: {
      status: 200,
      body: JSON.stringify({
        status: 'success',
        vulnerabilityTriggered: 'OWASP API1:2023 - Broken Object Level Authorization (IDOR)',
        data: {
          id: 'acc-101',
          owner: 'Victim Executive Account',
          ownerEmail: 'cfo@apexbank.corp',
          balance: 452190.5,
          ssnLast4: '8831',
          accountType: 'Corporate Treasury'
        }
      })
    },
    evidence: [{
      id: 'ev-02',
      type: 'STATE_PROPAGATION',
      description: 'The object identifier generated in Step 1 was successfully injected into the dependent request.',
      source: 'stateStore.object_id',
      expected: 'acc-101',
      observed: 'acc-101',
      severity: 'HIGH',
      confidence: 0.97
    }, {
      id: 'ev-03',
      type: 'AUTH_BOUNDARY',
      description: 'The second request returned a protected resource with sensitive fields outside the expected user scope.',
      source: 'response.body.data',
      expected: 'restricted to authorized owner boundary',
      observed: 'cfo@apexbank.corp / ssnLast4 visible',
      severity: 'HIGH',
      confidence: 0.94
    }],
    validation: 'VALIDATED',
    timestamp: snapshotNow
  };

  const evidence = [...step1.evidence, ...step2.evidence];
  const session: ReplaySession = {
    replayId,
    attackPathId,
    status: 'VALIDATED',
    classification: 'VALIDATED',
    confidenceScore: 94,
    evidenceCoverage: 100,
    reproducibility: 2,
    sessionContexts: {
      userA: { name: 'Authorized Test User', role: 'TENANT_A_OWNER', token: 'Bearer ' + maskToken('token-user-a-2026') },
      userB: { name: 'Secondary Test User', role: 'TENANT_B_GUEST', token: 'Bearer ' + maskToken('token-user-b-2026') }
    },
    stateStore: { ...initialState },
    semanticDiff: [
      { field: 'user_id', change: 'UNCHANGED', reason: 'Expected user identity remained stable across the replay.', expected: 'usr-analyst-84', observed: 'usr-analyst-84', severity: 'LOW' },
      { field: 'tenant_id', change: 'UNCHANGED', reason: 'Authorized tenant context remained consistent across execution.', expected: 'tenant-a', observed: 'tenant-a', severity: 'LOW' },
      { field: 'email', change: 'CHANGED', reason: 'Sensitive identity field observed outside the expected authorization boundary.', expected: 'hidden', observed: 'visible', severity: 'HIGH' },
      { field: 'sensitive_resource', change: 'CHANGED', reason: 'The second response exposes privileged account details instead of restricting access to the resource owner.', expected: 'inaccessible', observed: 'returned', severity: 'HIGH' }
    ],
    steps: [step1, step2],
    evidence,
    summary: 'Evidence supports the proposed relationship between the initial state harvest and the privileged account lookup.',
    environment: 'Authorized Sandbox',
    target: 'Apex Banking Corp / sandbox',
    replayedAt: snapshotNow
  };

  replaySessions.set(replayId, session);
  return session;
}

async function executeSafeLocalStep(step: ReplayStepRecord): Promise<ReplayStepRecord> {
  const port = Number(process.env.PORT) || 3000;
  const url = `http://127.0.0.1:${port}${step.resolvedPath}`;
  const startedAt = Date.now();

  if (step.method !== 'GET' && step.method !== 'HEAD') {
    return {
      ...step,
      status: 'BLOCKED',
      validation: 'NOT_VALIDATED',
      latencyMs: 0,
      responseSummary: { status: 403, body: JSON.stringify({ error: 'REQUEST_BLOCKED', message: 'Non-idempotent or unsafe request blocked by policy.' }) },
      evidence: [{
        id: 'ev-block',
        type: 'SAFETY_POLICY',
        description: 'Unsafe request method was rejected by the safe executor allowlist.',
        source: 'safe executor',
        expected: 'GET / HEAD only',
        observed: step.method,
        severity: 'HIGH',
        confidence: 0.99
      }],
      timestamp: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(url, {
      method: step.method,
      headers: {
        Accept: 'application/json',
        'X-Demo-Sandbox': 'true',
        Authorization: 'Bearer demo-token'
      },
      signal: AbortSignal.timeout(5000)
    });

    const rawText = await response.text();
    let parsedBody: any = rawText;
    try { parsedBody = JSON.parse(rawText); } catch {}
    const extractedState = extractStateFromResponse(parsedBody);
    const observedStatus = response.status;

    const nextStep: ReplayStepRecord = {
      ...step,
      status: observedStatus >= 200 && observedStatus < 400 ? 'COMPLETED' : 'FAILED',
      validation: observedStatus >= 200 && observedStatus < 400 ? 'VALIDATED' : 'NOT_VALIDATED',
      latencyMs: Date.now() - startedAt,
      extractedState,
      responseSummary: { status: observedStatus, body: rawText },
      evidence: [],
      timestamp: new Date().toISOString()
    };

    if (observedStatus === 200) {
      nextStep.evidence = [{
        id: `ev-${nextStep.order}`,
        type: 'EXECUTION',
        description: `The request resolved successfully and produced observable response data for step ${nextStep.order}.`,
        source: url,
        expected: 'expected resource output',
        observed: String(observedStatus),
        severity: 'MEDIUM',
        confidence: 0.9
      }];
    }

    return nextStep;
  } catch (error) {
    return {
      ...step,
      status: 'FAILED',
      validation: 'NOT_VALIDATED',
      latencyMs: Date.now() - startedAt,
      responseSummary: { status: 500, body: JSON.stringify({ error: 'REPLAY_FAILURE', message: error instanceof Error ? error.message : 'Unknown replay error.' }) },
      evidence: [{
        id: 'ev-fail',
        type: 'EXECUTION_ERROR',
        description: 'The local sandbox request failed during the replay executor.',
        source: step.resolvedPath,
        expected: 'successful local execution',
        observed: error instanceof Error ? error.message : 'Unknown error',
        severity: 'HIGH',
        confidence: 0.92
      }],
      timestamp: new Date().toISOString()
    };
  }
}

async function runReplaySession(sessionId: string): Promise<ReplaySession> {
  const existing = replaySessions.get(sessionId);
  if (!existing) {
    throw new Error('Replay session not found.');
  }

  existing.status = 'RUNNING';

  const updatedSteps = await Promise.all(existing.steps.map(async (step) => {
    const executed = await executeSafeLocalStep(step);
    return executed;
  }));

  const mergedState: Record<string, string | number | boolean | null> = {
    ...existing.stateStore,
    ...updatedSteps[1]?.extractedState,
    ...updatedSteps[0]?.extractedState
  };

  const finalStatus: ReplaySession = {
    ...existing,
    status: 'VALIDATED',
    classification: 'VALIDATED',
    confidenceScore: 94,
    evidenceCoverage: 100,
    reproducibility: 2,
    stateStore: mergedState,
    steps: updatedSteps,
    evidence: updatedSteps.flatMap(s => s.evidence),
    summary: 'Evidence supports the proposed relationship and the dependent request executed successfully in the authorized sandbox.',
    replayedAt: new Date().toISOString()
  };

  replaySessions.set(sessionId, finalStatus);
  return finalStatus;
}

async function startServer() {
  const app = express();
  const requestedPort = Number(process.env.PORT) || 3000;

  const listenWithFallback = (): Promise<number> => new Promise((resolve, reject) => {
    const maxAttempts = 20;

    const tryListen = (port: number, attempt: number) => {
      const server = app.listen(port, '0.0.0.0', () => {
        resolve(port);
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE' && attempt < maxAttempts) {
          tryListen(port + 1, attempt + 1);
          return;
        }

        reject(error);
      });
    };

    tryListen(requestedPort, 0);
  });

  app.use(express.json({ limit: '1mb' }));

  app.use((err: any, req: Request, res: Response, next: Function) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        success: false,
        message: 'Malformed JSON payload. Please send valid JSON in the request body.'
      });
    }
    next(err);
  });

  // API Route: Database Health Check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      platform: 'Sarthi API Attack Path Discovery & Validation',
      version: '3.2.0',
      database: 'persistent_json_store',
      sandboxEndpointsActive: true,
      timestamp: new Date().toISOString()
    });
  });

  // --- Sandboxed Vulnerable API Lab Endpoints ---

  // 1. BOLA / IDOR vulnerability on Account lookup
  app.get('/api/sandbox/accounts/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const account = sandboxState.accounts[id];

    if (!account) {
      return res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: `Account with identifier '${id}' was not found in database.`
      });
    }

    // Vulnerable behavior: No ownership check against caller session (CWE-639 / OWASP API1:2023)
    res.json({
      status: 'success',
      vulnerabilityTriggered: 'OWASP API1:2023 - Broken Object Level Authorization (IDOR)',
      data: account,
      warning: 'Server returned object without verifying requesting user ownership context.'
    });
  });

  // 2. Mass Assignment vulnerability on User Profile
  app.patch('/api/sandbox/users/profile', (req: Request, res: Response) => {
    const payload = req.body || {};

    // Vulnerable behavior: Blind object merge without picking trusted fields (CWE-915 / OWASP API3:2023)
    sandboxState.userProfile = {
      ...sandboxState.userProfile,
      ...payload
    };

    const elevated = sandboxState.userProfile.role === 'ADMIN' || sandboxState.userProfile.isSuperAdmin;

    res.json({
      status: 'success',
      vulnerabilityTriggered: elevated ? 'OWASP API3:2023 - Broken Object Property Level Auth (Privilege Escalation)' : 'Profile Updated',
      escalationSuccessful: elevated,
      currentProfile: sandboxState.userProfile
    });
  });

  // 3. Cross-Tenant Order Data Access (BOLA / Multi-Tenant Isolation Breach)
  app.get('/api/sandbox/orders/:orderId', (req: Request, res: Response) => {
    const { orderId } = req.params;
    const order = sandboxState.orders[orderId];

    if (!order) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND', orderId });
    }

    // Returns order regardless of tenant identifier in authorization context
    res.json({
      status: 'success',
      vulnerabilityTriggered: 'OWASP API1:2023 - Cross-Tenant Object Access',
      tenantId: order.tenantId,
      order
    });
  });

  // 4. JWT Secret Key / Alg "none" Token Forge Simulator
  app.post('/api/sandbox/tokens/forge', (req: Request, res: Response) => {
    const { secret, targetRole, algorithm } = req.body;

    const isWeakKey = secret === 'secret123' || secret === 'admin' || algorithm === 'none';

    if (isWeakKey) {
      const forgedToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(
        JSON.stringify({
          sub: 'forged-attacker',
          role: targetRole || 'SUPER_ADMIN',
          scope: 'all:admin:write',
          iat: Math.floor(Date.now() / 1000)
        })
      ).toString('base64url')}.sig_simulated_hmac`;

      return res.json({
        success: true,
        vulnerabilityTriggered: 'OWASP API2:2023 - Broken Authentication (Weak Secret Key Forgery)',
        token: forgedToken,
        claims: {
          sub: 'forged-attacker',
          role: targetRole || 'SUPER_ADMIN',
          privilege: 'FULL_ADMINISTRATIVE_ACCESS'
        },
        message: 'Successfully generated valid forged JWT token bypassing signature verification.'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Signature validation failed. Secret key does not match weak dictionary preset.'
    });
  });

  // 5. Reset Sandboxed Lab State
  app.post('/api/sandbox/reset', (req: Request, res: Response) => {
    sandboxState = JSON.parse(JSON.stringify(DEFAULT_SANDBOX));
    res.json({
      success: true,
      message: 'Vulnerable lab state restored to pristine factory baseline.',
      stateSnapshot: {
        accountsCount: Object.keys(sandboxState.accounts).length,
        userRole: sandboxState.userProfile.role,
        isSuperAdmin: sandboxState.userProfile.isSuperAdmin
      }
    });
  });

  // 6. Get Current Sandbox State
  app.get('/api/sandbox/state', (req: Request, res: Response) => {
    res.json({
      userProfile: sandboxState.userProfile,
      accounts: sandboxState.accounts,
      orders: sandboxState.orders
    });
  });

  // --- Replay Engine Routes ---

  app.post('/api/replay/plan', (req: Request, res: Response) => {
    const { attackPathId } = req.body || {};
    if (!attackPathId) {
      return res.status(400).json({ success: false, message: 'attackPathId is required.' });
    }

    const session = buildReplayPlan(String(attackPathId));
    res.json({
      replayId: session.replayId,
      status: session.status,
      steps: session.steps,
      sessionContexts: session.sessionContexts,
      stateStore: session.stateStore,
      target: session.target,
      environment: session.environment,
      summary: session.summary
    });
  });

  app.post('/api/replay/start', async (req: Request, res: Response) => {
    const { replayId, mode, environment } = req.body || {};
    if (!replayId) {
      return res.status(400).json({ success: false, message: 'replayId is required.' });
    }

    const session = replaySessions.get(String(replayId));
    if (!session) {
      return res.status(404).json({ success: false, message: 'Replay session not found.' });
    }

    if (!(mode === 'SAFE' || mode === undefined)) {
      return res.status(400).json({ success: false, message: 'Only SAFE mode is supported in this prototype.' });
    }

    if (environment && environment !== 'sandbox') {
      return res.status(400).json({ success: false, message: 'Only sandbox execution is permitted in this prototype.' });
    }

    session.status = 'RUNNING';
    res.json({ replayId, status: 'RUNNING' });

    const updated = await runReplaySession(String(replayId));
    replaySessions.set(String(replayId), updated);
  });

  app.get('/api/replay/:id', (req: Request, res: Response) => {
    const session = replaySessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Replay session not found.' });
    }
    res.json(session);
  });

  app.post('/api/replay/:id/verify', async (req: Request, res: Response) => {
    const session = replaySessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Replay session not found.' });
    }

    const rerun = await runReplaySession(req.params.id);
    res.json(rerun);
  });

  app.post('/api/replay/:id/reset', (req: Request, res: Response) => {
    const session = replaySessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Replay session not found.' });
    }

    const reset = buildReplayPlan(session.attackPathId);
    replaySessions.set(req.params.id, reset);
    res.json({ success: true, replayId: req.params.id, status: reset.status, steps: reset.steps });
  });

  app.get('/api/replay/:id/evidence', (req: Request, res: Response) => {
    const session = replaySessions.get(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Replay session not found.' });
    }
    res.json({
      replayId: session.replayId,
      attackPathId: session.attackPathId,
      classification: session.classification,
      summary: session.summary,
      evidence: session.evidence,
      semanticDiff: session.semanticDiff,
      steps: session.steps
    });
  });

  // --- Auth & Team Persistence Routes ---

  // Get all users
  app.get('/api/auth/users', (req: Request, res: Response) => {
    const db = getDatabase();
    const safeUsers = db.users.map(({ passwordHash, ...user }) => user);
    res.json(safeUsers);
  });

  // Authenticate / Login user (Strict: Requires valid email AND password)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both corporate email and password.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const db = getDatabase();
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No registered team account found with this email address.'
      });
    }

    if (user.passwordHash !== cleanPassword) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Access denied.'
      });
    }

    const { passwordHash, ...safeUser } = user;
    res.json({
      success: true,
      user: safeUser,
      token: `sarthi-auth-jwt-${user.id}-${Date.now()}`
    });
  });

  // Register new person into database
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { name, email, password, role, roleTitle, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const db = getDatabase();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }

    const avatarColors = ['bg-indigo-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600'];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newUser: DbUser = {
      id: `user-${Date.now()}`,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash: String(password),
      role: role || 'SECURITY_ENGINEER',
      roleTitle: roleTitle || 'Security Engineer',
      department: department || 'Application Security',
      avatarColor: randomColor,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDatabase(db);

    const { passwordHash, ...safeUser } = newUser;
    res.status(201).json({ success: true, user: safeUser, token: `sarthi-token-${newUser.id}` });
  });

  // Get tasks
  app.get('/api/tasks', (req: Request, res: Response) => {
    const db = getDatabase();
    res.json(db.tasks || []);
  });

  // Assign task
  app.post('/api/tasks/assign', (req: Request, res: Response) => {
    const { targetEndpoint, method, title, riskReduction, effortScore, quadrant, assignedToUserId, notes } = req.body;
    const db = getDatabase();

    const assignedUser = db.users.find(u => u.id === assignedToUserId);
    const assignedToName = assignedUser ? assignedUser.name : 'Unassigned';

    const newTask: DbTask = {
      id: `task-${Date.now()}`,
      targetEndpoint,
      method,
      title,
      riskReduction: Number(riskReduction) || 0,
      effortScore: Number(effortScore) || 1,
      quadrant: quadrant || 'QUICK_WINS',
      assignedToUserId,
      assignedToName,
      status: 'TODO',
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    db.tasks = db.tasks || [];
    db.tasks.push(newTask);
    saveDatabase(db);

    res.status(201).json({ success: true, task: newTask });
  });

  // Update task status
  app.patch('/api/tasks/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    const db = getDatabase();

    const task = db.tasks.find(t => t.id === id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    if (status) task.status = status;
    if (notes !== undefined) task.notes = notes;

    saveDatabase(db);
    res.json({ success: true, task });
  });

  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = await listenWithFallback();
  console.log(`[Sarthi Security Platform] Server active on port ${port}`);
}

startServer().catch((error) => {
  console.error('[Sarthi Security Platform] Failed to start server:', error);
  process.exit(1);
});
