/**
 * Hook for automatic persistence to IndexedDB
 */

import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { dbOps, loadInitialState, createAutoSave } from '../lib/db';
import { NodeKind } from '../types/core';

export const usePersistence = () => {
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Load initial state from IndexedDB
    if (!hasLoaded.current) {
      loadInitialState().then((data) => {
        if (data) {
          const store = useAppStore.getState();

          // Restore nodes
          if (data.nodes && data.nodes.length > 0) {
            data.nodes.forEach((node) => {
              node.kind = node.kind || NodeKind.NOTE;
              node.tags = node.tags || [];
              node.position = node.position || { x: 0, y: 0 };
              store.nodes.set(node.id, node);
            });
          }

          // Restore edges
          if (data.edges && data.edges.length > 0) {
            data.edges.forEach((edge) => {
              store.edges.set(edge.id, edge);
            });
          }

          // Restore blocks
          if (data.blocks && data.blocks.length > 0) {
            data.blocks.forEach((block) => {
              store.blocks.set(block.id, block);
            });
          }

          // Restore frames
          if (data.frames && data.frames.length > 0) {
            data.frames.forEach((frame) => {
              store.frames.set(frame.id, frame);
            });
          }

          // Restore tags
          if (data.tags && data.tags.length > 0) {
            data.tags.forEach((tag) => {
              store.tags.set(tag.name, tag);
            });
          }

          // Recalculate tag usage counts to stay in sync
          store.tags.forEach((tag) => {
            tag.count = 0;
          });
          store.nodes.forEach((node) => {
            node.tags.forEach((tagName) => {
              let existing = store.tags.get(tagName);
              if (!existing) {
                existing = store.addTag({ name: tagName });
              }
              existing.count += 1;
            });
          });

          // Restore view state
          if (data.viewState) {
            const viewState = data.viewState;
            if (viewState.viewMode) store.setViewMode(viewState.viewMode);
            if (typeof viewState.zoom === 'number') store.setZoom(viewState.zoom);
            if (viewState.pan) store.setPan(viewState.pan);
            if (viewState.layoutConfig) store.setLayoutConfig(viewState.layoutConfig);
            if (viewState.physicsPreset) {
              store.setPhysicsPreset(viewState.physicsPreset);
            }
            if (viewState.physicsConstraints) {
              store.setPhysicsConstraints(viewState.physicsConstraints);
            }
            if (viewState.graphFilters) {
              store.setGraphFilters(viewState.graphFilters);
            }
            if (Array.isArray(viewState.graphSnapshots)) {
              store.setGraphSnapshots(viewState.graphSnapshots);
            }
            if (viewState.activeGraphTool) {
              store.setActiveGraphTool(viewState.activeGraphTool);
            }
          }

          console.log('Loaded state from IndexedDB');
        }
      });

      hasLoaded.current = true;
    }

    // Setup auto-save
    const { scheduleSave, saveNow } = createAutoSave(
      useAppStore.getState,
      5000 // Auto-save every 5 seconds
    );

    // Subscribe to store changes
    const unsubscribe = useAppStore.subscribe(() => {
      scheduleSave();
    });

    // Save on unmount
    return () => {
      unsubscribe();
      saveNow();
    };
  }, []);
};

// ============================================
// Manual save/load utilities
// ============================================

export const usePersistenceActions = () => {
  const saveNow = async () => {
    const state = useAppStore.getState();

    const nodes = Array.from(state.nodes.values());
    const edges = Array.from(state.edges.values());
    const blocks = Array.from(state.blocks.values());
    const frames = Array.from(state.frames.values());
    const tags = Array.from(state.tags.values());

    await dbOps.saveAll({ nodes, edges, blocks, frames, tags });

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

    console.log('Manually saved to IndexedDB');
  };

  const exportData = async (): Promise<string> => {
    return await dbOps.exportToJSON();
  };

  const importData = async (json: string) => {
    await dbOps.importFromJSON(json);
    // Reload the app
    window.location.reload();
  };

  const clearAllData = async () => {
    await dbOps.clearAll();
    useAppStore.getState().reset();
    console.log('Cleared all data');
  };

  return {
    saveNow,
    exportData,
    importData,
    clearAllData,
  };
};
