import { useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import { usePersistence } from './hooks/usePersistence';
import { ViewMode } from './types/core';
import GraphView from './components/graph/GraphView';
import MarkdownView from './components/markdown/MarkdownView';
import { transformNote } from './lib/transform';
import './App.css';

function App() {
  usePersistence();

  const viewMode = useAppStore((state) => state.viewMode);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const addNode = useAppStore((state) => state.addNode);
  const getAllNodes = useAppStore((state) => state.getAllNodes);
  const selectedNodeIds = useAppStore((state) => Array.from(state.selectedNodeIds));

  useEffect(() => {
    const nodes = getAllNodes();
    if (nodes.length === 0) {
      const node1 = addNode({
        title: 'Welcome to MindOS',
        content:
          'This is your second brain. Start by creating nodes, connecting them, and exploring different views.',
        position: { x: 0, y: 0 },
        tags: ['welcome', 'intro'],
      });

      const node2 = addNode({
        title: 'Markdown View',
        content: 'Write your thoughts in markdown format. Use blocks, tasks, and formatting.',
        position: { x: 320, y: -40 },
        tags: ['features', 'markdown'],
      });

      const node3 = addNode({
        title: 'Canvas View',
        content: "Visualize your ideas as cards on an infinite canvas. Drag, drop, and organize.",
        position: { x: -80, y: 220 },
        tags: ['features', 'canvas'],
      });

      const node4 = addNode({
        title: 'Graph View',
        content: 'See the connections between your ideas. Navigate the knowledge graph.',
        position: { x: 360, y: 240 },
        tags: ['features', 'graph'],
      });

      const store = useAppStore.getState();
      store.addEdge({ sourceId: node1.id, targetId: node2.id, type: 'links' as any });
      store.addEdge({ sourceId: node1.id, targetId: node3.id, type: 'links' as any });
      store.addEdge({ sourceId: node1.id, targetId: node4.id, type: 'links' as any });
      store.addEdge({ sourceId: node2.id, targetId: node3.id, type: 'extends' as any });
    }
  }, [addNode, getAllNodes]);

  const handleGraphTransform = async (strategy: 'mindmap' | 'flow') => {
    const nodes = getAllNodes();
    const targetId = selectedNodeIds[0] ?? nodes[0]?.id;
    if (!targetId) return;

    try {
      await transformNote(targetId, { to: 'graph', strategy, focus: true });
    } catch (error) {
      console.error('Transform failed', error);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <h1>MindOS</h1>
          <span className="tagline">Your Second Brain</span>
        </div>

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

        <div className="header-actions">
          <button onClick={() => addNode()}>+ New Node</button>
          <button onClick={() => handleGraphTransform('mindmap')}>Mindmap Focus</button>
          <button onClick={() => handleGraphTransform('flow')}>Flow Focus</button>
        </div>
      </header>

      <main className="app-content">
        {viewMode === ViewMode.MARKDOWN && <MarkdownView />}

        {viewMode === ViewMode.CANVAS && (
          <div className="view-container">
            <h2>Canvas View</h2>
            <p>Canvas interactions are coming soon. Capture ideas as free-form cards.</p>
          </div>
        )}

        {viewMode === ViewMode.GRAPH && <GraphView />}

        {viewMode === ViewMode.TREE && (
          <div className="view-container">
            <h2>Tree View</h2>
            <p>Hierarchy explorer is on the roadmap.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;