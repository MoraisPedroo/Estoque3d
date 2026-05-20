export type PrinterModel = 'laser' | 'jato' | 'multifuncional' | 'industrial' | 'vazio';
export type ItemType = 'box' | 'rack' | 'wall' | 'furniture';
export type FurnitureType = 'desk' | 'chair' | 'table';
export type TransformMode = 'translate' | 'rotate' | 'scale';

export const ROWS = 3;
export const BOX = { w: 0.9, h: 0.55, d: 0.7 } as const;
export const GAP = 0.05;
export const RACK_FRAME_THICKNESS = 0.04;
export const RACK_DEPTH = BOX.d + 0.15;

export interface Box {
  id: string;
  rackId: string;
  rowIndex: number;
  colIndex: number;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  model: PrinterModel;
  sku: string;
  serial?: string;
}

export interface Rack {
  id: string;
  label: string;
  position: [number, number, number];
  rotationY: number;
  columns: number;
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
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(_idCounter++).toString(36)}`;

export function defaultRacks(): Rack[] {
  return [
    { id: 'rack-A1', label: 'A1', position: [-8, 0, -6], rotationY: 0, columns: 8 },
    { id: 'rack-A2', label: 'A2', position: [-8, 0, -2], rotationY: 0, columns: 8 },
    { id: 'rack-A3', label: 'A3', position: [-8, 0, 3], rotationY: 0, columns: 10 },
    { id: 'rack-B1', label: 'B1', position: [4, 0, -6], rotationY: 0, columns: 12 },
    { id: 'rack-B2', label: 'B2', position: [4, 0, -2], rotationY: 0, columns: 12 },
    { id: 'rack-B3', label: 'B3', position: [4, 0, 3], rotationY: 0, columns: 10 },
    { id: 'rack-C1', label: 'C1', position: [-2, 0, 8], rotationY: Math.PI / 2, columns: 6 },
    { id: 'rack-C2', label: 'C2', position: [2, 0, 8], rotationY: Math.PI / 2, columns: 6 },
  ];
}

export function rackWidthOf(rack: Rack) {
  return rack.columns * (BOX.w + GAP) + GAP;
}

export function localBoxPosition(rack: Rack, row: number, col: number): [number, number, number] {
  const rackWidth = rackWidthOf(rack);
  const localX = -rackWidth / 2 + GAP + BOX.w / 2 + col * (BOX.w + GAP);
  const localY = BOX.h / 2 + GAP + row * (BOX.h + GAP);
  return [localX, localY, 0];
}

export function worldFromLocal(
  rack: Rack,
  local: [number, number, number]
): [number, number, number] {
  const cos = Math.cos(rack.rotationY);
  const sin = Math.sin(rack.rotationY);
  const [lx, ly, lz] = local;
  return [
    rack.position[0] + cos * lx + sin * lz,
    rack.position[1] + ly,
    rack.position[2] - sin * lx + cos * lz,
  ];
}

export function generateInitialBoxes(racks: Rack[]): Box[] {
  const boxes: Box[] = [];
  let n = 0;
  for (let rIdx = 0; rIdx < racks.length; rIdx++) {
    const rack = racks[rIdx];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < rack.columns; col++) {
        const seed = ((rIdx * 73 + row * 31 + col * 17 + 7) % 100) / 100;
        const empty = seed < 0.15;
        const model: PrinterModel = empty
          ? 'vazio'
          : PRINTER_MODELS[Math.floor(seed * 9973) % PRINTER_MODELS.length];
        const local = localBoxPosition(rack, row, col);
        const world = worldFromLocal(rack, local);
        boxes.push({
          id: `box-${rack.id}-${row}-${col}`,
          rackId: rack.id,
          rowIndex: row,
          colIndex: col,
          position: world,
          size: [BOX.w, BOX.h, BOX.d],
          color: MODEL_COLORS[model],
          model,
          sku: `IMP-${(1000 + n).toString()}`,
          serial: `SN${(rIdx * 9001 + row * 137 + col * 17).toString(36).toUpperCase()}`,
        });
        n++;
      }
    }
  }
  return boxes;
}
