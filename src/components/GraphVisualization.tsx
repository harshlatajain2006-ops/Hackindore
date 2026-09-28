/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Shield,
  ShieldCheck,
  AlertCircle,
  Zap,
  Info,
  ChevronRight,
  X,
  ExternalLink,
  Search,
  Tag,
  Filter,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { ApiEndpoint, AttackPath, ChokePoint, GraphEdge, GraphNode, Severity } from '../types/security';

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  attackPaths: AttackPath[];
  chokePoints: ChokePoint[];
  simulatedNodeIds: string[];
  onToggleSimulateNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  highlightedPathId: string | null;
  onHighlightPath: (pathId: string | null) => void;
  endpoints?: ApiEndpoint[];
  onOpenTrafficScanner?: () => void;
  trafficFindingsCount?: number;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  nodes,
  edges,
  attackPaths,
  chokePoints,
  simulatedNodeIds,
  onToggleSimulateNode,
  selectedNodeId,
  onSelectNode,
  highlightedPathId,
  onHighlightPath,
  endpoints,
  onOpenTrafficScanner,
  trafficFindingsCount = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');
  const [selectedVulnFilter, setSelectedVulnFilter] = useState<string>('ALL');

  const simulatedSet = useMemo(() => new Set(simulatedNodeIds), [simulatedNodeIds]);
  const topChokePoint = chokePoints[0];

  // Selected node details
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Node position map
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Endpoint tags map (from node.tags or endpoints prop)
  const epTagMap = useMemo(() => {
    const map = new Map<string, string[]>();
    nodes.forEach(n => {
      map.set(n.id, n.tags || []);
    });
    if (endpoints) {
      endpoints.forEach(ep => {
        map.set(ep.id, ep.tags || []);
      });
    }
    return map;
  }, [nodes, endpoints]);

  // Available unique endpoint tags
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach(n => {
      (n.tags || []).forEach(t => {
        if (t) set.add(t);
      });
    });
    if (endpoints) {
      endpoints.forEach(ep => {
        (ep.tags || []).forEach(t => {
          if (t) set.add(t);
        });
      });
    }
    return Array.from(set).sort();
  }, [nodes, endpoints]);

  // Available unique vulnerability types / categories
  const availableVulnTypes = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach(n => {
      n.findings.forEach(f => {
        if (f.category) set.add(f.category);
      });
    });
    attackPaths.forEach(p => {
      p.hops.forEach(h => {
        if (h.vulnerability?.category) set.add(h.vulnerability.category);
      });
    });
    return Array.from(set).sort();
  }, [nodes, attackPaths]);

  const isFilterActive =
    searchQuery.trim().length > 0 ||
    selectedTagFilter !== 'ALL' ||
    selectedVulnFilter !== 'ALL';

  // Filter attack paths by search query, vulnerability type, or endpoint tag
  const matchedAttackPaths = useMemo(() => {
    if (!isFilterActive) return attackPaths;

    const q = searchQuery.trim().toLowerCase();

    return attackPaths.filter(path => {
      // 1. Tag dropdown filter check
      if (selectedTagFilter !== 'ALL') {
        const hasTag = path.nodeIds.some(nId => {
          const tags = epTagMap.get(nId) || [];
          return tags.includes(selectedTagFilter);
        });
        if (!hasTag) return false;
      }

      // 2. Vuln dropdown filter check
      if (selectedVulnFilter !== 'ALL') {
        const hasVuln =
          path.hops.some(h => h.vulnerability?.category === selectedVulnFilter) ||
          path.nodeIds.some(nId => {
            const node = nodeMap.get(nId);
            return node?.findings.some(f => f.category === selectedVulnFilter);
          });
        if (!hasVuln) return false;
      }

      // 3. Search query check
      if (q) {
        const matchMeta =
          path.title.toLowerCase().includes(q) ||
          path.description.toLowerCase().includes(q) ||
          path.targetImpact.toLowerCase().includes(q) ||
          path.id.toLowerCase().includes(q);

        const matchHopVuln = path.hops.some(h => {
          const v = h.vulnerability;
          if (!v) return false;
          return (
            v.title.toLowerCase().includes(q) ||
            v.category.toLowerCase().includes(q) ||
            v.owaspId.toLowerCase().includes(q) ||
            v.cwe.toLowerCase().includes(q) ||
            v.evidence.toLowerCase().includes(q)
          );
        });

        const matchNodes = path.nodeIds.some(nId => {
          const node = nodeMap.get(nId);
          const tags = epTagMap.get(nId) || [];
          const matchTag = tags.some(t => t.toLowerCase().includes(q));
          const matchPath = node ? node.path.toLowerCase().includes(q) : false;
          const matchFinding = node ? node.findings.some(f =>
            f.title.toLowerCase().includes(q) ||
            f.category.toLowerCase().includes(q) ||
            f.cwe.toLowerCase().includes(q) ||
            f.owaspId.toLowerCase().includes(q)
          ) : false;
          return matchTag || matchPath || matchFinding;
        });

        if (!matchMeta && !matchHopVuln && !matchNodes) {
          return false;
        }
      }

      return true;
    });
  }, [attackPaths, isFilterActive, searchQuery, selectedTagFilter, selectedVulnFilter, epTagMap, nodeMap]);

  // Set of node IDs participating in matched attack paths
  const matchedNodeIds = useMemo(() => {
    if (!isFilterActive) return new Set<string>();
    const set = new Set<string>();
    matchedAttackPaths.forEach(p => {
      p.nodeIds.forEach(id => set.add(id));
    });
    return set;
  }, [matchedAttackPaths, isFilterActive]);

  // Set of edge connection keys in matched attack paths
  const matchedEdgeKeys = useMemo(() => {
    if (!isFilterActive) return new Set<string>();
    const set = new Set<string>();
    matchedAttackPaths.forEach(p => {
      for (let i = 0; i < p.nodeIds.length - 1; i++) {
        set.add(`${p.nodeIds[i]}->${p.nodeIds[i + 1]}`);
      }
    });
    return set;
  }, [matchedAttackPaths, isFilterActive]);

  // Highlighted path nodes
  const activePathNodes = useMemo(() => {
    if (!highlightedPathId) return new Set<string>();
    const path = attackPaths.find(p => p.id === highlightedPathId);
    return path ? new Set(path.nodeIds) : new Set<string>();
  }, [attackPaths, highlightedPathId]);

  // Clear all filters
  const clearFilter = () => {
    setSearchQuery('');
    setSelectedTagFilter('ALL');
    setSelectedVulnFilter('ALL');
  };

  // Click on a matched attack path chip to focus & highlight it
  const handleSelectMatchingPath = (pathId: string) => {
    if (highlightedPathId === pathId) {
      onHighlightPath(null);
    } else {
      onHighlightPath(pathId);
      const path = attackPaths.find(p => p.id === pathId);
      if (path && path.nodeIds.length > 0) {
        const firstNode = nodeMap.get(path.nodeIds[0]);
        if (firstNode) {
          setPan({
            x: Math.max(30, 240 - firstNode.x * zoom),
            y: Math.max(30, 160 - firstNode.y * zoom)
          });
        }
      }
    }
  };

  // Mouse handlers for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(2.0, Math.max(0.5, prev + delta)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 40, y: 30 });
  };

  // Color mapping by severity
  const getSeverityColors = (sev: Severity | 'NONE', isRemediated: boolean) => {
    if (isRemediated) {
      return {
        border: 'border-emerald-500',
        stroke: '#10b981',
        bg: 'bg-emerald-950/70',
        fill: '#064e3b',
        text: 'text-emerald-300'
      };
    }
    switch (sev) {
      case 'CRITICAL':
        return {
          border: 'border-red-500',
          stroke: '#ef4444',
          bg: 'bg-red-950/40',
          fill: '#450a0a',
          text: 'text-red-400'
        };
      case 'HIGH':
        return {
          border: 'border-amber-500',
          stroke: '#f59e0b',
          bg: 'bg-amber-950/40',
          fill: '#451a03',
          text: 'text-amber-400'
        };
      case 'MEDIUM':
        return {
          border: 'border-yellow-600',
          stroke: '#ca8a04',
          bg: 'bg-yellow-950/30',
          fill: '#422006',
          text: 'text-yellow-400'
        };
      default:
        return {
          border: 'border-slate-700',
          stroke: '#475569',
          bg: 'bg-slate-900/60',
          fill: '#0f172a',
          text: 'text-slate-400'
        };
    }
  };

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-950/80 overflow-hidden flex flex-col shadow-xl">
      {/* Attack Graph Search & Filter Header */}
      <div className="bg-slate-900/95 border-b border-slate-800 p-3 sm:px-4 space-y-2.5 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input for Vuln Type or Endpoint Tag */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search graph paths by vuln (e.g., IDOR, Auth, BOLA) or endpoint tag (e.g., Workshop, Identity)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tag & Vuln Type Dropdown Selectors */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Endpoint Tag Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300">
              <Tag className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-[11px] text-slate-400">Tag:</span>
              <select
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-medium max-w-[130px] truncate"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">
                  All Tags ({availableTags.length})
                </option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag} className="bg-slate-900 text-slate-200">
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            {/* Vulnerability Type Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] text-slate-400">Vuln:</span>
              <select
                value={selectedVulnFilter}
                onChange={(e) => setSelectedVulnFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-medium max-w-[150px] truncate"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">
                  All Vulns ({availableVulnTypes.length})
                </option>
                {availableVulnTypes.map(vuln => (
                  <option key={vuln} value={vuln} className="bg-slate-900 text-slate-200">
                    {vuln.replace(/^OWASP\s+API\d+:\d+\s+-\s+/, '')}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset All Filters Button */}
            {isFilterActive && (
              <button
                onClick={clearFilter}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
                title="Reset search and filters"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset</span>
              </button>
            )}

            {/* Launch Live Traffic Scanner */}
            {onOpenTrafficScanner && (
              <button
                onClick={onOpenTrafficScanner}
                className="px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0 shadow-sm shadow-cyan-950/20"
                title="Open Live Traffic Scanner to analyze JSON logs"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Scan Live Traffic</span>
                {trafficFindingsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500 text-slate-950 font-bold">
                    +{trafficFindingsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Tag Buttons & Matched Segment Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-500" />
              <span>Quick Filters:</span>
            </span>

            {/* Top Endpoint Tags */}
            {availableTags.slice(0, 4).map(tag => {
              const isSelected = selectedTagFilter === tag || searchQuery.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTagFilter('ALL');
                      if (searchQuery.toLowerCase() === tag.toLowerCase()) setSearchQuery('');
                    } else {
                      setSelectedTagFilter(tag);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-semibold'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Tag className="w-2.5 h-2.5 opacity-60" />
                  <span>#{tag}</span>
                </button>
              );
            })}

            {/* Common Vulnerability Shortcuts */}
            {['IDOR', 'Authentication', 'BFLA', 'Rate Limit'].map(vName => {
              const isSelected = searchQuery.toLowerCase().includes(vName.toLowerCase());
              return (
                <button
                  key={vName}
                  onClick={() => {
                    if (isSelected) {
                      setSearchQuery('');
                    } else {
                      setSearchQuery(vName);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-semibold'
                      : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{vName}</span>
                </button>
              );
            })}
          </div>

          {/* Filter Status Feedback */}
          {isFilterActive && (
            <div className="text-[11px] text-slate-300 flex items-center gap-1.5 ml-auto">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="font-semibold text-cyan-300 font-mono">{matchedAttackPaths.length}</span>
              <span className="text-slate-400">of {attackPaths.length} attack chains</span>
              <span className="text-slate-500 font-mono">({matchedNodeIds.size} nodes pinpointed)</span>
            </div>
          )}
        </div>

        {/* Pinpoint Segment Path Selector Chips */}
        {isFilterActive && matchedAttackPaths.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/40">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mr-1">
              Pinpoint Chain:
            </span>
            {matchedAttackPaths.map(path => {
              const isPathActive = highlightedPathId === path.id;
              return (
                <button
                  key={path.id}
                  onClick={() => handleSelectMatchingPath(path.id)}
                  className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-mono ${
                    isPathActive
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 hover:border-cyan-400'
                  }`}
                  title={`Highlight ${path.title} in graph`}
                >
                  <span>{path.id}</span>
                  <span className="max-w-[170px] truncate text-[11px] font-sans font-normal opacity-90">
                    {path.title}
                  </span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {/* Zero Matches Notification Banner */}
        {isFilterActive && matchedAttackPaths.length === 0 && (
          <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>No attack paths match current filter. Showing 0 pinpointed segments in the state graph.</span>
            </div>
            <button
              onClick={clearFilter}
              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-medium transition-colors"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* Interactive SVG Canvas Container */}
      <div className="relative h-[600px] overflow-hidden flex flex-col">
        {/* Top Graph Controls Bar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 backdrop-blur-md shadow-lg">
          <span className="text-xs font-semibold text-slate-300 px-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>API Attack State-Graph</span>
          </span>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => handleZoom(0.15)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.15)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Reset Canvas View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-500 px-1">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Active Chain Highlight Indicator */}
        {highlightedPathId && (
          <div className="absolute top-3 right-3 z-10 bg-slate-900/90 border border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs text-cyan-300 flex items-center gap-2 backdrop-blur-md shadow-lg">
            <span>Highlighting Chain: {highlightedPathId}</span>
            <button
              onClick={() => onHighlightPath(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SVG Canvas */}
        <div
          ref={containerRef}
          className="w-full h-full cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            id="graph-bg"
            className="w-full h-full"
            style={{
              backgroundImage: 'radial-gradient(rgba(51, 65, 85, 0.25) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            <defs>
              {/* Arrowhead definitions */}
              <marker
                id="arrow-default"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
              </marker>
              <marker
                id="arrow-critical"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
              </marker>
              <marker
                id="arrow-highlighted"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
              </marker>
              <marker
                id="arrow-severed"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
              </marker>
            </defs>

            {/* Canvas Transform Container */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Render Edges */}
              {edges.map((edge) => {
                const src = nodeMap.get(edge.source);
                const dst = nodeMap.get(edge.target);
                if (!src || !dst) return null;

                const isSourceSimulated = simulatedSet.has(src.id);
                const isTargetSimulated = simulatedSet.has(dst.id);
                const isSevered = isSourceSimulated || isTargetSimulated;

                const edgeKey = `${src.id}->${dst.id}`;
                const isMatchedEdge = matchedEdgeKeys.has(edgeKey);

                const isHighlighted =
                  highlightedPathId &&
                  activePathNodes.has(src.id) &&
                  activePathNodes.has(dst.id);

                // Calculate edge curve
                const sx = src.x + 220; // right of source node card
                const sy = src.y + 40; // center height
                const tx = dst.x; // left of target node card
                const ty = dst.y + 40;

                const dx = tx - sx;
                const controlPointOffset = Math.max(40, Math.abs(dx) * 0.4);
                const pathData = `M ${sx} ${sy} C ${sx + controlPointOffset} ${sy}, ${tx - controlPointOffset} ${ty}, ${tx} ${ty}`;

                let strokeColor = isSevered ? '#334155' : isHighlighted ? '#06b6d4' : '#64748b';
                let markerEnd = isSevered ? 'url(#arrow-severed)' : isHighlighted ? 'url(#arrow-highlighted)' : 'url(#arrow-default)';
                let strokeWidth = isHighlighted ? 2.8 : isSevered ? 1.2 : 1.6;
                let edgeOpacity = isSevered ? 0.35 : 0.85;

                // Adjust for active search/filter pinpointing
                if (isFilterActive && !isSevered) {
                  if (isHighlighted || isMatchedEdge) {
                    strokeColor = '#06b6d4';
                    markerEnd = 'url(#arrow-highlighted)';
                    strokeWidth = 2.4;
                    edgeOpacity = 1.0;
                  } else {
                    strokeColor = '#1e293b';
                    markerEnd = 'url(#arrow-severed)';
                    strokeWidth = 1.0;
                    edgeOpacity = 0.12;
                  }
                }

                return (
                  <g key={edge.id} className="transition-opacity duration-300">
                    <path
                      d={pathData}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={isSevered ? '4 4' : 'none'}
                      markerEnd={markerEnd}
                      opacity={edgeOpacity}
                    />
                    {/* Midpoint Label */}
                    <g transform={`translate(${(sx + tx) / 2}, ${(sy + ty) / 2 - 8})`}>
                      <rect
                        x="-55"
                        y="-9"
                        width="110"
                        height="18"
                        rx="4"
                        fill="#0b0f19"
                        stroke={isHighlighted || (isFilterActive && isMatchedEdge) ? '#06b6d4' : '#1e293b'}
                        strokeWidth="1"
                        opacity={isSevered ? 0.3 : isFilterActive && !isMatchedEdge ? 0.2 : 0.9}
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-[9px] font-mono fill-slate-300"
                        opacity={isFilterActive && !isMatchedEdge ? 0.3 : 1}
                      >
                        {edge.label} {edge.status === 'VALIDATED' ? '✓' : '~'}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {nodes.map((node) => {
                const isRemediated = simulatedSet.has(node.id);
                const isSelected = selectedNodeId === node.id;
                const isChokePoint = topChokePoint && topChokePoint.nodeId === node.id;
                const isHighlighted = activePathNodes.has(node.id);
                const isNodeMatched = matchedNodeIds.has(node.id);

                const colors = getSeverityColors(node.maxSeverity, isRemediated);

                // Opacity dimming when search filter is active
                let nodeOpacity = 1;
                if (isFilterActive && !isNodeMatched) {
                  nodeOpacity = 0.22;
                }

                const primaryTag = (node.tags && node.tags.length > 0) ? node.tags[0] : null;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectNode(node.id);
                    }}
                    opacity={nodeOpacity}
                    className="cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  >
                    {/* Choke Point Animated Glow */}
                    {isChokePoint && !isRemediated && (!isFilterActive || isNodeMatched) && (
                      <rect
                        x="-4"
                        y="-4"
                        width="228"
                        height="88"
                        rx="12"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        className="animate-pulse"
                        strokeDasharray="6 3"
                      />
                    )}

                    {/* Matched Filter Luminous Ring */}
                    {isFilterActive && isNodeMatched && !isSelected && (
                      <rect
                        x="-4"
                        y="-4"
                        width="228"
                        height="88"
                        rx="12"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        className="animate-pulse"
                        strokeDasharray="4 2"
                      />
                    )}

                    {/* Node Card Background */}
                    <rect
                      x="0"
                      y="0"
                      width="220"
                      height="80"
                      rx="8"
                      fill={isRemediated ? '#042f2e' : '#0f172a'}
                      stroke={
                        isSelected
                          ? '#38bdf8'
                          : isRemediated
                          ? '#10b981'
                          : isHighlighted
                          ? '#06b6d4'
                          : isFilterActive && isNodeMatched
                          ? '#06b6d4'
                          : isChokePoint
                          ? '#f59e0b'
                          : colors.stroke
                      }
                      strokeWidth={isSelected || isHighlighted || (isFilterActive && isNodeMatched) || isChokePoint ? 2 : 1}
                      opacity={isRemediated ? 0.8 : 1}
                    />

                    {/* Header Bar inside Node */}
                    <g transform="translate(10, 18)">
                      {/* Method Badge */}
                      <rect
                        x="0"
                        y="-10"
                        width={node.method.length * 7 + 10}
                        height="16"
                        rx="3"
                        fill="#1e293b"
                      />
                      <text
                        x={node.method.length * 3.5 + 5}
                        y="1"
                        textAnchor="middle"
                        className="text-[9px] font-mono font-bold fill-slate-200"
                      >
                        {node.method}
                      </text>

                      {/* Path Label */}
                      <text
                        x={node.method.length * 7 + 16}
                        y="2"
                        className="text-[11px] font-mono font-medium fill-white"
                      >
                        {node.path.length > 17 ? node.path.substring(0, 16) + '…' : node.path}
                      </text>
                    </g>

                    {/* Status / Findings Row */}
                    <g transform="translate(10, 48)">
                      {isRemediated ? (
                        <g>
                          <text className="text-[10px] font-semibold fill-emerald-400">
                            🛡️ REMEDIATED (Secured)
                          </text>
                        </g>
                      ) : (
                        <g>
                          <text className="text-[10px] font-medium fill-slate-400">
                            {node.findings.length > 0 ? (
                              <tspan className={colors.text}>
                                {node.maxSeverity} · {node.findings.length} Finding{node.findings.length > 1 ? 's' : ''}
                              </tspan>
                            ) : (
                              <tspan className="fill-slate-500">Nominal / Low Risk</tspan>
                            )}
                          </text>
                        </g>
                      )}
                    </g>

                    {/* Bottom Tag, Node Type & Choke Badges */}
                    <g transform="translate(10, 68)">
                      <text className="text-[9px] font-mono fill-slate-500">
                        {node.nodeType === 'ENTRY' ? 'ENTRY' : node.nodeType === 'EXPLOIT_TARGET' ? 'TARGET' : 'TRANSIT'}
                      </text>

                      {/* Endpoint Tag Badge on card */}
                      {primaryTag && (
                        <g transform="translate(50, -8)">
                          <rect
                            x="0"
                            y="0"
                            width={primaryTag.length * 5.5 + 10}
                            height="12"
                            rx="2"
                            fill="#1e293b"
                            stroke="#334155"
                            strokeWidth="0.5"
                          />
                          <text
                            x={(primaryTag.length * 5.5 + 10) / 2}
                            y="9"
                            textAnchor="middle"
                            className="text-[8px] font-mono fill-cyan-300"
                          >
                            #{primaryTag}
                          </text>
                        </g>
                      )}

                      {isChokePoint && !isRemediated && (
                        <text x="145" className="text-[9px] font-mono font-bold fill-amber-400">
                          ⚡ CHOKE
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Legend & Guidance Footer */}
        <div className="border-t border-slate-800 bg-slate-900/90 p-2.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-400">
            <span className="font-semibold text-slate-300">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
              <span>Critical Risk</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
              <span>High Risk</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
              <span>Matched Chain / Tag</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              <span>Remediated</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-300"></span>
              <span>Choke Point</span>
            </span>
          </div>

          <div className="text-xs text-slate-500">
            <span>Filter by vuln/tag above or click any node to simulate remediation in real time.</span>
          </div>
        </div>

        {/* Slide-in Inspection Drawer for Selected Node */}
        {selectedNode && (
          <div className="absolute top-0 right-0 bottom-0 w-80 md:w-96 bg-slate-900/95 border-l border-slate-800 p-4 z-20 overflow-y-auto backdrop-blur-md shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200">
                      {selectedNode.method}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {selectedNode.requiresAuth ? 'Auth Required' : 'Public Endpoint'}
                    </span>
                    {selectedNode.tags && selectedNode.tags.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-sm font-bold font-mono text-white break-all">
                    {selectedNode.path}
                  </h3>
                </div>
                <button
                  onClick={() => onSelectNode(null)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* What-If Simulator Action on this node */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    What-If Simulation State
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    simulatedSet.has(selectedNode.id)
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {simulatedSet.has(selectedNode.id) ? 'REMEDIATED' : 'VULNERABLE'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {simulatedSet.has(selectedNode.id)
                    ? 'This endpoint is currently marked as remediated. Connected attack paths are severed.'
                    : 'Simulate fixing this endpoint to see which multi-hop attack paths get broken in real time.'}
                </p>
                <button
                  onClick={() => onToggleSimulateNode(selectedNode.id)}
                  className={`mt-2.5 w-full py-1.5 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                    simulatedSet.has(selectedNode.id)
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                  }`}
                >
                  {simulatedSet.has(selectedNode.id) ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Revert Fix Simulation</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Simulate Fix (Remediate)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Findings List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Vulnerabilities Detected</span>
                  <span className="text-slate-500 text-[11px] font-mono">
                    {selectedNode.findings.length}
                  </span>
                </div>

                {selectedNode.findings.length === 0 ? (
                  <div className="text-xs text-slate-500 p-3 bg-slate-950/40 rounded-lg">
                    No automated vulnerabilities detected on this endpoint.
                  </div>
                ) : (
                  selectedNode.findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{f.title}</span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            f.severity === 'CRITICAL'
                              ? 'bg-red-950/80 text-red-400 border border-red-500/30'
                              : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {f.severity}
                        </span>
                      </div>
                      <div className="text-[11px] text-cyan-300">{f.category}</div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{f.evidence}</p>
                      <div className="pt-1 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
                        <span>CWE: {f.cwe}</span>
                        <span>Effort: {f.remediationEffort}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Attack Paths Passing Through this Node */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Attack Chains Traversing this Node
                </div>
                <div className="space-y-1.5">
                  {attackPaths
                    .filter(p => p.nodeIds.includes(selectedNode.id))
                    .map(p => {
                      const isMatchedInFilter = isFilterActive && matchedAttackPaths.some(mp => mp.id === p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => onHighlightPath(p.id)}
                          className={`p-2 rounded bg-slate-950/40 border transition-colors cursor-pointer flex items-center justify-between text-xs ${
                            highlightedPathId === p.id
                              ? 'border-cyan-500 bg-cyan-950/20'
                              : isMatchedInFilter
                              ? 'border-cyan-500/40 hover:border-cyan-400'
                              : 'border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-cyan-400 font-semibold">{p.id}</span>
                              {isMatchedInFilter && (
                                <span className="text-[9px] font-mono px-1 py-0.2 bg-cyan-500/20 text-cyan-300 rounded">
                                  MATCH
                                </span>
                              )}
                            </div>
                            <div className="text-slate-300 truncate text-[11px]">{p.title}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Node ID: {selectedNode.id}</span>
              <button
                onClick={() => onSelectNode(null)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
