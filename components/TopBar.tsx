'use client';

import { useWarehouseStore } from '@/store/useWarehouseStore';
import { MODEL_COLORS, MODEL_LABELS, PrinterModel } from '@/lib/data';

export function TopBar() {
  const view = useWarehouseStore((s) => s.view);
  const appMode = useWarehouseStore((s) => s.appMode);
  const setAppMode = useWarehouseStore((s) => s.setAppMode);
  const selectedShelfId = useWarehouseStore((s) => s.selectedShelfId);
  const shelves = useWarehouseStore((s) => s.shelves);
  const backToFloor = useWarehouseStore((s) => s.backToFloor);

  const shelf = shelves.find((sh) => sh.id === selectedShelfId);
  const isEdit = appMode === 'edit';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-5">
      <div className="glass pointer-events-auto rounded-2xl px-5 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Gêmeo Digital</div>
        <div className="text-lg font-semibold text-slate-100">Estoque de Impressoras</div>
        <div className="mt-1 text-xs text-slate-400">
          {view === 'floor'
            ? 'Clique para selecionar • duplo-clique numa estante para o zoom 3D'
            : shelf
            ? `Estante ${shelf.label} — clique numa caixa ou no painel para destacar fileiras`
            : ''}
        </div>
      </div>

      <div className="glass pointer-events-auto flex flex-col gap-2 rounded-2xl px-4 py-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Legenda</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {(['laser', 'jato', 'multifuncional', 'industrial', 'vazio'] as PrinterModel[]).map(
            (m) => (
              <div key={m} className="flex items-center gap-2 text-xs text-slate-200">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: MODEL_COLORS[m] }}
                />
                {MODEL_LABELS[m]}
              </div>
            )
          )}
        </div>
      </div>

      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <button
          onClick={() => setAppMode(isEdit ? 'view' : 'edit')}
          className={`glass rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
            isEdit
              ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
              : 'bg-sky-500/20 text-sky-100 hover:bg-sky-500/30'
          }`}
        >
          {isEdit ? '✕ Sair da edição' : '✎ Editar mapa'}
        </button>
        {view === 'rack' && (
          <button
            onClick={backToFloor}
            className="glass rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-800/70"
          >
            ← Voltar à planta
          </button>
        )}
      </div>
    </div>
  );
}
