import type { Edge, Node, NodeId, Position } from '../../../types/core';
import { EdgeType, NodeKind } from '../../../types/core';
import { snapToGrid } from './math';

export type LayoutMode = 'flowGrid' | 'byTags' | 'byTypes' | 'byCausality' | 'byTime';

export interface LayoutOptions {
  gridSize: number;
  columnSpacing?: number;
  rowSpacing?: number;
  margin?: number;
  maxPerColumn?: number;
}

export interface LayoutComputation {
  positions: Record<NodeId, Position>;
  groups: Map<string, NodeId[]>;
  layers: Map<NodeId, number>;
}

const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  gridSize: 8,
  columnSpacing: 240,
  rowSpacing: 160,
  margin: 120,
  maxPerColumn: 8,
};

const DIRECTIONAL_EDGE_TYPES = new Set<EdgeType>([
  EdgeType.CAUSES,
  EdgeType.SUPPORTS,
  EdgeType.EXTENDS,
  EdgeType.PART_OF,
  EdgeType.DEPENDS_ON,
]);

const ORDERED_NODE_KINDS: NodeKind[] = [
  NodeKind.NOTE,
  NodeKind.IDEA,
  NodeKind.TASK,
  NodeKind.TAG,
];

const ensureOptions = (options?: Partial<LayoutOptions>) => ({
  ...DEFAULT_LAYOUT_OPTIONS,
  ...options,
});

const buildLayers = (nodes: Node[], edges: Edge[]): Map<NodeId, number> => {
  const indegree = new Map<NodeId, number>();
  const adjacency = new Map<NodeId, NodeId[]>();

  nodes.forEach((node) => {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    if (!DIRECTIONAL_EDGE_TYPES.has(edge.type)) return;
    const neighbors = adjacency.get(edge.sourceId);
    if (neighbors) {
      neighbors.push(edge.targetId);
    }
    indegree.set(edge.targetId, (indegree.get(edge.targetId) || 0) + 1);
  });

  const queue: Array<{ id: NodeId; layer: number }> = [];

  indegree.forEach((count, nodeId) => {
    if (count === 0) {
      queue.push({ id: nodeId, layer: 0 });
    }
  });

  const layers = new Map<NodeId, number>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const existingLayer = layers.get(current.id);
    if (existingLayer !== undefined && existingLayer >= current.layer) {
      continue;
    }
    layers.set(current.id, current.layer);

    const neighbors = adjacency.get(current.id) || [];
    neighbors.forEach((neighborId) => {
      const nextIndegree = (indegree.get(neighborId) || 0) - 1;
      indegree.set(neighborId, nextIndegree);
      const nextLayer = current.layer + 1;
      if (nextIndegree <= 0) {
        queue.push({ id: neighborId, layer: nextLayer });
      } else {
        const existingNeighborLayer = layers.get(neighborId) ?? 0;
        layers.set(neighborId, Math.max(existingNeighborLayer, nextLayer));
      }
    });
  }

  // Ensure every node has a layer assignment
  nodes.forEach((node) => {
    if (!layers.has(node.id)) {
      layers.set(node.id, 0);
    }
  });

  return layers;
};

const assignPositionsFromGroups = (
  groupedNodes: Array<[string, Node[]]>,
  options: Required<LayoutOptions>,
): LayoutComputation => {
  const positions: Record<NodeId, Position> = {};
  const groups = new Map<string, NodeId[]>();
  const layers = new Map<NodeId, number>();

  groupedNodes.forEach(([groupId, groupNodes], columnIndex) => {
    const x = snapToGrid(options.margin + columnIndex * options.columnSpacing, options.gridSize);
    const sortedGroup = [...groupNodes].sort((a, b) => a.position.y - b.position.y);

    sortedGroup.forEach((node, index) => {
      const y = snapToGrid(options.margin + index * options.rowSpacing, options.gridSize);
      positions[node.id] = { x, y };
      layers.set(node.id, columnIndex);

      const existing = groups.get(groupId) || [];
      existing.push(node.id);
      groups.set(groupId, existing);
    });
  });

  return { positions, groups, layers };
};

const computeFlowGridLayout = (
  nodes: Node[],
  edges: Edge[],
  options: Required<LayoutOptions>,
): LayoutComputation => {
  if (nodes.length === 0) {
    return { positions: {}, groups: new Map(), layers: new Map() };
  }

  const layers = buildLayers(nodes, edges);
  const grouped = new Map<number, Node[]>();

  nodes.forEach((node) => {
    const layer = layers.get(node.id) ?? 0;
    if (!grouped.has(layer)) {
      grouped.set(layer, []);
    }
    grouped.get(layer)!.push(node);
  });

  const sortedLayers = Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);

  const positions: Record<NodeId, Position> = {};
  const groups = new Map<string, NodeId[]>();

  sortedLayers.forEach(([layer, layerNodes], columnIndex) => {
    const x = snapToGrid(options.margin + columnIndex * options.columnSpacing, options.gridSize);
    const sortedNodes = [...layerNodes].sort((a, b) => a.position.y - b.position.y);

    sortedNodes.forEach((node, index) => {
      const y = snapToGrid(options.margin + index * options.rowSpacing, options.gridSize);
      positions[node.id] = { x, y };
      const key = `layer:${layer}`;
      const assigned = groups.get(key) || [];
      assigned.push(node.id);
      groups.set(key, assigned);
    });
  });

  return { positions, groups, layers };
};

const layoutByTags = (
  nodes: Node[],
  options: Required<LayoutOptions>,
): LayoutComputation => {
  const tagGroups = new Map<string, Node[]>();
  const untagged: Node[] = [];

  nodes.forEach((node) => {
    if (node.tags.length === 0) {
      untagged.push(node);
      return;
    }

    const key = node.tags[0];
    if (!tagGroups.has(key)) {
      tagGroups.set(key, []);
    }
    tagGroups.get(key)!.push(node);
  });

  const entries: Array<[string, Node[]]> = Array.from(tagGroups.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  if (untagged.length > 0) {
    entries.push(['untagged', untagged]);
  }

  return assignPositionsFromGroups(entries, options);
};

const layoutByTypes = (
  nodes: Node[],
  options: Required<LayoutOptions>,
): LayoutComputation => {
  const typeGroups = new Map<NodeKind, Node[]>();

  nodes.forEach((node) => {
    if (!typeGroups.has(node.kind)) {
      typeGroups.set(node.kind, []);
    }
    typeGroups.get(node.kind)!.push(node);
  });

  const entries: Array<[string, Node[]]> = ORDERED_NODE_KINDS
    .filter((kind) => typeGroups.has(kind))
    .map((kind) => [kind, typeGroups.get(kind)!]);

  return assignPositionsFromGroups(entries, options);
};

const layoutByTime = (
  nodes: Node[],
  options: Required<LayoutOptions>,
): LayoutComputation => {
  if (nodes.length === 0) {
    return { positions: {}, groups: new Map(), layers: new Map() };
  }

  const sorted = [...nodes].sort((a, b) => a.createdAt - b.createdAt);
  const positions: Record<NodeId, Position> = {};
  const groups = new Map<string, NodeId[]>();
  const layers = new Map<NodeId, number>();

  const perColumn = options.maxPerColumn;

  sorted.forEach((node, index) => {
    const column = Math.floor(index / perColumn);
    const row = index % perColumn;
    const x = snapToGrid(options.margin + column * options.columnSpacing, options.gridSize);
    const y = snapToGrid(options.margin + row * options.rowSpacing, options.gridSize);
    positions[node.id] = { x, y };
    layers.set(node.id, column);
    const key = `time:${column}`;
    const bucket = groups.get(key) || [];
    bucket.push(node.id);
    groups.set(key, bucket);
  });

  return { positions, groups, layers };
};

export const computeLayout = (
  mode: LayoutMode,
  nodes: Node[],
  edges: Edge[],
  options?: Partial<LayoutOptions>,
): LayoutComputation => {
  const resolvedOptions = ensureOptions(options);

  switch (mode) {
    case 'byTags':
      return layoutByTags(nodes, resolvedOptions);
    case 'byTypes':
      return layoutByTypes(nodes, resolvedOptions);
    case 'byTime':
      return layoutByTime(nodes, resolvedOptions);
    case 'byCausality':
    case 'flowGrid':
    default:
      return computeFlowGridLayout(nodes, edges, resolvedOptions);
  }
};

export const mergeLayouts = (
  base: Record<NodeId, Position>,
  update: Record<NodeId, Position>,
): Record<NodeId, Position> => {
  const merged = { ...base };
  Object.entries(update).forEach(([nodeId, position]) => {
    merged[nodeId as NodeId] = position;
  });
  return merged;
};
