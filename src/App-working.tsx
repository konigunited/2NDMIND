/**
 * MindOS App (working version without persistence)
 */

import { useAppStore } from './stores/useAppStore';
import { ViewMode } from './types/core';
import MarkdownView from './components/markdown/MarkdownView';
import GraphView from './components/graph/GraphView';
import { usePersistence, usePersistenceActions } from './hooks/usePersistence';
import { transformNote } from './lib/transform';
import './App.css';

function App() {
  // Enable auto-save to IndexedDB
  usePersistence();
  const { exportData, importData, clearAllData } = usePersistenceActions();
  const viewMode = useAppStore((state) => state.viewMode);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const addNode = useAppStore((state) => state.addNode);
  const addEdge = useAppStore((state) => state.addEdge);
  const nodesMap = useAppStore((state) => state.nodes);
  const getAllNodes = useAppStore((state) => state.getAllNodes);
  const selectedNodeIds = useAppStore((state) => Array.from(state.selectedNodeIds));
  const reset = useAppStore((state) => state.reset);

  // Convert Map to Array
  const nodes = Array.from(nodesMap.values());

  // Load demo content
  const loadDemo = () => {
    reset(); // Clear existing data

    // Create 5 nodes with positioned layout
    const node1 = addNode({
      title: 'Project Ideas',
      content: 'Collection of potential project concepts and innovations',
      tags: ['ideas', 'planning'],
      position: { x: 300, y: 200 }
    });

    const node2 = addNode({
      title: 'MindOS Architecture',
      content: 'Core design principles: unified data model, constrained physics, typed relationships',
      tags: ['architecture', 'design'],
      position: { x: 600, y: 150 }
    });

    const node3 = addNode({
      title: 'React + TypeScript',
      content: 'Modern web stack with type safety and performance',
      tags: ['tech', 'stack'],
      position: { x: 600, y: 350 }
    });

    const node4 = addNode({
      title: 'Graph Visualization',
      content: 'Interactive 2D/3D node visualization with physics constraints',
      tags: ['visualization', 'ui'],
      position: { x: 900, y: 200 }
    });

    const node5 = addNode({
      title: 'Knowledge Graph',
      content: 'Semantic network of interconnected concepts and ideas',
      tags: ['concepts', 'theory'],
      position: { x: 450, y: 400 }
    });

    // Create connections
    addEdge({ sourceId: node1.id, targetId: node2.id }); // Ideas в†’ Architecture
    addEdge({ sourceId: node2.id, targetId: node3.id }); // Architecture в†’ Tech Stack
    addEdge({ sourceId: node2.id, targetId: node4.id }); // Architecture в†’ Visualization
    addEdge({ sourceId: node1.id, targetId: node5.id }); // Ideas в†’ Knowledge Graph
    addEdge({ sourceId: node5.id, targetId: node4.id }); // Knowledge Graph в†’ Visualization

    console.log('Demo content loaded: 5 nodes, 5 connections');
  };

  const handleFocusGraph = async (strategy: 'mindmap' | 'flow') => {
    const allNodes = getAllNodes();
    const targetId = selectedNodeIds[0] ?? allNodes[0]?.id;
    if (!targetId) return;

    try {
      await transformNote(targetId, { to: 'graph', strategy, focus: true });
    } catch (error) {
      console.error('Transform failed', error);
    }
  };

  // Data persistence handlers
  const handleExport = async () => {
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindos-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await importData(text);
        console.log('Data imported successfully');
      } catch (error) {
        console.error('Import failed:', error);
      }
    };
    input.click();
  };

  const handleClear = async () => {
    if (confirm('Clear all data? This cannot be undone!')) {
      await clearAllData();
      console.log('All data cleared');
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <h1>рџ§  MindOS</h1>
          <span className="tagline">Your Second Brain</span>
        </div>

        {/* View Switcher */}
                <nav className="view-switcher">
          <button
            className={viewMode === ViewMode.MARKDOWN ? 'active' : ''}
            onClick={() => setViewMode(ViewMode.MARKDOWN)}
          >
            Markdown
          </button>
          <button
            className={viewMode === ViewMode.CANVAS ? 'active' : ''}
            onClick={() => setViewMode(ViewMode.CANVAS)}
          >
            Canvas
          </button>
          <button
            className={viewMode === ViewMode.GRAPH ? 'active' : ''}
            onClick={() => setViewMode(ViewMode.GRAPH)}
          >
            Graph
          </button>
          <button
            className={viewMode === ViewMode.TREE ? 'active' : ''}
            onClick={() => setViewMode(ViewMode.TREE)}
          >
            Tree
          </button>
        </nav>

        {/* Actions */}
        <div className="header-actions">
          <button onClick={loadDemo} style={{ marginRight: '8px' }}>
            Load Demo
          </button>
          <button
            onClick={() => {
              const node = addNode({
                title: 'Untitled',
                content: '',
                tags: []
              });
              console.log('Node created:', node.id);
            }}
            style={{ marginRight: '8px' }}
          >
            + New Node ({nodes.length})
          </button>
          <button onClick={() => handleFocusGraph('mindmap')} style={{ marginRight: '4px' }}>
            Mindmap Focus
          </button>
          <button onClick={() => handleFocusGraph('flow')} style={{ marginRight: '16px' }}>
            Flow Focus
          </button>
          {/* Data persistence */}
          <button onClick={handleExport} style={{ marginRight: '4px' }} title="Export to JSON">
            Export
          </button>
          <button onClick={handleImport} style={{ marginRight: '4px' }} title="Import from JSON">
            Import
          </button>
          <button onClick={handleClear} style={{ background: '#ff6b6b', color: 'white' }} title="Clear all data">
            Clear
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-content">
        {viewMode === ViewMode.MARKDOWN && <MarkdownView />}

        {viewMode === ViewMode.CANVAS && (
          <div className="view-container">
            <h2>Canvas View</h2>
            <p>Coming soon: Infinite canvas with drag'n'drop</p>
          </div>
        )}

        {viewMode === ViewMode.GRAPH && <GraphView />}

        {viewMode === ViewMode.TREE && (
          <div className="view-container">
            <h2>Tree View</h2>
            <p>Coming soon: Hierarchical tree explorer</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
