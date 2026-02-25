export type TargetMode = 'http' | 'ws';

export type Sample = {
  id?: number;
  sessionId?: number;
  timestamp: number;
  latencyMs: number | null;
  success: boolean;
  timedOut: boolean;
};

export type Stats = {
  current: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
  p95: number | null;
  jitter: number | null;
  lossPct: number;
};

export type RouteHop = {
  hop: number;
  host: string;
  ip: string;
  avgLatency: number | null;
  lossPct: number;
};

export type Session = {
  id: number;
  mode: TargetMode;
  target: string;
  startedAt: number;
  endedAt: number | null;
};
