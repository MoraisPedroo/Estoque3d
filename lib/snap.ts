import { Door, Wall } from './data';

const SNAP_DISTANCE = 4; // metres

/**
 * Snap a door to the nearest wall: copy the wall's rotation, project the
 * door's position onto the wall's plane (zero out the local perpendicular axis),
 * and clamp along the wall length so the door doesn't slide off the edge.
 */
export function snapDoorToWall(door: Door, walls: Wall[]): Door {
  if (walls.length === 0) return door;

  let best: { wall: Wall; dist: number } | null = null;
  for (const w of walls) {
    const dx = door.position[0] - w.position[0];
    const dz = door.position[2] - w.position[2];
    const dist = Math.hypot(dx, dz);
    if (!best || dist < best.dist) best = { wall: w, dist };
  }
  if (!best || best.dist > SNAP_DISTANCE) {
    // No wall close enough — leave as is, detach if previously attached.
    return { ...door, wallId: null };
  }
  const wall = best.wall;
  const rotY = wall.rotation[1];
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);

  // World→wall local
  const dx = door.position[0] - wall.position[0];
  const dz = door.position[2] - wall.position[2];
  let localX = cos * dx - sin * dz;     // along wall length
  // local Z is the perpendicular distance — snap to 0 (door rides the wall plane)

  // Clamp along the wall length so the door stays within bounds.
  const half = Math.max(0, wall.scale[0] / 2 - door.scale[0] / 2);
  if (localX > half) localX = half;
  else if (localX < -half) localX = -half;

  // Local→world (with local Z = 0)
  const snappedX = wall.position[0] + cos * localX;
  const snappedZ = wall.position[2] - sin * localX;

  // Door height defaults to half its own height so it sits on the floor.
  const groundY = Math.max(door.scale[1] / 2, door.position[1]);

  return {
    ...door,
    position: [snappedX, groundY, snappedZ],
    rotation: [0, rotY, 0],
    wallId: wall.id,
  };
}
