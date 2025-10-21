import type { MouseEvent as ReactMouseEvent } from 'react';
import type { NodeId, Position } from '../../types/core';

interface GraphMinimapProps {
  nodes: Array<{ id: NodeId; position: Position }>;
  selected: Set<NodeId>;
  pan: Position;
  zoom: number;
  viewportSize: { width: number; height: number };
  onNavigate?: (target: Position) => void;
}

const MINIMAP_SIZE = 160;

export function GraphMinimap({
  nodes,
  selected,
  pan,
  zoom,
  viewportSize,
  onNavigate,
}: GraphMinimapProps) {
  if (nodes.length === 0) {
    return (
      <div className="graph-minimap empty">
        <span>No nodes</span>
      </div>
    );
  }

  const xs = nodes.map((node) => node.position.x);
  const ys = nodes.map((node) => node.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const scale = Math.min(
    (MINIMAP_SIZE - 20) / width,
    (MINIMAP_SIZE - 20) / height,
  );
  const offsetX = (MINIMAP_SIZE - width * scale) / 2;
  const offsetY = (MINIMAP_SIZE - height * scale) / 2;

  const viewWidth = viewportSize.width / zoom;
  const viewHeight = viewportSize.height / zoom;
  const viewMinX = -pan.x / zoom;
  const viewMinY = -pan.y / zoom;

  const handleClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!onNavigate) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left - offsetX) / scale) + minX;
    const y = ((event.clientY - bounds.top - offsetY) / scale) + minY;
    onNavigate({ x, y });
  };

  return (
    <div className="graph-minimap">
      <svg
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        viewBox={`0 0 ${MINIMAP_SIZE} ${MINIMAP_SIZE}`}
        onClick={handleClick}
      >
        <rect
          x={0}
          y={0}
          width={MINIMAP_SIZE}
          height={MINIMAP_SIZE}
          rx={8}
          className="minimap-background"
        />
        {nodes.map((node) => {
          const x = offsetX + (node.position.x - minX) * scale;
          const y = offsetY + (node.position.y - minY) * scale;
          return (
            <circle
              key={node.id}
              cx={x}
              cy={y}
              r={selected.has(node.id) ? 4 : 3}
              className={selected.has(node.id) ? 'node selected' : 'node'}
            />
          );
        })}
        <rect
          x={offsetX + (viewMinX - minX) * scale}
          y={offsetY + (viewMinY - minY) * scale}
          width={Math.max(20, viewWidth * scale)}
          height={Math.max(20, viewHeight * scale)}
          className="minimap-viewport"
        />
      </svg>
    </div>
  );
}
