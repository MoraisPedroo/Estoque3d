'use client';

import { useEffect } from 'react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { Box, MODEL_COLORS, MODEL_LABELS } from '@/lib/data';

const MODEL_TEXT = 'ZD230';

function layerLabel(layer: number, total: number) {
  if (total === 1) return 'Camada única';
  if (total === 2) return layer === 0 ? 'Frente' : 'Fundo';
  // total === 3
  return layer === 0 ? 'Frente' : layer === 1 ? 'Meio' : 'Fundo';
}

function slotCode(row: number, col: number) {
  // "C9X3" style: column then row
  return `C${col + 1}X${row + 1}`;
}

export function ShelfGridModal() {
  const inspecting = useWarehouseStore((s) => s.inspectingShelf);
  const shelves = useWarehouseStore((s) => s.shelves);
  const boxes = useWarehouseStore((s) => s.boxes);
  const close = useWarehouseStore((s) => s.closeShelfInspection);
  const setLayer = useWarehouseStore((s) => s.setInspectionLayer);

  useEffect(() => {
    if (!inspecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inspecting, close]);

  if (!inspecting) return null;
  const shelf = shelves.find((sh) => sh.id === inspecting.id);
  if (!shelf) return null;

  // Step 1: layer chooser when none selected yet (small popup).
  if (inspecting.layer === null) {
    const options = Array.from({ length: shelf.depthLayers }, (_, i) => i);
    return (
      <div className="ui-modal flex items-center justify-center">
        <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={close} />
        <div className="glass relative z-10 w-[340px] rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Inspecionar estante {shelf.label}
          </div>
          <div className="mt-1 text-base font-semibold text-slate-100">
            Qual camada deseja visualizar?
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {options.map((l) => (
              <button
                key={l}
                onClick={() => setLayer(l)}
                className="rounded-lg border border-slate-700/60 bg-slate-800/50 px-4 py-2.5 text-left text-sm text-slate-100 transition hover:border-sky-400/60 hover:bg-sky-500/10"
              >
                <span className="text-sky-300">{l + 1}.</span> {layerLabel(l, shelf.depthLayers)}
              </button>
            ))}
          </div>
          <button
            onClick={close}
            className="mt-4 w-full rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 transition hover:bg-slate-700/70"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Step 2: WMS-style 2D grid (CSS Grid laid out from shelf.rows × shelf.columns).
  const layer = inspecting.layer;
  const layerBoxes = boxes.filter(
    (b) => b.shelfId === shelf.id && b.layerIndex === layer
  );
  const byKey = new Map<string, Box>();
  layerBoxes.forEach((b) => byKey.set(`${b.rowIndex}:${b.colIndex}`, b));

  const filled = layerBoxes.filter((b) => b.model !== 'vazio').length;

  return (
    <div className="ui-modal flex items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={close} />
      <div className="glass relative z-10 w-[min(94vw,920px)] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Mapa 2D · WMS
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-100">
              Estante {shelf.label}{' '}
              <span className="text-sm font-normal text-slate-400">
                — {layerLabel(layer, shelf.depthLayers)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {shelf.rows} fileiras × {shelf.columns} colunas · {filled}/
              {layerBoxes.length} ocupados
            </div>
          </div>
          <div className="flex items-center gap-2">
            {shelf.depthLayers > 1 && (
              <div className="flex gap-1">
                {Array.from({ length: shelf.depthLayers }, (_, l) => (
                  <button
                    key={l}
                    onClick={() => setLayer(l)}
                    className={`rounded-md px-3 py-1.5 text-xs transition ${
                      l === layer
                        ? 'bg-sky-500 text-white'
                        : 'border border-slate-700/70 bg-slate-800/60 text-slate-200 hover:bg-slate-700/70'
                    }`}
                  >
                    {layerLabel(l, shelf.depthLayers)}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={close}
              className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-700"
            >
              ✕ Fechar
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `48px repeat(${shelf.columns}, minmax(82px, 1fr))`,
            }}
          >
            {/* Column header */}
            <div />
            {Array.from({ length: shelf.columns }, (_, c) => (
              <div
                key={`col-${c}`}
                className="text-center text-[10px] uppercase tracking-wider text-slate-500"
              >
                C{c + 1}
              </div>
            ))}

            {/* Rows top→bottom = top row first (X3..X1 visually) */}
            {Array.from({ length: shelf.rows }, (_, ri) => shelf.rows - 1 - ri).map(
              (row) => (
                <RowCells
                  key={`row-${row}`}
                  row={row}
                  columns={shelf.columns}
                  byKey={byKey}
                />
              )
            )}
          </div>
        </div>

        <p className="mt-3 text-[10px] text-slate-500">
          Cada célula representa um slot físico da estante. Código C(coluna)X(fileira)
          como na referência de mapa de armazém.
        </p>
      </div>
    </div>
  );
}

function RowCells({
  row,
  columns,
  byKey,
}: {
  row: number;
  columns: number;
  byKey: Map<string, Box>;
}) {
  return (
    <>
      <div className="grid place-items-center text-[10px] uppercase tracking-wider text-slate-500">
        X{row + 1}
      </div>
      {Array.from({ length: columns }, (_, col) => {
        const box = byKey.get(`${row}:${col}`);
        const empty = !box || box.model === 'vazio';
        return (
          <div
            key={`${row}-${col}`}
            className={`flex flex-col items-center justify-center rounded-md border px-2 py-2 text-[10px] transition ${
              empty
                ? 'border-dashed border-slate-700/70 bg-slate-800/30 text-slate-500'
                : 'border-slate-600/40 text-slate-900 shadow-sm'
            }`}
            style={
              !empty
                ? {
                    background: `linear-gradient(135deg, ${MODEL_COLORS[box!.model]} 0%, #f5e6c4 95%)`,
                  }
                : undefined
            }
            title={
              empty
                ? `Slot ${slotCode(row, col)} vazio`
                : `${MODEL_LABELS[box!.model]} · SKU ${box!.sku}`
            }
          >
            <span className="font-mono text-[10px] tracking-wider opacity-70">
              {slotCode(row, col)}
            </span>
            {empty ? (
              <span className="mt-0.5 font-medium">vazio</span>
            ) : (
              <>
                <span className="mt-0.5 text-[12px] font-bold tracking-wide">
                  {MODEL_TEXT}
                </span>
                <span className="text-[9px] opacity-75">{box!.sku}</span>
              </>
            )}
          </div>
        );
      })}
    </>
  );
}

