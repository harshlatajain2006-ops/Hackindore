/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AttackPath, ChokePoint, GraphNode, RemediationEffort, Severity, WhatIfSimulationResult } from '../types/security';

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1,
  LOW: 0.5
};

const EFFORT_WEIGHTS: Record<RemediationEffort, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3
};

/**
 * Computes choke points across the graph.
 * Identifies high-centrality intersection nodes where a single patch collapses multiple attack chains.
 */
export function analyzeChokePoints(nodes: GraphNode[], attackPaths: AttackPath[]): ChokePoint[] {
  if (attackPaths.length === 0) return [];

  // Calculate total path weight
  const totalPathWeight = attackPaths.reduce((acc, p) => acc + (SEVERITY_WEIGHTS[p.severity] || 1), 0);
  const totalCriticalPaths = attackPaths.filter(p => p.severity === 'CRITICAL').length;

  const chokePoints: ChokePoint[] = [];

  nodes.forEach((node) => {
    // Determine which paths pass through this node
    const containingPaths = attackPaths.filter(p => p.nodeIds.includes(node.id));
    if (containingPaths.length === 0) return;

    const brokenPathIds = containingPaths.map(p => p.id);
    const criticalPathsCovered = containingPaths.filter(p => p.severity === 'CRITICAL').length;

    const brokenWeight = containingPaths.reduce((acc, p) => acc + (SEVERITY_WEIGHTS[p.severity] || 1), 0);
    const riskReductionPercent = totalPathWeight > 0 ? Math.round((brokenWeight / totalPathWeight) * 100) : 0;
    const criticalReductionPercent = totalCriticalPaths > 0 ? Math.round((criticalPathsCovered / totalCriticalPaths) * 100) : 0;

    // Estimate remediation effort based on findings
    let effort: RemediationEffort = 'LOW';
    if (node.findings.some(f => f.remediationEffort === 'HIGH')) {
      effort = 'HIGH';
    } else if (node.findings.some(f => f.remediationEffort === 'MEDIUM')) {
      effort = 'MEDIUM';
    }

    const effortWeight = EFFORT_WEIGHTS[effort];
    const roiScore = Math.round((riskReductionPercent / effortWeight) * 10);

    let roiCategory: ChokePoint['roiCategory'] = 'Routine Hardening';
    if (riskReductionPercent >= 40 && effort === 'LOW') {
      roiCategory = 'Top Priority (Quick Win)';
    } else if (riskReductionPercent >= 50) {
      roiCategory = 'High Strategic Impact';
    } else if (riskReductionPercent < 25) {
      roiCategory = 'Isolated Fix';
    }

    const topFinding = node.findings[0];
    const recommendedAction = topFinding
      ? topFinding.remediationGuidance
      : `Harden access validation and token controls on ${node.method} ${node.path}.`;

    chokePoints.push({
      nodeId: node.id,
      method: node.method,
      path: node.path,
      findingsCount: node.findings.length,
      maxSeverity: (node.maxSeverity === 'NONE' ? 'LOW' : node.maxSeverity) as Severity,
      pathsCoveredCount: containingPaths.length,
      criticalPathsCoveredCount: criticalPathsCovered,
      brokenPathIds,
      riskReductionPercent,
      criticalReductionPercent,
      remediationEffort: effort,
      roiScore,
      roiCategory,
      recommendedAction
    });
  });

  // Sort descending by risk reduction percentage, then by ROI score
  return chokePoints.sort((a, b) => {
    if (b.riskReductionPercent !== a.riskReductionPercent) {
      return b.riskReductionPercent - a.riskReductionPercent;
    }
    return b.roiScore - a.roiScore;
  });
}

/**
 * Simulates fixing one or more nodes and returns the exact impact on the attack graph.
 */
export function simulateRemediation(
  simulatedNodeIds: string[],
  attackPaths: AttackPath[]
): WhatIfSimulationResult {
  const totalPaths = attackPaths.length;
  if (totalPaths === 0) {
    return {
      simulatedNodeIds,
      totalPaths: 0,
      remainingPaths: 0,
      eliminatedPathsCount: 0,
      overallRiskReductionPercent: 0,
      criticalRiskReductionPercent: 0,
      activePathIds: [],
      brokenPathIds: [],
      residualMaxSeverity: 'SECURED'
    };
  }

  const simulatedSet = new Set(simulatedNodeIds);

  const brokenPaths = attackPaths.filter(path => path.nodeIds.some(id => simulatedSet.has(id)));
  const activePaths = attackPaths.filter(path => !path.nodeIds.some(id => simulatedSet.has(id)));

  const totalCritical = attackPaths.filter(p => p.severity === 'CRITICAL').length;
  const brokenCritical = brokenPaths.filter(p => p.severity === 'CRITICAL').length;

  const totalWeight = attackPaths.reduce((acc, p) => acc + (SEVERITY_WEIGHTS[p.severity] || 1), 0);
  const brokenWeight = brokenPaths.reduce((acc, p) => acc + (SEVERITY_WEIGHTS[p.severity] || 1), 0);

  const overallRiskReductionPercent = totalWeight > 0 ? Math.round((brokenWeight / totalWeight) * 100) : 0;
  const criticalRiskReductionPercent = totalCritical > 0 ? Math.round((brokenCritical / totalCritical) * 100) : 0;

  let residualMaxSeverity: Severity | 'SECURED' = 'SECURED';
  if (activePaths.some(p => p.severity === 'CRITICAL')) residualMaxSeverity = 'CRITICAL';
  else if (activePaths.some(p => p.severity === 'HIGH')) residualMaxSeverity = 'HIGH';
  else if (activePaths.some(p => p.severity === 'MEDIUM')) residualMaxSeverity = 'MEDIUM';
  else if (activePaths.some(p => p.severity === 'LOW')) residualMaxSeverity = 'LOW';

  return {
    simulatedNodeIds,
    totalPaths,
    remainingPaths: activePaths.length,
    eliminatedPathsCount: brokenPaths.length,
    overallRiskReductionPercent,
    criticalRiskReductionPercent,
    activePathIds: activePaths.map(p => p.id),
    brokenPathIds: brokenPaths.map(p => p.id),
    residualMaxSeverity
  };
}
