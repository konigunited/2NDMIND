import type { Frame, Node, NodeId, PhysicsConstraints, Position } from '../../../types/core';
import { clamp, snapPosition, distanceSquared } from './math';

export interface PhysicsNodeState {
  position: Position;
  velocity: Position;
  target: Position;
}

export type PhysicsState = Map<NodeId, PhysicsNodeState>;

const createZeroVector = (): Position => ({ x: 0, y: 0 });

export const initializePhysicsState = (
  nodes: Node[],
  gridSnap: number,
): PhysicsState => {
  const state: PhysicsState = new Map();
  nodes.forEach((node) => {
    state.set(node.id, {
      position: snapPosition(node.position, gridSnap),
      velocity: createZeroVector(),
      target: snapPosition(node.position, gridSnap),
    });
  });
  return state;
};

export const syncPhysicsTargets = (
  state: PhysicsState,
  layout: Record<NodeId, Position>,
  gridSnap: number,
) => {
  Object.entries(layout).forEach(([nodeId, position]) => {
    const existing = state.get(nodeId as NodeId);
    if (existing) {
      existing.target = snapPosition(position, gridSnap);
    } else {
      state.set(nodeId as NodeId, {
        position: snapPosition(position, gridSnap),
        velocity: createZeroVector(),
        target: snapPosition(position, gridSnap),
      });
    }
  });
};

export interface PhysicsStepOptions {
  state: PhysicsState;
  nodes: Node[];
  constraints: PhysicsConstraints;
  deltaMs: number;
  draggingIds?: Set<NodeId>;
  frames?: Frame[];
}

const ensureStateForNode = (
  state: PhysicsState,
  node: Node,
  gridSnap: number,
): PhysicsNodeState => {
  let entry = state.get(node.id);
  if (!entry) {
    entry = {
      position: snapPosition(node.position, gridSnap),
      target: snapPosition(node.position, gridSnap),
      velocity: createZeroVector(),
    };
    state.set(node.id, entry);
  }
  return entry;
};

const FRAME_FORCE_MULTIPLIER = 0.15;

export const stepPhysics = ({
  state,
  nodes,
  constraints,
  deltaMs,
  draggingIds,
  frames,
}: PhysicsStepOptions): boolean => {
  if (nodes.length === 0) return false;

  const activeDragging = draggingIds ?? new Set<NodeId>();
  let hasMovement = false;

  const dt = clamp(deltaMs, 0, 48) / 16.666;
  const gridSnap = constraints.gridSnap;
  const repulsionRadiusSq = constraints.repulsionRadius * constraints.repulsionRadius;
  const frameCenters = new Map<string, Position>();

  frames?.forEach((frame) => {
    frameCenters.set(frame.id, {
      x: frame.position.x + frame.size.width / 2,
      y: frame.position.y + frame.size.height / 2,
    });
  });

  nodes.forEach((node) => {
    ensureStateForNode(state, node, gridSnap);
  });

  if (!constraints.enablePhysics) {
    state.forEach((entry) => {
      entry.position = snapPosition(entry.target, gridSnap);
      entry.velocity = createZeroVector();
    });
    return false;
  }

  const entries = nodes.map((node) => ({
    node,
    physics: state.get(node.id)!,
  }));

  entries.forEach(({ physics }) => {
    physics.target = snapPosition(physics.target, gridSnap);
  });

  entries.forEach(({ node, physics }) => {
    if (node.locked || activeDragging.has(node.id)) {
      physics.position = snapPosition(physics.target, gridSnap);
      physics.velocity = createZeroVector();
      return;
    }

    let forceX = 0;
    let forceY = 0;

    const toTargetX = physics.target.x - physics.position.x;
    const toTargetY = physics.target.y - physics.position.y;
    forceX += toTargetX * constraints.forces.spring;
    forceY += toTargetY * constraints.forces.spring;

    const frameCenter = node.frameId ? frameCenters.get(node.frameId) : undefined;
    if (frameCenter) {
      const dx = frameCenter.x - physics.position.x;
      const dy = frameCenter.y - physics.position.y;
      forceX += dx * constraints.forces.frameMagnet * FRAME_FORCE_MULTIPLIER;
      forceY += dy * constraints.forces.frameMagnet * FRAME_FORCE_MULTIPLIER;
    }

    entries.forEach(({ node: otherNode, physics: otherPhysics }) => {
      if (otherNode.id === node.id) return;
      const dx = physics.position.x - otherPhysics.position.x;
      const dy = physics.position.y - otherPhysics.position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > 0 && distSq < repulsionRadiusSq) {
        const dist = Math.sqrt(distSq) || 1;
        const strength = constraints.forces.repulsion / distSq;
        forceX += (dx / dist) * strength;
        forceY += (dy / dist) * strength;
      }
    });

    const damping = 0.82;
    physics.velocity.x = (physics.velocity.x + forceX * dt) * damping;
    physics.velocity.y = (physics.velocity.y + forceY * dt) * damping;

    physics.position.x += physics.velocity.x * dt;
    physics.position.y += physics.velocity.y * dt;

    const offsetX = physics.position.x - physics.target.x;
    const offsetY = physics.position.y - physics.target.y;
    const offsetDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    if (offsetDistance > constraints.maxOffset) {
      const scaleFactor = constraints.maxOffset / (offsetDistance || 1);
      physics.position.x = physics.target.x + offsetX * scaleFactor;
      physics.position.y = physics.target.y + offsetY * scaleFactor;
      physics.velocity.x *= 0.6;
      physics.velocity.y *= 0.6;
    }

    const velocityMagnitude = Math.sqrt(
      physics.velocity.x * physics.velocity.x + physics.velocity.y * physics.velocity.y,
    );

    if (
      offsetDistance < gridSnap * 0.4 &&
      velocityMagnitude < 0.08
    ) {
      physics.position = snapPosition(physics.target, gridSnap);
      physics.velocity = createZeroVector();
    } else {
      hasMovement =
        hasMovement ||
        velocityMagnitude > 0.02 ||
        distanceSquared(physics.position, physics.target) > 4;
    }
  });

  return hasMovement;
};
