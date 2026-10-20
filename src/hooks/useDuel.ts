import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getDuelState } from '../services/duelService';
import { secondsUntil } from '../utils/duel';
import type { DuelStateResponse } from '../types/duel';

const REFRESH_DEBOUNCE_MS = 400;

/**
 * Estado autoritativo de un duelo: `duel-state` + Realtime.
 *
 * Realtime solo avisa de que algo cambió; la verdad siempre se vuelve a pedir
 * a la Edge Function. Presence se usa únicamente para el punto verde.
 */
export function useDuel(duelId: string | undefined) {
  const [state, setState] = useState<DuelStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const mounted = useRef(true);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const debounceTimer = useRef<number | null>(null);

  /**
   * Serializa las lecturas: si llega un refresco mientras otro está en vuelo,
   * espera y lanza uno nuevo. Así el estado posterior a un intento nunca se
   * pierde por una petición anterior que llegue tarde.
   */
  const refresh = useCallback((): Promise<void> => {
    if (!duelId) {
      return Promise.resolve();
    }

    queue.current = queue.current
      .catch(() => {
        // Un fallo anterior no debe cancelar la siguiente lectura.
      })
      .then(async () => {
        try {
          const data = await getDuelState(duelId);

          if (!mounted.current) {
            return;
          }

          setState(data);
          setOffset(Date.parse(data.serverNow) - Date.now());
          setError(null);
        } catch (err) {
          if (mounted.current) {
            setError((err as Error).message);
          }
        } finally {
          if (mounted.current) {
            setLoading(false);
          }
        }
      });

    return queue.current;
  }, [duelId]);

  useEffect(() => {
    mounted.current = true;

    // Diferido para no disparar renders síncronos desde el efecto.
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      mounted.current = false;
      window.clearTimeout(timer);
    };
  }, [refresh]);

  // Reloj cosmético: el servidor valida `ends_at` con su propio now().
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Al volver el foco o la red, se recupera el estado (reconexión).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    }

    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  // Realtime: cambios de estado + presence.
  useEffect(() => {
    if (!duelId) {
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    function scheduleRefresh() {
      if (debounceTimer.current !== null) {
        window.clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = window.setTimeout(() => {
        debounceTimer.current = null;
        void refresh();
      }, REFRESH_DEBOUNCE_MS);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) {
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        return;
      }

      channel = supabase.channel(`duel:${duelId}`, {
        config: { presence: { key: userId } },
      });

      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'duels', filter: `id=eq.${duelId}` },
          scheduleRefresh
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'duel_players', filter: `duel_id=eq.${duelId}` },
          scheduleRefresh
        )
        .on('presence', { event: 'sync' }, () => {
          if (!channel) {
            return;
          }
          const presence = channel.presenceState<{ userId?: string }>();
          const ids = new Set<string>();
          for (const entries of Object.values(presence)) {
            for (const entry of entries) {
              if (entry.userId) {
                ids.add(entry.userId);
              }
            }
          }
          setOnlineIds(ids);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            void channel?.track({ userId });
          }
        });
    });

    return () => {
      cancelled = true;
      if (debounceTimer.current !== null) {
        window.clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      if (channel) {
        void supabase.removeChannel(channel);
      }
      setOnlineIds(new Set());
    };
  }, [duelId, refresh]);

  const remainingSeconds = secondsUntil(state?.duel.ends_at ?? null, now + offset);

  // Al llegar a cero, se reintenta cerrar el duelo unas pocas veces: el reloj
  // local puede adelantarse unas décimas al del servidor.
  const closeTries = useRef(0);
  useEffect(() => {
    if (state?.duel.status !== 'active' || remainingSeconds !== 0) {
      closeTries.current = 0;
      return;
    }

    const timer = window.setInterval(() => {
      closeTries.current += 1;
      if (closeTries.current > 4) {
        window.clearInterval(timer);
        return;
      }
      void refresh();
    }, 1500);

    return () => window.clearInterval(timer);
  }, [remainingSeconds, refresh, state?.duel.status]);

  return {
    state,
    loading,
    error,
    refresh,
    onlineIds,
    remainingSeconds,
  };
}
