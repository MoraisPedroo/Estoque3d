'use client';

import { useMemo, useState } from 'react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { MODEL_COLORS, MODEL_LABELS } from '@/lib/data';

const MAX_RESULTS = 8;

export function SearchPanel() {
  const boxes = useWarehouseStore((s) => s.boxes);
  const shelves = useWarehouseStore((s) => s.shelves);
  const searchSelectedBoxId = useWarehouseStore((s) => s.searchSelectedBoxId);
  const routeAlert = useWarehouseStore((s) => s.routeAlert);
  const searchSelectBox = useWarehouseStore((s) => s.searchSelectBox);
  const dismissRouteAlert = useWarehouseStore((s) => s.dismissRouteAlert);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return boxes
      .filter(
        (b) =>
          b.model !== 'vazio' &&
          ((b.sku && b.sku.toLowerCase().includes(q)) ||
            (b.serial && b.serial.toLowerCase().includes(q)))
      )
      .slice(0, MAX_RESULTS);
  }, [boxes, query]);

  const selectedBox = searchSelectedBoxId
    ? boxes.find((b) => b.id === searchSelectedBoxId)
    : null;
  const selectedShelf = selectedBox
    ? shelves.find((sh) => sh.id === selectedBox.shelfId)
    : null;

  return (
    <div className="pointer-events-auto absolute right-5 bottom-5 z-10 w-[320px]">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Busca de Inventário
          </div>
          {searchSelectedBoxId && (
            <button
              onClick={() => {
                searchSelectBox(null);
                setQuery('');
              }}
              className="rounded-md border border-slate-700/70 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-300 transition hover:bg-slate-700/70"
            >
              Limpar rota
            </button>
          )}
        </div>

        <div className="relative mt-2">
          <input
            type="text"
            placeholder="Digite SELB, SKU ou número de série…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
          />

          {focused && results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-md border border-slate-700 bg-slate-900/95 shadow-xl">
              {results.map((b) => {
                const sh = shelves.find((x) => x.id === b.shelfId);
                return (
                  <li key={b.id}>
                    <button
                      onClick={() => {
                        searchSelectBox(b.id);
                        setQuery(b.sku);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-800"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: MODEL_COLORS[b.model] }}
                      />
                      <span className="flex-1 truncate">
                        <span className="font-mono text-slate-100">{b.sku}</span>
                        {b.serial && (
                          <span className="ml-2 text-[10px] text-slate-500">
                            {b.serial}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sh ? `Est. ${sh.label}` : '—'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {query.trim().length >= 2 && results.length === 0 && (
          <p className="mt-2 text-[11px] text-slate-500">
            Nenhum item bate com “{query}”.
          </p>
        )}

        {selectedBox && selectedShelf && !routeAlert && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            <div className="font-semibold">Rota traçada</div>
            <div className="text-amber-200/80">
              {MODEL_LABELS[selectedBox.model]} · SKU {selectedBox.sku}
            </div>
            <div className="text-amber-200/60">
              Estante {selectedShelf.label} · Camada {selectedBox.layerIndex + 1} · Fileira{' '}
              {selectedBox.rowIndex + 1} · Coluna {selectedBox.colIndex + 1}
            </div>
          </div>
        )}

        {routeAlert && (
          <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100">
            <div className="flex items-start justify-between gap-2">
              <span>{routeAlert}</span>
              <button
                onClick={dismissRouteAlert}
                className="rounded border border-rose-500/40 px-1.5 py-0.5 text-[10px] text-rose-200 transition hover:bg-rose-500/20"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
