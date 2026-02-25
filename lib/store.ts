import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { BACKEND_BASE_URL, RING_BUFFER_LIMIT } from './config';
import { createSession, endSession, insertSample } from './db';
import { computeStats, windowSamples } from './metrics';
import { runProbe } from './probe';
import { startDriftCorrectedScheduler } from './scheduler';
import { RouteHop, Sample, Stats, TargetMode } from './types';

type Store = {
  mode: TargetMode;
  target: string;
  intervalMs: number;
  timeoutMs: number;
  monitoring: boolean;
  backendReachable: boolean;
  sessionId: number | null;
  samples: Sample[];
  routeHops: RouteHop[];
  darkMode: boolean;
  qualityThresholdMs: number;
  lossThresholdPct: number;
  stats1m: Stats;
  stats5m: Stats;
  statsSession: Stats;
  statusMessage: string | null;
  setMode: (m: TargetMode) => void;
  setTarget: (t: string) => void;
  setIntervalMs: (v: number) => void;
  setTimeoutMs: (v: number) => void;
  setDarkMode: (v: boolean) => Promise<void>;
  setThresholds: (quality: number, loss: number) => Promise<void>;
  loadSettings: () => Promise<void>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  refreshRoute: () => Promise<void>;
};

let cancelScheduler: null | (() => void) = null;
let routeTimer: null | ReturnType<typeof setInterval> = null;

function emptyStats(): Stats {
  return { current: null, avg: null, min: null, max: null, p95: null, jitter: null, lossPct: 0 };
}

export const useAppStore = create<Store>((set, get) => ({
  mode: 'http',
  target: 'https://example.com',
  intervalMs: 1000,
  timeoutMs: 2000,
  monitoring: false,
  backendReachable: true,
  sessionId: null,
  samples: [],
  routeHops: [],
  darkMode: false,
  qualityThresholdMs: 150,
  lossThresholdPct: 5,
  stats1m: emptyStats(),
  stats5m: emptyStats(),
  statsSession: emptyStats(),
  statusMessage: null,
  setMode: (mode) => set({ mode }),
  setTarget: (target) => set({ target }),
  setIntervalMs: (intervalMs) => set({ intervalMs: Math.max(500, Math.min(10000, intervalMs)) }),
  setTimeoutMs: (timeoutMs) => set({ timeoutMs: Math.max(1000, Math.min(5000, timeoutMs)) }),
  setDarkMode: async (darkMode) => {
    set({ darkMode });
    await AsyncStorage.setItem('darkMode', JSON.stringify(darkMode));
  },
  setThresholds: async (qualityThresholdMs, lossThresholdPct) => {
    set({ qualityThresholdMs, lossThresholdPct });
    await AsyncStorage.multiSet([
      ['qualityThresholdMs', String(qualityThresholdMs)],
      ['lossThresholdPct', String(lossThresholdPct)],
    ]);
  },
  loadSettings: async () => {
    const values = await AsyncStorage.multiGet(['darkMode', 'qualityThresholdMs', 'lossThresholdPct']);
    const map = Object.fromEntries(values);
    set({
      darkMode: map.darkMode ? JSON.parse(map.darkMode) : false,
      qualityThresholdMs: map.qualityThresholdMs ? Number(map.qualityThresholdMs) : 150,
      lossThresholdPct: map.lossThresholdPct ? Number(map.lossThresholdPct) : 5,
    });
  },
  startMonitoring: async () => {
    const { mode, target, intervalMs, timeoutMs } = get();
    const sessionId = await createSession(mode, target);
    set({ monitoring: true, sessionId, samples: [], statusMessage: null });

    cancelScheduler = startDriftCorrectedScheduler(intervalMs, async () => {
      const sample = await runProbe(mode, target, timeoutMs);
      const state = get();
      if (!state.monitoring || !state.sessionId) return;

      await insertSample(state.sessionId, sample);
      const samples = [...state.samples, sample].slice(-RING_BUFFER_LIMIT);
      const stats1m = computeStats(windowSamples(samples, 60_000));
      const stats5m = computeStats(windowSamples(samples, 5 * 60_000));
      const statsSession = computeStats(samples);
      const unhealthy =
        (stats1m.avg ?? 0) > state.qualityThresholdMs || stats1m.lossPct > state.lossThresholdPct;
      set({
        samples,
        stats1m,
        stats5m,
        statsSession,
        statusMessage: unhealthy ? 'Quality threshold exceeded' : null,
      });
    });

    await get().refreshRoute();
    routeTimer = setInterval(() => {
      if (get().monitoring) {
        void get().refreshRoute();
      }
    }, 60_000);
  },
  stopMonitoring: async () => {
    const { sessionId } = get();
    if (cancelScheduler) cancelScheduler();
    cancelScheduler = null;
    if (routeTimer) clearInterval(routeTimer);
    routeTimer = null;
    if (sessionId) await endSession(sessionId);
    set({ monitoring: false, sessionId: null });
  },
  refreshRoute: async () => {
    const { target } = get();
    const tracerouteTarget = target.replace(/^https?:\/\//, '').split('/')[0] || target;
    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/traceroute?target=${encodeURIComponent(tracerouteTarget)}`,
      );
      if (!response.ok) throw new Error('Backend error');
      const json = await response.json();
      set({ routeHops: json.hops || [], backendReachable: true });
    } catch {
      set({ backendReachable: false, statusMessage: 'Backend unreachable. Route data unavailable.' });
    }
  },
}));
