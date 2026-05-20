'use client';

import { useState } from 'react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { FurnitureType, TransformMode } from '@/lib/data';

const MODE_LABELS: Record<TransformMode, string> = {
  translate: 'Mover',
  rotate: 'Girar',
  scale: 'Escalar',
};

export function Toolbar() {
  const appMode = useWarehouseStore((s) => s.appMode);
  const warehouseSize = useWarehouseStore((s) => s.warehouseSize);
  const setWarehouseSize = useWarehouseStore((s) => s.setWarehouseSize);
  const addShelf = useWarehouseStore((s) => s.addShelf);
  const addWall = useWarehouseStore((s) => s.addWall);
  const addDoor = useWarehouseStore((s) => s.addDoor);
  const addFurniture = useWarehouseStore((s) => s.addFurniture);
  const transformMode = useWarehouseStore((s) => s.transformMode);
  const setTransformMode = useWarehouseStore((s) => s.setTransformMode);
  const selectedItems = useWarehouseStore((s) => s.selectedItems);

  const [w, setW] = useState(warehouseSize.width);
  const [d, setD] = useState(warehouseSize.depth);

  const applySize = () => setWarehouseSize(Number(w) || 0, Number(d) || 0);

  if (appMode !== 'edit') return null;

  const onlyItem = selectedItems.length === 1 ? selectedItems[0] : null;
  const showTransformModes =
    !!onlyItem &&
    (onlyItem.type === 'wall' ||
      onlyItem.type === 'furniture' ||
      onlyItem.type === 'shelf');

  return (
    <div className="glass side-panel pointer-events-auto absolute left-5 top-28 z-10 w-[260px] rounded-2xl p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Dimensões do Galpão</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-[11px] text-slate-400">
          Largura (m)
          <input
            type="number"
            min={5}
            max={200}
            value={w}
            onChange={(e) => setW(Number(e.target.value))}
            onBlur={applySize}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
        </label>
        <label className="text-[11px] text-slate-400">
          Profundidade (m)
          <input
            type="number"
            min={5}
            max={200}
            value={d}
            onChange={(e) => setD(Number(e.target.value))}
            onBlur={applySize}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
        </label>
      </div>
      <button
        onClick={applySize}
        className="mt-2 w-full rounded-md bg-sky-500/90 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-400"
      >
        Aplicar metragem
      </button>

      <div className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-400">Inserir</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={addShelf}
          className="col-span-2 rounded-md border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs text-sky-200 transition hover:bg-sky-500/25"
        >
          + Estante
        </button>
        <button
          onClick={addWall}
          className="rounded-md border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-xs text-slate-100 transition hover:bg-slate-700/70"
        >
          + Divisória
        </button>
        <button
          onClick={addDoor}
          className="rounded-md border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-xs text-slate-100 transition hover:bg-slate-700/70"
        >
          + Porta
        </button>
        <FurnitureButton label="+ Mesa" onClick={() => addFurniture('desk')} />
        <FurnitureButton label="+ Cadeira" onClick={() => addFurniture('chair')} />
        <FurnitureButton label="+ Mesa redonda" onClick={() => addFurniture('table')} />
      </div>

      {showTransformModes && (
        <>
          <div className="mt-5 text-xs uppercase tracking-[0.18em] text-slate-400">Gizmo</div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {(['translate', 'rotate', 'scale'] as TransformMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setTransformMode(m)}
                className={`rounded-md px-2 py-1.5 text-xs transition ${
                  transformMode === m
                    ? 'bg-sky-500 text-white'
                    : 'border border-slate-700/70 bg-slate-800/60 text-slate-200 hover:bg-slate-700/70'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FurnitureButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-xs text-slate-100 transition hover:bg-slate-700/70"
    >
      {label}
    </button>
  );
}
