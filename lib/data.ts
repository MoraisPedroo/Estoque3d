export type PrinterModel = 'laser' | 'jato' | 'multifuncional' | 'industrial' | 'vazio';

export interface BoxState {
  model: PrinterModel;
  sku: string;
  serial?: string;
}

export interface RackData {
  id: string;
  label: string;
  position: [number, number, number];
  rotationY: number;
  columns: number;
  slots: (BoxState | null)[];
}

export const ROWS = 3;
export const BOX = { w: 0.9, h: 0.55, d: 0.7 } as const;
export const GAP = 0.05;
export const RACK_FRAME_THICKNESS = 0.04;
export const RACK_DEPTH = BOX.d + 0.15;

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

function mockSlot(rackIdx: number, slotIdx: number): BoxState | null {
  const r = ((rackIdx * 73 + slotIdx * 31 + 7) % 100) / 100;
  if (r < 0.18) return null;
  const models: PrinterModel[] = ['laser', 'jato', 'multifuncional', 'industrial'];
  const model = models[Math.floor(r * 9973) % models.length];
  return {
    model,
    sku: `IMP-${(1000 + rackIdx * 50 + slotIdx).toString()}`,
    serial: `SN${(rackIdx * 9001 + slotIdx * 17).toString(36).toUpperCase()}`,
  };
}

export function buildWarehouse(): RackData[] {
  const layout: Array<{ cols: number; pos: [number, number, number]; rotationY: number; label: string }> = [
    { cols: 8, pos: [-8, 0, -6], rotationY: 0, label: 'A1' },
    { cols: 8, pos: [-8, 0, -2], rotationY: 0, label: 'A2' },
    { cols: 10, pos: [-8, 0, 3], rotationY: 0, label: 'A3' },

    { cols: 12, pos: [4, 0, -6], rotationY: 0, label: 'B1' },
    { cols: 12, pos: [4, 0, -2], rotationY: 0, label: 'B2' },
    { cols: 10, pos: [4, 0, 3], rotationY: 0, label: 'B3' },

    { cols: 6, pos: [-2, 0, 8], rotationY: Math.PI / 2, label: 'C1' },
    { cols: 6, pos: [2, 0, 8], rotationY: Math.PI / 2, label: 'C2' },
  ];

  return layout.map((l, i) => {
    const total = ROWS * l.cols;
    return {
      id: `rack-${i}`,
      label: l.label,
      position: l.pos,
      rotationY: l.rotationY,
      columns: l.cols,
      slots: Array.from({ length: total }, (_, s) => mockSlot(i, s)),
    };
  });
}
