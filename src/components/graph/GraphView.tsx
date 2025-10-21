import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEventHandler, WheelEventHandler } from 'react';
import * as PIXI from 'pixi.js';
import { useAppStore } from '../../stores/useAppStore';
import type {
  Edge,
  Frame,
  GraphFilters,
  Node,
  NodeId,
  PhysicsConstraints,
  Position
} from '../../types/core';
import {
  EDGE_STYLES,
  EdgeType,
  GraphTool,
  NodeKind,
} from '../../types/core';
import type { LayoutComputation, LayoutMode } from './engine/layout';
import { computeLayout } from './engine/layout';
import {
  syncPhysicsTargets,
  stepPhysics,
  type PhysicsState,
} from './engine/physics';
import { clamp, snapPosition } from './engine/math';
import { GraphToolbar } from './GraphToolbar';
import { TagLensPanel } from './TagLensPanel';
import { GraphMinimap } from './GraphMinimap';
import { GraphBreadcrumbs } from './GraphBreadcrumbs';
import { TRANSFORM_EVENT, type TransformRequest } from '../../lib/transform';
import './GraphView.css';

type PixiDisplayObject = any;

interface GraphScene {
  app: PixiDisplayObject;
  stage: PixiDisplayObject;
  frameLayer: PixiDisplayObject;
  edgeLayer: PixiDisplayObject;
  nodeLayer: PixiDisplayObject;
  nodeGraphics: Map<NodeId, NodeGraphicMeta>;
  edgeGraphics: Map<string, PixiDisplayObject>;
  frameGraphics: Map<string, PixiDisplayObject>;
}

interface NodeGraphicMeta {
  container: PixiDisplayObject;
  body: PixiDisplayObject;
  label: PixiDisplayObject;
  icon: PixiDisplayObject;
}

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const KIND_COLORS: Record<NodeKind, string> = {
  [NodeKind.NOTE]: '#64B5F6',
  [NodeKind.IDEA]: '#FDD835',
  [NodeKind.TASK]: '#81C784',
  [NodeKind.TAG]: '#9E9E9E',
};

const KIND_ICONS: Record<NodeKind, string> = {
  [NodeKind.NOTE]: 'N',
  [NodeKind.IDEA]: 'I',
  [NodeKind.TASK]: 'T',
  [NodeKind.TAG]: '#',
};

const SELECTION_STROKE = '#4FC3F7';
const CONNECT_STROKE = '#81C784';

const colorToNumber = (hex: string) => Number.parseInt(hex.replace('#', ''), 16);

const matchesFilters = (node: Node, filters: GraphFilters): boolean => {
  if (filters.focusTag && !node.tags.includes(filters.focusTag)) {
    return false;
  }

  if (filters.ownerOnly) {
    const ownerTags = ['me', 'mine', 'owner:me'];
    if (!node.tags.some((tag) => ownerTags.includes(tag))) {
      return false;
    }
  }

  if (filters.newOnly) {
    const threeDays = 1000 * 60 * 60 * 24 * 3;
    if (Date.now() - node.createdAt > threeDays) {
      return false;
    }
  }

  if (filters.tagLenses.length === 0) {
    return true;
  }

  const andTags = filters.tagLenses.filter((lens) => lens.mode === 'and');
  const orTags = filters.tagLenses.filter((lens) => lens.mode === 'or');

  if (andTags.length > 0 && !andTags.every((lens) => node.tags.includes(lens.tag))) {
    return false;
  }

  if (orTags.length > 0 && !orTags.some((lens) => node.tags.includes(lens.tag))) {
    return false;
  }

  return true;
};

const computeDegreeMap = (edges: Edge[]): Map<NodeId, number> => {
  const degrees = new Map<NodeId, number>();
  edges.forEach((edge) => {
    degrees.set(edge.sourceId, (degrees.get(edge.sourceId) || 0) + 1);
    degrees.set(edge.targetId, (degrees.get(edge.targetId) || 0) + 1);
  });
  return degrees;
};

const buildBreadcrumbs = (
  selectedId: NodeId | null,
  nodeMap: Map<NodeId, Node>,
  edges: Edge[],
): Array<{ id: NodeId; title: string }> => {
  if (!selectedId) return [];

  const breadcrumbs: Array<{ id: NodeId; title: string }> = [];
  const visited = new Set<NodeId>();
  let currentId: NodeId | undefined | null = selectedId;

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const node = nodeMap.get(currentId);
    if (!node) break;
    breadcrumbs.unshift({ id: node.id, title: node.title });

    const parentEdge = edges.find(
      (edge) => edge.type === EdgeType.PART_OF && edge.sourceId === currentId,
    );
    currentId = parentEdge?.targetId ?? null;
  }

  return breadcrumbs;
};

const collectFrameMembers = (
  frames: Frame[],
  nodes: Node[],
  positions: Map<NodeId, Position>,
): Map<string, { frame: Frame; members: Node[]; bounds: { minX: number; maxX: number; minY: number; maxY: number } }> => {
  const membership = new Map<string, { frame: Frame; members: Node[]; bounds: { minX: number; maxX: number; minY: number; maxY: number } }>();

  if (frames.length === 0 || nodes.length === 0) return membership;

  frames.forEach((frame) => {
    const members: Node[] = [];

    nodes.forEach((node) => {
      const hasRuleMatch = frame.rules?.some((rule) => {
        if (rule.type === 'tag') {
          const tag = rule.value.startsWith('#') ? rule.value.slice(1) : rule.value;
          return node.tags.includes(tag);
        }
        return false;
      });

      if (node.frameId === frame.id || hasRuleMatch) {
        members.push(node);
      }
    });

    if (members.length === 0) return;

    const xs: number[] = [];
    const ys: number[] = [];
    members.forEach((member) => {
      const position = positions.get(member.id);
      if (!position) return;
      xs.push(position.x);
      ys.push(position.y);
    });

    if (xs.length === 0 || ys.length === 0) return;

    membership.set(frame.id, {
      frame,
      members,
      bounds: {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      },
    });
  });

  return membership;
};

interface NodeEventHandlers {
  onPointerDown: (node: Node, event: any) => void;
  onPointerUp: (node: Node, event: any) => void;
  onPointerMove: (node: Node, event: any) => void;
  onPointerOver: (node: Node) => void;
  onPointerOut: (node: Node) => void;
}

const createNodeGraphic = (node: Node, handlers: NodeEventHandlers): NodeGraphicMeta => {
  const container = new PIXI.Container();
  container.eventMode = 'dynamic';
  container.interactive = true;
  container.cursor = 'pointer';
  container.sortableChildren = true;

  const body = new PIXI.Graphics();
  const label = new PIXI.Text(node.title, {
    fill: '#f5f5f5',
    fontSize: 12,
    fontWeight: '600',
    align: 'center',
  });
  label.anchor.set(0.5);
  label.position.set(0, 8);

  const icon = new PIXI.Text(KIND_ICONS[node.kind] || '', {
    fill: '#f5f5f5',
    fontSize: 12,
    fontWeight: '700',
  });
  icon.anchor.set(0.5);
  icon.position.set(0, -20);

  container.addChild(body, icon, label);

  container.on('pointerdown', (event: any) => handlers.onPointerDown(node, event));
  container.on('pointerup', (event: any) => handlers.onPointerUp(node, event));
  container.on('pointerupoutside', (event: any) => handlers.onPointerUp(node, event));
  container.on('pointermove', (event: any) => handlers.onPointerMove(node, event));
  container.on('pointerover', () => handlers.onPointerOver(node));
  container.on('pointerout', () => handlers.onPointerOut(node));

  return { container, body, label, icon };
};

const drawNodeShape = (
  body: PixiDisplayObject,
  node: Node,
  baseColor: string,
  options: {
    selected: boolean;
    hovered: boolean;
    connectSource: boolean;
  },
) => {
  const fillColor = colorToNumber(baseColor);
  const strokeColor = options.selected
    ? colorToNumber(SELECTION_STROKE)
    : options.connectSource
      ? colorToNumber(CONNECT_STROKE)
      : colorToNumber('#1f1f1f');

  body.clear();
  body.lineStyle(options.selected || options.connectSource ? 3 : 1.5, strokeColor, 0.95);
  body.beginFill(fillColor, options.hovered ? 0.95 : 0.82);

  const width = 140;
  const height = 70;
  const radius = 22;

  switch (node.kind) {
    case NodeKind.IDEA: {
      body.moveTo(-width / 2, 0);
      body.lineTo(0, -height / 2);
      body.lineTo(width / 2, 0);
      body.lineTo(0, height / 2);
      body.closePath();
      break;
    }
    case NodeKind.TASK: {
      body.drawRoundedRect(-width / 2, -height / 2, width, height, radius);
      break;
    }
    case NodeKind.TAG: {
      body.drawRoundedRect(-width / 2, -height / 2, width, height * 0.6, height * 0.6);
      break;
    }
    case NodeKind.NOTE:
    default: {
      body.drawRoundedRect(-width / 2, -height / 2, width, height, radius);
    }
  }

  body.endFill();
};

const updateNodeGraphic = (
  meta: NodeGraphicMeta,
  node: Node,
  options: {
    selected: boolean;
    hovered: boolean;
    connectSource: boolean;
  },
) => {
  meta.label.text = node.title;
  meta.icon.text = KIND_ICONS[node.kind] || '';
  drawNodeShape(meta.body, node, node.color || KIND_COLORS[node.kind], options);
  meta.container.alpha = options.hovered ? 1 : 0.96;
  meta.container.scale.set(options.selected ? 1.08 : options.hovered ? 1.04 : 1);
};

const drawEdgeGraphic = (
  graphics: PixiDisplayObject,
  sourcePos: Position | undefined,
  targetPos: Position | undefined,
  edgeType: EdgeType,
) => {
  if (!sourcePos || !targetPos) return;

  const style = EDGE_STYLES[edgeType];
  graphics.clear();
  graphics.lineStyle(style.strokeWidth, colorToNumber(style.color), 0.9);

  const midX = (sourcePos.x + targetPos.x) / 2;
  graphics.moveTo(sourcePos.x, sourcePos.y);
  graphics.lineTo(midX, sourcePos.y);
  graphics.lineTo(midX, targetPos.y);
  graphics.lineTo(targetPos.x, targetPos.y);

  graphics.beginFill(colorToNumber(style.color), 0.95);
  graphics.drawCircle(targetPos.x, targetPos.y, 4);
  graphics.endFill();
};

const updateFrameGraphic = (
  graphics: PixiDisplayObject,
  data: { frame: Frame; members: Node[]; bounds: { minX: number; maxX: number; minY: number; maxY: number } },
) => {
  const padding = 40;
  const { minX, maxX, minY, maxY } = data.bounds;
  const width = Math.max(160, maxX - minX + padding * 2);
  const height = Math.max(120, maxY - minY + padding * 2);
  const startX = minX - padding;
  const startY = minY - padding;

  graphics.clear();
  graphics.lineStyle(2, colorToNumber(data.frame.color), 0.8);
  graphics.beginFill(colorToNumber(data.frame.color), 0.08);
  graphics.drawRoundedRect(startX, startY, width, height, 28);
  graphics.endFill();
};

const screenToWorld = (
  point: Position,
  containerBounds: DOMRect,
  pan: Position,
  zoom: number,
): Position => ({
  x: (point.x - containerBounds.left - pan.x) / zoom,
  y: (point.y - containerBounds.top - pan.y) / zoom,
});

const applyColorPalette = (
  nodes: Node[],
  updateNode: (id: NodeId, updates: Partial<Node>) => void,
) => {
  nodes.forEach((node) => {
    const color = KIND_COLORS[node.kind] || '#4FC3F7';
    updateNode(node.id, { color });
  });
};

export default function GraphView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<GraphScene | null>(null);
  const physicsStateRef = useRef<PhysicsState>(new Map());
  const draggingIdsRef = useRef<Set<NodeId>>(new Set());
  const visibleNodesRef = useRef<Node[]>([]);
  const visibleEdgesRef = useRef<Edge[]>([]);
  const layoutRef = useRef<LayoutComputation>({ positions: {}, groups: new Map(), layers: new Map() });
  const hoveredNodeRef = useRef<NodeId | null>(null);
  const connectSourceRef = useRef<NodeId | null>(null);
  const selectionRef = useRef<Set<NodeId>>(new Set());
  const framesRef = useRef<Frame[]>([]);
  const filtersRef = useRef<GraphFilters>({ tagLenses: [], ownerOnly: false, newOnly: false, focusTag: null });
  const lastTickRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number>(0);
  const panRef = useRef<Position>({ x: 0, y: 0 });

  const nodes = useAppStore((state) => Array.from(state.nodes.values()));
  const edges = useAppStore((state) => Array.from(state.edges.values()));
  const frames = useAppStore((state) => Array.from(state.frames.values()));
  const tags = useAppStore((state) => Array.from(state.tags.values()));
  const zoom = useAppStore((state) => state.zoom);
  const pan = useAppStore((state) => state.pan);
  const setPan = useAppStore((state) => state.setPan);
  const setZoom = useAppStore((state) => state.setZoom);
  const updateNode = useAppStore((state) => state.updateNode);
  const addEdge = useAppStore((state) => state.addEdge);
  const addFrame = useAppStore((state) => state.addFrame);
  const setPhysicsConstraints = useAppStore((state) => state.setPhysicsConstraints);
  const physicsConstraints = useAppStore((state) => state.physicsConstraints);
  const physicsPreset = useAppStore((state) => state.physicsPreset);
  const cyclePhysicsPreset = useAppStore((state) => state.cyclePhysicsPreset);
  const activeTool = useAppStore((state) => state.activeGraphTool);
  const setActiveGraphTool = useAppStore((state) => state.setActiveGraphTool);
  const filters = useAppStore((state) => state.graphFilters);
  const setGraphFilters = useAppStore((state) => state.setGraphFilters);
  const addTagLens = useAppStore((state) => state.addTagLens);
  const removeTagLens = useAppStore((state) => state.removeTagLens);
  const clearTagLenses = useAppStore((state) => state.clearTagLenses);
  const saveLayoutSnapshot = useAppStore((state) => state.saveLayoutSnapshot);
  const selectNode = useAppStore((state) => state.selectNode);
  const clearSelection = useAppStore((state) => state.clearSelection);
  const selectedNodeIds = useAppStore((state) => Array.from(state.selectedNodeIds));

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('flowGrid');
  const [edgeType, setEdgeType] = useState<EdgeType>(EdgeType.RELATES);
  const [simplifyActive, setSimplifyActive] = useState(false);
  const [connectSource, setConnectSource] = useState<NodeId | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<NodeId | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 1, height: 1 });

  const nodesMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const degrees = useMemo(() => computeDegreeMap(edges), [edges]);
  const selectedNodeSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);

  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (!matchesFilters(node, filters)) {
        return false;
      }
      if (simplifyActive) {
        return (degrees.get(node.id) || 0) > 0;
      }
      return true;
    });
  }, [nodes, filters, simplifyActive, degrees]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((node) => node.id)), [filteredNodes]);

  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (edge) => filteredNodeIds.has(edge.sourceId) && filteredNodeIds.has(edge.targetId),
      ),
    [edges, filteredNodeIds],
  );

  const layout = useMemo(() => {
    return computeLayout(layoutMode, filteredNodes, filteredEdges, {
      gridSize: physicsConstraints.gridSnap,
      columnSpacing: 260,
      rowSpacing: 180,
      margin: 140,
    });
  }, [layoutMode, filteredNodes, filteredEdges, physicsConstraints.gridSnap]);

  const minimapNodes = useMemo(
    () =>
      filteredNodes.map((node) => ({
        id: node.id,
        position: layout.positions[node.id] || node.position,
      })),
    [filteredNodes, layout],
  );

  useEffect(() => {
    visibleNodesRef.current = filteredNodes;
  }, [filteredNodes]);

  useEffect(() => {
    visibleEdgesRef.current = filteredEdges;
  }, [filteredEdges]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    hoveredNodeRef.current = hoveredNodeId;
  }, [hoveredNodeId]);

  useEffect(() => {
    connectSourceRef.current = connectSource;
  }, [connectSource]);

  useEffect(() => {
    selectionRef.current = selectedNodeSet;
  }, [selectedNodeSet]);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    setConnectSource(null);
    connectSourceRef.current = null;
  }, [activeTool]);

  useEffect(() => {
    const state = physicsStateRef.current;
    filteredNodes.forEach((node) => {
      if (!state.has(node.id)) {
        state.set(node.id, {
          position: snapPosition(node.position, physicsConstraints.gridSnap),
          target: snapPosition(layout.positions[node.id] || node.position, physicsConstraints.gridSnap),
          velocity: { x: 0, y: 0 },
        });
      }
    });
  }, [filteredNodes, physicsConstraints.gridSnap, layout]);

  useEffect(() => {
    syncPhysicsTargets(
      physicsStateRef.current,
      layout.positions,
      physicsConstraints.gridSnap,
    );
  }, [layout, physicsConstraints.gridSnap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || sceneRef.current) return;

    const app = new PIXI.Application({
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: container,
    });
    container.appendChild(app.view as HTMLCanvasElement);

    const stage = new PIXI.Container();
    stage.sortableChildren = true;
    const frameLayer = new PIXI.Container();
    frameLayer.zIndex = 1;
    const edgeLayer = new PIXI.Container();
    edgeLayer.zIndex = 2;
    const nodeLayer = new PIXI.Container();
    nodeLayer.zIndex = 3;

    stage.addChild(frameLayer, edgeLayer, nodeLayer);
    app.stage.addChild(stage);

    sceneRef.current = {
      app,
      stage,
      frameLayer,
      edgeLayer,
      nodeLayer,
      nodeGraphics: new Map(),
      edgeGraphics: new Map(),
      frameGraphics: new Map(),
    };

    return () => {
      app.destroy(true);
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.stage.scale.set(zoom, zoom);
    scene.stage.position.set(pan.x, pan.y);
  }, [pan, zoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleTransform = (event: CustomEvent<TransformRequest>) => {
      if (event.detail.to !== 'graph') {
        return;
      }

      const { id, strategy, focus } = event.detail;
      const nextMode: LayoutMode = strategy === 'flow' ? 'byCausality' : 'flowGrid';
      setLayoutMode(nextMode);

      if (focus) {
        selectNode(id);
        const physicsEntry = physicsStateRef.current.get(id);
        const target = physicsEntry?.position || layoutRef.current.positions[id];
        const container = containerRef.current;
        if (target && container) {
          const rect = container.getBoundingClientRect();
          const nextPan = {
            x: rect.width / 2 - target.x * zoom,
            y: rect.height / 2 - target.y * zoom,
          };
          setPan(nextPan);
        }
      }

      setActiveGraphTool(GraphTool.REFRAME);
    };

    const listener = (event: Event) => handleTransform(event as CustomEvent<TransformRequest>);
    window.addEventListener(TRANSFORM_EVENT, listener as EventListener);
    return () => {
      window.removeEventListener(TRANSFORM_EVENT, listener as EventListener);
    };
  }, [selectNode, setPan, setActiveGraphTool, setLayoutMode, zoom]);

  const handleNodePointerDown = useCallback(
    (node: Node, event: any) => {
      event.stopPropagation();
      const original = event.data?.originalEvent as PointerEvent | MouseEvent | undefined;
      const multi = original ? (original as PointerEvent).shiftKey : false;

      if (activeTool === GraphTool.CONNECT) {
        if (!connectSourceRef.current || connectSourceRef.current === node.id) {
          setConnectSource(node.id);
          connectSourceRef.current = node.id;
        } else {
          addEdge({ sourceId: connectSourceRef.current, targetId: node.id, type: edgeType });
          setConnectSource(null);
          connectSourceRef.current = null;
        }
        return;
      }

      if (!multi) {
        clearSelection();
      }
      selectNode(node.id, multi);

      draggingIdsRef.current.add(node.id);
      event.currentTarget.alpha = 0.92;
    },
    [activeTool, addEdge, clearSelection, edgeType, selectNode],
  );

  const handleNodePointerUp = useCallback(
    (node: Node, event: any) => {
      event.stopPropagation();
      const entry = physicsStateRef.current.get(node.id);
      if (entry) {
        const snapped = snapPosition(entry.position, physicsConstraints.gridSnap);
        entry.position = snapped;
        entry.target = snapped;
        updateNode(node.id, { position: snapped });
      }
      draggingIdsRef.current.delete(node.id);
      event.currentTarget.alpha = 1;
    },
    [physicsConstraints.gridSnap, updateNode],
  );

  const handleNodePointerMove = useCallback((node: Node, event: any) => {
    if (!draggingIdsRef.current.has(node.id)) return;
    const scene = sceneRef.current;
    if (!scene) return;
    const global = event.data.getLocalPosition(scene.stage);
    const entry = physicsStateRef.current.get(node.id);
    if (entry) {
      entry.position = { x: global.x, y: global.y };
      entry.target = { x: global.x, y: global.y };
    }
  }, []);

  const handleNodePointerOver = useCallback((node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const handleNodePointerOut = useCallback((node: Node) => {
    if (hoveredNodeRef.current === node.id) {
      setHoveredNodeId(null);
    }
  }, []);

  const handleWheel: WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const { offsetX, offsetY } = event.nativeEvent as WheelEvent;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = clamp(zoom * zoomFactor, 0.3, 3.5);
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const worldBefore = screenToWorld({ x: offsetX + rect.left, y: offsetY + rect.top }, rect, pan, zoom);
    setZoom(nextZoom);
    const newPan = {
      x: offsetX + rect.left - worldBefore.x * nextZoom,
      y: offsetY + rect.top - worldBefore.y * nextZoom,
    };
    setPan(newPan);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isPanning = false;
    let lastPoint: Position | null = null;

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (event.shiftKey) {
        setSelectionRect({ x: event.clientX, y: event.clientY, width: 0, height: 0 });
        lastPoint = { x: event.clientX, y: event.clientY };
        return;
      }
      if ((event.target as HTMLElement).closest('.graph-toolbar, .tag-lens-panel')) return;
      isPanning = true;
      lastPoint = { x: event.clientX, y: event.clientY };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (selectionRect && lastPoint) {
        const width = event.clientX - selectionRect.x;
        const height = event.clientY - selectionRect.y;
        setSelectionRect({
          x: selectionRect.x,
          y: selectionRect.y,
          width,
          height,
        });
        return;
      }

      if (!isPanning || !lastPoint) return;
      const dx = event.clientX - lastPoint.x;
      const dy = event.clientY - lastPoint.y;
      lastPoint = { x: event.clientX, y: event.clientY };
      setPan({ x: panRef.current.x + dx, y: panRef.current.y + dy });
    };

    const onMouseUp = () => {
      if (selectionRect && lastPoint) {
        const rect = container.getBoundingClientRect();
        const start = screenToWorld({ x: selectionRect.x, y: selectionRect.y }, rect, pan, zoom);
        const end = screenToWorld({ x: selectionRect.x + selectionRect.width, y: selectionRect.y + selectionRect.height }, rect, pan, zoom);
        const frameWidth = Math.abs(end.x - start.x);
        const frameHeight = Math.abs(end.y - start.y);
        if (frameWidth > 60 && frameHeight > 60) {
          addFrame({
            title: 'Frame',
            position: { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) },
            width: frameWidth,
            height: frameHeight,
          });
        }
        setSelectionRect(null);
        lastPoint = null;
        return;
      }

      isPanning = false;
      lastPoint = null;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [pan, zoom, selectionRect, setPan, addFrame]);

  const handleReframe = (mode: LayoutMode) => {
    saveLayoutSnapshot(`Reframe-${mode}`);
    setLayoutMode(mode);
    setActiveGraphTool(GraphTool.REFRAME);
  };

  const handleMagnetToggle = () => {
    const current = physicsConstraints.forces.frameMagnet;
    const next = current > 0.05 ? 0 : 0.24;
    setPhysicsConstraints({
      forces: { frameMagnet: next },
    } as Partial<PhysicsConstraints>);
    setActiveGraphTool(GraphTool.MAGNET);
  };

  const handleColorize = () => {
    applyColorPalette(nodes, updateNode);
    setActiveGraphTool(GraphTool.COLORIZE);
  };

  const handleSimplify = () => {
    setSimplifyActive((prev) => !prev);
    setActiveGraphTool(GraphTool.SIMPLIFY);
  };

  const handleFreeze = () => {
    setPhysicsConstraints({ enablePhysics: false } as Partial<PhysicsConstraints>);
    setActiveGraphTool(GraphTool.FREEZE);
  };

  const handleUnfreeze = () => {
    setPhysicsConstraints({ enablePhysics: true } as Partial<PhysicsConstraints>);
    setActiveGraphTool(GraphTool.UNFREEZE);
  };

  const handleTagDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const tag = event.dataTransfer?.getData('text/plain');
    if (!tag) return;
    addTagLens(tag, event.altKey ? 'or' : 'and');
  };

  const handleTagDragOver: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
  };

  const updateSceneGraphics = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const state = physicsStateRef.current;
    const nodes = visibleNodesRef.current;
    const edges = visibleEdgesRef.current;
    const selected = selectionRef.current;
    const hovered = hoveredNodeRef.current;
    const connectSource = connectSourceRef.current;
    const frames = framesRef.current;

    const positionMap = new Map<NodeId, Position>();
    nodes.forEach((node) => {
      const entry = state.get(node.id);
      if (entry) {
        positionMap.set(node.id, entry.position);
      }
    });

    const frameMembership = collectFrameMembers(frames, nodes, positionMap);

    const visibleIdSet = new Set(nodes.map((node) => node.id));

    scene.nodeGraphics.forEach((meta, nodeId) => {
      if (!visibleIdSet.has(nodeId)) {
        scene.nodeLayer.removeChild(meta.container);
        meta.container.destroy({ children: true });
        scene.nodeGraphics.delete(nodeId);
      }
    });

    nodes.forEach((node) => {
      let meta = scene.nodeGraphics.get(node.id);
      if (!meta) {
        meta = createNodeGraphic(node, {
          onPointerDown: handleNodePointerDown,
          onPointerUp: handleNodePointerUp,
          onPointerMove: handleNodePointerMove,
          onPointerOver: handleNodePointerOver,
          onPointerOut: handleNodePointerOut,
        });
        meta.container.zIndex = 2;
        scene.nodeLayer.addChild(meta.container);
        scene.nodeGraphics.set(node.id, meta);
      }

      const entry = state.get(node.id);
      if (!entry) return;

      updateNodeGraphic(meta, node, {
        selected: selected.has(node.id),
        hovered: hovered === node.id,
        connectSource: connectSource === node.id,
      });

      meta.container.position.set(entry.position.x, entry.position.y);
    });

    const edgeIdSet = new Set(edges.map((edge) => edge.id));
    scene.edgeGraphics.forEach((graphics, edgeId) => {
      if (!edgeIdSet.has(edgeId)) {
        scene.edgeLayer.removeChild(graphics);
        graphics.destroy({ children: true });
        scene.edgeGraphics.delete(edgeId);
      }
    });

    edges.forEach((edge) => {
      let graphics = scene.edgeGraphics.get(edge.id);
      if (!graphics) {
        graphics = new PIXI.Graphics();
        graphics.zIndex = 1;
        scene.edgeLayer.addChild(graphics);
        scene.edgeGraphics.set(edge.id, graphics);
      }

      const source = state.get(edge.sourceId)?.position;
      const target = state.get(edge.targetId)?.position;
      drawEdgeGraphic(graphics, source, target, edge.type);
    });

    const frameIdSet = new Set(Array.from(frameMembership.keys()));
    scene.frameGraphics.forEach((graphics, id) => {
      if (!frameIdSet.has(id)) {
        scene.frameLayer.removeChild(graphics);
        graphics.destroy({ children: true });
        scene.frameGraphics.delete(id);
      }
    });

    frameMembership.forEach((data, frameId) => {
      let graphics = scene.frameGraphics.get(frameId);
      if (!graphics) {
        graphics = new PIXI.Graphics();
        graphics.zIndex = 0;
        scene.frameLayer.addChild(graphics);
        scene.frameGraphics.set(frameId, graphics);
      }

      updateFrameGraphic(graphics, data);
    });
  }, [handleNodePointerDown, handleNodePointerMove, handleNodePointerOut, handleNodePointerOver, handleNodePointerUp]);

  const stepAnimation = useCallback(
    (time: number) => {
      const delta = time - lastTickRef.current;
      lastTickRef.current = time;

      const nodes = visibleNodesRef.current;
      if (nodes.length > 0) {
        stepPhysics({
          state: physicsStateRef.current,
          nodes,
          constraints: physicsConstraints,
          deltaMs: delta,
          draggingIds: draggingIdsRef.current,
          frames: framesRef.current,
        });
      }

      updateSceneGraphics();
      animationFrameRef.current = requestAnimationFrame(stepAnimation);
    },
    [physicsConstraints, updateSceneGraphics],
  );

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(stepAnimation);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stepAnimation]);

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(selectedNodeIds[0] ?? null, nodesMap, edges),
    [selectedNodeIds, nodesMap, edges],
  );

  return (
    <div className="graph-view">
      <GraphToolbar
        activeTool={activeTool}
        physicsPreset={physicsPreset}
        edgeType={edgeType}
        onSelectTool={setActiveGraphTool}
        onReframe={handleReframe}
        onCyclePhysicsPreset={cyclePhysicsPreset}
        onFreeze={handleFreeze}
        onUnfreeze={handleUnfreeze}
        onColorize={handleColorize}
        onSimplify={handleSimplify}
        onMagnetToggle={handleMagnetToggle}
        onEdgeTypeChange={setEdgeType}
        onSnapshot={() => saveLayoutSnapshot('Manual Snapshot')}
      />

      <div className="graph-content">
        <TagLensPanel
          tags={tags.sort((a, b) => b.count - a.count)}
          lenses={filters.tagLenses}
          onLensRemove={removeTagLens}
          onClearLenses={clearTagLenses}
        />

        <div
          className="graph-stage"
          ref={containerRef}
          onWheel={handleWheel}
          onDragOver={handleTagDragOver}
          onDrop={handleTagDrop}
        >
          {selectionRect && (
            <div
              className="selection-rect"
              style={{
                left: Math.min(selectionRect.x, selectionRect.x + selectionRect.width),
                top: Math.min(selectionRect.y, selectionRect.y + selectionRect.height),
                width: Math.abs(selectionRect.width),
                height: Math.abs(selectionRect.height),
              }}
            />
          )}

          <div className="graph-overlay">
            <GraphBreadcrumbs
              trail={breadcrumbs}
              onSelect={(id) => selectNode(id)}
            />

            <div className="filter-toggles">
              <button
                type="button"
                className={filters.ownerOnly ? 'active' : ''}
                onClick={() => setGraphFilters({ ownerOnly: !filters.ownerOnly })}
              >
                Only Mine
              </button>
              <button
                type="button"
                className={filters.newOnly ? 'active' : ''}
                onClick={() => setGraphFilters({ newOnly: !filters.newOnly })}
              >
                New
              </button>
            </div>

            <GraphMinimap
              nodes={minimapNodes}
              selected={selectedNodeSet}
              pan={pan}
              zoom={zoom}
              viewportSize={viewportSize}
              onNavigate={(target) => {
                setPan({ x: -target.x * zoom + viewportSize.width / 2, y: -target.y * zoom + viewportSize.height / 2 });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
