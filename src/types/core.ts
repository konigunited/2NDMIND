/**
 * MindOS Core Data Model
 *
 * Unified data structure for all three views:
 * - Markdown (text blocks)
 * - Canvas (visual cards)
 * - Graph (network nodes)
 */

// ============================================
// IDs and Common Types
// ============================================

export type NodeId = string;
export type EdgeId = string;
export type BlockId = string;
export type FrameId = string;
export type TagId = string;

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// ============================================
// Edge Types (Relation Types)
// ============================================

export enum EdgeType {
  // Core relations
  CAUSES = 'causes',           // A → B (causality)
  SUPPORTS = 'supports',       // A supports B (evidence)
  CONTRASTS = 'contrasts',     // A vs B (opposition)
  EXTENDS = 'extends',         // A extends B (inheritance)
  PART_OF = 'part_of',        // A is part of B (composition)

  // Additional relations
  LINKS = 'links',            // Generic link
  DEPENDS_ON = 'depends_on',  // A depends on B
  RELATES = 'relates',        // Weak relation
}

export interface EdgeStyle {
  color: string;
  strokeWidth: number;
  dashArray?: string;
  arrowType: 'none' | 'arrow' | 'double' | 'diamond';
}

// Default styles for each edge type
export const EDGE_STYLES: Record<EdgeType, EdgeStyle> = {
  [EdgeType.CAUSES]: {
    color: '#ff6b6b',
    strokeWidth: 2,
    arrowType: 'arrow',
  },
  [EdgeType.SUPPORTS]: {
    color: '#51cf66',
    strokeWidth: 2,
    arrowType: 'arrow',
  },
  [EdgeType.CONTRASTS]: {
    color: '#ffd43b',
    strokeWidth: 2,
    dashArray: '4 4',
    arrowType: 'double',
  },
  [EdgeType.EXTENDS]: {
    color: '#74c0fc',
    strokeWidth: 2,
    arrowType: 'diamond',
  },
  [EdgeType.PART_OF]: {
    color: '#b197fc',
    strokeWidth: 2,
    arrowType: 'arrow',
  },
  [EdgeType.LINKS]: {
    color: '#868e96',
    strokeWidth: 1,
    arrowType: 'none',
  },
  [EdgeType.DEPENDS_ON]: {
    color: '#ff922b',
    strokeWidth: 2,
    dashArray: '2 2',
    arrowType: 'arrow',
  },
  [EdgeType.RELATES]: {
    color: '#adb5bd',
    strokeWidth: 1,
    dashArray: '1 3',
    arrowType: 'none',
  },
};

// ============================================
// Node (unified entity)
// ============================================

export enum NodeKind {
  NOTE = 'note',
  IDEA = 'idea',
  TASK = 'task',
  TAG = 'tag',
}

export interface Node {
  id: NodeId;

  // Content
  title: string;
  content: string;           // Markdown content

  // Metadata
  tags: string[];
  createdAt: number;
  updatedAt: number;
  kind: NodeKind;
  icon?: string;

  // Visual properties
  position: Position;        // Position in Canvas/Graph
  size?: Size;              // Size (calculated or manual)
  color?: string;           // Custom color

  // State
  locked: boolean;          // Prevent editing/moving
  collapsed: boolean;       // Collapsed state in graph

  // References
  frameId?: FrameId;        // Parent frame (if any)

  // Graph-specific
  graphProperties?: {
    mass: number;           // For physics simulation
    fixed: boolean;         // Fixed position in graph
    layer: number;          // Depth/hierarchy level
  };
}

// ============================================
// Edge (connection between nodes)
// ============================================

export interface Edge {
  id: EdgeId;

  // Connection
  sourceId: NodeId;
  targetId: NodeId;

  // Type and properties
  type: EdgeType;
  label?: string;

  // Visual
  style?: Partial<EdgeStyle>;

  // State
  bidirectional: boolean;

  // Metadata
  createdAt: number;
}

// ============================================
// Block (Markdown block)
// ============================================

export enum BlockType {
  PARAGRAPH = 'paragraph',
  HEADING = 'heading',
  TASK_LIST = 'task_list',
  BULLET_LIST = 'bullet_list',
  CODE = 'code',
  TABLE = 'table',
  QUOTE = 'quote',
}

export interface Block {
  id: BlockId;
  nodeId: NodeId;           // Parent node

  type: BlockType;
  content: string;

  // Ordering
  order: number;

  // Properties
  level?: number;           // For headings (1-6)
  checked?: boolean;        // For task items

  // Metadata
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Frame (grouping container)
// ============================================

export interface Frame {
  id: FrameId;

  title: string;
  description?: string;

  // Visual
  position: Position;
  size: Size;
  color: string;

  // Auto-grouping rules
  rules?: FrameRule[];

  // State
  locked: boolean;
  collapsed: boolean;

  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface FrameRule {
  type: 'tag' | 'search' | 'relation';
  value: string;
  // Examples:
  // { type: 'tag', value: 'design' } - all nodes with #design
  // { type: 'search', value: 'TODO' } - all nodes containing "TODO"
  // { type: 'relation', value: 'causes:nodeId' } - all nodes that cause nodeId
}

// ============================================
// Tag
// ============================================

export interface Tag {
  id: TagId;
  name: string;
  color: string;

  // Usage stats
  count: number;            // How many nodes use this tag

  // Metadata
  createdAt: number;
}

// ============================================
// Graph Layout
// ============================================

export enum LayoutType {
  FORCE = 'force',          // Force-directed (with constraints)
  HIERARCHY = 'hierarchy',  // Tree-like
  GRID = 'grid',           // Grid-aligned
  CIRCULAR = 'circular',    // Circular layout
  TAGS = 'tags',           // Grouped by tags
  TYPES = 'types',         // Grouped by edge types
  CAUSALITY = 'causality', // Causal chain
}

export interface LayoutConfig {
  type: LayoutType;

  // Physics constraints
  maxOffset: number;        // Max distance from ideal position (default: 32)
  returnSpeed: number;      // Speed of return animation (default: 0.5s)

  // Force parameters
  repulsionStrength?: number;
  springStrength?: number;

  // Grid parameters
  gridSize?: number;
  padding?: number;
}

// ============================================
// Physics Constraints
// ============================================

export interface PhysicsConstraints {
  maxOffset: number;        // Maximum offset from ideal position (px)
  returnDuration: number;   // Return animation duration (ms)
  enablePhysics: boolean;   // Enable/disable physics
  gridSnap: number;         // Snap distance for layout grid
  repulsionRadius: number;  // Local repulsion radius

  forces: {
    spring: number;         // Edge spring force
    repulsion: number;      // Node repulsion force
    frameMagnet: number;    // Frame attraction force
  };
}

export const DEFAULT_PHYSICS: PhysicsConstraints = {
  maxOffset: 32,
  returnDuration: 500,
  enablePhysics: true,
  gridSnap: 8,
  repulsionRadius: 64,
  forces: {
    spring: 0.1,
    repulsion: 100,
    frameMagnet: 0.05,
  },
};

export enum PhysicsPreset {
  STATIC = 'static',
  TACTILE = 'tactile',
  STORM = 'storm',
}

export const PHYSICS_PRESETS: Record<PhysicsPreset, PhysicsConstraints> = {
  [PhysicsPreset.STATIC]: {
    maxOffset: 0,
    returnDuration: 0,
    enablePhysics: false,
    gridSnap: 8,
    repulsionRadius: 48,
    forces: {
      spring: 0.05,
      repulsion: 40,
      frameMagnet: 0.1,
    },
  },
  [PhysicsPreset.TACTILE]: {
    maxOffset: 32,
    returnDuration: 500,
    enablePhysics: true,
    gridSnap: 8,
    repulsionRadius: 64,
    forces: {
      spring: 0.12,
      repulsion: 120,
      frameMagnet: 0.12,
    },
  },
  [PhysicsPreset.STORM]: {
    maxOffset: 48,
    returnDuration: 300,
    enablePhysics: true,
    gridSnap: 8,
    repulsionRadius: 96,
    forces: {
      spring: 0.16,
      repulsion: 220,
      frameMagnet: 0.18,
    },
  },
};

// ============================================
// View State
// ============================================

export enum ViewMode {
  MARKDOWN = 'markdown',
  CANVAS = 'canvas',
  GRAPH = 'graph',
  TREE = 'tree',           // Hierarchy explorer
}

export interface ViewState {
  mode: ViewMode;

  // Camera/viewport
  zoom: number;
  pan: Position;

  // Selection
  selectedNodeIds: NodeId[];
  selectedEdgeIds: EdgeId[];

  // Filters
  visibleTags: string[];   // Empty = all visible
  hiddenNodeIds: NodeId[];

  // Layout
  layoutConfig: LayoutConfig;
}

export type LensMode = 'and' | 'or';

export interface TagLens {
  tag: string;
  mode: LensMode;
}

export interface GraphFilters {
  tagLenses: TagLens[];
  ownerOnly: boolean;
  newOnly: boolean;
  focusTag?: string | null;
}

export enum GraphTool {
  SELECT = 'select',
  CONNECT = 'connect',
  REFRAME = 'reframe',
  MAGNET = 'magnet',
  COLORIZE = 'colorize',
  SIMPLIFY = 'simplify',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
}

export interface GraphLayoutSnapshot {
  id: string;
  label: string;
  createdAt: number;
  layout: Record<NodeId, Position>;
}

// ============================================
// App State (root)
// ============================================

export interface AppState {
  nodes: Map<NodeId, Node>;
  edges: Map<EdgeId, Edge>;
  blocks: Map<BlockId, Block>;
  frames: Map<FrameId, Frame>;
  tags: Map<TagId, Tag>;

  viewState: ViewState;
  physicsConstraints: PhysicsConstraints;
  physicsPreset: PhysicsPreset;
  graphFilters: GraphFilters;
  graphSnapshots: GraphLayoutSnapshot[];
  activeGraphTool: GraphTool;

  // History
  history: {
    past: AppState[];
    future: AppState[];
  };
}
