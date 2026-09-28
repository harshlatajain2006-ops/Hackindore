/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProbeTest } from '../types/security';

export const BUILTIN_PROBES: ProbeTest[] = [
  {
    id: 'probe-apex-bola',
    name: 'BOLA / IDOR Account Balance Exfiltration',
    targetApi: 'Apex Banking Corp',
    endpoint: '/api/sandbox/accounts/acc-101',
    method: 'GET',
    targetVulnerability: 'Broken Object Level Authorization (IDOR)',
    owaspId: 'API1:2023',
    description: 'Requests high-value executive treasury account balance (acc-101) using low-privilege contractor token.',
    sampleHeaders: {
      'Authorization': 'Bearer guest-analyst-session-token',
      'X-Target-Account': 'acc-101',
      'Accept': 'application/json'
    },
    sampleBody: '',
    tamperPayload: 'acc-204',
    expectedVulnerabilityStatus: 200
  },
  {
    id: 'probe-apex-mass-assign',
    name: 'Mass Assignment Privilege Escalation to Super-Admin',
    targetApi: 'Apex Banking Corp',
    endpoint: '/api/sandbox/users/profile',
    method: 'PATCH',
    targetVulnerability: 'Broken Object Property Level Auth (Mass Assignment)',
    owaspId: 'API3:2023',
    description: 'Submits unwhitelisted administrative payload ({ "role": "ADMIN", "isSuperAdmin": true }) to escalate session privileges.',
    sampleHeaders: {
      'Authorization': 'Bearer contractor-token-xyz',
      'Content-Type': 'application/json'
    },
    sampleBody: JSON.stringify({
      name: 'Security Test Guest',
      role: 'ADMIN',
      isSuperAdmin: true,
      permissions: ['*']
    }, null, 2),
    tamperPayload: JSON.stringify({
      role: 'SUPER_ADMIN',
      isSuperAdmin: true,
      overrideApproval: true
    }, null, 2),
    expectedVulnerabilityStatus: 200
  },
  {
    id: 'probe-omni-cross-tenant',
    name: 'Cross-Tenant Supply Chain Order Interception',
    targetApi: 'OmniLogistics E-Commerce',
    endpoint: '/api/sandbox/orders/ord-9001',
    method: 'GET',
    targetVulnerability: 'Multi-Tenant Isolation Failure & BOLA',
    owaspId: 'API1:2023',
    description: 'Queries commercial shipping order ord-9001 belonging to tenant omni-us-east while authenticated under omni-eu-central.',
    sampleHeaders: {
      'X-Tenant-Context': 'omni-eu-central',
      'Authorization': 'Bearer tenant-token-eu'
    },
    sampleBody: '',
    tamperPayload: 'ord-9002',
    expectedVulnerabilityStatus: 200
  },
  {
    id: 'probe-jwt-secret-forge',
    name: 'Weak HMAC Secret Forgery & Signature Bypass',
    targetApi: 'MedSecure Health Systems',
    endpoint: '/api/sandbox/tokens/forge',
    method: 'POST',
    targetVulnerability: 'Broken Authentication (Weak Secret Key)',
    owaspId: 'API2:2023',
    description: 'Tests offline brute-forced dictionary key ("secret123") against JWT verification routine to mint arbitrary administrative bearer tokens.',
    sampleHeaders: {
      'Content-Type': 'application/json'
    },
    sampleBody: JSON.stringify({
      secret: 'secret123',
      targetRole: 'HOSPITAL_CHIEF_ADMIN',
      algorithm: 'HS256'
    }, null, 2),
    tamperPayload: JSON.stringify({
      secret: 'secret123',
      targetRole: 'SUPER_ADMIN',
      algorithm: 'none'
    }, null, 2),
    expectedVulnerabilityStatus: 200
  }
];
