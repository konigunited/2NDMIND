/**
 * Main Zustand store for MindOS
 * Manages all application state with Immer for immutability
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Map/Set support in Immer
enableMapSet();
import type {
  Node,
  Edge,
  Block,
  Frame,
  Tag,
  NodeId,
  EdgeId,
  BlockId,
  FrameId,
  LayoutConfig,
  LayoutType,
  PhysicsConstraints,
  Position,
  GraphFilters,
  GraphLayoutSnapshot,
  LensMode,
} from '../types/core';
import { ViewMode, PHYSICS_PRESETS, PhysicsPreset, GraphTool, NodeKind } from '../types/core';
import {
  createNode,
  createEdge,
  createBlock,
  createFrame,
  createTag,
} from '../utils/factories';
import type {
  CreateNodeOptions,
  CreateEdgeOptions,
  CreateBlockOptions,
  CreateFrameOptions,
  CreateTagOptions,
} from '../utils/factories';

const clonePhysics = (constraints: PhysicsConstraints): PhysicsConstraints => ({
  ...constraints,
  forces: { ...constraints.forces },
});

const createSnapshotId = () =>
  `snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ============================================
// Store State Interface
// ============================================

interface AppStore {
  // Data
  nodes: Map<NodeId, Node>;
  edges: Map<EdgeId, Edge>;
  blocks: Map<BlockId, Block>;
  frames: Map<FrameId, Frame>;
  tags: Map<string, Tag>;

  // View state
  viewMode: ViewMode;
  zoom: number;
  pan: Position;
  selectedNodeIds: Set<NodeId>;
  selectedEdgeIds: Set<EdgeId>;

  // Layout
  layoutConfig: LayoutConfig;
  physicsConstraints: PhysicsConstraints;
  physicsPreset: PhysicsPreset;
  graphFilters: GraphFilters;
  graphSnapshots: GraphLayoutSnapshot[];
  activeGraphTool: GraphTool;

  // History
  history: {
    past: string[];  // Serialized states
    future: string[];
  };

  // ============================================
  // Node Actions
  // ============================================

  addNode: (options?: CreateNodeOptions) => Node;
  updateNode: (id: NodeId, updates: Partial<Node>) => void;
  deleteNode: (id: NodeId) => void;
  getNode: (id: NodeId) => Node | undefined;
  getAllNodes: () => Node[];

  // ============================================
  // Edge Actions
  // ============================================

  addEdge: (options: CreateEdgeOptions) => Edge;
  updateEdge: (id: EdgeId, updates: Partial<Edge>) => void;
  deleteEdge: (id: EdgeId) => void;
  getEdge: (id: EdgeId) => Edge | undefined;
  getAllEdges: () => Edge[];
  getNodeEdges: (nodeId: NodeId) => Edge[];

  // ============================================
  // Block Actions
  // ============================================

  addBlock: (options: CreateBlockOptions) => Block;
  updateBlock: (id: BlockId, updates: Partial<Block>) => void;
  deleteBlock: (id: BlockId) => void;
  getNodeBlocks: (nodeId: NodeId) => Block[];

  // ============================================
  // Frame Actions
  // ============================================

  addFrame: (options?: CreateFrameOptions) => Frame;
  updateFrame: (id: FrameId, updates: Partial<Frame>) => void;
  deleteFrame: (id: FrameId) => void;
  getFrame: (id: FrameId) => Frame | undefined;
  getAllFrames: () => Frame[];

  // ============================================
  // Tag Actions
  // ============================================

  addTag: (options: CreateTagOptions) => Tag;
  removeTag: (name: string) => void;
  getTag: (name: string) => Tag | undefined;
  getAllTags: () => Tag[];

  // ============================================
  // Selection Actions
  // ============================================

  selectNode: (id: NodeId, multi?: boolean) => void;
  deselectNode: (id: NodeId) => void;
  clearSelection: () => void;
  selectEdge: (id: EdgeId, multi?: boolean) => void;
  deselectEdge: (id: EdgeId) => void;

  // ============================================
  // View Actions
  // ============================================

  setViewMode: (mode: ViewMode) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Position) => void;
  setLayoutConfig: (config: Partial<LayoutConfig>) => void;
  setPhysicsConstraints: (constraints: Partial<PhysicsConstraints>) => void;
  setPhysicsPreset: (preset: PhysicsPreset) => void;
  cyclePhysicsPreset: () => void;
  setGraphFilters: (filters: Partial<GraphFilters>) => void;
  setGraphSnapshots: (snapshots: GraphLayoutSnapshot[]) => void;
  addTagLens: (tag: string, mode?: LensMode) => void;
  removeTagLens: (tag: string) => void;
  clearTagLenses: () => void;
  setActiveGraphTool: (tool: GraphTool) => void;
  saveLayoutSnapshot: (label?: string) => GraphLayoutSnapshot;
  restoreLayoutSnapshot: (id: string) => void;

  // ============================================
  // Transform Actions
  // ============================================

  transformNodeToCanvas: (nodeId: NodeId) => void;
  transformNodeToMarkdown: (nodeId: NodeId) => void;

  // ============================================
  // History Actions
  // ============================================

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // ============================================
  // Utility Actions
  // ============================================

  reset: () => void;
  loadState: (state: string) => void;
  exportState: () => string;
}

// ============================================
// Initial State
// ============================================

const createInitialState = () => ({
  nodes: new Map(),
  edges: new Map(),
  blocks: new Map(),
  frames: new Map(),
  tags: new Map(),

  viewMode: ViewMode.GRAPH,
  zoom: 1,
  pan: { x: 0, y: 0 },
  selectedNodeIds: new Set<NodeId>(),
  selectedEdgeIds: new Set<EdgeId>(),

  layoutConfig: {
    type: 'force' as LayoutType,
    maxOffset: 32,
    returnSpeed: 0.5,
    repulsionStrength: 100,
    springStrength: 0.1,
  },

  physicsConstraints: clonePhysics(PHYSICS_PRESETS[PhysicsPreset.TACTILE]),
  physicsPreset: PhysicsPreset.TACTILE,
  graphFilters: {
    tagLenses: [],
    ownerOnly: false,
    newOnly: false,
    focusTag: null,
  },
  graphSnapshots: [],
  activeGraphTool: GraphTool.SELECT,

  history: {
    past: [],
    future: [],
  },
});

const initialState = createInitialState();

// ============================================
// Store Implementation
// ============================================

export const useAppStore = create<AppStore>()(
  immer((set, get) => ({
    ...initialState,

    // ============================================
    // Node Actions
    // ============================================

    addNode: (options) => {
      const node = createNode(options);
      set((state) => {
        state.nodes.set(node.id, node);

        // Update tag counts
        node.tags.forEach((tagName) => {
          let tag = state.tags.get(tagName);
          if (!tag) {
            tag = createTag({ name: tagName });
            state.tags.set(tagName, tag);
          }
          tag.count++;
        });
      });
      return node;
    },

    updateNode: (id, updates) => {
      set((state) => {
        const node = state.nodes.get(id);
        if (!node) return;

        // Handle tag changes
        if (updates.tags) {
          const oldTags = new Set(node.tags);
          const newTags = new Set(updates.tags);

          // Decrement old tags
          oldTags.forEach((tagName) => {
            if (!newTags.has(tagName)) {
              const tag = state.tags.get(tagName);
              if (tag) tag.count--;
            }
          });

          // Increment new tags
          newTags.forEach((tagName) => {
            if (!oldTags.has(tagName)) {
              let tag = state.tags.get(tagName);
              if (!tag) {
                tag = createTag({ name: tagName });
                state.tags.set(tagName, tag);
              }
              tag.count++;
            }
          });
        }

        Object.assign(node, updates);
        node.updatedAt = Date.now();
      });
    },

    deleteNode: (id) => {
      set((state) => {
        const node = state.nodes.get(id);
        if (!node) return;

        // Update tag counts
        node.tags.forEach((tagName) => {
          const tag = state.tags.get(tagName);
          if (tag) {
            tag.count--;
            if (tag.count <= 0) {
              state.tags.delete(tagName);
            }
          }
        });

        // Delete associated blocks
        Array.from(state.blocks.values())
          .filter((block) => block.nodeId === id)
          .forEach((block) => state.blocks.delete(block.id));

        // Delete associated edges
        Array.from(state.edges.values())
          .filter((edge) => edge.sourceId === id || edge.targetId === id)
          .forEach((edge) => state.edges.delete(edge.id));

        state.nodes.delete(id);
        state.selectedNodeIds.delete(id);
      });
    },

    getNode: (id) => get().nodes.get(id),

    getAllNodes: () => Array.from(get().nodes.values()),

    // ============================================
    // Edge Actions
    // ============================================

    addEdge: (options) => {
      const edge = createEdge(options);
      set((state) => {
        state.edges.set(edge.id, edge);
      });
      return edge;
    },

    updateEdge: (id, updates) => {
      set((state) => {
        const edge = state.edges.get(id);
        if (edge) {
          Object.assign(edge, updates);
        }
      });
    },

    deleteEdge: (id) => {
      set((state) => {
        state.edges.delete(id);
        state.selectedEdgeIds.delete(id);
      });
    },

    getEdge: (id) => get().edges.get(id),

    getAllEdges: () => Array.from(get().edges.values()),

    getNodeEdges: (nodeId) => {
      return Array.from(get().edges.values()).filter(
        (edge) => edge.sourceId === nodeId || edge.targetId === nodeId
      );
    },

    // ============================================
    // Block Actions
    // ============================================

    addBlock: (options) => {
      const block = createBlock(options);
      set((state) => {
        state.blocks.set(block.id, block);
      });
      return block;
    },

    updateBlock: (id, updates) => {
      set((state) => {
        const block = state.blocks.get(id);
        if (block) {
          Object.assign(block, updates);
          block.updatedAt = Date.now();
        }
      });
    },

    deleteBlock: (id) => {
      set((state) => {
        state.blocks.delete(id);
      });
    },

    getNodeBlocks: (nodeId) => {
      return Array.from(get().blocks.values())
        .filter((block) => block.nodeId === nodeId)
        .sort((a, b) => a.order - b.order);
    },

    // ============================================
    // Frame Actions
    // ============================================

    addFrame: (options) => {
      const frame = createFrame(options);
      set((state) => {
        state.frames.set(frame.id, frame);
      });
      return frame;
    },

    updateFrame: (id, updates) => {
      set((state) => {
        const frame = state.frames.get(id);
        if (frame) {
          Object.assign(frame, updates);
          frame.updatedAt = Date.now();
        }
      });
    },

    deleteFrame: (id) => {
      set((state) => {
        // Remove frame reference from nodes
        state.nodes.forEach((node) => {
          if (node.frameId === id) {
            node.frameId = undefined;
          }
        });
        state.frames.delete(id);
      });
    },

    getFrame: (id) => get().frames.get(id),

    getAllFrames: () => Array.from(get().frames.values()),

    // ============================================
    // Tag Actions
    // ============================================

    addTag: (options) => {
      const tag = createTag(options);
      set((state) => {
        state.tags.set(tag.name, tag);
      });
      return tag;
    },

    removeTag: (name) => {
      set((state) => {
        state.tags.delete(name);
        // Remove tag from all nodes
        state.nodes.forEach((node) => {
          node.tags = node.tags.filter((t) => t !== name);
        });
      });
    },

    getTag: (name) => get().tags.get(name),

    getAllTags: () => Array.from(get().tags.values()),

    // ============================================
    // Selection Actions
    // ============================================

    selectNode: (id, multi = false) => {
      set((state) => {
        if (!multi) {
          state.selectedNodeIds.clear();
        }
        state.selectedNodeIds.add(id);
      });
    },

    deselectNode: (id) => {
      set((state) => {
        state.selectedNodeIds.delete(id);
      });
    },

    clearSelection: () => {
      set((state) => {
        state.selectedNodeIds.clear();
        state.selectedEdgeIds.clear();
      });
    },

    selectEdge: (id, multi = false) => {
      set((state) => {
        if (!multi) {
          state.selectedEdgeIds.clear();
        }
        state.selectedEdgeIds.add(id);
      });
    },

    deselectEdge: (id) => {
      set((state) => {
        state.selectedEdgeIds.delete(id);
      });
    },

    // ============================================
    // View Actions
    // ============================================

    setViewMode: (mode) => {
      set((state) => {
        state.viewMode = mode;
      });
    },

    setZoom: (zoom) => {
      set((state) => {
        state.zoom = Math.max(0.1, Math.min(5, zoom));
      });
    },

    setPan: (pan) => {
      set((state) => {
        state.pan = pan;
      });
    },

    setLayoutConfig: (config) => {
      set((state) => {
        Object.assign(state.layoutConfig, config);
      });
    },

    setPhysicsConstraints: (constraints) => {
      set((state) => {
        const target = state.physicsConstraints;
        if (constraints.forces) {
          target.forces = {
            ...target.forces,
            ...constraints.forces,
          };
        }
        const { forces, ...rest } = constraints;
        Object.assign(target, rest);
      });
    },
    setPhysicsPreset: (preset) => {
      set((state) => {
        state.physicsPreset = preset;
        state.physicsConstraints = clonePhysics(PHYSICS_PRESETS[preset]);
      });
    },
    cyclePhysicsPreset: () => {
      const order: PhysicsPreset[] = [
        PhysicsPreset.STATIC,
        PhysicsPreset.TACTILE,
        PhysicsPreset.STORM,
      ];
      const current = get().physicsPreset;
      const next = order[(order.indexOf(current) + 1) % order.length];
      get().setPhysicsPreset(next);
    },
    setGraphFilters: (filters) => {
      set((state) => {
        Object.assign(state.graphFilters, filters);
      });
    },
    setGraphSnapshots: (snapshots) => {
      set((state) => {
        state.graphSnapshots = snapshots;
      });
    },
    addTagLens: (tag, mode: LensMode = 'and') => {
      set((state) => {
        const existing = state.graphFilters.tagLenses.find((lens) => lens.tag === tag);
        if (existing) {
          existing.mode = mode;
        } else {
          state.graphFilters.tagLenses.push({ tag, mode });
        }
      });
    },
    removeTagLens: (tag) => {
      set((state) => {
        state.graphFilters.tagLenses = state.graphFilters.tagLenses.filter(
          (lens) => lens.tag !== tag,
        );
      });
    },
    clearTagLenses: () => {
      set((state) => {
        state.graphFilters.tagLenses = [];
      });
    },
    setActiveGraphTool: (tool) => {
      set((state) => {
        state.activeGraphTool = tool;
      });
    },
    saveLayoutSnapshot: (label) => {
      const layout: Record<NodeId, Position> = {};
      const now = Date.now();
      get()
        .nodes.forEach((node) => {
          layout[node.id] = { ...node.position };
        });

      const snapshot: GraphLayoutSnapshot = {
        id: createSnapshotId(),
        label: label || `Layout ${new Date(now).toLocaleTimeString()}`,
        createdAt: now,
        layout,
      };

      set((state) => {
        state.graphSnapshots.push(snapshot);
        if (state.graphSnapshots.length > 10) {
          state.graphSnapshots.shift();
        }
      });

      return snapshot;
    },
    restoreLayoutSnapshot: (id) => {
      const snapshot = get().graphSnapshots.find((snap) => snap.id === id);
      if (!snapshot) return;

      set((state) => {
        Object.entries(snapshot.layout).forEach(([nodeId, position]) => {
          const node = state.nodes.get(nodeId);
          if (node) {
            node.position = { ...position };
          }
        });
      });
    },

    // ============================================
    // Transform Actions
    // ============================================

    transformNodeToCanvas: (nodeId) => {
      // Transform markdown blocks to canvas position
      // Implementation depends on canvas view
      console.log('Transform to canvas:', nodeId);
    },

    transformNodeToMarkdown: (nodeId) => {
      // Transform canvas node to markdown blocks
      console.log('Transform to markdown:', nodeId);
    },

    // ============================================
    // History Actions
    // ============================================

    undo: () => {
      const state = get();
      if (state.history.past.length === 0) return;

      const previous = state.history.past[state.history.past.length - 1];
      const current = get().exportState();

      set((draft) => {
        draft.history.past.pop();
        draft.history.future.push(current);
      });

      get().loadState(previous);
    },

    redo: () => {
      const state = get();
      if (state.history.future.length === 0) return;

      const next = state.history.future[state.history.future.length - 1];
      const current = get().exportState();

      set((draft) => {
        draft.history.future.pop();
        draft.history.past.push(current);
      });

      get().loadState(next);
    },

    canUndo: () => get().history.past.length > 0,

    canRedo: () => get().history.future.length > 0,

    // ============================================
    // Utility Actions
    // ============================================

    reset: () => {
      set(createInitialState());
    },

    loadState: (stateJson: string) => {
      try {
        const parsed = JSON.parse(stateJson);
        set((state) => {
          const nodeEntries = (parsed.nodes || []).map(
            ([id, rawNode]: [NodeId, Node]) => {
              const safeNode: Node = {
                ...rawNode,
                kind: rawNode.kind || NodeKind.NOTE,
                tags: rawNode.tags || [],
                position: rawNode.position
                  ? { ...rawNode.position }
                  : { x: 0, y: 0 },
              };
              return [id, safeNode];
            },
          );
          state.nodes = new Map(nodeEntries);
          state.edges = new Map(parsed.edges || []);
          state.blocks = new Map(parsed.blocks || []);
          state.frames = new Map(parsed.frames || []);
          state.tags = new Map(parsed.tags || []);
          state.tags.forEach((tag) => {
            tag.count = 0;
          });
          state.nodes.forEach((node) => {
            node.tags.forEach((tagName) => {
              let tag = state.tags.get(tagName);
              if (!tag) {
                tag = createTag({ name: tagName });
                state.tags.set(tagName, tag);
              }
              tag.count += 1;
            });
          });

          if (parsed.viewMode) {
            state.viewMode = parsed.viewMode;
          }
          if (typeof parsed.zoom === 'number') {
            state.zoom = parsed.zoom;
          }
          if (parsed.pan) {
            state.pan = { ...state.pan, ...parsed.pan };
          }
          if (parsed.layoutConfig) {
            state.layoutConfig = {
              ...state.layoutConfig,
              ...parsed.layoutConfig,
            };
          }

          const applyPhysics = (preset: PhysicsPreset) => {
            const base = clonePhysics(
              PHYSICS_PRESETS[preset] || PHYSICS_PRESETS[PhysicsPreset.TACTILE],
            );
            if (parsed.physicsConstraints) {
              const incoming = parsed.physicsConstraints as Partial<PhysicsConstraints>;
              if (incoming.forces) {
                base.forces = {
                  ...base.forces,
                  ...incoming.forces,
                };
              }
              const { forces, ...rest } = incoming;
              Object.assign(base, rest);
            }
            state.physicsConstraints = base;
          };

          if (parsed.physicsPreset) {
            const preset = parsed.physicsPreset as PhysicsPreset;
            state.physicsPreset = preset;
            applyPhysics(preset);
          } else if (parsed.physicsConstraints) {
            applyPhysics(state.physicsPreset || PhysicsPreset.TACTILE);
          }

          if (parsed.graphFilters) {
            const filters = parsed.graphFilters as GraphFilters;
            state.graphFilters = {
              ...state.graphFilters,
              ...filters,
              tagLenses: filters.tagLenses || [],
            };
          }

          if (Array.isArray(parsed.graphSnapshots)) {
            state.graphSnapshots = parsed.graphSnapshots;
          }

          if (parsed.activeGraphTool) {
            state.activeGraphTool = parsed.activeGraphTool as GraphTool;
          }
        });
      } catch (error) {
        console.error('Failed to load state:', error);
      }
    },

    exportState: () => {
      const state = get();
      return JSON.stringify({
        nodes: Array.from(state.nodes.entries()),
        edges: Array.from(state.edges.entries()),
        blocks: Array.from(state.blocks.entries()),
        frames: Array.from(state.frames.entries()),
        tags: Array.from(state.tags.entries()),
        viewMode: state.viewMode,
        zoom: state.zoom,
        pan: state.pan,
        layoutConfig: state.layoutConfig,
        physicsConstraints: state.physicsConstraints,
        physicsPreset: state.physicsPreset,
        graphFilters: state.graphFilters,
        graphSnapshots: state.graphSnapshots,
        activeGraphTool: state.activeGraphTool,
      });
    },
  }))
);
