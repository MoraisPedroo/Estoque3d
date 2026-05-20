'use client';

import { useEffect } from 'react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { Box, MODEL_COLORS, MODEL_LABELS, PrinterModel } from '@/lib/data';

const MODEL_TEXT = 'ZD230';

function layerLabel(layer: number, total: number) {
  if (total === 1) return 'Camada única';
  if (total === 2) return layer === 0 ? 'Frente' : 'Fundo';
  return layer === 0 ? 'Frente' : layer === 1 ? 'Meio' : 'Fundo';
}

function slotCode(row: number, col: number) {
  return `C${col + 1}X${row + 1}`;
}

// Solid status palette with on-color text — matches the spec's "modern WMS panel" look.
const STATUS_STYLE: Record<PrinterModel, { bg: string; text: string; label: string }> = {
  laser: { bg: '#3b82f6', text: '#ffffff', label: 'Laser' },
  jato: { bg: '#10b981', text: '#062018', label: 'Jato' },
  multifuncional: { bg: '#f59e0b', text: '#1a1207', label: 'Multifunc.' },
  industrial: { bg: '#ec4899', text: '#ffffff', label: 'Industrial' },
  vazio: { bg: 'transparent', text: '#64748b', label: 'Vazio' },
};

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

  // Layer chooser
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

  const layer = inspecting.layer;
  const layerBoxes = boxes.filter((b) => b.shelfId === shelf.id && b.layerIndex === layer);
  const byKey = new Map<string, Box>();
  layerBoxes.forEach((b) => byKey.set(`${b.rowIndex}:${b.colIndex}`, b));

  const filled = layerBoxes.filter((b) => b.model !== 'vazio').length;
  const occupancy = layerBoxes.length > 0 ? Math.round((filled / layerBoxes.length) * 100) : 0;

  // Counts by model for the summary bar
  const counts: Partial<Record<PrinterModel, number>> = {};
  layerBoxes.forEach((b) => (counts[b.model] = (counts[b.model] ?? 0) + 1));

  return (
    <div className="ui-modal flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={close} />

      <div
        className="relative z-10 w-[min(96vw,960px)] rounded-2xl border border-slate-700/60 bg-slate-950 p-6 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />
              WMS · MAPA 2D
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <h2 className="font-mono text-2xl font-semibold text-slate-100">
                {shelf.label}
              </h2>
              <span className="text-sm text-slate-400">
                {layerLabel(layer, shelf.depthLayers)} · {shelf.rows} × {shelf.columns}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {shelf.depthLayers > 1 && (
              <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
                {Array.from({ length: shelf.depthLayers }, (_, l) => (
                  <button
                    key={l}
                    onClick={() => setLayer(l)}
                    className={`rounded-md px-3 py-1 text-xs transition ${
                      l === layer
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {layerLabel(l, shelf.depthLayers)}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={close}
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <KPI label="Ocupação" value={`${occupancy}%`} accent="sky" />
          <KPI label="Ocupados" value={`${filled}`} accent="emerald" />
          <KPI label="Vazios" value={`${layerBoxes.length - filled}`} accent="slate" />
          <KPI label="Total" value={`${layerBoxes.length}`} accent="slate" />
        </div>

        {/* Status legend */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          {(Object.keys(STATUS_STYLE) as PrinterModel[]).map((m) => {
            const count = counts[m] ?? 0;
            if (m === 'vazio' && count === 0) return null;
            return (
              <span key={m} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: STATUS_STYLE[m].bg, border: m === 'vazio' ? '1px dashed #475569' : 'none' }}
                />
                <span>{MODEL_LABELS[m]}</span>
                {count > 0 && <span className="text-slate-500">· {count}</span>}
              </span>
            );
          })}
        </div>

        {/* Grid */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `52px repeat(${shelf.columns}, minmax(86px, 1fr))`,
            }}
          >
            <div />
            {Array.from({ length: shelf.columns }, (_, c) => (
              <div
                key={`col-${c}`}
                className="text-center font-mono text-[11px] font-semibold tracking-wider text-slate-500"
              >
                C{c + 1}
              </div>
            ))}

            {Array.from({ length: shelf.rows }, (_, ri) => shelf.rows - 1 - ri).map((row) => (
              <RowCells key={`row-${row}`} row={row} columns={shelf.columns} byKey={byKey} />
            ))}
          </div>
        </div>

        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
          C(coluna) X(fileira) · ZEBRA · ZD230
        </p>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'sky' | 'emerald' | 'slate';
}) {
  const accentMap = {
    sky: 'text-sky-300',
    emerald: 'text-emerald-300',
    slate: 'text-slate-300',
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 shadow-inner">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-lg font-semibold ${accentMap[accent]}`}>
        {value}
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
      <div className="grid place-items-center font-mono text-[11px] font-semibold tracking-wider text-slate-500">
        X{row + 1}
      </div>
      {Array.from({ length: columns }, (_, col) => {
        const box = byKey.get(`${row}:${col}`);
        const empty = !box || box.model === 'vazio';
        const style = box ? STATUS_STYLE[box.model] : STATUS_STYLE.vazio;
        return (
          <div
            key={`${row}-${col}`}
            className={`group relative flex flex-col items-stretch justify-between rounded-lg px-2.5 py-2 text-[10px] transition ${
              empty
                ? 'border border-dashed border-slate-700 bg-slate-900/30 text-slate-500'
                : 'border border-black/20 shadow-lg shadow-black/40'
            }`}
            style={
              empty
                ? undefined
                : { backgroundColor: style.bg, color: style.text }
            }
            title={
              empty
                ? `Slot ${slotCode(row, col)} vazio`
                : `${MODEL_LABELS[box!.model]} · SKU ${box!.sku}`
            }
          >
            <div className="flex items-center justify-between">
              <span
                className={`font-mono text-[10px] tracking-wider ${
                  empty ? 'opacity-80' : 'opacity-75'
                }`}
              >
                {slotCode(row, col)}
              </span>
              {!empty && (
                <span
                  className="rounded-full bg-black/25 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider"
                  style={{ color: style.text }}
                >
                  {style.label}
                </span>
              )}
            </div>

            {empty ? (
              <div className="mt-1 grid place-items-center text-[11px] font-medium tracking-wider">
                — VAZIO —
              </div>
            ) : (
              <div className="mt-1.5">
                <div className="font-mono text-[13px] font-bold leading-none tracking-wide">
                  {MODEL_TEXT}
                </div>
                <div className="mt-0.5 truncate font-mono text-[9px] opacity-90">
                  {box!.sku}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
