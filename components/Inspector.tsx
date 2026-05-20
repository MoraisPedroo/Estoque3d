'use client';

import { useState } from 'react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import {
  COLOR_PALETTE,
  DEPTH_LAYER_OPTIONS,
  ItemType,
  MODEL_COLORS,
  MODEL_LABELS,
  PrinterModel,
  SelectedItem,
} from '@/lib/data';

export function Inspector() {
  const selectedItems = useWarehouseStore((s) => s.selectedItems);
  const appMode = useWarehouseStore((s) => s.appMode);

  if (appMode !== 'edit') return null;
  if (selectedItems.length === 0) return null;

  // Multi-selection: bulk panel (currently for boxes; others fall back to first item)
  if (selectedItems.length > 1) {
    const allBoxes = selectedItems.every((it) => it.type === 'box');
    if (allBoxes) {
      return (
        <div className="glass pointer-events-auto absolute right-5 top-28 z-10 w-[320px] rounded-2xl p-4">
          <BulkBoxInspector ids={selectedItems.map((i) => i.id)} />
        </div>
      );
    }
  }

  const first = selectedItems[0];
  return (
    <div className="glass pointer-events-auto absolute right-5 top-28 z-10 w-[320px] rounded-2xl p-4">
      <SinglePanelHeader item={first} />
      {first.type === 'box' && <BoxInspector id={first.id} />}
      {first.type === 'shelf' && <ShelfInspector id={first.id} />}
      {first.type === 'wall' && <WallInspector id={first.id} />}
      {first.type === 'furniture' && <FurnitureInspector id={first.id} />}
    </div>
  );
}

function SinglePanelHeader({ item }: { item: SelectedItem }) {
  const removeItem = useWarehouseStore((s) => s.removeItem);
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Propriedades</div>
      <button
        onClick={() => removeItem(item.id, item.type)}
        title="Remover item"
        className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/20"
      >
        🗑 Remover
      </button>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 0.1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block text-[11px] text-slate-400">
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? Number(value.toFixed(3)) : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
      />
    </label>
  );
}

// ===== Single Box =====
function BoxInspector({ id }: { id: string }) {
  const box = useWarehouseStore((s) => s.boxes.find((b) => b.id === id));
  const updateBox = useWarehouseStore((s) => s.updateBox);

  if (!box) return null;

  const setSize = (i: 0 | 1 | 2, v: number) => {
    const size = [...box.size] as [number, number, number];
    size[i] = Math.max(0.05, v);
    updateBox(box.id, { size });
  };
  const setPos = (i: 0 | 1 | 2, v: number) => {
    const position = [...box.position] as [number, number, number];
    position[i] = v;
    updateBox(box.id, { position });
  };

  return (
    <div className="mt-2 space-y-3">
      <div>
        <div className="text-base font-semibold text-slate-100">Caixa</div>
        <div className="text-xs text-slate-400">
          {MODEL_LABELS[box.model]} • SKU {box.sku}
        </div>
        <div className="text-[10px] text-slate-500">
          Camada {box.layerIndex + 1} • Fileira {box.rowIndex + 1} • Coluna{' '}
          {box.colIndex + 1}
        </div>
      </div>

      <label className="block text-[11px] text-slate-400">
        Cor
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            value={box.color}
            onChange={(e) => updateBox(box.id, { color: e.target.value })}
            className="h-8 w-14 cursor-pointer rounded border border-slate-700 bg-transparent"
          />
          <input
            type="text"
            value={box.color}
            onChange={(e) => updateBox(box.id, { color: e.target.value })}
            className="flex-1 rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100"
          />
        </div>
      </label>

      <label className="block text-[11px] text-slate-400">
        Tipo de Impressora
        <select
          value={box.model}
          onChange={(e) =>
            updateBox(box.id, {
              model: e.target.value as PrinterModel,
              color: MODEL_COLORS[e.target.value as PrinterModel],
            })
          }
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100"
        >
          {(Object.keys(MODEL_LABELS) as PrinterModel[]).map((m) => (
            <option key={m} value={m}>
              {MODEL_LABELS[m]}
            </option>
          ))}
        </select>
      </label>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Tamanho (m)</div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="L" value={box.size[0]} onChange={(v) => setSize(0, v)} />
          <NumberInput label="A" value={box.size[1]} onChange={(v) => setSize(1, v)} />
          <NumberInput label="P" value={box.size[2]} onChange={(v) => setSize(2, v)} />
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Posição local (m)</div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="X" value={box.position[0]} onChange={(v) => setPos(0, v)} />
          <NumberInput label="Y" value={box.position[1]} onChange={(v) => setPos(1, v)} />
          <NumberInput label="Z" value={box.position[2]} onChange={(v) => setPos(2, v)} />
        </div>
      </div>
    </div>
  );
}

// ===== Bulk Box =====
function BulkBoxInspector({ ids }: { ids: string[] }) {
  const bulkUpdateBoxes = useWarehouseStore((s) => s.bulkUpdateBoxes);
  const clearSelection = useWarehouseStore((s) => s.clearSelection);
  const removeSelectedItems = useWarehouseStore((s) => s.removeSelectedItems);

  const [color, setColor] = useState('#60a5fa');
  const [model, setModel] = useState<PrinterModel>('laser');
  const [w, setW] = useState(0.9);
  const [h, setH] = useState(0.55);
  const [d, setD] = useState(0.7);

  const applyColor = (c: string) => {
    setColor(c);
    bulkUpdateBoxes(ids, { color: c });
  };
  const applyModel = (m: PrinterModel) => {
    setModel(m);
    bulkUpdateBoxes(ids, { model: m, color: MODEL_COLORS[m] });
    setColor(MODEL_COLORS[m]);
  };
  const applySize = () => {
    bulkUpdateBoxes(ids, {
      size: [Math.max(0.05, w), Math.max(0.05, h), Math.max(0.05, d)],
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Edição em Massa
          </div>
          <div className="text-base font-semibold text-slate-100">
            {ids.length} caixas selecionadas
          </div>
        </div>
        <button
          onClick={removeSelectedItems}
          title="Remover todas"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/20"
        >
          🗑
        </button>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Paleta de Cores</div>
        <div className="grid grid-cols-5 gap-1.5">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => applyColor(c)}
              className={`h-8 w-full rounded-md border transition ${
                color === c
                  ? 'border-white scale-105'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => applyColor(e.target.value)}
            className="h-8 w-14 cursor-pointer rounded border border-slate-700 bg-transparent"
          />
          <span className="text-xs text-slate-400">Cor customizada</span>
        </div>
      </div>

      <label className="block text-[11px] text-slate-400">
        Tipo de Impressora
        <select
          value={model}
          onChange={(e) => applyModel(e.target.value as PrinterModel)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100"
        >
          {(Object.keys(MODEL_LABELS) as PrinterModel[]).map((m) => (
            <option key={m} value={m}>
              {MODEL_LABELS[m]}
            </option>
          ))}
        </select>
      </label>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Tamanho (m)</div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="L" value={w} onChange={setW} />
          <NumberInput label="A" value={h} onChange={setH} />
          <NumberInput label="P" value={d} onChange={setD} />
        </div>
        <button
          onClick={applySize}
          className="mt-2 w-full rounded-md bg-sky-500/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-400"
        >
          Aplicar tamanho em todas
        </button>
      </div>

      <button
        onClick={clearSelection}
        className="w-full rounded-md border border-slate-700/70 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-700/70"
      >
        Limpar seleção
      </button>

      <p className="text-[10px] text-slate-500">
        Dica: segure <kbd className="rounded bg-slate-800 px-1">Shift</kbd> + clique para
        adicionar/remover caixas da seleção.
      </p>
    </div>
  );
}

// ===== Shelf =====
function ShelfInspector({ id }: { id: string }) {
  const shelf = useWarehouseStore((s) => s.shelves.find((sh) => sh.id === id));
  const updateShelf = useWarehouseStore((s) => s.updateShelf);
  const zoomToShelf = useWarehouseStore((s) => s.zoomToShelf);
  const view = useWarehouseStore((s) => s.view);

  if (!shelf) return null;

  const setBoxSize = (i: 0 | 1 | 2, v: number) => {
    const boxSize = [...shelf.boxSize] as [number, number, number];
    boxSize[i] = v;
    updateShelf(shelf.id, { boxSize });
  };
  const setPos = (i: 0 | 1 | 2, v: number) => {
    const position = [...shelf.position] as [number, number, number];
    position[i] = v;
    updateShelf(shelf.id, { position });
  };

  return (
    <div className="mt-2 space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-base font-semibold text-slate-100">Estante {shelf.label}</div>
          <div className="text-xs text-slate-400">
            {shelf.depthLayers} camada{shelf.depthLayers > 1 ? 's' : ''} • {shelf.rows}×
            {shelf.columns} = {shelf.capacityPerLayer} slots/camada
          </div>
        </div>
        {view === 'floor' && (
          <button
            onClick={() => zoomToShelf(shelf.id)}
            className="rounded-md bg-sky-500/90 px-3 py-1 text-xs font-medium text-white transition hover:bg-sky-400"
          >
            Zoom 3D
          </button>
        )}
      </div>

      <label className="block text-[11px] text-slate-400">
        Layout da Estante (profundidade)
        <select
          value={shelf.depthLayers}
          onChange={(e) => updateShelf(shelf.id, { depthLayers: Number(e.target.value) })}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100"
        >
          {DEPTH_LAYER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Estrutura</div>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput
            label="Fileiras"
            value={shelf.rows}
            step={1}
            min={1}
            max={10}
            onChange={(v) => updateShelf(shelf.id, { rows: v })}
          />
          <NumberInput
            label="Colunas"
            value={shelf.columns}
            step={1}
            min={1}
            max={40}
            onChange={(v) => updateShelf(shelf.id, { columns: v })}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          Alterar fileiras/colunas/camadas recria o buffer de caixas desta estante.
        </p>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Caixa padrão (m)</div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="L" value={shelf.boxSize[0]} onChange={(v) => setBoxSize(0, v)} />
          <NumberInput label="A" value={shelf.boxSize[1]} onChange={(v) => setBoxSize(1, v)} />
          <NumberInput label="P" value={shelf.boxSize[2]} onChange={(v) => setBoxSize(2, v)} />
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Posição (m)</div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="X" value={shelf.position[0]} onChange={(v) => setPos(0, v)} />
          <NumberInput label="Y" value={shelf.position[1]} onChange={(v) => setPos(1, v)} />
          <NumberInput label="Z" value={shelf.position[2]} onChange={(v) => setPos(2, v)} />
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Rotação Y (rad)</div>
        <NumberInput
          label="Y"
          value={shelf.rotation[1]}
          step={Math.PI / 2}
          onChange={(v) =>
            updateShelf(shelf.id, { rotation: [shelf.rotation[0], v, shelf.rotation[2]] })
          }
        />
      </div>
    </div>
  );
}

// ===== Wall =====
function WallInspector({ id }: { id: string }) {
  const wall = useWarehouseStore((s) => s.walls.find((w) => w.id === id));
  const updateWall = useWarehouseStore((s) => s.updateWall);

  if (!wall) return null;

  const set = <K extends 'position' | 'rotation' | 'scale'>(
    key: K,
    i: 0 | 1 | 2,
    v: number
  ) => {
    const arr = [...wall[key]] as [number, number, number];
    arr[i] = v;
    updateWall(wall.id, { [key]: arr } as any);
  };

  return (
    <div className="mt-2 space-y-3">
      <div className="text-base font-semibold text-slate-100">Divisória</div>

      <label className="block text-[11px] text-slate-400">
        Cor
        <input
          type="color"
          value={wall.color}
          onChange={(e) => updateWall(wall.id, { color: e.target.value })}
          className="mt-1 h-8 w-14 cursor-pointer rounded border border-slate-700 bg-transparent"
        />
      </label>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Dimensões (m)</div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput
            label="Comp."
            value={wall.scale[0]}
            onChange={(v) => set('scale', 0, Math.max(0.1, v))}
          />
          <NumberInput
            label="Alt."
            value={wall.scale[1]}
            onChange={(v) => set('scale', 1, Math.max(0.1, v))}
          />
          <NumberInput
            label="Esp."
            value={wall.scale[2]}
            onChange={(v) => set('scale', 2, Math.max(0.02, v))}
          />
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Posição (m)</div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="X" value={wall.position[0]} onChange={(v) => set('position', 0, v)} />
          <NumberInput label="Y" value={wall.position[1]} onChange={(v) => set('position', 1, v)} />
          <NumberInput label="Z" value={wall.position[2]} onChange={(v) => set('position', 2, v)} />
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Rotação Y (rad)</div>
        <NumberInput
          label="Y"
          value={wall.rotation[1]}
          step={Math.PI / 2}
          onChange={(v) => set('rotation', 1, v)}
        />
      </div>
    </div>
  );
}

// ===== Furniture =====
function FurnitureInspector({ id }: { id: string }) {
  const f = useWarehouseStore((s) => s.furniture.find((x) => x.id === id));
  const updateFurniture = useWarehouseStore((s) => s.updateFurniture);

  if (!f) return null;

  const set = <K extends 'position' | 'rotation'>(key: K, i: 0 | 1 | 2, v: number) => {
    const arr = [...f[key]] as [number, number, number];
    arr[i] = v;
    updateFurniture(f.id, { [key]: arr } as any);
  };

  const typeLabel = f.type === 'desk' ? 'Mesa' : f.type === 'chair' ? 'Cadeira' : 'Mesa redonda';

  return (
    <div className="mt-2 space-y-3">
      <div className="text-base font-semibold text-slate-100">{typeLabel}</div>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Posição (m)</div>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput label="X" value={f.position[0]} onChange={(v) => set('position', 0, v)} />
          <NumberInput label="Y" value={f.position[1]} onChange={(v) => set('position', 1, v)} />
          <NumberInput label="Z" value={f.position[2]} onChange={(v) => set('position', 2, v)} />
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase text-slate-500">Rotação Y (rad)</div>
        <NumberInput
          label="Y"
          value={f.rotation[1]}
          step={Math.PI / 2}
          onChange={(v) => set('rotation', 1, v)}
        />
      </div>
    </div>
  );
}
