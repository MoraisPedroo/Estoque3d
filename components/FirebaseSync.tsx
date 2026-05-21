'use client';

import { useEffect, useRef, useState } from 'react';
import { useWarehouseStore } from '@/store/useWarehouseStore';
import { initAnalytics } from '@/lib/firebase';
import { loadLayout, saveLayout } from '@/lib/persistence';

type Status = 'loading' | 'loaded' | 'saving' | 'saved' | 'error' | 'offline';

const SAVE_DEBOUNCE_MS = 1500;

export function FirebaseSync() {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const appMode = useWarehouseStore((s) => s.appMode);

  const loadedRef = useRef(false);
  const skipNextRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Bootstrap: load saved layout (if any) and fire-and-forget Analytics.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        initAnalytics();
        const snap = await loadLayout();
        if (cancelled) return;
        if (snap) {
          // Don't immediately re-save the freshly loaded data.
          skipNextRef.current = true;
          useWarehouseStore.getState().loadFromSnapshot(snap);
        }
        loadedRef.current = true;
        setStatus('loaded');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao carregar';
        if (!cancelled) {
          setErrorMessage(msg);
          setStatus('error');
          // Allow saves even on load failure (Firestore rules might block reads only).
          loadedRef.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Subscribe to any store change → debounce → save to Firestore.
  useEffect(() => {
    const persist = async () => {
      try {
        setStatus('saving');
        const s = useWarehouseStore.getState();
        await saveLayout({
          version: 1,
          warehouseSize: s.warehouseSize,
          shelves: s.shelves,
          boxes: s.boxes,
          walls: s.walls,
          furniture: s.furniture,
          doors: s.doors,
        });
        setLastSavedAt(Date.now());
        setStatus('saved');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao salvar';
        setErrorMessage(msg);
        setStatus('error');
      }
    };

    // Zustand v4 subscribe — fires on every store change.
    const unsub = useWarehouseStore.subscribe((state, prev) => {
      if (!loadedRef.current) return;
      if (skipNextRef.current) {
        skipNextRef.current = false;
        return;
      }
      // Only react when a persisted slice changed (cheap reference check).
      if (
        state.warehouseSize === prev.warehouseSize &&
        state.shelves === prev.shelves &&
        state.boxes === prev.boxes &&
        state.walls === prev.walls &&
        state.furniture === prev.furniture &&
        state.doors === prev.doors
      ) {
        return;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(persist, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (appMode === 'walk') return null;

  return (
    <div className="pointer-events-auto absolute right-5 bottom-5 z-10">
      <div className="glass flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px]">
        <StatusDot status={status} />
        <span className="text-slate-200">{labelFor(status, lastSavedAt)}</span>
        {status === 'error' && errorMessage && (
          <span
            className="text-rose-300/80"
            title={errorMessage}
          >
            · ver detalhes
          </span>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  const color = {
    loading: 'bg-slate-400 animate-pulse',
    loaded: 'bg-emerald-400',
    saving: 'bg-amber-400 animate-pulse',
    saved: 'bg-emerald-400',
    error: 'bg-rose-400',
    offline: 'bg-slate-500',
  }[status];
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function labelFor(status: Status, lastSavedAt: number | null): string {
  if (status === 'loading') return 'Sincronizando com Firebase…';
  if (status === 'loaded') return 'Conectado · Firebase';
  if (status === 'saving') return 'Salvando…';
  if (status === 'error') return 'Falha ao sincronizar';
  if (status === 'offline') return 'Offline';
  if (lastSavedAt) {
    const secs = Math.max(0, Math.round((Date.now() - lastSavedAt) / 1000));
    if (secs < 5) return 'Salvo agora';
    if (secs < 60) return `Salvo há ${secs}s`;
    const mins = Math.round(secs / 60);
    return `Salvo há ${mins} min`;
  }
  return 'Salvo';
}
