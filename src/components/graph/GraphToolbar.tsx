import type { LayoutMode } from './engine/layout';
import { EdgeType, GraphTool, PhysicsPreset } from '../../types/core';

const TOOL_LABELS: Record<GraphTool, string> = {
  [GraphTool.SELECT]: 'Select',
  [GraphTool.CONNECT]: 'Connect',
  [GraphTool.REFRAME]: 'Reframe',
  [GraphTool.MAGNET]: 'Magnet',
  [GraphTool.COLORIZE]: 'Colorize',
  [GraphTool.SIMPLIFY]: 'Simplify',
  [GraphTool.FREEZE]: 'Freeze',
  [GraphTool.UNFREEZE]: 'Unfreeze',
};

const LAYOUT_OPTIONS: Array<{ value: LayoutMode; label: string }> = [
  { value: 'flowGrid', label: 'Flow Grid' },
  { value: 'byTags', label: 'By Tags' },
  { value: 'byTypes', label: 'By Types' },
  { value: 'byCausality', label: 'By Causality' },
  { value: 'byTime', label: 'By Time' },
];

const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  [EdgeType.CAUSES]: 'Causes',
  [EdgeType.SUPPORTS]: 'Supports',
  [EdgeType.CONTRASTS]: 'Contrasts',
  [EdgeType.EXTENDS]: 'Extends',
  [EdgeType.PART_OF]: 'Part Of',
  [EdgeType.LINKS]: 'Links',
  [EdgeType.DEPENDS_ON]: 'Depends On',
  [EdgeType.RELATES]: 'Relates',
};

interface GraphToolbarProps {
  activeTool: GraphTool;
  physicsPreset: PhysicsPreset;
  edgeType: EdgeType;
  onSelectTool: (tool: GraphTool) => void;
  onReframe: (mode: LayoutMode) => void;
  onCyclePhysicsPreset: () => void;
  onFreeze: () => void;
  onUnfreeze: () => void;
  onColorize: () => void;
  onSimplify: () => void;
  onMagnetToggle: () => void;
  onEdgeTypeChange: (edge: EdgeType) => void;
  onSnapshot: () => void;
}

export function GraphToolbar({
  activeTool,
  physicsPreset,
  edgeType,
  onSelectTool,
  onReframe,
  onCyclePhysicsPreset,
  onFreeze,
  onUnfreeze,
  onColorize,
  onSimplify,
  onMagnetToggle,
  onEdgeTypeChange,
  onSnapshot,
}: GraphToolbarProps) {
  return (
    <div className="graph-toolbar">
      <div className="toolbar-group">
        <button
          type="button"
          className={activeTool === GraphTool.SELECT ? 'active' : ''}
          onClick={() => onSelectTool(GraphTool.SELECT)}
        >
          {TOOL_LABELS[GraphTool.SELECT]}
        </button>
        <button
          type="button"
          className={activeTool === GraphTool.CONNECT ? 'active' : ''}
          onClick={() => onSelectTool(GraphTool.CONNECT)}
        >
          {TOOL_LABELS[GraphTool.CONNECT]}
        </button>
        <button
          type="button"
          className={activeTool === GraphTool.MAGNET ? 'active' : ''}
          onClick={onMagnetToggle}
        >
          {TOOL_LABELS[GraphTool.MAGNET]}
        </button>
        <button type="button" onClick={onColorize}>
          {TOOL_LABELS[GraphTool.COLORIZE]}
        </button>
        <button type="button" onClick={onSimplify}>
          {TOOL_LABELS[GraphTool.SIMPLIFY]}
        </button>
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label" htmlFor="graph-reframe-select">
          Reframe
        </label>
        <select
          id="graph-reframe-select"
          onChange={(event) => onReframe(event.target.value as LayoutMode)}
        >
          {LAYOUT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={onSnapshot}>
          Snapshot
        </button>
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label" htmlFor="edge-type-select">
          Edge
        </label>
        <select
          id="edge-type-select"
          value={edgeType}
          onChange={(event) => onEdgeTypeChange(event.target.value as EdgeType)}
        >
          {Object.values(EdgeType).map((value) => (
            <option key={value} value={value}>
              {EDGE_TYPE_LABELS[value]}
            </option>
          ))}
        </select>

        <button type="button" onClick={onCyclePhysicsPreset}>
          Physics: {physicsPreset}
        </button>
        <button type="button" onClick={onFreeze}>
          {TOOL_LABELS[GraphTool.FREEZE]}
        </button>
        <button type="button" onClick={onUnfreeze}>
          {TOOL_LABELS[GraphTool.UNFREEZE]}
        </button>
      </div>
    </div>
  );
}
