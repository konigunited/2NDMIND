import type { Position } from '../../../types/core';

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const snapToGrid = (value: number, gridSize: number) =>
  Math.round(value / gridSize) * gridSize;

export const snapPosition = (position: Position, gridSize: number): Position => ({
  x: snapToGrid(position.x, gridSize),
  y: snapToGrid(position.y, gridSize),
});

export const distanceSquared = (a: Position, b: Position) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const distance = (a: Position, b: Position) => Math.sqrt(distanceSquared(a, b));

export const normalize = (vector: Position): Position => {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
};

export const scale = (vector: Position, factor: number): Position => ({
  x: vector.x * factor,
  y: vector.y * factor,
});

export const add = (a: Position, b: Position): Position => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

export const subtract = (a: Position, b: Position): Position => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

export const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export const lerpPosition = (start: Position, end: Position, t: number): Position => ({
  x: lerp(start.x, end.x, t),
  y: lerp(start.y, end.y, t),
});
