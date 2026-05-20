'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { MODEL_LABELS, ItemType } from '@/lib/data';

export function Inspector() {
  const selectedItem = useWarehouseStore((s) => s.selectedItem);
  const removeItem = useWarehouseStore((s) => s.removeItem);

  if (!selectedItem) return null;

  return (
    <div className="glass pointer-events-auto absolute right-5 top-28 z-10 w-[320px] rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Propriedades</div>
        <RemoveButton id={selectedItem.id} type={selectedItem.type} onRemove={removeItem} />
      </div>
      {selectedItem.type === 'box' && <BoxInspector id={selectedItem.id} />}
      {selectedItem.type === 'shelf' && <ShelfInspector id={selectedItem.id} />}
      {selectedItem.type === 'wall' && <WallInspector id={selectedItem.id} />}
      {selectedItem.type === 'furniture' && <FurnitureInspector id={selectedItem.id} />}
    </div>
  );
}

function RemoveButton({
  id,
  type,
  onRemove,
}: {
  id: string;
  type: ItemType;
  onRemove: (id: string, type: ItemType) => void;
}) {
  return (
    <button
      onClick={() => onRemove(id, type)}
      title="Remover item"
      className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/20"
    >
      🗑 Remover
    </button>
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
            {shelf.rows} fileiras × {shelf.columns} colunas
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
          Alterar fileiras/colunas recria o buffer de caixas desta estante.
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
