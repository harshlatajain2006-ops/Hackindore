/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiEndpoint } from '../types/security';

export interface PreloadedSpec {
  id: string;
  name: string;
  version: string;
  industry: string;
  description: string;
  swaggerRaw: string;
  endpoints: ApiEndpoint[];
}

export const SAMPLE_SPECS: Record<string, PreloadedSpec> = {
  crapi: {
    id: 'crapi',
    name: 'crAPI (Completely Ridiculous API)',
    version: 'v2.1.0',
    industry: 'Automotive & IoT',
    description: 'OWASP benchmark vulnerable car fleet & community API with auth bypass, OTP lack of rate limiting, and vehicle BOLA/IDOR.',
    swaggerRaw: JSON.stringify({
      openapi: '3.0.3',
      info: {
        title: 'crAPI - Vehicle Fleet & Community Gateway',
        version: '2.1.0',
        description: 'Demonstrating OWASP API Top 10 vulnerabilities in modern microservices.'
      },
      paths: {
        '/auth/v2/user/login': {
          post: {
            summary: 'Authenticate user with email and password',
            tags: ['Authentication'],
            requestBody: { content: { 'application/json': { schema: { properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
            responses: { '200': { description: 'JWT Token returned', content: { 'application/json': { schema: { properties: { token: { type: 'string' }, user_id: { type: 'string' } } } } } } }
          }
        },
        '/auth/v2/user/verify-otp': {
          post: {
            summary: 'Verify 4-digit MFA OTP for password reset (No Rate Limiting)',
            tags: ['Authentication'],
            requestBody: { content: { 'application/json': { schema: { properties: { email: { type: 'string' }, otp: { type: 'string' } } } } } },
            responses: { '200': { description: 'OTP accepted, returns reset_token' } }
          }
        },
        '/auth/v2/user/reset-password': {
          post: {
            summary: 'Reset password using reset_token',
            tags: ['Authentication'],
            requestBody: { content: { 'application/json': { schema: { properties: { reset_token: { type: 'string' }, new_password: { type: 'string' } } } } } },
            responses: { '200': { description: 'Password changed successfully' } }
          }
        },
        '/identity/api/v2/user/dashboard': {
          get: {
            summary: 'Retrieve user profile, vehicles, and billing details',
            tags: ['Identity'],
            security: [{ bearerAuth: [] }],
            responses: { '200': { description: 'Contains user PII, SSN, and vehicle VIN list' } }
          }
        },
        '/workshop/api/shop/orders/{order_id}': {
          get: {
            summary: 'Fetch mechanic shop order details (IDOR Vulnerability)',
            tags: ['Workshop'],
            parameters: [{ name: 'order_id', in: 'path', required: true, schema: { type: 'string' } }],
            security: [{ bearerAuth: [] }],
            responses: { '200': { description: 'Order breakdown including credit card last 4 and vehicle VIN' } }
          }
        },
        '/workshop/api/merchant/{merchant_id}/payout': {
          post: {
            summary: 'Execute vendor merchant balance payout',
            tags: ['Workshop'],
            parameters: [{ name: 'merchant_id', in: 'path', required: true, schema: { type: 'string' } }],
            security: [{ bearerAuth: [] }],
            responses: { '200': { description: 'Disburses balance to vendor account' } }
          }
        },
        '/community/api/v2/community/posts/recent': {
          get: {
            summary: 'List recent community forum vehicle posts (Leaks Author Internal IDs)',
            tags: ['Community'],
            responses: { '200': { description: 'Returns post list with author user_id and email' } }
          }
        },
        '/mechanic/api/service/request': {
          post: {
            summary: 'Submit privileged road service emergency dispatch',
            tags: ['Mechanic'],
            security: [{ bearerAuth: [] }],
            requestBody: { content: { 'application/json': { schema: { properties: { vin: { type: 'string' }, mechanic_code: { type: 'string' }, priority: { type: 'string' } } } } } },
            responses: { '200': { description: 'Dispatches emergency roadside technician' } }
          }
        }
      }
    }, null, 2),
    endpoints: [
      {
        id: 'ep-crapi-login',
        path: '/auth/v2/user/login',
        method: 'POST',
        summary: 'Authenticate user with email and password',
        tags: ['Authentication'],
        requiresAuth: false,
        authType: 'None',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['email', 'password'],
        responseFields: ['token', 'user_id', 'role'],
        producesTokens: ['token', 'user_id']
      },
      {
        id: 'ep-crapi-otp',
        path: '/auth/v2/user/verify-otp',
        method: 'POST',
        summary: 'Verify 4-digit MFA OTP for password reset',
        tags: ['Authentication'],
        requiresAuth: false,
        authType: 'None',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['email', 'otp'],
        responseFields: ['reset_token'],
        producesTokens: ['reset_token']
      },
      {
        id: 'ep-crapi-reset',
        path: '/auth/v2/user/reset-password',
        method: 'POST',
        summary: 'Reset password using reset_token',
        tags: ['Authentication'],
        requiresAuth: false,
        authType: 'None',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['reset_token', 'new_password'],
        responseFields: ['status', 'message', 'token'],
        producesTokens: ['token']
      },
      {
        id: 'ep-crapi-dashboard',
        path: '/identity/api/v2/user/dashboard',
        method: 'GET',
        summary: 'Retrieve user profile, vehicles, and billing details',
        tags: ['Identity'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: [],
        queryParameters: [],
        responseFields: ['email', 'phone', 'ssn_last4', 'vehicles', 'balance'],
        sensitiveDataExposed: ['ssn_last4', 'vehicles', 'balance']
      },
      {
        id: 'ep-crapi-orders',
        path: '/workshop/api/shop/orders/{order_id}',
        method: 'GET',
        summary: 'Fetch mechanic shop order details (IDOR Vulnerability)',
        tags: ['Workshop'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: ['order_id'],
        queryParameters: [],
        responseFields: ['order_id', 'vin', 'owner_id', 'payment_status', 'invoice_url'],
        sensitiveDataExposed: ['vin', 'owner_id', 'invoice_url']
      },
      {
        id: 'ep-crapi-posts',
        path: '/community/api/v2/community/posts/recent',
        method: 'GET',
        summary: 'List recent community forum vehicle posts (Leaks Author Internal IDs)',
        tags: ['Community'],
        requiresAuth: false,
        authType: 'None',
        pathParameters: [],
        queryParameters: ['limit'],
        responseFields: ['post_id', 'author_id', 'author_email', 'vin_preview'],
        sensitiveDataExposed: ['author_id', 'author_email', 'vin_preview']
      },
      {
        id: 'ep-crapi-payout',
        path: '/workshop/api/merchant/{merchant_id}/payout',
        method: 'POST',
        summary: 'Execute vendor merchant balance payout',
        tags: ['Workshop'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: ['merchant_id'],
        queryParameters: [],
        requestBodyFields: ['amount', 'routing_number'],
        responseFields: ['transfer_id', 'status', 'cleared_amount']
      },
      {
        id: 'ep-crapi-mechanic',
        path: '/mechanic/api/service/request',
        method: 'POST',
        summary: 'Submit privileged road service emergency dispatch',
        tags: ['Mechanic'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['vin', 'mechanic_code', 'priority'],
        responseFields: ['dispatch_id', 'status', 'assigned_crew']
      }
    ]
  },
  fintech: {
    id: 'fintech',
    name: 'vAPI FinTech Banking Gateway',
    version: 'v3.4.0',
    industry: 'Financial Services',
    description: 'Core banking microservices suite containing account enumeration, BOLA on ledger accounts, and administrative approval flaws.',
    swaggerRaw: JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'vAPI FinTech Core Gateway', version: '3.4.0' },
      paths: {
        '/api/v1/auth/token': {
          post: { summary: 'Acquire user access token', tags: ['Auth'] }
        },
        '/api/v1/users/{id}/accounts': {
          get: { summary: 'Query account balances and card numbers (BOLA/IDOR)', tags: ['Accounts'] }
        },
        '/api/v1/cards/{card_id}/cvv': {
          get: { summary: 'Expose plaintext CVV and PIN code', tags: ['Cards'] }
        },
        '/api/v1/transfers/send': {
          post: { summary: 'Initiate external wire transfer', tags: ['Transfers'] }
        },
        '/api/v1/admin/refunds/{id}/approve': {
          post: { summary: 'Authorize immediate merchant chargeback refund (BFLA)', tags: ['Admin'] }
        }
      }
    }, null, 2),
    endpoints: [
      {
        id: 'ep-fin-token',
        path: '/api/v1/auth/token',
        method: 'POST',
        summary: 'Acquire user access token',
        tags: ['Auth'],
        requiresAuth: false,
        authType: 'None',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['client_id', 'client_secret', 'grant_type'],
        responseFields: ['access_token', 'user_id', 'scope'],
        producesTokens: ['access_token', 'user_id']
      },
      {
        id: 'ep-fin-accounts',
        path: '/api/v1/users/{id}/accounts',
        method: 'GET',
        summary: 'Query account balances and card numbers (BOLA/IDOR)',
        tags: ['Accounts'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: ['id'],
        queryParameters: [],
        responseFields: ['account_id', 'balance', 'card_id', 'routing_number'],
        sensitiveDataExposed: ['balance', 'card_id', 'routing_number']
      },
      {
        id: 'ep-fin-cards',
        path: '/api/v1/cards/{card_id}/cvv',
        method: 'GET',
        summary: 'Expose plaintext CVV and PIN code (Excessive Data Exposure)',
        tags: ['Cards'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: ['card_id'],
        queryParameters: [],
        responseFields: ['card_number', 'expiry', 'cvv', 'pin_hash'],
        sensitiveDataExposed: ['cvv', 'pin_hash']
      },
      {
        id: 'ep-fin-transfers',
        path: '/api/v1/transfers/send',
        method: 'POST',
        summary: 'Initiate external wire transfer without idempotency check',
        tags: ['Transfers'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['source_account', 'destination_account', 'amount', 'currency'],
        responseFields: ['transaction_id', 'status', 'fee']
      },
      {
        id: 'ep-fin-refund-approve',
        path: '/api/v1/admin/refunds/{id}/approve',
        method: 'POST',
        summary: 'Authorize immediate merchant chargeback refund (BFLA)',
        tags: ['Admin'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: ['id'],
        queryParameters: [],
        requestBodyFields: ['override_reason'],
        responseFields: ['refund_id', 'status', 'cleared_amount']
      }
    ]
  },
  healthtrack: {
    id: 'healthtrack',
    name: 'HealthTrack FHIR Telehealth API',
    version: 'v1.8.0',
    industry: 'Healthcare & EHR',
    description: 'HIPAA-sensitive healthcare platform with patient record IDOR, unauthenticated diagnostic logs, and prescription mass assignment.',
    swaggerRaw: JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'HealthTrack FHIR API', version: '1.8.0' },
      paths: {
        '/api/patient/login': { post: { summary: 'Patient portal authentication' } },
        '/api/records/{patient_id}/ehr': { get: { summary: 'Electronic Health Record (BOLA)' } },
        '/api/prescriptions/{rx_id}': { put: { summary: 'Update prescription dosage (Mass Assignment)' } },
        '/api/doctor/notes/{note_id}': { get: { summary: 'Psychiatric notes and diagnosis' } },
        '/api/admin/audit-logs': { get: { summary: 'System HIPAA access logs (No Auth)' } }
      }
    }, null, 2),
    endpoints: [
      {
        id: 'ep-health-login',
        path: '/api/patient/login',
        method: 'POST',
        summary: 'Patient portal authentication',
        tags: ['Authentication'],
        requiresAuth: false,
        authType: 'None',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['mrn', 'password'],
        responseFields: ['session_token', 'patient_id'],
        producesTokens: ['session_token', 'patient_id']
      },
      {
        id: 'ep-health-ehr',
        path: '/api/records/{patient_id}/ehr',
        method: 'GET',
        summary: 'Electronic Health Record (BOLA / IDOR Vulnerability)',
        tags: ['EHR'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: ['patient_id'],
        queryParameters: [],
        responseFields: ['patient_id', 'diagnosis', 'medications', 'ssn', 'insurance_id'],
        sensitiveDataExposed: ['diagnosis', 'ssn', 'insurance_id']
      },
      {
        id: 'ep-health-rx',
        path: '/api/prescriptions/{rx_id}',
        method: 'PUT',
        summary: 'Update prescription dosage (Mass Assignment flaw)',
        tags: ['Pharmacy'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: ['rx_id'],
        queryParameters: [],
        requestBodyFields: ['refills_remaining', 'is_approved_by_md', 'controlled_substance_override'],
        responseFields: ['rx_id', 'status', 'dispense_date']
      },
      {
        id: 'ep-health-notes',
        path: '/api/doctor/notes/{note_id}',
        method: 'GET',
        summary: 'Psychiatric consultation notes and confidential diagnosis',
        tags: ['Clinical'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: ['note_id'],
        queryParameters: [],
        responseFields: ['note_id', 'doctor_id', 'patient_id', 'transcript', 'icd10_code'],
        sensitiveDataExposed: ['transcript', 'icd10_code']
      },
      {
        id: 'ep-health-audit',
        path: '/api/admin/audit-logs',
        method: 'GET',
        summary: 'System HIPAA access logs (Missing Authentication)',
        tags: ['Admin'],
        requiresAuth: false,
        authType: 'None',
        pathParameters: [],
        queryParameters: ['since'],
        responseFields: ['logs', 'user_ip', 'accessed_records'],
        sensitiveDataExposed: ['accessed_records', 'user_ip']
      }
    ]
  },
  saas: {
    id: 'saas',
    name: 'CloudOps B2B Multi-Tenant Platform',
    version: 'v4.0.0',
    industry: 'Enterprise SaaS',
    description: 'Multi-tenant cloud management API with cross-tenant isolation breakdown, role elevation, and unauthenticated internal webhooks.',
    swaggerRaw: JSON.stringify({
      openapi: '3.0.3',
      info: { title: 'CloudOps Platform API', version: '4.0.0' },
      paths: {
        '/auth/sso': { post: { summary: 'SAML / OAuth enterprise login' } },
        '/orgs/{org_id}/members': { get: { summary: 'Tenant membership directory' } },
        '/invites/accept': { post: { summary: 'Accept team invitation with role tampering' } },
        '/webhooks/internal/dispatch': { post: { summary: 'Internal job runner (SSRF)' } },
        '/billing/subscription/upgrade': { post: { summary: 'Plan modification' } }
      }
    }, null, 2),
    endpoints: [
      {
        id: 'ep-saas-sso',
        path: '/auth/sso',
        method: 'POST',
        summary: 'SAML / OAuth enterprise login',
        tags: ['Auth'],
        requiresAuth: false,
        authType: 'None',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['domain', 'assertion'],
        responseFields: ['auth_token', 'org_id', 'user_id', 'role'],
        producesTokens: ['auth_token', 'org_id', 'user_id']
      },
      {
        id: 'ep-saas-members',
        path: '/orgs/{org_id}/members',
        method: 'GET',
        summary: 'Tenant membership directory (Cross-Tenant BOLA)',
        tags: ['Organization'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: ['org_id'],
        queryParameters: [],
        responseFields: ['members', 'api_keys', 'billing_admin_email'],
        sensitiveDataExposed: ['api_keys', 'billing_admin_email']
      },
      {
        id: 'ep-saas-invite',
        path: '/invites/accept',
        method: 'POST',
        summary: 'Accept team invitation with role tampering (BOPLA)',
        tags: ['Invites'],
        requiresAuth: false,
        authType: 'None',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['invite_token', 'role', 'is_super_admin'],
        responseFields: ['membership_id', 'status', 'granted_role']
      },
      {
        id: 'ep-saas-webhook',
        path: '/webhooks/internal/dispatch',
        method: 'POST',
        summary: 'Internal job runner & webhook dispatch (SSRF / Missing Auth)',
        tags: ['Internal'],
        requiresAuth: false,
        authType: 'None',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['target_url', 'headers', 'payload'],
        responseFields: ['execution_id', 'response_code', 'response_body']
      },
      {
        id: 'ep-saas-upgrade',
        path: '/billing/subscription/upgrade',
        method: 'POST',
        summary: 'Plan modification without backend tier validation',
        tags: ['Billing'],
        requiresAuth: true,
        authType: 'Bearer',
        pathParameters: [],
        queryParameters: [],
        requestBodyFields: ['plan_name', 'price_cents_override', 'seats'],
        responseFields: ['subscription_id', 'status']
      }
    ]
  }
};
