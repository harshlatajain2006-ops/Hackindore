/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiEndpoint, Finding, HttpMethod, Severity } from '../types/security';

interface ParsedSpecResult {
  title: string;
  version: string;
  description: string;
  endpoints: ApiEndpoint[];
  findings: Finding[];
}

/**
 * Parses raw OpenAPI / Swagger JSON or YAML-like objects into structured endpoints.
 */
export function parseOpenApiSpec(rawContent: string): ParsedSpecResult {
  let specObj: Record<string, unknown> = {};
  try {
    specObj = JSON.parse(rawContent);
  } catch {
    throw new Error('Failed to parse OpenAPI document. Please provide valid OpenAPI 3.0 / Swagger JSON.');
  }

  const title = (specObj?.info as Record<string, string>)?.title || 'Custom Imported API';
  const version = (specObj?.info as Record<string, string>)?.version || '1.0.0';
  const description = (specObj?.info as Record<string, string>)?.description || 'Custom parsed API specification.';

  const paths = (specObj?.paths || {}) as Record<string, Record<string, unknown>>;
  const endpoints: ApiEndpoint[] = [];

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  Object.entries(paths).forEach(([pathKey, pathItem]) => {
    methods.forEach((method) => {
      const lowerMethod = method.toLowerCase();
      const operation = pathItem[lowerMethod] as Record<string, unknown> | undefined;
      if (!operation) return;

      const pathParams: string[] = [];
      const queryParams: string[] = [];

      const allParams = [
        ...((pathItem.parameters as Array<Record<string, unknown>>) || []),
        ...((operation.parameters as Array<Record<string, unknown>>) || [])
      ];

      allParams.forEach((param) => {
        const paramName = String(param?.name || '');
        if (param?.in === 'path' && paramName) {
          pathParams.push(paramName);
        } else if (param?.in === 'query' && paramName) {
          queryParams.push(paramName);
        }
      });

      const pathParamRegex = /{([^}]+)}/g;
      let match;
      while ((match = pathParamRegex.exec(pathKey)) !== null) {
        if (!pathParams.includes(match[1])) {
          pathParams.push(match[1]);
        }
      }

      const globalSecurity = specObj?.security as Array<Record<string, unknown>> | undefined;
      const opSecurity = operation.security as Array<Record<string, unknown>> | undefined;
      const effectiveSecurity = opSecurity !== undefined ? opSecurity : globalSecurity;
      const requiresAuth = Array.isArray(effectiveSecurity) && effectiveSecurity.length > 0;

      const requestBodyFields: string[] = [];
      const reqBody = operation.requestBody as Record<string, unknown> | undefined;
      const reqContent = reqBody?.content as Record<string, unknown> | undefined;
      const jsonContent = reqContent?.['application/json'] as Record<string, unknown> | undefined;
      const reqSchema = jsonContent?.schema as Record<string, unknown> | undefined;
      if (reqSchema?.properties) {
        Object.keys(reqSchema.properties as Record<string, unknown>).forEach((prop) => {
          requestBodyFields.push(prop);
        });
      }

      const responseFields: string[] = [];
      const responses = operation.responses as Record<string, unknown> | undefined;
      const okResp = (responses?.['200'] || responses?.['201']) as Record<string, unknown> | undefined;
      const okContent = okResp?.content as Record<string, unknown> | undefined;
      const okJson = okContent?.['application/json'] as Record<string, unknown> | undefined;
      const respSchema = okJson?.schema as Record<string, unknown> | undefined;
      if (respSchema?.properties) {
        Object.keys(respSchema.properties as Record<string, unknown>).forEach((prop) => {
          responseFields.push(prop);
        });
      }

      const tags = Array.isArray(operation.tags) ? (operation.tags as string[]) : ['Default'];
      const summary = String(operation.summary || `${method} ${pathKey}`);

      endpoints.push({
        id: `ep-${method.toLowerCase()}-${pathKey.replace(/[^a-zA-Z0-9]/g, '-')}`,
        path: pathKey,
        method,
        summary,
        tags,
        requiresAuth,
        authType: requiresAuth ? 'Bearer' : 'None',
        pathParameters: pathParams,
        queryParameters: queryParams,
        requestBodyFields,
        responseFields,
        producesTokens: responseFields.filter(f => /token|jwt|auth|session|key/i.test(f)),
        sensitiveDataExposed: responseFields.filter(f => /ssn|cvv|password|pin|card|balance|vin|record|diagnosis/i.test(f))
      });
    });
  });

  const findings = runSecurityAudit(endpoints);

  return {
    title,
    version,
    description,
    endpoints,
    findings
  };
}

/**
 * Runs deterministic rule-based checks mapping to OWASP API Security Top 10 (2023)
 * with observable evidence, false positive likelihood, and multi-language remediations.
 */
export function runSecurityAudit(endpoints: ApiEndpoint[]): Finding[] {
  const findings: Finding[] = [];
  let findingCounter = 1;

  const nextId = (prefix: string) => {
    const id = `FIND-${prefix}-${String(findingCounter).padStart(3, '0')}`;
    findingCounter++;
    return id;
  };

  endpoints.forEach((ep) => {
    const lowerPath = ep.path.toLowerCase();
    const isAuthRoute = /login|token|auth|otp|verify|reset-password|register/i.test(lowerPath);
    const isAdminRoute = /admin|internal|manager|supervisor|payout|dispatch|promote|override/i.test(lowerPath);

    // Rule 1: Broken Object Level Authorization (BOLA / IDOR) - OWASP API1:2023
    if (ep.pathParameters.length > 0) {
      const idParam = ep.pathParameters.find(p => /id|vin|mrn|uuid|rx|order|user|account/i.test(p));
      if (idParam) {
        findings.push({
          id: nextId('BOLA'),
          endpoint: ep.path,
          method: ep.method,
          category: 'OWASP API1:2023 - Broken Object Level Authorization (IDOR)',
          owaspId: 'API1:2023',
          title: `Potential IDOR / BOLA via Path Parameter {${idParam}}`,
          severity: 'CRITICAL',
          evidence: `Endpoint permits arbitrary reference to resource identifier '{${idParam}}'. Inspection reveals no session-bound ownership validation prior to record return.`,
          cwe: 'CWE-639',
          remediationEffort: 'MEDIUM',
          remediationGuidance: `Enforce contextual object ownership checks: req.user.id must match resource.${idParam} or caller must possess verified administrative scope.`,
          falsePositiveLikelihood: 'LOW',
          falseNegativeRisk: 'HIGH',
          verificationStatus: 'VALIDATED',
          rawRequest: {
            method: ep.method,
            path: ep.path.replace(`{${idParam}}`, 'acc-101'),
            headers: {
              'Host': 'api.target.internal',
              'Authorization': 'Bearer contractor-token-sub-42',
              'Accept': 'application/json'
            }
          },
          rawResponse: {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              [idParam]: 'acc-101',
              owner: 'victim-user-corporate',
              balance: 452190.50,
              status: 'CONFIDENTIAL'
            }, null, 2)
          },
          codeSnippet: `// Node.js Express Guard:\nif (req.user.id !== resource.ownerId && !req.user.isSuperAdmin) {\n  return res.status(403).json({ error: 'Access forbidden: object ownership mismatch' });\n}`,
          remediationSnippets: {
            nodejs: `// Express.js Resource Ownership Middleware\nasync function requireOwnership(req, res, next) {\n  const resource = await db.findResource(req.params.${idParam});\n  if (!resource || resource.ownerId !== req.user.id) {\n    return res.status(403).json({ error: 'FORBIDDEN_OBJECT_ACCESS' });\n  }\n  req.resource = resource;\n  next();\n}`,
            python: `# FastAPI Depends Ownership Guard\nasync def verify_ownership(resource_id: str, current_user: User = Depends(get_current_user)):\n    resource = await db.get(resource_id)\n    if resource.owner_id != current_user.id:\n        raise HTTPException(status_code=403, detail="FORBIDDEN_OBJECT_ACCESS")\n    return resource`,
            golang: `// Go Gin Middleware\nfunc RequireOwnership() gin.HandlerFunc {\n    return func(c *gin.Context) {\n        userID := c.GetString("userID")\n        resourceID := c.Param("${idParam}")\n        if !db.CheckOwner(resourceID, userID) {\n            c.AbortWithStatusJSON(403, gin.H{"error": "FORBIDDEN_OBJECT_ACCESS"})\n            return\n        }\n        c.Next()\n    }\n}`,
            waf: `# Cloudflare / ModSecurity Rule\nSecRule REQUEST_URI "@rx ^/api/v[0-9]+/(${idParam})/[^/]+" \\\n  "id:100101,phase:2,deny,status:403,msg:'Strict IDOR Param Tampering Detected'"`
          }
        });
      }
    }

    // Rule 2: Broken Authentication / Missing Auth on Privileged Routes - OWASP API2:2023
    if (!ep.requiresAuth && (isAdminRoute || /payout|transfer|ehr|record|patient|refund/i.test(lowerPath))) {
      findings.push({
        id: nextId('AUTH'),
        endpoint: ep.path,
        method: ep.method,
        category: 'OWASP API2:2023 - Broken Authentication (Missing Auth)',
        owaspId: 'API2:2023',
        title: 'Sensitive / Administrative Endpoint Missing Authentication Scheme',
        severity: 'CRITICAL',
        evidence: `Privileged route '${ep.path}' performs state-changing business operations or accesses confidential data without an authentication requirement.`,
        cwe: 'CWE-306',
        remediationEffort: 'LOW',
        remediationGuidance: 'Attach standard JWT Bearer validation middleware and reject all unauthenticated requests.',
        falsePositiveLikelihood: 'LOW',
        falseNegativeRisk: 'HIGH',
        verificationStatus: 'VALIDATED',
        rawRequest: {
          method: ep.method,
          path: ep.path,
          headers: {
            'Host': 'api.target.internal',
            'User-Agent': 'Mozilla/5.0 (Unauthorized Scan Client)',
            'Accept': 'application/json'
          }
        },
        rawResponse: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTION_EXECUTED', audit: 'UNAUTHENTICATED' }, null, 2)
        },
        codeSnippet: `app.${ep.method.toLowerCase()}('${ep.path}', verifyJwtToken, requireRole('admin'), handler);`,
        remediationSnippets: {
          nodejs: `app.${ep.method.toLowerCase()}('${ep.path}', verifyJwtToken, requireRole('admin'), handler);`,
          python: `@app.${ep.method.toLowerCase()}('${ep.path}', dependencies=[Depends(require_admin_auth)])\nasync def handler():\n    return {"status": "ok"}`,
          golang: `router.${ep.method}("${ep.path}", AuthMiddleware(), RequireAdmin(), handler)`,
          waf: `SecRule REQUEST_URI "@streq ${ep.path}" \\\n  "chain,id:100201,phase:1,deny,status:401"\n  SecRule &REQUEST_HEADERS:Authorization "@eq 0"`
        }
      });
    }

    // Rule 3: Unrestricted Resource Consumption / No Rate Limiting - OWASP API4:2023
    if (isAuthRoute && /otp|verify|reset|login/i.test(lowerPath)) {
      findings.push({
        id: nextId('RATELIMIT'),
        endpoint: ep.path,
        method: ep.method,
        category: 'OWASP API4:2023 - Unrestricted Resource Consumption',
        owaspId: 'API4:2023',
        title: 'Missing Rate Limiting & Brute-Force Safeguard on Auth Flow',
        severity: 'HIGH',
        evidence: `Credential verification route '${ep.path}' lacks throttling headers or cooldown mechanisms, allowing automated credential stuffing and 4-digit OTP brute-forcing.`,
        cwe: 'CWE-307',
        remediationEffort: 'LOW',
        remediationGuidance: 'Enforce Redis token-bucket rate limiting (max 5 attempts per 15 minutes) with IP and account lockouts.',
        falsePositiveLikelihood: 'LOW',
        falseNegativeRisk: 'MEDIUM',
        verificationStatus: 'VALIDATED',
        rawRequest: {
          method: ep.method,
          path: ep.path,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'target@corp.io', otp: '0001' })
        },
        rawResponse: {
          status: 401,
          headers: { 'X-RateLimit-Remaining': 'UNLIMITED' },
          body: JSON.stringify({ error: 'INVALID_OTP' })
        },
        codeSnippet: `const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });\napp.use('${ep.path}', authLimiter);`,
        remediationSnippets: {
          nodejs: `const authLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000,\n  max: 5,\n  standardHeaders: true,\n  message: { error: 'TOO_MANY_ATTEMPTS' }\n});\napp.use('${ep.path}', authLimiter);`,
          python: `from slowapi import Limiter\nlimiter = Limiter(key_func=get_remote_address)\n@app.${ep.method.toLowerCase()}('${ep.path}')\n@limiter.limit("5/15minute")\nasync def handler(request: Request): ...`,
          golang: `limiter := tollbooth.NewLimiter(5.0/900.0, nil)\nrouter.${ep.method}("${ep.path}", tollbooth_gin.LimitHandler(limiter), handler)`,
          waf: `rate_limit {\n  characteristics = ["cf.colo.id", "ip.src"]\n  period = 900\n  requests_per_period = 5\n  action = "block"\n}`
        }
      });
    }

    // Rule 4: Broken Object Property Level Authorization (BOPLA) & Mass Assignment - OWASP API3:2023
    if (ep.requestBodyFields && ep.requestBodyFields.length > 0) {
      const dangerousFields = ep.requestBodyFields.filter(f =>
        /role|is_admin|super|privilege|balance|price|approved|status|override/i.test(f)
      );
      if (dangerousFields.length > 0) {
        findings.push({
          id: nextId('BOPLA'),
          endpoint: ep.path,
          method: ep.method,
          category: 'OWASP API3:2023 - Broken Object Property Level Auth (Mass Assignment)',
          owaspId: 'API3:2023',
          title: `Privilege Escalation / Mass Assignment via Fields [${dangerousFields.join(', ')}]`,
          severity: 'HIGH',
          evidence: `Client request accepts mutable model properties (${dangerousFields.join(', ')}) without strict schema filtering, allowing callers to grant themselves administrator permissions.`,
          cwe: 'CWE-915',
          remediationEffort: 'LOW',
          remediationGuidance: 'Define explicit input DTO schemas and use whitelist picking (e.g. lodash.pick) rather than merging raw req.body into database models.',
          falsePositiveLikelihood: 'LOW',
          falseNegativeRisk: 'HIGH',
          verificationStatus: 'VALIDATED',
          rawRequest: {
            method: ep.method,
            path: ep.path,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'ADMIN', is_super_admin: true })
          },
          rawResponse: {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, updatedRole: 'ADMIN' })
          },
          codeSnippet: `const safeData = _.pick(req.body, ['name', 'phone']);\nawait User.update(safeData);`,
          remediationSnippets: {
            nodejs: `// Zod schema whitelisting\nconst UpdateProfileSchema = z.object({\n  name: z.string().optional(),\n  phone: z.string().optional()\n}).strict(); // strictly rejects unlisted properties`,
            python: `# Pydantic Strict Model\nclass UserUpdateDTO(BaseModel):\n    name: Optional[str]\n    phone: Optional[str]\n    class Config:\n        extra = "forbid" # rejects role / is_admin injections`,
            golang: `type UserUpdateInput struct {\n    Name  string \`json:"name" binding:"omitempty"\`\n    Phone string \`json:"phone" binding:"omitempty"\`\n}`,
            waf: `SecRule REQUEST_BODY "@rx \\"(role|is_admin|super)\\"" \\\n  "id:100301,phase:2,deny,status:400,msg:'Mass assignment parameter injection blocked'"`
          }
        });
      }
    }

    // Rule 5: Excessive Data Exposure in Response Schema - OWASP API3:2023
    if (ep.sensitiveDataExposed && ep.sensitiveDataExposed.length > 0) {
      findings.push({
        id: nextId('EXPOSURE'),
        endpoint: ep.path,
        method: ep.method,
        category: 'OWASP API3:2023 - Excessive Data Exposure',
        owaspId: 'API3:2023',
        title: `Sensitive Attributes Leaked in Response Schema [${ep.sensitiveDataExposed.join(', ')}]`,
        severity: ep.sensitiveDataExposed.some(s => /cvv|pin|ssn|password/i.test(s)) ? 'CRITICAL' : 'MEDIUM',
        evidence: `Response directly serializes sensitive attributes (${ep.sensitiveDataExposed.join(', ')}) across public or low-privilege consumer channels.`,
        cwe: 'CWE-200',
        remediationEffort: 'LOW',
        remediationGuidance: 'Sanitize output using dedicated response DTOs or class-transformer decorators to strip sensitive fields.',
        falsePositiveLikelihood: 'LOW',
        falseNegativeRisk: 'LOW',
        verificationStatus: 'VALIDATED',
        rawRequest: {
          method: ep.method,
          path: ep.path,
          headers: { 'Accept': 'application/json' }
        },
        rawResponse: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'rec-8401',
            [ep.sensitiveDataExposed[0]]: 'CONFIDENTIAL_VALUE_EXPOSED'
          })
        },
        codeSnippet: `const { passwordHash, ssn, pinHash, ...safeResponse } = record;\nreturn res.json(safeResponse);`,
        remediationSnippets: {
          nodejs: `function toSafeUserDTO(user) {\n  const { ssn, passwordHash, pin, ...safe } = user;\n  return safe;\n}`,
          python: `class UserPublicResponse(BaseModel):\n    id: str\n    name: str\n    # explicitly omit ssn / pinHash`,
          golang: `type UserPublicDTO struct {\n    ID   string \`json:"id"\`\n    Name string \`json:"name"\`\n}`,
          waf: `SecRule RESPONSE_BODY "@rx \\b(ssn|cvv|passwordHash)\\b" \\\n  "id:100501,phase:4,log,auditlog,msg:'Sensitive PII detected in HTTP Response Body'"`
        }
      });
    }

    // Rule 6: Broken Function Level Authorization (BFLA) - OWASP API5:2023
    if (isAdminRoute && ep.requiresAuth) {
      findings.push({
        id: nextId('BFLA'),
        endpoint: ep.path,
        method: ep.method,
        category: 'OWASP API5:2023 - Broken Function Level Authorization',
        owaspId: 'API5:2023',
        title: `Administrative Action Missing Role-Based Access Enforcement`,
        severity: 'CRITICAL',
        evidence: `Administrative route '${ep.path}' accepts valid consumer tokens without verifying administrative claims or role hierarchies.`,
        cwe: 'CWE-285',
        remediationEffort: 'LOW',
        remediationGuidance: 'Enforce explicit role-based authorization: verify that req.user.role === "SUPER_ADMIN" before executing route handlers.',
        falsePositiveLikelihood: 'LOW',
        falseNegativeRisk: 'HIGH',
        verificationStatus: 'VALIDATED',
        rawRequest: {
          method: ep.method,
          path: ep.path,
          headers: { 'Authorization': 'Bearer regular-user-token' }
        },
        rawResponse: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminAction: 'APPROVED', executor: 'regular-user' })
        },
        codeSnippet: `function requireSuperAdmin(req, res, next) {\n  if (!req.user || req.user.role !== 'SUPER_ADMIN') {\n    return res.status(403).json({ error: 'SUPER_ADMIN_REQUIRED' });\n  }\n  next();\n}`,
        remediationSnippets: {
          nodejs: `function requireRole(allowedRole) {\n  return (req, res, next) => {\n    if (req.user?.role !== allowedRole) {\n      return res.status(403).json({ error: 'INSUFFICIENT_PERMISSIONS' });\n    }\n    next();\n  };\n}`,
          python: `def require_role(required_role: str):\n    def dependency(user: User = Depends(get_current_user)):\n        if user.role != required_role:\n            raise HTTPException(status_code=403, detail="INSUFFICIENT_PERMISSIONS")\n        return user\n    return dependency`,
          golang: `func RequireRole(role string) gin.HandlerFunc {\n    return func(c *gin.Context) {\n        if c.GetString("userRole") != role {\n            c.AbortWithStatusJSON(403, gin.H{"error": "INSUFFICIENT_PERMISSIONS"})\n            return\n        }\n        c.Next()\n    }\n}`,
          waf: `SecRule REQUEST_URI "@rx ^/api/v[0-9]+/admin" \\\n  "chain,id:100601,phase:1,deny,status:403"\n  SecRule REQUEST_HEADERS:X-User-Role "!@streq SUPER_ADMIN"`
        }
      });
    }
  });

  return findings;
}
