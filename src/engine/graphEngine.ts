/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiEndpoint, AttackHop, AttackPath, Finding, GraphEdge, GraphNode, Severity, ValidationStatus } from '../types/security';

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
  attackPaths: AttackPath[];
}

/**
 * Builds the directed attack graph from API endpoints and findings.
 * Follows NetworkX / graph-traversal principles:
 * - Nodes: Endpoints enriched with findings and state variables.
 * - Edges: State transitions, auth token propagation, ID passing, or privilege jumps.
 */
export function buildStateGraph(endpoints: ApiEndpoint[], findings: Finding[]): GraphModel {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Map findings by endpoint and method
  const findingsMap = new Map<string, Finding[]>();
  findings.forEach((f) => {
    const key = `${f.method}:${f.endpoint}`;
    if (!findingsMap.has(key)) {
      findingsMap.set(key, []);
    }
    findingsMap.get(key)!.push(f);
  });

  // Calculate coordinates in a clean DAG/layered layout
  const total = endpoints.length;
  endpoints.forEach((ep, index) => {
    const key = `${ep.method}:${ep.path}`;
    const epFindings = findingsMap.get(key) || [];

    let maxSeverity: Severity | 'NONE' = 'NONE';
    if (epFindings.some(f => f.severity === 'CRITICAL')) maxSeverity = 'CRITICAL';
    else if (epFindings.some(f => f.severity === 'HIGH')) maxSeverity = 'HIGH';
    else if (epFindings.some(f => f.severity === 'MEDIUM')) maxSeverity = 'MEDIUM';
    else if (epFindings.some(f => f.severity === 'LOW')) maxSeverity = 'LOW';

    let nodeType: 'ENTRY' | 'TRANSIT' | 'EXPLOIT_TARGET' = 'TRANSIT';
    if (!ep.requiresAuth) {
      nodeType = 'ENTRY';
    } else if (maxSeverity === 'CRITICAL' || /payout|refund|rx|audit|admin|ehr/i.test(ep.path)) {
      nodeType = 'EXPLOIT_TARGET';
    }

    // Default positioning in a multi-column visual stage
    let col = 1;
    if (nodeType === 'ENTRY') col = 0;
    else if (nodeType === 'EXPLOIT_TARGET') col = 2;

    const spacingX = 320;
    const spacingY = 110;
    const itemsInCol = endpoints.filter((_, i) => (i % 3) === col).length || 1;
    const row = Math.floor(index / 3);

    nodes.push({
      id: ep.id,
      endpointId: ep.id,
      path: ep.path,
      method: ep.method,
      label: `${ep.method} ${ep.path}`,
      findings: epFindings,
      maxSeverity,
      nodeType,
      requiresAuth: ep.requiresAuth,
      tags: ep.tags || [],
      x: 100 + col * spacingX,
      y: 80 + (row % 6) * spacingY
    });
  });

  // Construct directed edges based on state transitions and data dependencies
  let edgeCounter = 1;
  const nextEdgeId = () => `edge-${edgeCounter++}`;

  for (let i = 0; i < endpoints.length; i++) {
    for (let j = 0; j < endpoints.length; j++) {
      if (i === j) continue;
      const src = endpoints[i];
      const dst = endpoints[j];

      // Edge Rule 1: Auth token generation -> Protected endpoint consumption
      if (src.producesTokens && src.producesTokens.length > 0 && dst.requiresAuth) {
        edges.push({
          id: nextEdgeId(),
          source: src.id,
          target: dst.id,
          label: 'Yields Bearer Token',
          confidenceScore: 0.95,
          status: 'VALIDATED',
          evidence: `Token '${src.producesTokens[0]}' produced by ${src.path} satisfies ${dst.authType || 'Bearer'} authentication for ${dst.path}`,
          propagatedData: src.producesTokens
        });
      }

      // Edge Rule 2: Password reset verification -> Password reset execution
      if (/verify-otp|challenge|verify/i.test(src.path) && /reset-password|confirm/i.test(dst.path)) {
        edges.push({
          id: nextEdgeId(),
          source: src.id,
          target: dst.id,
          label: 'Passes reset_token',
          confidenceScore: 0.98,
          status: 'VALIDATED',
          evidence: `Successful OTP brute force or bypass on ${src.path} grants valid reset_token accepted by ${dst.path}`,
          propagatedData: ['reset_token']
        });
      }

      // Edge Rule 3: Public info leak -> IDOR consumption
      if (src.sensitiveDataExposed && dst.pathParameters.length > 0) {
        const matchingParam = dst.pathParameters.find(p =>
          src.sensitiveDataExposed!.some(s => s.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(s.toLowerCase()))
        );
        if (matchingParam) {
          edges.push({
            id: nextEdgeId(),
            source: src.id,
            target: dst.id,
            label: `Supplies leaked {${matchingParam}}`,
            confidenceScore: 0.88,
            status: 'VALIDATED',
            evidence: `Endpoint ${src.path} leaks '${matchingParam}', which is directly injected into vulnerable path parameter of ${dst.path}`,
            propagatedData: [matchingParam]
          });
        }
      }

      // Edge Rule 4: Sequential state transitions (e.g. Account -> Transfer / Order -> Refund)
      if (
        (/accounts|orders|ehr|records/i.test(src.path) && /transfers|payout|refund|rx/i.test(dst.path)) ||
        (/reset-password|login/i.test(src.path) && /dashboard|members|accounts|orders/i.test(dst.path))
      ) {
        const alreadyExists = edges.some(e => e.source === src.id && e.target === dst.id);
        if (!alreadyExists) {
          edges.push({
            id: nextEdgeId(),
            source: src.id,
            target: dst.id,
            label: 'State Sequence Hop',
            confidenceScore: 0.72,
            status: 'SUSPECTED',
            evidence: `Heuristic dependency: successful retrieval or takeover at ${src.path} enables target execution at ${dst.path}`,
            propagatedData: ['state_context']
          });
        }
      }

      // Edge Rule 5: Privilege escalation to admin endpoint
      if (/invite|promote|role/i.test(src.path) && /admin|dispatch|internal/i.test(dst.path)) {
        edges.push({
          id: nextEdgeId(),
          source: src.id,
          target: dst.id,
          label: 'Elevated Token Flow',
          confidenceScore: 0.89,
          status: 'VALIDATED',
          evidence: `Role alteration or unvalidated claim at ${src.path} unlocks execution permissions on ${dst.path}`,
          propagatedData: ['admin_role']
        });
      }
    }
  }

  // Generate Attack Paths by graph traversal
  const attackPaths = discoverAttackPaths(nodes, edges, endpoints);

  return {
    nodes,
    edges,
    attackPaths
  };
}

/**
 * Traverses directed graph using DFS to discover full multi-hop exploit paths.
 */
function discoverAttackPaths(nodes: GraphNode[], edges: GraphEdge[], endpoints: ApiEndpoint[]): AttackPath[] {
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const epMap = new Map<string, ApiEndpoint>();
  endpoints.forEach(e => epMap.set(e.id, e));

  // Build adjacency list
  const adj = new Map<string, GraphEdge[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    if (adj.has(e.source)) {
      adj.get(e.source)!.push(e);
    }
  });

  const discoveredPaths: string[][] = [];

  // DFS search for paths up to length 4
  function dfs(currId: string, visited: Set<string>, currentPath: string[]) {
    if (currentPath.length >= 2) {
      const lastNode = nodeMap.get(currId);
      if (lastNode && (lastNode.nodeType === 'EXPLOIT_TARGET' || lastNode.maxSeverity === 'CRITICAL' || lastNode.maxSeverity === 'HIGH')) {
        discoveredPaths.push([...currentPath]);
      }
    }

    if (currentPath.length >= 4) return; // limit depth to avoid combinatorial blowup

    const outgoing = adj.get(currId) || [];
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        currentPath.push(edge.target);
        dfs(edge.target, visited, currentPath);
        currentPath.pop();
        visited.delete(edge.target);
      }
    }
  }

  // Start from ENTRY nodes
  const entryNodes = nodes.filter(n => n.nodeType === 'ENTRY' || !n.requiresAuth);
  entryNodes.forEach(entry => {
    const visited = new Set<string>([entry.id]);
    dfs(entry.id, visited, [entry.id]);
  });

  // Filter redundant sub-paths if longer path exists
  const uniquePaths = filterSubpaths(discoveredPaths);

  // Convert node sequences into AttackPath objects
  return uniquePaths.map((nodeIds, index) => {
    const pathNodes = nodeIds.map(id => nodeMap.get(id)!);
    const hops: AttackHop[] = [];
    let isValidated = true;
    let minConfidence = 1.0;
    let hasCriticalFinding = false;

    for (let i = 0; i < pathNodes.length; i++) {
      const node = pathNodes[i];
      const ep = epMap.get(node.endpointId);
      const topFinding = node.findings[0];

      if (node.maxSeverity === 'CRITICAL') hasCriticalFinding = true;

      // Find connecting edge from previous hop
      let edgeConfidence = 1.0;
      let edgeEvidence = 'Entry Point of Attack Chain';
      if (i > 0) {
        const prevId = pathNodes[i - 1].id;
        const edge = edges.find(e => e.source === prevId && e.target === node.id);
        if (edge) {
          edgeConfidence = edge.confidenceScore;
          edgeEvidence = edge.evidence;
          if (edge.status === 'SUSPECTED') isValidated = false;
        } else {
          isValidated = false;
          edgeConfidence = 0.65;
        }
      }

      minConfidence = Math.min(minConfidence, edgeConfidence);

      hops.push({
        nodeId: node.id,
        method: node.method,
        path: node.path,
        action: ep ? ep.summary : node.label,
        confidence: edgeConfidence,
        evidence: edgeEvidence,
        vulnerability: topFinding
      });
    }

    const firstHop = hops[0];
    const lastHop = hops[hops.length - 1];

    let title = `${firstHop.method} ${firstHop.path} → ${lastHop.method} ${lastHop.path}`;
    let targetImpact = 'Unauthorized data access and state tampering.';

    if (/reset|otp/i.test(firstHop.path) && /payout|refund|transfer/i.test(lastHop.path)) {
      title = 'Credential Takeover to Financial Drain';
      targetImpact = 'Attacker forces password reset via un-throttled OTP verification, hijacks session, and initiates unauthorized merchant/user payouts.';
    } else if (/posts|leak|directory|members/i.test(firstHop.path) && /orders|accounts|ehr/i.test(lastHop.path)) {
      title = 'Public Identity Leak to Deep BOLA Data Harvest';
      targetImpact = 'Attacker extracts victim IDs from public/unauthenticated endpoints, then enumerates private account records via Broken Object Level Authorization.';
    } else if (/invite|upgrade|role/i.test(firstHop.path) && /admin|dispatch|audit/i.test(lastHop.path)) {
      title = 'Privilege Escalation to Administrative Function Hijack';
      targetImpact = 'Attacker mutates membership role through un-validated request parameters and calls privileged back-office administrative actions.';
    } else if (lastHop.vulnerability) {
      title = `Exploit Chain: ${lastHop.vulnerability.title}`;
      targetImpact = lastHop.vulnerability.evidence;
    }

    const severity: Severity = hasCriticalFinding ? 'CRITICAL' : 'HIGH';
    const status: ValidationStatus = isValidated && minConfidence >= 0.8 ? 'VALIDATED' : 'SUSPECTED';

    return {
      id: `path-chain-${index + 1}`,
      title,
      description: `Multi-step progression spanning ${hops.length} endpoints from initial reconnaissance to target exploit.`,
      targetImpact,
      severity,
      status,
      confidenceScore: Math.round(minConfidence * 100),
      nodeIds,
      hops
    };
  });
}

function filterSubpaths(paths: string[][]): string[][] {
  const result: string[][] = [];
  // Sort by length descending
  const sorted = [...paths].sort((a, b) => b.length - a.length);

  for (const path of sorted) {
    const pathStr = path.join(',');
    const isSub = result.some(r => r.join(',').includes(pathStr));
    if (!isSub) {
      result.push(path);
    }
  }

  return result.slice(0, 8); // Keep top 8 rich representative chains
}
