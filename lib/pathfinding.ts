import { Shelf, Wall, rackDepthOf, rackWidthOf } from './data';

export const CELL_SIZE = 0.4; // grid resolution in metres
const SAFETY_INFLATE = 1; // extra cell ring around each obstacle

export interface GridSpec {
  cellSize: number;
  gridW: number;
  gridH: number;
  originX: number; // world X of column 0 (left edge)
  originZ: number; // world Z of row 0 (front edge)
  blocked: Uint8Array;
}

/** World (x, z) → integer grid cell. */
export function worldToCell(grid: GridSpec, x: number, z: number) {
  return {
    cx: Math.floor((x - grid.originX) / grid.cellSize),
    cz: Math.floor((z - grid.originZ) / grid.cellSize),
  };
}

/** Centre of cell → world (x, z). */
export function cellToWorld(grid: GridSpec, cx: number, cz: number) {
  return {
    x: grid.originX + (cx + 0.5) * grid.cellSize,
    z: grid.originZ + (cz + 0.5) * grid.cellSize,
  };
}

/** Mark the axis-aligned bbox of a rotated rectangle as blocked. */
function rasterizeRotatedRect(
  grid: GridSpec,
  cx: number,
  cz: number,
  halfW: number,
  halfD: number,
  rotY: number
) {
  // Compute the 4 corners of the rotated rect, then take their AABB.
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  const corners: Array<[number, number]> = [
    [+halfW, +halfD],
    [+halfW, -halfD],
    [-halfW, +halfD],
    [-halfW, -halfD],
  ];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [lx, lz] of corners) {
    const wx = cx + c * lx + s * lz;
    const wz = cz - s * lx + c * lz;
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wz < minZ) minZ = wz;
    if (wz > maxZ) maxZ = wz;
  }
  const { cx: x0, cz: z0 } = worldToCell(grid, minX, minZ);
  const { cx: x1, cz: z1 } = worldToCell(grid, maxX, maxZ);
  for (let gz = z0 - SAFETY_INFLATE; gz <= z1 + SAFETY_INFLATE; gz++) {
    for (let gx = x0 - SAFETY_INFLATE; gx <= x1 + SAFETY_INFLATE; gx++) {
      if (gx < 0 || gz < 0 || gx >= grid.gridW || gz >= grid.gridH) continue;
      grid.blocked[gz * grid.gridW + gx] = 1;
    }
  }
}

export function buildGrid(
  warehouseSize: { width: number; depth: number },
  shelves: Shelf[],
  walls: Wall[]
): GridSpec {
  const cellSize = CELL_SIZE;
  const gridW = Math.ceil(warehouseSize.width / cellSize);
  const gridH = Math.ceil(warehouseSize.depth / cellSize);
  const originX = -warehouseSize.width / 2;
  const originZ = -warehouseSize.depth / 2;
  const grid: GridSpec = {
    cellSize,
    gridW,
    gridH,
    originX,
    originZ,
    blocked: new Uint8Array(gridW * gridH),
  };

  for (const shelf of shelves) {
    rasterizeRotatedRect(
      grid,
      shelf.position[0],
      shelf.position[2],
      rackWidthOf(shelf) / 2,
      rackDepthOf(shelf) / 2,
      shelf.rotation[1]
    );
  }
  for (const wall of walls) {
    rasterizeRotatedRect(
      grid,
      wall.position[0],
      wall.position[2],
      wall.scale[0] / 2,
      wall.scale[2] / 2,
      wall.rotation[1]
    );
  }

  return grid;
}

/** Find the nearest free cell within a small radius if the requested one is blocked. */
function nearestFreeCell(grid: GridSpec, cx: number, cz: number, maxR = 6) {
  const idx = (x: number, z: number) => z * grid.gridW + x;
  if (cx >= 0 && cz >= 0 && cx < grid.gridW && cz < grid.gridH && !grid.blocked[idx(cx, cz)]) {
    return { cx, cz };
  }
  for (let r = 1; r <= maxR; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = cx + dx, z = cz + dz;
        if (x < 0 || z < 0 || x >= grid.gridW || z >= grid.gridH) continue;
        if (!grid.blocked[idx(x, z)]) return { cx: x, cz: z };
      }
    }
  }
  return null;
}

interface AStarNode {
  cx: number;
  cz: number;
  g: number;
  f: number;
  parent: AStarNode | null;
}

const SQRT2 = Math.SQRT2;

function octile(a: { cx: number; cz: number }, b: { cx: number; cz: number }) {
  const dx = Math.abs(a.cx - b.cx);
  const dz = Math.abs(a.cz - b.cz);
  return Math.max(dx, dz) + (SQRT2 - 1) * Math.min(dx, dz);
}

/**
 * A* with 8-directional movement that refuses to cut diagonally across
 * an obstacle corner. Returns null if no path exists.
 */
export function astar(
  grid: GridSpec,
  startWorld: [number, number],
  endWorld: [number, number]
): Array<[number, number]> | null {
  const startCellRaw = worldToCell(grid, startWorld[0], startWorld[1]);
  const endCellRaw = worldToCell(grid, endWorld[0], endWorld[1]);
  const startCell = nearestFreeCell(grid, startCellRaw.cx, startCellRaw.cz);
  const endCell = nearestFreeCell(grid, endCellRaw.cx, endCellRaw.cz);
  if (!startCell || !endCell) return null;

  const idx = (x: number, z: number) => z * grid.gridW + x;
  const open: AStarNode[] = [];
  const closed = new Uint8Array(grid.gridW * grid.gridH);
  const best = new Map<number, number>(); // cell idx → best g found

  const startNode: AStarNode = {
    cx: startCell.cx,
    cz: startCell.cz,
    g: 0,
    f: octile(startCell, endCell),
    parent: null,
  };
  open.push(startNode);
  best.set(idx(startCell.cx, startCell.cz), 0);

  while (open.length > 0) {
    // Linear scan for lowest-f (open set rarely grows huge for warehouse maps).
    let bestI = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestI].f) bestI = i;
    }
    const current = open.splice(bestI, 1)[0];
    if (current.cx === endCell.cx && current.cz === endCell.cz) {
      const path: Array<[number, number]> = [];
      let n: AStarNode | null = current;
      while (n) {
        const w = cellToWorld(grid, n.cx, n.cz);
        path.unshift([w.x, w.z]);
        n = n.parent;
      }
      return path;
    }
    closed[idx(current.cx, current.cz)] = 1;

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        const nx = current.cx + dx;
        const nz = current.cz + dz;
        if (nx < 0 || nz < 0 || nx >= grid.gridW || nz >= grid.gridH) continue;
        const nIdx = idx(nx, nz);
        if (closed[nIdx]) continue;
        if (grid.blocked[nIdx]) continue;
        // No corner-cutting through obstacles.
        if (dx !== 0 && dz !== 0) {
          if (
            grid.blocked[idx(current.cx + dx, current.cz)] ||
            grid.blocked[idx(current.cx, current.cz + dz)]
          ) {
            continue;
          }
        }
        const step = dx === 0 || dz === 0 ? 1 : SQRT2;
        const tentativeG = current.g + step;
        const prior = best.get(nIdx);
        if (prior !== undefined && tentativeG >= prior) continue;
        best.set(nIdx, tentativeG);
        const f = tentativeG + octile({ cx: nx, cz: nz }, endCell);
        open.push({ cx: nx, cz: nz, g: tentativeG, f, parent: current });
      }
    }
  }
  return null;
}

/** Collinear waypoints are redundant — strip them so the curve smooths cleanly. */
export function simplifyPath(path: Array<[number, number]>): Array<[number, number]> {
  if (path.length < 3) return path;
  const out: Array<[number, number]> = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const [px, pz] = out[out.length - 1];
    const [cx, cz] = path[i];
    const [nx, nz] = path[i + 1];
    const dx1 = cx - px, dz1 = cz - pz;
    const dx2 = nx - cx, dz2 = nz - cz;
    // Same direction → skip the middle point.
    if (dx1 * dz2 === dx2 * dz1) continue;
    out.push(path[i]);
  }
  out.push(path[path.length - 1]);
  return out;
}
