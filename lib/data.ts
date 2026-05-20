export type PrinterModel = 'laser' | 'jato' | 'multifuncional' | 'industrial' | 'vazio';
export type ItemType = 'box' | 'shelf' | 'wall' | 'furniture';
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
  boxSize: [number, number, number];
}

export interface Box {
  id: string;
  shelfId: string;
  rowIndex: number;
  colIndex: number;
  position: [number, number, number]; // local to its shelf group
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
  return shelf.boxSize[2] + 0.15;
}

export function localBoxPosition(shelf: Shelf, row: number, col: number): [number, number, number] {
  const [bw, bh] = shelf.boxSize;
  const rackWidth = rackWidthOf(shelf);
  const localX = -rackWidth / 2 + GAP + bw / 2 + col * (bw + GAP);
  const localY = bh / 2 + GAP + row * (bh + GAP);
  return [localX, localY, 0];
}

export function defaultShelves(): Shelf[] {
  const make = (
    id: string,
    label: string,
    pos: [number, number, number],
    rotY: number,
    columns: number,
    rows: number = 3
  ): Shelf => ({
    id,
    label,
    position: pos,
    rotation: [0, rotY, 0],
    rows,
    columns,
    boxSize: [...DEFAULT_BOX_SIZE] as [number, number, number],
  });

  return [
    make('shelf-A1', 'A1', [-8, 0, -6], 0, 8),
    make('shelf-A2', 'A2', [-8, 0, -2], 0, 8),
    make('shelf-A3', 'A3', [-8, 0, 3], 0, 10),
    make('shelf-B1', 'B1', [4, 0, -6], 0, 12),
    make('shelf-B2', 'B2', [4, 0, -2], 0, 12),
    make('shelf-B3', 'B3', [4, 0, 3], 0, 10),
    make('shelf-C1', 'C1', [-2, 0, 8], Math.PI / 2, 6),
    make('shelf-C2', 'C2', [2, 0, 8], Math.PI / 2, 6),
  ];
}

function seededModel(shelfIndex: number, row: number, col: number): PrinterModel {
  const seed = ((shelfIndex * 73 + row * 31 + col * 17 + 7) % 100) / 100;
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
  for (let row = 0; row < shelf.rows; row++) {
    for (let col = 0; col < shelf.columns; col++) {
      const prev = existing?.find(
        (b) => b.shelfId === shelf.id && b.rowIndex === row && b.colIndex === col
      );
      const model: PrinterModel = prev?.model ?? seededModel(shelfIndex, row, col);
      const pos = localBoxPosition(shelf, row, col);
      boxes.push({
        id: prev?.id ?? `box-${shelf.id}-${row}-${col}-${(_boxCounter++).toString(36)}`,
        shelfId: shelf.id,
        rowIndex: row,
        colIndex: col,
        position: pos,
        size: [...shelf.boxSize] as [number, number, number],
        color: prev?.color ?? MODEL_COLORS[model],
        model,
        sku: prev?.sku ?? `IMP-${1000 + _boxCounter}`,
        serial: prev?.serial ?? `SN${(shelfIndex * 9001 + row * 137 + col * 17).toString(36).toUpperCase()}`,
      });
    }
  }
  return boxes;
}

export function generateInitialBoxes(shelves: Shelf[]): Box[] {
  return shelves.flatMap((sh, i) => generateBoxesForShelf(sh, i));
}
