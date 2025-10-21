import type { NodeId } from '../../types/core';

interface GraphBreadcrumbsProps {
  trail: Array<{ id: NodeId; title: string }>;
  onSelect: (id: NodeId) => void;
}

export function GraphBreadcrumbs({ trail, onSelect }: GraphBreadcrumbsProps) {
  if (trail.length === 0) return null;

  return (
    <nav className="graph-breadcrumbs">
      {trail.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className="breadcrumb-item"
          onClick={() => onSelect(item.id)}
        >
          {item.title}
          {index < trail.length - 1 && <span className="separator">›</span>}
        </button>
      ))}
    </nav>
  );
}
