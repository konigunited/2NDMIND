/**
 * ID generation utilities
 */

import type { NodeId, EdgeId, BlockId, FrameId, TagId } from '../types/core';

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const createNodeId = (): NodeId => `node-${generateId()}`;
export const createEdgeId = (): EdgeId => `edge-${generateId()}`;
export const createBlockId = (): BlockId => `block-${generateId()}`;
export const createFrameId = (): FrameId => `frame-${generateId()}`;
export const createTagId = (): TagId => `tag-${generateId()}`;
