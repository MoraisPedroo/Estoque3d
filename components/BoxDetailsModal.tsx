'use client';

import { useEffect } from 'react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { MODEL_COLORS, MODEL_LABELS } from '@/lib/data';

export function BoxDetailsModal() {
  const appMode = useWarehouseStore((s) => s.appMode);
  const selectedItems = useWarehouseStore((s) => s.selectedItems);
  const relocatingBoxId = useWarehouseStore((s) => s.relocatingBoxId);
  const boxes = useWarehouseStore((s) => s.boxes);
  const shelves = useWarehouseStore((s) => s.shelves);
  const clearSelection = useWarehouseStore((s) => s.clearSelection);
  const setRelocatingBox = useWarehouseStore((s) => s.setRelocatingBox);
  const clearBox = useWarehouseStore((s) => s.clearBox);

  const selectedBoxId =
    appMode === 'view' &&
    !relocatingBoxId &&
    selectedItems.length === 1 &&
    selectedItems[0].type === 'box'
      ? selectedItems[0].id
      : null;

  const box = selectedBoxId ? boxes.find((b) => b.id === selectedBoxId) : null;
  const currentShelf = box ? shelves.find((sh) => sh.id === box.shelfId) : null;

  useEffect(() => {
    if (!box) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [box, clearSelection]);

  if (!box || !currentShelf) return null;

  const isEmptySlot = box.model === 'vazio';
  const status = isEmptySlot ? 'Slot vazio' : 'Em estoque';

  const handleRelocate = () => {
    // Closes modal, exits zoom (backs to floor view) and arms the "click destination" flow.
    setRelocatingBox(box.id);
  };

  const handleRemove = () => {
    if (window.confirm('Remover este item da matriz? O slot ficará vazio.')) {
      clearBox(box.id);
    }
  };

  return (
    <div className="ui-modal flex items-center justify-center">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={clearSelection} />

      <div className="glass relative z-10 w-[420px] max-w-[92vw] rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Caixa de Impressora
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: MODEL_COLORS[box.model] }}
              />
              <h2 className="text-xl font-semibold text-slate-100">
                {MODEL_LABELS[box.model]}
              </h2>
            </div>
          </div>
          <button
            onClick={clearSelection}
            className="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-sm text-slate-200 transition hover:bg-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-2.5 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 text-sm">
          <DetailRow label="Status" value={status} />
          <DetailRow label="SKU" value={box.sku} />
          {box.serial && <DetailRow label="Série" value={box.serial} />}
          <DetailRow label="Estante" value={currentShelf.label} />
          <DetailRow
            label="Posição"
            value={`Camada ${box.layerIndex + 1} · Fileira ${box.rowIndex + 1} · Coluna ${
              box.colIndex + 1
            }`}
          />
          <DetailRow
            label="Tamanho"
            value={`${box.size[0].toFixed(2)} × ${box.size[1].toFixed(2)} × ${box.size[2].toFixed(
              2
            )} m`}
          />
          <DetailRow label="Quantidade" value={isEmptySlot ? '0' : '1 unidade'} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={handleRelocate}
            disabled={isEmptySlot}
            className="rounded-lg bg-sky-500 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ⇄ Mudar posição
          </button>
          <button
            onClick={handleRemove}
            disabled={isEmptySlot}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            🗑 Remover item
          </button>
        </div>

        <button
          onClick={clearSelection}
          className="mt-2 w-full rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-700/70"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm text-slate-100">{value}</span>
    </div>
  );
}
