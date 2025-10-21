/**
 * Factory functions for creating entities with default values
 */

import type {
  Node,
  Edge,
  Block,
  Frame,
  Tag,
  Position,
} from '../types/core';
import { EdgeType, BlockType, NodeKind } from '../types/core';
import {
  createNodeId,
  createEdgeId,
  createBlockId,
  createFrameId,
  createTagId,
} from './id';

// ============================================
// Node Factory
// ============================================

export interface CreateNodeOptions {
  title?: string;
  content?: string;
  position?: Position;
  tags?: string[];
  frameId?: string;
  color?: string;
  kind?: NodeKind;
  icon?: string;
}

// Generate random position for new nodes (avoid overlap)
const generateRandomPosition = (): Position => {
  // Random position in a reasonable area (200-800 x 200-600)
  const x = Math.floor(Math.random() * 600) + 200;
  const y = Math.floor(Math.random() * 400) + 200;
  return { x, y };
};

export const createNode = (options: CreateNodeOptions = {}): Node => {
  const now = Date.now();

  return {
    id: createNodeId(),
    title: options.title || 'Untitled',
    content: options.content || '',
    tags: options.tags || [],
    createdAt: now,
    updatedAt: now,
    kind: options.kind || NodeKind.NOTE,
    icon: options.icon,
    position: options.position || generateRandomPosition(),
    locked: false,
    collapsed: false,
    frameId: options.frameId,
    color: options.color,
    graphProperties: {
      mass: 1,
      fixed: false,
      layer: 0,
    },
  };
};

// ============================================
// Edge Factory
// ============================================

export interface CreateEdgeOptions {
  sourceId: string;
  targetId: string;
  type?: EdgeType;
  label?: string;
  bidirectional?: boolean;
}

export const createEdge = (options: CreateEdgeOptions): Edge => {
  if (!options.sourceId || !options.targetId) {
    throw new Error('sourceId and targetId are required for edge creation');
  }

  return {
    id: createEdgeId(),
    sourceId: options.sourceId,
    targetId: options.targetId,
    type: options.type || EdgeType.LINKS,
    label: options.label,
    bidirectional: options.bidirectional || false,
    createdAt: Date.now(),
  };
};

// ============================================
// Block Factory
// ============================================

export interface CreateBlockOptions {
  nodeId: string;
  type?: BlockType;
  content?: string;
  order?: number;
  level?: number;
  checked?: boolean;
}

export const createBlock = (options: CreateBlockOptions): Block => {
  if (!options.nodeId) {
    throw new Error('nodeId is required for block creation');
  }

  const now = Date.now();

  return {
    id: createBlockId(),
    nodeId: options.nodeId,
    type: options.type || BlockType.PARAGRAPH,
    content: options.content || '',
    order: options.order || 0,
    level: options.level,
    checked: options.checked,
    createdAt: now,
    updatedAt: now,
  };
};

// ============================================
// Frame Factory
// ============================================

export interface CreateFrameOptions {
  title?: string;
  description?: string;
  position?: Position;
  width?: number;
  height?: number;
  color?: string;
}

export const createFrame = (options: CreateFrameOptions = {}): Frame => {
  const now = Date.now();

  return {
    id: createFrameId(),
    title: options.title || 'New Frame',
    description: options.description,
    position: options.position || { x: 0, y: 0 },
    size: {
      width: options.width || 400,
      height: options.height || 300,
    },
    color: options.color || '#4c6ef5',
    locked: false,
    collapsed: false,
    createdAt: now,
    updatedAt: now,
  };
};

// ============================================
// Tag Factory
// ============================================

export interface CreateTagOptions {
  name: string;
  color?: string;
}

export const createTag = (options: CreateTagOptions): Tag => {
  if (!options.name) {
    throw new Error('name is required for tag creation');
  }

  return {
    id: createTagId(),
    name: options.name,
    color: options.color || generateTagColor(options.name),
    count: 0,
    createdAt: Date.now(),
  };
};

// Generate consistent color from tag name
const generateTagColor = (name: string): string => {
  const colors = [
    '#ff6b6b', '#51cf66', '#ffd43b', '#74c0fc',
    '#b197fc', '#ff922b', '#20c997', '#f06595',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};
