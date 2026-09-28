/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChokePoint, Finding, GraphNode, HttpMethod, RemediationEffort, RoiItem, RoiQuadrant } from '../types/security';

/**
 * Calculates effort score (1-10) and estimated engineering hours based on finding categories.
 */
function calculateEffortDetails(
  method: HttpMethod,
  path: string,
  findings: Finding[],
  baseEffort: RemediationEffort
): { score: number; estimate: string } {
  const lowerPath = path.toLowerCase();

  // Rate limiting fixes (OWASP API4) are quick config/middleware
  if (findings.some(f => f.owaspId === 'API4:2023') || /otp|verify|login/i.test(lowerPath)) {
    return { score: 2, estimate: '2–4 hours (Middleware config)' };
  }

  // Adding standard auth guard middleware (OWASP API2)
  if (findings.some(f => f.owaspId === 'API2:2023') && !/admin|isolate/i.test(lowerPath)) {
    return { score: 3, estimate: '3–6 hours (Auth middleware)' };
  }

  // BOPLA / DTO schema pick/filtering (OWASP API3)
  if (findings.some(f => f.owaspId === 'API3:2023')) {
    return { score: 3, estimate: '4–8 hours (DTO pick serialization)' };
  }

  // BOLA / IDOR requires ownership validation queries against DB (OWASP API1)
  if (findings.some(f => f.owaspId === 'API1:2023') || /{id}|{vin}|{mrn}/i.test(path)) {
    return { score: 6, estimate: '1.5–2 days (Resource ownership checks)' };
  }

  // BFLA / Role-based access control restructuring (OWASP API5)
  if (findings.some(f => f.owaspId === 'API5:2023') || /admin|dispatch|payout/i.test(lowerPath)) {
    return { score: 7, estimate: '2–3 days (RBAC claim enforcement)' };
  }

  // Default based on base effort
  switch (baseEffort) {
    case 'LOW':
      return { score: 3, estimate: '4–6 hours' };
    case 'MEDIUM':
      return { score: 6, estimate: '1.5–2 days' };
    case 'HIGH':
      return { score: 8, estimate: '3–5 days' };
  }
}

/**
 * Generates comprehensive Remediation ROI rankings and 2x2 quadrant classifications.
 */
export function calculateRoiRankings(chokePoints: ChokePoint[], nodes: GraphNode[]): RoiItem[] {
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  return chokePoints.map((cp, index) => {
    const node = nodeMap.get(cp.nodeId);
    const findings = node ? node.findings : [];

    // Calculate Impact Score (1 to 10 scale)
    // Primary factor: risk reduction percentage (0-100% -> 1-10)
    let impactScore = Math.max(1, Math.min(10, Math.round(cp.riskReductionPercent / 10)));
    if (cp.criticalPathsCoveredCount >= 2 && impactScore < 9) {
      impactScore = Math.min(10, impactScore + 1);
    }

    // Calculate Effort Score (1 to 10 scale)
    const { score: effortScore, estimate: developerHoursEstimate } = calculateEffortDetails(
      cp.method,
      cp.path,
      findings,
      cp.remediationEffort
    );

    // Calculate ROI Score: (Impact / Effort) normalized to 1-100
    const roiScore = Math.round((impactScore / effortScore) * 100);

    // Determine 2x2 Matrix Quadrant
    // Threshold: Effort <= 4 is Easy; Impact >= 5 is High Impact
    let quadrant: RoiQuadrant;
    let quadrantLabel: string;
    let quadrantDescription: string;

    const isEasy = effortScore <= 4;
    const isHighImpact = impactScore >= 5;

    if (isEasy && isHighImpact) {
      quadrant = 'QUICK_WINS';
      quadrantLabel = 'Quick Wins (Easy Fix · High Impact)';
      quadrantDescription = 'Immediate sprint candidate. Minimal engineering effort yields substantial attack surface elimination.';
    } else if (!isEasy && isHighImpact) {
      quadrant = 'STRATEGIC';
      quadrantLabel = 'Strategic Projects (Difficult Fix · High Impact)';
      quadrantDescription = 'High security payoff requiring structural architecture, data schema, or permission layer refactoring.';
    } else if (isEasy && !isHighImpact) {
      quadrant = 'LOW_HANGING';
      quadrantLabel = 'Low-Hanging Fruit (Easy Fix · Low Impact)';
      quadrantDescription = 'Straightforward patches with localized impact. Ideal for junior developers or batch hardening.';
    } else {
      quadrant = 'DE_PRIORITIZED';
      quadrantLabel = 'De-prioritized (Difficult Fix · Low Impact)';
      quadrantDescription = 'High complexity with low path coverage. Consider accepting the residual risk or deferring.';
    }

    return {
      id: `roi-${cp.nodeId}`,
      nodeId: cp.nodeId,
      title: `${cp.method} ${cp.path}`,
      method: cp.method,
      path: cp.path,
      type: 'CHOKE_POINT' as const,
      riskReductionPercent: cp.riskReductionPercent,
      impactScore,
      effortScore,
      effortCategory: cp.remediationEffort,
      developerHoursEstimate,
      roiScore,
      quadrant,
      quadrantLabel,
      quadrantDescription,
      recommendedAction: cp.recommendedAction,
      associatedFindings: findings
    };
  }).sort((a, b) => {
    // Sort primarily by quadrant priority (QUICK_WINS > STRATEGIC > LOW_HANGING > DE_PRIORITIZED), then by ROI score
    const quadrantOrder: Record<RoiQuadrant, number> = {
      QUICK_WINS: 4,
      STRATEGIC: 3,
      LOW_HANGING: 2,
      DE_PRIORITIZED: 1
    };

    if (quadrantOrder[b.quadrant] !== quadrantOrder[a.quadrant]) {
      return quadrantOrder[b.quadrant] - quadrantOrder[a.quadrant];
    }
    return b.roiScore - a.roiScore;
  });
}
