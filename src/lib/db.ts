/**
 * IndexedDB persistence layer using Dexie
 */

import Dexie, { type Table } from 'dexie';
import type { Node, Edge, Block, Frame, Tag } from '../types/core';

// ============================================
// Database Schema
// ============================================

export class MindOSDatabase extends Dexie {
  nodes!: Table<Node, string>;
  edges!: Table<Edge, string>;
  blocks!: Table<Block, string>;
  frames!: Table<Frame, string>;
  tags!: Table<Tag, string>;
  meta!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('MindOSDatabase');

    this.version(1).stores({
      nodes: 'id, *tags, frameId, createdAt, updatedAt',
      edges: 'id, sourceId, targetId, type, createdAt',
      blocks: 'id, nodeId, type, order, createdAt, updatedAt',
      frames: 'id, createdAt, updatedAt',
      tags: 'id, name, createdAt',
      meta: 'key',
    });
  }
}

export const db = new MindOSDatabase();

// ============================================
// Database Operations
// ============================================

export const dbOps = {
  // ============================================
  // Node Operations
  // ============================================

  async saveNode(node: Node) {
    await db.nodes.put(node);
  },

  async saveNodes(nodes: Node[]) {
    await db.nodes.bulkPut(nodes);
  },

  async getNode(id: string): Promise<Node | undefined> {
    return await db.nodes.get(id);
  },

  async getAllNodes(): Promise<Node[]> {
    return await db.nodes.toArray();
  },

  async deleteNode(id: string) {
    await db.nodes.delete(id);
    // Delete associated blocks
    await db.blocks.where('nodeId').equals(id).delete();
  },

  async getNodesByTag(tag: string): Promise<Node[]> {
    return await db.nodes.where('tags').equals(tag).toArray();
  },

  async getNodesByFrame(frameId: string): Promise<Node[]> {
    return await db.nodes.where('frameId').equals(frameId).toArray();
  },

  // ============================================
  // Edge Operations
  // ============================================

  async saveEdge(edge: Edge) {
    await db.edges.put(edge);
  },

  async saveEdges(edges: Edge[]) {
    await db.edges.bulkPut(edges);
  },

  async getEdge(id: string): Promise<Edge | undefined> {
    return await db.edges.get(id);
  },

  async getAllEdges(): Promise<Edge[]> {
    return await db.edges.toArray();
  },

  async deleteEdge(id: string) {
    await db.edges.delete(id);
  },

  async getNodeEdges(nodeId: string): Promise<Edge[]> {
    const outgoing = await db.edges.where('sourceId').equals(nodeId).toArray();
    const incoming = await db.edges.where('targetId').equals(nodeId).toArray();
    return [...outgoing, ...incoming];
  },

  // ============================================
  // Block Operations
  // ============================================

  async saveBlock(block: Block) {
    await db.blocks.put(block);
  },

  async saveBlocks(blocks: Block[]) {
    await db.blocks.bulkPut(blocks);
  },

  async getBlock(id: string): Promise<Block | undefined> {
    return await db.blocks.get(id);
  },

  async deleteBlock(id: string) {
    await db.blocks.delete(id);
  },

  async getNodeBlocks(nodeId: string): Promise<Block[]> {
    return await db.blocks.where('nodeId').equals(nodeId).sortBy('order');
  },

  // ============================================
  // Frame Operations
  // ============================================

  async saveFrame(frame: Frame) {
    await db.frames.put(frame);
  },

  async saveFrames(frames: Frame[]) {
    await db.frames.bulkPut(frames);
  },

  async getFrame(id: string): Promise<Frame | undefined> {
    return await db.frames.get(id);
  },

  async getAllFrames(): Promise<Frame[]> {
    return await db.frames.toArray();
  },

  async deleteFrame(id: string) {
    await db.frames.delete(id);
  },

  // ============================================
  // Tag Operations
  // ============================================

  async saveTag(tag: Tag) {
    await db.tags.put(tag);
  },

  async saveTags(tags: Tag[]) {
    await db.tags.bulkPut(tags);
  },

  async getTag(name: string): Promise<Tag | undefined> {
    return await db.tags.where('name').equals(name).first();
  },

  async getAllTags(): Promise<Tag[]> {
    return await db.tags.toArray();
  },

  async deleteTag(id: string) {
    await db.tags.delete(id);
  },

  // ============================================
  // Meta Operations (for app settings)
  // ============================================

  async setMeta(key: string, value: any) {
    await db.meta.put({ key, value });
  },

  async getMeta(key: string): Promise<any> {
    const result = await db.meta.get(key);
    return result?.value;
  },

  // ============================================
  // Bulk Operations
  // ============================================

  async saveAll(data: {
    nodes?: Node[];
    edges?: Edge[];
    blocks?: Block[];
    frames?: Frame[];
    tags?: Tag[];
  }) {
    await db.transaction('rw', [db.nodes, db.edges, db.blocks, db.frames, db.tags], async () => {
      if (data.nodes) await db.nodes.bulkPut(data.nodes);
      if (data.edges) await db.edges.bulkPut(data.edges);
      if (data.blocks) await db.blocks.bulkPut(data.blocks);
      if (data.frames) await db.frames.bulkPut(data.frames);
      if (data.tags) await db.tags.bulkPut(data.tags);
    });
  },

  async loadAll(): Promise<{
    nodes: Node[];
    edges: Edge[];
    blocks: Block[];
    frames: Frame[];
    tags: Tag[];
  }> {
    return {
      nodes: await db.nodes.toArray(),
      edges: await db.edges.toArray(),
      blocks: await db.blocks.toArray(),
      frames: await db.frames.toArray(),
      tags: await db.tags.toArray(),
    };
  },

  async clearAll() {
    await db.transaction('rw', [db.nodes, db.edges, db.blocks, db.frames, db.tags], async () => {
      await db.nodes.clear();
      await db.edges.clear();
      await db.blocks.clear();
      await db.frames.clear();
      await db.tags.clear();
    });
  },

  // ============================================
  // Export/Import
  // ============================================

  async exportToJSON(): Promise<string> {
    const data = await this.loadAll();
    return JSON.stringify(data, null, 2);
  },

  async importFromJSON(json: string) {
    try {
      const data = JSON.parse(json);
      await this.clearAll();
      await this.saveAll(data);
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  },
};

// ============================================
// Auto-save Hook (to be used in store)
// ============================================

export const createAutoSave = (getState: () => any, interval = 5000) => {
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  const save = async () => {
    const state = getState();

    const nodes = Array.from(state.nodes.values()) as Node[];
    const edges = Array.from(state.edges.values()) as Edge[];
    const blocks = Array.from(state.blocks.values()) as Block[];
    const frames = Array.from(state.frames.values()) as Frame[];
    const tags = Array.from(state.tags.values()) as Tag[];

    await dbOps.saveAll({ nodes, edges, blocks, frames, tags });

    // Save view state
    await dbOps.setMeta('viewState', {
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

    console.log('Auto-saved to IndexedDB');
  };

  const scheduleSave = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(save, interval);
  };

  const saveNow = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    return save();
  };

  return { scheduleSave, saveNow };
};

// ============================================
// Load initial state
// ============================================

export const loadInitialState = async () => {
  try {
    const data = await dbOps.loadAll();
    const viewState = await dbOps.getMeta('viewState');

    return {
      ...data,
      viewState,
    };
  } catch (error) {
    console.error('Failed to load initial state:', error);
    return null;
  }
};
