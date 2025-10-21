import type { Tag, TagLens } from '../../types/core';

interface TagLensPanelProps {
  tags: Tag[];
  lenses: TagLens[];
  onLensRemove: (tag: string) => void;
  onClearLenses: () => void;
}

export function TagLensPanel({ tags, lenses, onLensRemove, onClearLenses }: TagLensPanelProps) {
  const activeLensTags = new Set(lenses.map((lens) => lens.tag));

  return (
    <aside className="tag-lens-panel">
      <div className="panel-header">
        <h3>Tag Lenses</h3>
        {lenses.length > 0 && (
          <button type="button" onClick={onClearLenses}>
            Clear
          </button>
        )}
      </div>
      <p className="panel-hint">Drag a tag onto the graph. Hold Alt for OR lens.</p>
      <ul>
        {tags.map((tag) => {
          const isActive = activeLensTags.has(tag.name);
          return (
            <li key={tag.id}>
              <button
                type="button"
                className={`tag-pill ${isActive ? 'active' : ''}`}
                draggable
                data-tag={tag.name}
                onDragStart={(event) => {
                  event.dataTransfer?.setData('text/plain', tag.name);
                }}
              >
                <span className="dot" style={{ backgroundColor: tag.color }} />
                {tag.name}
                <span className="count">{tag.count}</span>
              </button>
              {isActive && (
                <button
                  type="button"
                  className="remove-lens"
                  onClick={() => onLensRemove(tag.name)}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
