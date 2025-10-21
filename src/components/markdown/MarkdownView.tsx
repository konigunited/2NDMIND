/**
 * Markdown View - Two-panel interface
 * Left: Node list | Right: Editor
 */

import { useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import './MarkdownView.css';

export default function MarkdownView() {
  const nodesMap = useAppStore((state) => state.nodes);
  const updateNode = useAppStore((state) => state.updateNode);
  const deleteNode = useAppStore((state) => state.deleteNode);

  const nodes = Array.from(nodesMap.values());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    nodes.length > 0 ? nodes[0].id : null
  );

  const selectedNode = selectedNodeId ? nodesMap.get(selectedNodeId) : null;

  return (
    <div className="markdown-view">
      {/* Left Panel: Node List */}
      <aside className="node-list">
        <div className="node-list-header">
          <h3>Notes ({nodes.length})</h3>
        </div>

        <div className="node-list-items">
          {nodes.length === 0 ? (
            <div className="empty-state">
              <p>No notes yet</p>
              <p className="hint">Click "+ New Node" to create one</p>
            </div>
          ) : (
            nodes.map((node) => (
              <div
                key={node.id}
                className={`node-item ${selectedNodeId === node.id ? 'active' : ''}`}
                onClick={() => setSelectedNodeId(node.id)}
              >
                <div className="node-item-title">{node.title}</div>
                <div className="node-item-preview">
                  {node.content ? node.content.substring(0, 60) + '...' : 'Empty note'}
                </div>
                {node.tags.length > 0 && (
                  <div className="node-item-tags">
                    {node.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="tag-pill">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Right Panel: Editor */}
      <main className="node-editor">
        {selectedNode ? (
          <div className="editor-container">
            {/* Title Editor */}
            <input
              type="text"
              className="title-input"
              value={selectedNode.title}
              onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
              placeholder="Untitled"
            />

            {/* Content Editor */}
            <textarea
              className="content-textarea"
              value={selectedNode.content}
              onChange={(e) => updateNode(selectedNode.id, { content: e.target.value })}
              placeholder="Start typing..."
            />

            {/* Tags Editor */}
            <div className="tags-editor">
              <label>Tags:</label>
              <input
                type="text"
                className="tags-input"
                value={selectedNode.tags.join(', ')}
                onChange={(e) => {
                  const tags = e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0);
                  updateNode(selectedNode.id, { tags });
                }}
                placeholder="tag1, tag2, tag3"
              />
            </div>

            {/* Actions */}
            <div className="editor-actions">
              <button
                className="delete-btn"
                onClick={() => {
                  deleteNode(selectedNode.id);
                  setSelectedNodeId(nodes[0]?.id || null);
                }}
              >
                Delete Note
              </button>

              <div className="meta-info">
                <span>Created: {new Date(selectedNode.createdAt).toLocaleDateString()}</span>
                <span>Updated: {new Date(selectedNode.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-editor">
            <h2>No note selected</h2>
            <p>Select a note from the list or create a new one</p>
          </div>
        )}
      </main>
    </div>
  );
}
