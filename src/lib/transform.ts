import { ViewMode } from '../types/core';
import type { NodeId } from '../types/core';
import { useAppStore } from '../stores/useAppStore';

export type TransformTarget = 'canvas' | 'graph' | 'markdown';
export type TransformStrategy = 'mindmap' | 'flow';

export interface TransformOptions {
  to: TransformTarget;
  strategy?: TransformStrategy;
  focus?: boolean;
}

export interface TransformRequest {
  id: NodeId;
  to: TransformTarget;
  strategy: TransformStrategy;
  focus: boolean;
}

export const TRANSFORM_EVENT = 'mindos:transform';
const DEFAULT_STRATEGY: TransformStrategy = 'mindmap';

export async function transformNote(id: NodeId, options: TransformOptions): Promise<void> {
  const store = useAppStore.getState();
  const note = store.nodes.get(id);

  if (!note) {
    throw new Error(`Note ${id} not found`);
  }

  const target = options.to;
  const strategy = options.strategy ?? DEFAULT_STRATEGY;
  const focus = options.focus ?? true;

  store.saveLayoutSnapshot(`before-transform-${target}-${strategy}`);

  switch (target) {
    case 'graph':
      store.setViewMode(ViewMode.GRAPH);
      if (focus) {
        store.clearSelection();
        store.selectNode(id);
      }
      break;
    case 'canvas':
      store.setViewMode(ViewMode.CANVAS);
      break;
    case 'markdown':
      store.setViewMode(ViewMode.MARKDOWN);
      break;
    default:
      throw new Error(`Unsupported transform target: ${target}`);
  }

  const detail: TransformRequest = { id, to: target, strategy, focus };
  window.dispatchEvent(new CustomEvent<TransformRequest>(TRANSFORM_EVENT, { detail }));
}