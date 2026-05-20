'use client';

import { useEffect, useState } from 'react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { MODEL_COLORS, MODEL_LABELS } from '@/lib/data';

export function BoxDetailsModal() {
  const appMode = useWarehouseStore((s) => s.appMode);
  const selectedItems = useWarehouseStore((s) => s.selectedItems);
  const boxes = useWarehouseStore((s) => s.boxes);
  const shelves = useWarehouseStore((s) => s.shelves);
  const clearSelection = useWarehouseStore((s) => s.clearSelection);
  const relocateBox = useWarehouseStore((s) => s.relocateBox);

  const selectedBoxId =
    appMode === 'view' &&
    selectedItems.length === 1 &&
    selectedItems[0].type === 'box'
      ? selectedItems[0].id
      : null;

  const box = selectedBoxId ? boxes.find((b) => b.id === selectedBoxId) : null;
  const currentShelf = box ? shelves.find((sh) => sh.id === box.shelfId) : null;

  const [relocating, setRelocating] = useState(false);
  const [destShelfId, setDestShelfId] = useState<string>('');
  const [destLayer, setDestLayer] = useState(0);
  const [destRow, setDestRow] = useState(0);
  const [destCol, setDestCol] = useState(0);

  // Reset relocate form when opening a different box
  useEffect(() => {
    if (!box) return;
    setRelocating(false);
    setDestShelfId(box.shelfId);
    setDestLayer(box.layerIndex);
    setDestRow(box.rowIndex);
    setDestCol(box.colIndex);
  }, [box?.id]);

  // ESC closes the modal
  useEffect(() => {
    if (!box) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [box, clearSelection]);

  if (!box || !currentShelf) return null;

  const destShelf = shelves.find((sh) => sh.id === destShelfId) ?? currentShelf;

  const isEmptySlot = box.model === 'vazio';
  const status = isEmptySlot ? 'Slot vazio' : 'Em estoque';

  const handleConfirmRelocate = () => {
    relocateBox(box.id, destShelfId, destLayer, destRow, destCol);
    setRelocating(false);
    clearSelection();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={clearSelection}
      />

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

        {!relocating ? (
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setRelocating(true)}
              className="flex-1 rounded-lg bg-sky-500 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400"
            >
              ⇄ Mudar de lugar
            </button>
            <button
              onClick={clearSelection}
              className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700/70"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-100">
              Mover para…
            </div>

            <div className="space-y-2.5">
              <SelectField label="Estante">
                <select
                  value={destShelfId}
                  onChange={(e) => {
                    setDestShelfId(e.target.value);
                    setDestLayer(0);
                    setDestRow(0);
                    setDestCol(0);
                  }}
                  className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100"
                >
                  {shelves.map((sh) => (
                    <option key={sh.id} value={sh.id}>
                      {sh.label} ({sh.depthLayers}×{sh.rows}×{sh.columns})
                    </option>
                  ))}
                </select>
              </SelectField>

              <div className="grid grid-cols-3 gap-2">
                <SelectField label="Camada">
                  <select
                    value={destLayer}
                    onChange={(e) => setDestLayer(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100"
                  >
                    {Array.from({ length: destShelf.depthLayers }, (_, i) => (
                      <option key={i} value={i}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </SelectField>
                <SelectField label="Fileira">
                  <select
                    value={destRow}
                    onChange={(e) => setDestRow(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100"
                  >
                    {Array.from({ length: destShelf.rows }, (_, i) => (
                      <option key={i} value={i}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </SelectField>
                <SelectField label="Coluna">
                  <select
                    value={destCol}
                    onChange={(e) => setDestCol(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100"
                  >
                    {Array.from({ length: destShelf.columns }, (_, i) => (
                      <option key={i} value={i}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </SelectField>
              </div>

              <p className="text-[10px] text-slate-500">
                Se o destino já estiver ocupado, as duas caixas trocam de lugar.
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleConfirmRelocate}
                className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-400"
              >
                Confirmar mudança
              </button>
              <button
                onClick={() => setRelocating(false)}
                className="rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700/70"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
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

function SelectField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] text-slate-400">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
