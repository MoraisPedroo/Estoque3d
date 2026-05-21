export type PrinterModel = 'laser' | 'jato' | 'multifuncional' | 'industrial' | 'vazio';
export type ItemType = 'box' | 'shelf' | 'wall' | 'furniture' | 'door';
export type FurnitureType = 'desk' | 'chair' | 'table';
export type TransformMode = 'translate' | 'rotate' | 'scale';

export const GAP = 0.05;
export const RACK_FRAME_THICKNESS = 0.04;
export const DEFAULT_BOX_SIZE: [number, number, number] = [0.9, 0.55, 0.7];

export interface Shelf {
  id: string;
  label: string;
  position: [number, number, number];
  rotation: [number, number, number];
  rows: number;
  columns: number;
  depthLayers: number; // 1 | 2 | 3
  capacityPerLayer: number; // = rows * columns
  boxSize: [number, number, number];
  /** True for double-tier shelves: adds a thicker mid-ceiling between the two tiers. */
  hasMidCeiling: boolean;
}

export interface Box {
  id: string;
  shelfId: string;
  layerIndex: number; // Z depth layer
  rowIndex: number;   // Y row
  colIndex: number;   // X column
  position: [number, number, number]; // local to shelf group
  size: [number, number, number];
  color: string;
  model: PrinterModel;
  sku: string;
  serial?: string;
}

export interface Wall {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

export interface Furniture {
  id: string;
  type: FurnitureType;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface Door {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  /** scale[0] is the door width (also exposed as `width` helper below). */
  scale: [number, number, number];
  color: string;
  wallId: string | null;
  isPrincipal: boolean;
}

export const doorWidth = (d: Door) => d.scale[0];

export interface SelectedItem {
  id: string;
  type: ItemType;
}

export const MODEL_COLORS: Record<PrinterModel, string> = {
  laser: '#60a5fa',
  jato: '#34d399',
  multifuncional: '#f59e0b',
  industrial: '#f472b6',
  vazio: '#475569',
};

export const MODEL_LABELS: Record<PrinterModel, string> = {
  laser: 'Laser',
  jato: 'Jato de Tinta',
  multifuncional: 'Multifuncional',
  industrial: 'Industrial',
  vazio: 'Vazio',
};

export const COLOR_PALETTE = [
  '#60a5fa', '#34d399', '#f59e0b', '#f472b6', '#a78bfa',
  '#fb7185', '#22d3ee', '#facc15', '#94a3b8', '#475569',
] as const;

export const DEPTH_LAYER_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Camada Simples' },
  { value: 2, label: 'Dupla (Frente/Fundo)' },
  { value: 3, label: 'Tripla (Frente/Meio/Fundo)' },
];

const PRINTER_MODELS: PrinterModel[] = ['laser', 'jato', 'multifuncional', 'industrial'];

let _idCounter = 0;
export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(_idCounter++).toString(36)}`;

export function rackWidthOf(shelf: Shelf) {
  return shelf.columns * (shelf.boxSize[0] + GAP) + GAP;
}

export function rackHeightOf(shelf: Shelf) {
  return shelf.rows * (shelf.boxSize[1] + GAP) + GAP + 0.1;
}

export function rackDepthOf(shelf: Shelf) {
  return shelf.depthLayers * (shelf.boxSize[2] + GAP) + GAP + 0.05;
}

export function localBoxPosition(
  shelf: Shelf,
  layer: number,
  row: number,
  col: number
): [number, number, number] {
  const [bw, bh, bd] = shelf.boxSize;
  const rackWidth = rackWidthOf(shelf);
  const rackDepth = rackDepthOf(shelf);
  const localX = -rackWidth / 2 + GAP + bw / 2 + col * (bw + GAP);
  const localY = bh / 2 + GAP + row * (bh + GAP);
  // Z: front (layer 0) at -depth/2 + offset, back (layer N-1) toward +depth/2
  const localZ = -rackDepth / 2 + GAP + bd / 2 + layer * (bd + GAP);
  return [localX, localY, localZ];
}

export function defaultShelves(): Shelf[] {
  const make = (
    id: string,
    label: string,
    pos: [number, number, number],
    rotY: number,
    columns: number,
    rows: number = 3,
    depthLayers: number = 1
  ): Shelf => ({
    id,
    label,
    position: pos,
    rotation: [0, rotY, 0],
    rows,
    columns,
    depthLayers,
    capacityPerLayer: rows * columns,
    boxSize: [...DEFAULT_BOX_SIZE] as [number, number, number],
    hasMidCeiling: false,
  });

  return [
    make('shelf-A1', 'A1', [-8, 0, -6], 0, 8),
    make('shelf-A2', 'A2', [-8, 0, -2], 0, 8, 3, 2),
    make('shelf-A3', 'A3', [-8, 0, 3], 0, 10),
    make('shelf-B1', 'B1', [4, 0, -6], 0, 12),
    make('shelf-B2', 'B2', [4, 0, -2], 0, 12, 3, 2),
    make('shelf-B3', 'B3', [4, 0, 3], 0, 10),
    make('shelf-C1', 'C1', [-2, 0, 8], Math.PI / 2, 6),
    make('shelf-C2', 'C2', [2, 0, 8], Math.PI / 2, 6),
  ];
}

function seededModel(shelfIndex: number, layer: number, row: number, col: number): PrinterModel {
  const seed = ((shelfIndex * 73 + layer * 211 + row * 31 + col * 17 + 7) % 100) / 100;
  if (seed < 0.15) return 'vazio';
  return PRINTER_MODELS[Math.floor(seed * 9973) % PRINTER_MODELS.length];
}

let _boxCounter = 0;

export function generateBoxesForShelf(
  shelf: Shelf,
  shelfIndex: number,
  existing?: Box[]
): Box[] {
  const boxes: Box[] = [];
  // 3-axis nesting: layer (Z) → row (Y) → column (X)
  for (let layer = 0; layer < shelf.depthLayers; layer++) {
    for (let row = 0; row < shelf.rows; row++) {
      for (let col = 0; col < shelf.columns; col++) {
        const prev = existing?.find(
          (b) =>
            b.shelfId === shelf.id &&
            b.layerIndex === layer &&
            b.rowIndex === row &&
            b.colIndex === col
        );
        const model: PrinterModel = prev?.model ?? seededModel(shelfIndex, layer, row, col);
        const pos = localBoxPosition(shelf, layer, row, col);
        boxes.push({
          id:
            prev?.id ??
            `box-${shelf.id}-${layer}-${row}-${col}-${(_boxCounter++).toString(36)}`,
          shelfId: shelf.id,
          layerIndex: layer,
          rowIndex: row,
          colIndex: col,
          position: pos,
          size: prev?.size ?? ([...shelf.boxSize] as [number, number, number]),
          color: prev?.color ?? MODEL_COLORS[model],
          model,
          sku: prev?.sku ?? `IMP-${1000 + _boxCounter}`,
          serial:
            prev?.serial ??
            `SN${(shelfIndex * 9001 + layer * 401 + row * 137 + col * 17)
              .toString(36)
              .toUpperCase()}`,
        });
      }
    }
  }
  return boxes;
}

export function generateInitialBoxes(shelves: Shelf[]): Box[] {
  return shelves.flatMap((sh, i) => generateBoxesForShelf(sh, i));
}
