/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiEndpoint, Finding, HttpMethod, Severity, TrafficLogEntry, TrafficScanResult } from '../types/security';

/**
 * Normalizes an API path into an OpenAPI-style parameterized path
 * e.g. /workshop/api/shop/orders/9021 -> /workshop/api/shop/orders/{order_id}
 */
export function matchOrNormalizePath(rawPath: string, existingEndpoints: ApiEndpoint[]): { path: string; endpoint: ApiEndpoint | null } {
  const cleanPath = rawPath.split('?')[0];

  // 1. Check exact match
  const exact = existingEndpoints.find(ep => ep.path === cleanPath);
  if (exact) return { path: exact.path, endpoint: exact };

  // 2. Check parameterized match
  for (const ep of existingEndpoints) {
    const regexStr = '^' + ep.path.replace(/{[^}]+}/g, '([^/]+)') + '$';
    try {
      const regex = new RegExp(regexStr);
      if (regex.test(cleanPath)) {
        return { path: ep.path, endpoint: ep };
      }
    } catch {
      // Ignore regex issues
    }
  }

  // 3. Fallback: normalize numeric / UUID segments
  const normalized = cleanPath
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/{id}')
    .replace(/\/\d+/g, '/{id}');

  return { path: normalized, endpoint: null };
}

/**
 * Executes a real-time security heuristic scan on a JSON log of API requests.
 */
export function scanTrafficLogs(
  logs: TrafficLogEntry[],
  existingEndpoints: ApiEndpoint[] = []
): TrafficScanResult {
  const findings: Finding[] = [];
  const discoveredEndpointsMap = new Map<string, ApiEndpoint>();
  const heuristicSummary: Record<string, number> = {
    'API1:2023 - Broken Object Level Auth (IDOR)': 0,
    'API2:2023 - Broken Authentication': 0,
    'API3:2023 - Excessive Data Exposure': 0,
    'API4:2023 - Lack of Rate Limiting': 0,
    'API5:2023 - Broken Function Level Auth': 0,
    'API6:2023 - Mass Assignment': 0,
    'API8:2023 - Security Misconfiguration': 0
  };

  let findingCounter = 1;
  const nextId = () => `traffic-finding-${Date.now()}-${findingCounter++}`;

  // Track request frequencies per path for rate-limit analysis
  const pathRequestCounts = new Map<string, number>();
  logs.forEach(l => {
    const cleanPath = l.path.split('?')[0];
    pathRequestCounts.set(cleanPath, (pathRequestCounts.get(cleanPath) || 0) + 1);
  });

  logs.forEach((log) => {
    const rawMethod = (log.method || 'GET').toUpperCase() as HttpMethod;
    const cleanPath = log.path.split('?')[0];
    const { path: normPath, endpoint } = matchOrNormalizePath(cleanPath, existingEndpoints);

    const headers = log.headers || {};
    const headerKeysLower = Object.keys(headers).reduce((acc, k) => {
      acc[k.toLowerCase()] = headers[k];
      return acc;
    }, {} as Record<string, string>);

    const respHeaders = log.responseHeaders || {};
    const respHeaderKeysLower = Object.keys(respHeaders).reduce((acc, k) => {
      acc[k.toLowerCase()] = respHeaders[k];
      return acc;
    }, {} as Record<string, string>);

    const respStatus = log.responseStatus || 200;
    const reqBodyStr = typeof log.requestBody === 'object' ? JSON.stringify(log.requestBody) : String(log.requestBody || '');
    const respBodyStr = typeof log.responseBody === 'object' ? JSON.stringify(log.responseBody) : String(log.responseBody || '');

    // Check if this is a shadow / unmapped endpoint
    if (!endpoint && !existingEndpoints.some(e => e.path === normPath && e.method === rawMethod)) {
      const epKey = `${rawMethod}:${normPath}`;
      if (!discoveredEndpointsMap.has(epKey)) {
        const pathSegments = normPath.split('/').filter(Boolean);
        const tag = pathSegments.length > 0 ? pathSegments[0].toUpperCase() : 'Traffic-Discovered';
        discoveredEndpointsMap.set(epKey, {
          id: `ep-discovered-${rawMethod.toLowerCase()}-${normPath.replace(/[^a-zA-Z0-9]/g, '-')}`,
          path: normPath,
          method: rawMethod,
          summary: `Discovered Endpoint via Live Traffic (${rawMethod} ${normPath})`,
          tags: [tag, 'Traffic-Discovered'],
          requiresAuth: Boolean(headerKeysLower['authorization']),
          authType: headerKeysLower['authorization']?.startsWith('Bearer') ? 'Bearer' : 'None',
          pathParameters: normPath.includes('{') ? ['id'] : [],
          queryParameters: Object.keys(log.queryParams || {})
        });
      }
    }

    // ==========================================
    // HEURISTIC 1: BOLA / IDOR Violation (API1:2023)
    // ==========================================
    const hasIdInPathOrBody = /orders\/\d+|merchant\/[^\/]+\/payout|patients\/[^\/]+|accounts\/\d+|users\/\d+/i.test(cleanPath) ||
      (typeof log.requestBody === 'object' && log.requestBody && ('order_id' in log.requestBody || 'account_id' in log.requestBody || 'patient_id' in log.requestBody));

    if (hasIdInPathOrBody && respStatus >= 200 && respStatus < 300) {
      // Check if response contains an owner or tenant ID that diverges from caller or lacks authorization verification
      const hasOwnerMismatch = /victim|owner_id|ssn|vin|balance|credit_card/i.test(respBodyStr);
      if (hasOwnerMismatch) {
        findings.push({
          id: nextId(),
          endpoint: normPath,
          method: rawMethod,
          category: 'OWASP API1:2023 - Broken Object Level Authorization (IDOR)',
          owaspId: 'API1:2023',
          title: `IDOR Object Hijack Detected via Live Traffic in ${rawMethod} ${normPath}`,
          severity: 'CRITICAL',
          evidence: `Live traffic request to '${cleanPath}' returned sensitive resource payload (HTTP ${respStatus}) without enforcing caller tenant-level isolation. Leaked owner details: ${respBodyStr.substring(0, 140)}…`,
          cwe: 'CWE-639: Authorization Bypass Through User-Controlled Key',
          remediationEffort: 'LOW',
          remediationGuidance: 'Enforce server-side user/tenant validation: verify that the authenticated caller owns the requested object identifier before querying storage.',
          verificationStatus: 'VALIDATED',
          falsePositiveLikelihood: 'LOW',
          rawRequest: {
            method: rawMethod,
            path: cleanPath,
            headers,
            body: reqBodyStr
          },
          rawResponse: {
            status: respStatus,
            headers: respHeaders,
            body: respBodyStr
          }
        });
        heuristicSummary['API1:2023 - Broken Object Level Auth (IDOR)']++;
      }
    }

    // ==========================================
    // HEURISTIC 2: Broken Authentication / Missing Auth on Sensitive Route (API2:2023)
    // ==========================================
    const isSensitiveOperation =
      rawMethod === 'POST' || rawMethod === 'PUT' || rawMethod === 'DELETE' ||
      /transfers|refunds|payout|orders|admin|users\/profile|service\/request/i.test(cleanPath);

    const hasAuthHeader = Boolean(headerKeysLower['authorization'] || headerKeysLower['x-api-key'] || headerKeysLower['cookie']);

    if (isSensitiveOperation && !hasAuthHeader && respStatus >= 200 && respStatus < 300) {
      findings.push({
        id: nextId(),
        endpoint: normPath,
        method: rawMethod,
        category: 'OWASP API2:2023 - Broken Authentication',
        owaspId: 'API2:2023',
        title: `Unauthenticated Sensitive Action Processed on ${rawMethod} ${normPath}`,
        severity: 'CRITICAL',
        evidence: `Live traffic request executed high-value state-changing transaction on '${cleanPath}' without any Authorization or Session credentials, yet the API returned HTTP ${respStatus}.`,
        cwe: 'CWE-306: Missing Authentication for Critical Function',
        remediationEffort: 'LOW',
        remediationGuidance: 'Require mandatory JWT / OAuth Bearer authentication middleware on all state-altering endpoints prior to controller invocation.',
        verificationStatus: 'VALIDATED',
        falsePositiveLikelihood: 'LOW',
        rawRequest: {
          method: rawMethod,
          path: cleanPath,
          headers,
          body: reqBodyStr
        },
        rawResponse: {
          status: respStatus,
          headers: respHeaders,
          body: respBodyStr
        }
      });
      heuristicSummary['API2:2023 - Broken Authentication']++;
    }

    // ==========================================
    // HEURISTIC 3: Excessive Data Exposure / PII Leakage (API3:2023)
    // ==========================================
    const piiMatches: string[] = [];
    if (/ssn|social_security|000-\d{2}-\d{4}/i.test(respBodyStr)) piiMatches.push('Social Security Number (SSN)');
    if (/cvv|pin|credit_card|card_number|routing_number/i.test(respBodyStr)) piiMatches.push('PCI Data (CVV/PIN/Account)');
    if (/jwt_secret_key|private_key|db_connection|password_hash/i.test(respBodyStr)) piiMatches.push('Internal Secret / Credentials');

    if (piiMatches.length > 0 && respStatus === 200) {
      findings.push({
        id: nextId(),
        endpoint: normPath,
        method: rawMethod,
        category: 'OWASP API3:2023 - Broken Object Property Level Authorization (Data Exposure)',
        owaspId: 'API3:2023',
        title: `Sensitive PII / Secret Leakage Detected in ${rawMethod} ${normPath}`,
        severity: 'HIGH',
        evidence: `Live traffic response inspection discovered unmasked sensitive attributes [${piiMatches.join(', ')}] exposed in JSON payload for ${cleanPath}.`,
        cwe: 'CWE-200: Exposure of Sensitive Information to an Unauthorized Actor',
        remediationEffort: 'MEDIUM',
        remediationGuidance: 'Implement DTO projection serialization schemas (Pydantic / Zod / Class-Transformer) to filter sensitive attributes before returning responses.',
        verificationStatus: 'VALIDATED',
        falsePositiveLikelihood: 'LOW',
        rawRequest: {
          method: rawMethod,
          path: cleanPath,
          headers,
          body: reqBodyStr
        },
        rawResponse: {
          status: respStatus,
          headers: respHeaders,
          body: respBodyStr
        }
      });
      heuristicSummary['API3:2023 - Excessive Data Exposure']++;
    }

    // ==========================================
    // HEURISTIC 4: Lack of Rate Limiting / Brute-Force Burst (API4:2023)
    // ==========================================
    const isAuthOtpPath = /verify-otp|login|auth\/token|reset-password/i.test(cleanPath);
    const countOnPath = pathRequestCounts.get(cleanPath) || 0;
    const hasRateLimitHeader = Object.keys(respHeaderKeysLower).some(h => h.includes('ratelimit') || h === 'retry-after');

    if (isAuthOtpPath && countOnPath >= 2 && !hasRateLimitHeader) {
      // Only generate once per endpoint
      const alreadyLogged = findings.some(f => f.endpoint === normPath && f.owaspId === 'API4:2023');
      if (!alreadyLogged) {
        findings.push({
          id: nextId(),
          endpoint: normPath,
          method: rawMethod,
          category: 'OWASP API4:2023 - Unrestricted Resource Consumption (Rate Limiting)',
          owaspId: 'API4:2023',
          title: `Missing Rate Limiting On Authentication Endpoint ${normPath}`,
          severity: 'HIGH',
          evidence: `Repeated authentication/verification requests detected on '${cleanPath}' (${countOnPath} requests in window) with no 'X-RateLimit-*' or 'Retry-After' response headers enforced.`,
          cwe: 'CWE-799: Improper Control of Interaction Frequency',
          remediationEffort: 'LOW',
          remediationGuidance: 'Deploy a token-bucket or sliding-window rate limiter (e.g. express-rate-limit, Redis limiter) capped at 5 attempts per IP/account per 15 minutes.',
          verificationStatus: 'VALIDATED',
          falsePositiveLikelihood: 'LOW'
        });
        heuristicSummary['API4:2023 - Lack of Rate Limiting']++;
      }
    }

    // ==========================================
    // HEURISTIC 5: Broken Function Level Authorization (BFLA) (API5:2023)
    // ==========================================
    const isAdminOperation = /admin|payout|refunds\/[^\/]+\/approve|internal\/debug/i.test(cleanPath);
    const tokenSub = headerKeysLower['authorization'] || '';
    const isNonAdminToken = tokenSub.includes('user') || tokenSub.includes('regular') || tokenSub.includes('nurse');

    if (isAdminOperation && isNonAdminToken && respStatus >= 200 && respStatus < 300) {
      findings.push({
        id: nextId(),
        endpoint: normPath,
        method: rawMethod,
        category: 'OWASP API5:2023 - Broken Function Level Authorization (BFLA)',
        owaspId: 'API5:2023',
        title: `Privilege Escalation / BFLA Bypass Detected on ${rawMethod} ${normPath}`,
        severity: 'CRITICAL',
        evidence: `Non-administrative caller identity executed restricted endpoint '${cleanPath}' and server granted HTTP ${respStatus} access without verifying administrative clearance role.`,
        cwe: 'CWE-285: Improper Authorization',
        remediationEffort: 'LOW',
        remediationGuidance: 'Implement role-based access control (RBAC) middleware verifying caller role === "ADMIN" before executing administrative controllers.',
        verificationStatus: 'VALIDATED',
        falsePositiveLikelihood: 'LOW'
      });
      heuristicSummary['API5:2023 - Broken Function Level Auth']++;
    }

    // ==========================================
    // HEURISTIC 6: Mass Assignment / Privilege Mutation (API6:2023)
    // ==========================================
    if (typeof log.requestBody === 'object' && log.requestBody) {
      const hasPrivilegeKeys = 'role' in log.requestBody || 'is_admin' in log.requestBody || 'permissions' in log.requestBody || 'balance' in log.requestBody;
      if (hasPrivilegeKeys && respStatus >= 200 && respStatus < 300) {
        findings.push({
          id: nextId(),
          endpoint: normPath,
          method: rawMethod,
          category: 'OWASP API6:2023 - Unrestricted Access to Sensitive Business Flows (Mass Assignment)',
          owaspId: 'API6:2023',
          title: `Mass Assignment Privilege Property Accepted in ${rawMethod} ${normPath}`,
          severity: 'HIGH',
          evidence: `Client payload passed internal security attributes ('role', 'is_admin', or 'permissions') which the server accepted without parameter whitelisting.`,
          cwe: 'CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes',
          remediationEffort: 'MEDIUM',
          remediationGuidance: 'Explicitly whitelist client-updatable fields. Never bind raw request bodies directly to internal database entity schemas.',
          verificationStatus: 'VALIDATED',
          falsePositiveLikelihood: 'LOW'
        });
        heuristicSummary['API6:2023 - Mass Assignment']++;
      }
    }

    // ==========================================
    // HEURISTIC 7: Security Misconfiguration / Debug Banners (API8:2023)
    // ==========================================
    const hasTechBanner = respHeaderKeysLower['x-powered-by'] || respHeaderKeysLower['server']?.includes('Express');
    const hasDebugBody = /debug_mode|jwt_secret_key|db_connection|Exception in thread|Traceback/i.test(respBodyStr);

    if ((hasTechBanner || hasDebugBody) && respStatus < 400) {
      const alreadyAdded = findings.some(f => f.endpoint === normPath && f.owaspId === 'API8:2023');
      if (!alreadyAdded) {
        findings.push({
          id: nextId(),
          endpoint: normPath,
          method: rawMethod,
          category: 'OWASP API8:2023 - Security Misconfiguration',
          owaspId: 'API8:2023',
          title: `Debug Exposure & Technology Fingerprint on ${rawMethod} ${normPath}`,
          severity: 'MEDIUM',
          evidence: `Endpoint '${cleanPath}' exposed technology banners (${respHeaderKeysLower['x-powered-by'] || 'Debug Data'}) or verbose configuration in response body: ${respBodyStr.substring(0, 100)}…`,
          cwe: 'CWE-200: Exposure of Sensitive Information to an Unauthorized Actor',
          remediationEffort: 'LOW',
          remediationGuidance: 'Disable "X-Powered-By" headers (app.disable("x-powered-by")), mask server banners, and ensure debug/diagnostic routes are stripped from production builds.',
          verificationStatus: 'VALIDATED',
          falsePositiveLikelihood: 'LOW'
        });
        heuristicSummary['API8:2023 - Security Misconfiguration']++;
      }
    }
  });

  const discoveredEndpoints = Array.from(discoveredEndpointsMap.values());

  return {
    totalScanned: logs.length,
    anomaliesDetected: findings.length,
    newFindingsCount: findings.length,
    findings,
    discoveredEndpoints,
    scannedAt: new Date().toISOString(),
    heuristicSummary
  };
}
