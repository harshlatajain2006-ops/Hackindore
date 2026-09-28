/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TrafficLogEntry } from '../types/security';

export interface SampleTrafficLogSet {
  id: string;
  name: string;
  targetApi: string;
  description: string;
  entries: TrafficLogEntry[];
}

export const SAMPLE_TRAFFIC_LOGS: SampleTrafficLogSet[] = [
  {
    id: 'crapi-attack-traffic',
    name: 'crAPI Real-World Attack Trace',
    targetApi: 'crAPI Automotive Gateway',
    description: 'Captured gateway traffic showing OTP brute-force, IDOR order scraping across victim IDs, and unauthorized merchant payout invocation.',
    entries: [
      {
        id: 'req-crapi-001',
        timestamp: '2026-09-27T10:14:01Z',
        method: 'POST',
        path: '/auth/v2/user/login',
        headers: {
          'Host': 'api.crapi.internal',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
        },
        requestBody: { email: 'attacker.recon@offsec.lab', password: 'Password123!' },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEwMSIsInJvbGUiOiJ1c2VyIn0.sig', user_id: 'user-101' },
        durationMs: 45
      },
      {
        id: 'req-crapi-002',
        timestamp: '2026-09-27T10:14:04Z',
        method: 'POST',
        path: '/auth/v2/user/verify-otp',
        headers: {
          'Host': 'api.crapi.internal',
          'Content-Type': 'application/json',
          'User-Agent': 'Python/3.11 requests'
        },
        requestBody: { email: 'victim.executive@crapi.me', otp: '1042' },
        responseStatus: 401,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: { error: 'INVALID_OTP', message: 'The submitted OTP did not match.' },
        durationMs: 12
      },
      {
        id: 'req-crapi-003',
        timestamp: '2026-09-27T10:14:05Z',
        method: 'POST',
        path: '/auth/v2/user/verify-otp',
        headers: {
          'Host': 'api.crapi.internal',
          'Content-Type': 'application/json',
          'User-Agent': 'Python/3.11 requests'
        },
        requestBody: { email: 'victim.executive@crapi.me', otp: '1043' },
        responseStatus: 401,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: { error: 'INVALID_OTP', message: 'The submitted OTP did not match.' },
        durationMs: 11
      },
      {
        id: 'req-crapi-004',
        timestamp: '2026-09-27T10:14:06Z',
        method: 'POST',
        path: '/auth/v2/user/verify-otp',
        headers: {
          'Host': 'api.crapi.internal',
          'Content-Type': 'application/json',
          'User-Agent': 'Python/3.11 requests'
        },
        requestBody: { email: 'victim.executive@crapi.me', otp: '1044' },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: { reset_token: 'rst_tok_99182390a18f' },
        durationMs: 14
      },
      {
        id: 'req-crapi-005',
        timestamp: '2026-09-27T10:14:15Z',
        method: 'GET',
        path: '/workshop/api/shop/orders/9021',
        headers: {
          'Host': 'api.crapi.internal',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEwMSIsInJvbGUiOiJ1c2VyIn0.sig',
          'User-Agent': 'Mozilla/5.0'
        },
        responseStatus: 200,
        responseHeaders: {
          'Content-Type': 'application/json',
          'Server': 'Express/4.21.2',
          'X-Powered-By': 'Express'
        },
        responseBody: {
          order_id: '9021',
          owner_id: 'victim-corp-99',
          credit_card_last4: '9921',
          vin: 'VIN-990182-W21',
          total_price: 3450.00
        },
        durationMs: 38
      },
      {
        id: 'req-crapi-006',
        timestamp: '2026-09-27T10:14:22Z',
        method: 'POST',
        path: '/workshop/api/merchant/merchant-881/payout',
        headers: {
          'Host': 'api.crapi.internal',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEwMSIsInJvbGUiOiJ1c2VyIn0.sig',
          'Content-Type': 'application/json'
        },
        requestBody: { amount: 85000, routing_number: '021000021' },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: { transfer_id: 'tr-992144', status: 'INITIATED', cleared_amount: 85000 },
        durationMs: 65
      },
      {
        id: 'req-crapi-007',
        timestamp: '2026-09-27T10:14:35Z',
        method: 'GET',
        path: '/community/api/v2/community/posts/recent',
        headers: { 'Host': 'api.crapi.internal' },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: [
          { post_id: 'p-1', author_id: 'admin-0', author_email: 'fleet.admin@crapi.internal', vin_preview: 'VIN-001' }
        ],
        durationMs: 22
      },
      {
        id: 'req-crapi-008',
        timestamp: '2026-09-27T10:14:48Z',
        method: 'GET',
        path: '/api/v2/internal/debug-dump',
        headers: { 'Host': 'api.crapi.internal', 'X-Debug-Mode': 'true' },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json', 'X-Powered-By': 'Express' },
        responseBody: {
          env: 'production',
          db_connection: 'postgres://crapi_admin:Sup3rS3cr3t@10.0.1.4:5432/fleet_db',
          jwt_secret_key: 'crapi_jwt_dev_secret_key_2026'
        },
        durationMs: 18
      }
    ]
  },
  {
    id: 'fintech-wire-traffic',
    name: 'vAPI FinTech Suspicious Ledger Traffic',
    targetApi: 'vAPI Core Banking Gateway',
    description: 'Wire transfer logs demonstrating missing authentication verification, plaintext CVV payload reflection, and unauthorized BFLA refunds.',
    entries: [
      {
        id: 'req-fin-001',
        timestamp: '2026-09-27T10:18:00Z',
        method: 'POST',
        path: '/api/v1/auth/token',
        headers: { 'Content-Type': 'application/json' },
        requestBody: { client_id: 'corp-client-2', client_secret: 'secret-99' },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: { access_token: 'tok-regular-client', user_id: 'usr-client-2', scope: 'accounts:read' },
        durationMs: 31
      },
      {
        id: 'req-fin-002',
        timestamp: '2026-09-27T10:18:10Z',
        method: 'GET',
        path: '/api/v1/cards/card-8812/cvv',
        headers: {
          'Authorization': 'Bearer tok-regular-client',
          'User-Agent': 'Mozilla/5.0'
        },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json', 'Server': 'nginx/1.24' },
        responseBody: {
          card_id: 'card-8812',
          card_number: '4111-2222-3333-4444',
          cvv: '842',
          pin: '9012',
          expires: '12/28'
        },
        durationMs: 25
      },
      {
        id: 'req-fin-003',
        timestamp: '2026-09-27T10:18:25Z',
        method: 'POST',
        path: '/api/v1/transfers/send',
        headers: {
          'Content-Type': 'application/json'
        },
        requestBody: {
          from_account: 'acc-901',
          to_account: 'acc-attacker-99',
          amount: 250000,
          currency: 'USD'
        },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: { transfer_id: 'tx-881923', status: 'COMPLETED', reference: 'FEDWIRE-9901' },
        durationMs: 82
      },
      {
        id: 'req-fin-004',
        timestamp: '2026-09-27T10:18:40Z',
        method: 'POST',
        path: '/api/v1/admin/refunds/ref-401/approve',
        headers: {
          'Authorization': 'Bearer tok-regular-client',
          'Content-Type': 'application/json'
        },
        requestBody: { approver_override: true, reason: 'Disputed charge reversal' },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: { status: 'APPROVED_AND_DISBURSED', amount: 12000 },
        durationMs: 44
      }
    ]
  },
  {
    id: 'ehr-pii-traffic',
    name: 'HealthTrack EHR Patient Traffic',
    targetApi: 'HealthTrack EHR Platform',
    description: 'Hospital patient query logs demonstrating unmasked SSN exposure and mass assignment role privilege escalations.',
    entries: [
      {
        id: 'req-ehr-001',
        timestamp: '2026-09-27T10:22:01Z',
        method: 'GET',
        path: '/ehr/api/v1/patients/pt-88219/records',
        headers: { 'Authorization': 'Bearer nurse-session-token' },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json', 'X-Powered-By': 'Express' },
        responseBody: {
          patient_id: 'pt-88219',
          full_name: 'Jonathan Doe',
          ssn: '000-45-6789',
          medical_diagnosis: 'Acute Coronary Syndrome',
          prescription: 'Warfarin 5mg daily'
        },
        durationMs: 33
      },
      {
        id: 'req-ehr-002',
        timestamp: '2026-09-27T10:22:15Z',
        method: 'PUT',
        path: '/ehr/api/v1/users/profile',
        headers: {
          'Authorization': 'Bearer nurse-session-token',
          'Content-Type': 'application/json'
        },
        requestBody: {
          name: 'Jane Nurse',
          email: 'jane.nurse@hospital.org',
          role: 'ADMIN',
          is_admin: true,
          permissions: ['prescribe_controlled_substances', 'delete_audit_logs']
        },
        responseStatus: 200,
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: { success: true, updated_profile: { role: 'ADMIN', is_admin: true } },
        durationMs: 40
      }
    ]
  }
];
