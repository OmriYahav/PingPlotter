# PingPlotter-like App Plan (React Native + Expo Go)

## 1) Project Architecture

### Core principles
- Expo Go compatible only (no custom native code).
- Probe methods are app-safe and network-safe in Expo Go:
  - HTTP latency probe via `fetch` + `HEAD`/`GET`
  - WebSocket RTT probe via backend echo service
- Traceroute data comes from backend API only.
- Offline-first local history via SQLite.
- Low-jitter scheduler with overlap protection and timeout-driven packet-loss accounting.

### Folder structure

```text
.
├── app/
│   ├── _layout.tsx
│   ├── settings.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── monitor.tsx
│       ├── chart.tsx
│       ├── route.tsx
│       └── history.tsx
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBanner.tsx
│   │   │   ├── StatPill.tsx
│   │   │   └── SectionCard.tsx
│   │   ├── monitor/
│   │   │   ├── ProbeControlBar.tsx
│   │   │   ├── LiveLatencyTile.tsx
│   │   │   ├── PacketLossTile.tsx
│   │   │   └── ProbeMethodBadge.tsx
│   │   ├── chart/
│   │   │   ├── LatencyLineChart.tsx
│   │   │   ├── JitterBandOverlay.tsx
│   │   │   ├── LossMarkers.tsx
│   │   │   └── WindowSelector.tsx
│   │   ├── route/
│   │   │   ├── HopList.tsx
│   │   │   ├── HopRow.tsx
│   │   │   └── RouteSummary.tsx
│   │   └── history/
│   │       ├── SessionList.tsx
│   │       ├── SessionRow.tsx
│   │       └── ExportActions.tsx
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── tracerouteApi.ts
│   │   │   └── config.ts
│   │   ├── probe/
│   │   │   ├── httpProbe.ts
│   │   │   ├── wsProbe.ts
│   │   │   ├── scheduler.ts
│   │   │   ├── timeout.ts
│   │   │   └── metrics.ts
│   │   ├── export/
│   │   │   ├── csvExporter.ts
│   │   │   └── fileShare.ts
│   │   └── storage/
│   │       ├── repositories/
│   │       │   ├── samplesRepo.ts
│   │       │   ├── sessionsRepo.ts
│   │       │   └── hopsRepo.ts
│   │       └── migrations.ts
│   ├── store/
│   │   ├── appStore.ts
│   │   ├── probeSlice.ts
│   │   ├── chartSlice.ts
│   │   ├── routeSlice.ts
│   │   ├── historySlice.ts
│   │   └── settingsSlice.ts
│   ├── utils/
│   │   ├── time.ts
│   │   ├── math.ts
│   │   ├── ringBuffer.ts
│   │   ├── net.ts
│   │   └── csv.ts
│   ├── db/
│   │   ├── schema.sql
│   │   ├── sqlite.ts
│   │   └── types.ts
│   ├── hooks/
│   │   ├── useMonitorController.ts
│   │   ├── useRollingMetrics.ts
│   │   └── useTracerouteRefresh.ts
│   ├── models/
│   │   ├── probe.ts
│   │   ├── route.ts
│   │   ├── metrics.ts
│   │   └── settings.ts
│   └── constants/
│       ├── defaults.ts
│       └── windows.ts
├── assets/
└── docs/
    └── expo-go-pingplotter-plan.md
```

### Zustand state slices
- `probeSlice`
  - Live monitor state: running/stopped, target, method, interval, timeout, inFlight flag, last sequence, last sample.
  - Actions: start, stop, enqueueTick, finalizeSample, markTimeout.
- `chartSlice`
  - Active window (`1m`, `5m`, `session`), decimation level, visible series, chart cursor.
  - Derived selectors for min/max/p95/loss.
- `routeSlice`
  - Last traceroute snapshot, loading/error state, refresh timestamp.
- `historySlice`
  - Session list paging/filtering, selected session, export status.
- `settingsSlice`
  - API base URL, ws URL, probe defaults, retention policy, auto-refresh route interval, theme.
- `appStore`
  - Compose slices, optional persist middleware for user settings only.

### TypeScript interfaces (data models)

```ts
export type ProbeMethod = 'http_head' | 'http_get' | 'ws_echo';
export type ProbeStatus = 'ok' | 'timeout' | 'error';

export interface ProbeTarget {
  id: string;
  label: string;
  url: string;
  method: ProbeMethod;
  expectedStatusCodes?: number[];
}

export interface ProbeConfig {
  intervalMs: number;
  timeoutMs: number;
  method: ProbeMethod;
  targetUrl: string;
  sessionLabel?: string;
}

export interface ProbeSample {
  id: string;
  sessionId: string;
  sequence: number;
  startedAtMs: number;
  finishedAtMs: number;
  latencyMs: number | null;
  status: ProbeStatus;
  statusCode?: number;
  errorCode?: string;
  method: ProbeMethod;
  targetUrl: string;
}

export interface RollingMetrics {
  window: '1m' | '5m' | 'session';
  sampleCount: number;
  successCount: number;
  timeoutCount: number;
  errorCount: number;
  packetLossPct: number;
  minMs: number | null;
  maxMs: number | null;
  avgMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  jitterMs: number | null;
}

export interface MonitorSession {
  id: string;
  label?: string;
  method: ProbeMethod;
  targetUrl: string;
  intervalMs: number;
  timeoutMs: number;
  startedAtMs: number;
  endedAtMs?: number;
  totalSent: number;
  totalReceived: number;
  totalLost: number;
}

export interface TracerouteHop {
  hop: number;
  host?: string;
  ip?: string;
  rttMs?: number;
  lossPct?: number;
  asn?: string;
  geo?: string;
}

export interface TracerouteResponse {
  target: string;
  requestedAtMs: number;
  completedAtMs: number;
  hops: TracerouteHop[];
}

export interface WsPingMessage {
  type: 'ping' | 'pong';
  sequence: number;
  clientSendTsMs: number;
  serverRecvTsMs?: number;
  serverSendTsMs?: number;
}

export interface AppSettings {
  apiBaseUrl: string;
  wsPingUrl: string;
  defaultIntervalMs: number;
  defaultTimeoutMs: number;
  routeRefreshSec: number;
  historyRetentionDays: number;
  autoExportOnSessionEnd: boolean;
}
```

## 2) Screens and Navigation Routes (Expo Router)

### Routes
- `/(tabs)/monitor`
  - Live probe controls and current health.
  - Start/stop run, target URL, method toggle (HEAD/GET/WS), interval/timeout controls.
  - Key KPIs: latest RTT, rolling loss, session sent/received/lost.
- `/(tabs)/chart`
  - Time series of RTT + timeout/loss markers.
  - Window selector (`1m`, `5m`, `session`) and percentile cards.
- `/(tabs)/route`
  - Backend traceroute result viewer.
  - Hop table with RTT/loss per hop and manual/auto refresh.
- `/(tabs)/history`
  - Past sessions list + detail summary.
  - Export to CSV per-session or time-range.
- `/settings`
  - Backend URLs, defaults (interval/timeout), route refresh, retention policy, diagnostics.

### Navigation model
- Root stack (`app/_layout.tsx`) with Tabs group + modal/push `settings` route.
- Tabs layout in `app/(tabs)/_layout.tsx` with 4 tabs: monitor, chart, route, history.
- Global header action on tabs to open `/settings`.

## 3) Engineering Plan

### Stable sampling scheduler (no drift, no overlaps)
- Use monotonic scheduling model:
  - `t0 = now()` at session start.
  - For tick `n`, target fire time: `tTarget = t0 + n * intervalMs`.
  - After each completion, compute next delay as `max(0, tTargetNext - now())`.
  - This avoids cumulative drift from callback/runtime latency.
- Overlap prevention:
  - Maintain `inFlight` semaphore.
  - If tick arrives while in flight, mark as `skipped` OR better: queue exactly one pending tick and run immediately when probe finishes.
  - Recommended for packet accounting: do not run concurrent probes; sequence remains strictly increasing.
- App lifecycle:
  - On background transition, stop active scheduler and mark session paused/ended (Expo Go constraints).
  - On foreground, require explicit resume to keep accounting deterministic.

### Timeouts and packet-loss accounting
- Each scheduled sequence increments `totalSent`.
- Probe result handling:
  - Success before timeout -> `status='ok'`, `latencyMs` recorded, `totalReceived++`.
  - Timeout reached first -> finalize once with `status='timeout'`, `latencyMs=null`, `totalLost++`.
  - Network/protocol error (DNS, TLS, socket close) -> `status='error'`; counts as lost for packet-loss KPI.
- Guard against double-finalization using per-sequence completion registry.
- Packet loss formula:
  - `lossPct = ((timeouts + errors) / totalSent) * 100`.

### Rolling metrics windows (1m, 5m, session)
- Maintain append-only sample stream in memory + SQLite persistence.
- Use timestamp-based windows, not sample-count windows:
  - `1m`: samples where `startedAtMs >= now - 60_000`
  - `5m`: samples where `startedAtMs >= now - 300_000`
  - `session`: all current session samples
- For efficient live updates:
  - In-memory deque/ring buffer for recent samples (at least 5m coverage + margin).
  - Incremental aggregates for avg/min/max/loss.
  - Recompute percentiles/jitter from window subset on a throttled cadence (e.g., every 1–2 seconds).
- Jitter definition (recommended): mean absolute delta of consecutive successful RTT samples.

## 4) SQLite Persistence Schema

### Tables

```sql
-- sessions: one monitoring run
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  label TEXT,
  method TEXT NOT NULL,
  target_url TEXT NOT NULL,
  interval_ms INTEGER NOT NULL,
  timeout_ms INTEGER NOT NULL,
  started_at_ms INTEGER NOT NULL,
  ended_at_ms INTEGER,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_received INTEGER NOT NULL DEFAULT 0,
  total_lost INTEGER NOT NULL DEFAULT 0,
  created_at_ms INTEGER NOT NULL
);

-- samples: one probe attempt per sequence
CREATE TABLE samples (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  method TEXT NOT NULL,
  target_url TEXT NOT NULL,
  started_at_ms INTEGER NOT NULL,
  finished_at_ms INTEGER NOT NULL,
  latency_ms REAL,
  status TEXT NOT NULL,          -- ok | timeout | error
  status_code INTEGER,
  error_code TEXT,
  created_at_ms INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, sequence)
);

-- traceroute snapshots
CREATE TABLE routes (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  target TEXT NOT NULL,
  requested_at_ms INTEGER NOT NULL,
  completed_at_ms INTEGER,
  raw_json TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

-- route hops denormalized per snapshot
CREATE TABLE route_hops (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  hop_number INTEGER NOT NULL,
  host TEXT,
  ip TEXT,
  rtt_ms REAL,
  loss_pct REAL,
  asn TEXT,
  geo TEXT,
  created_at_ms INTEGER NOT NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  UNIQUE(route_id, hop_number)
);

-- key-value settings cache
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
```

### Indexes

```sql
CREATE INDEX idx_sessions_started_at ON sessions(started_at_ms DESC);
CREATE INDEX idx_samples_session_time ON samples(session_id, started_at_ms);
CREATE INDEX idx_samples_status_time ON samples(status, started_at_ms DESC);
CREATE INDEX idx_routes_target_time ON routes(target, requested_at_ms DESC);
CREATE INDEX idx_route_hops_route_hop ON route_hops(route_id, hop_number);
```

### Retention and cleanup
- Keep full detail for recent N days (`historyRetentionDays`).
- Cleanup job on app launch + daily:
  - Delete `sessions` older than retention and cascade dependent data.
  - Optional compact via `VACUUM` when many rows deleted.

## 5) CSV Export Format

### File types
1. `session_summary.csv` (one row per session)
2. `session_samples_<sessionId>.csv` (one row per probe sample)
3. `route_hops_<routeId>.csv` (one row per hop snapshot)

### `session_samples` columns (exact order)
- `session_id`
- `sequence`
- `method`
- `target_url`
- `started_at_iso`
- `finished_at_iso`
- `latency_ms`
- `status`
- `status_code`
- `error_code`

### `session_summary` columns
- `session_id`
- `label`
- `method`
- `target_url`
- `interval_ms`
- `timeout_ms`
- `started_at_iso`
- `ended_at_iso`
- `total_sent`
- `total_received`
- `total_lost`
- `loss_pct`
- `avg_ms`
- `p50_ms`
- `p95_ms`
- `min_ms`
- `max_ms`

## 6) Backend API Contract

### `GET /traceroute?target=host`
- Purpose: provide traceroute/hops computed server-side.
- Query params:
  - `target` (required): hostname or IP.
  - optional: `maxHops`, `queriesPerHop`, `timeoutMs`.
- Response `200`:

```json
{
  "target": "example.com",
  "requestedAtMs": 1730000000000,
  "completedAtMs": 1730000001450,
  "hops": [
    { "hop": 1, "host": "gw.local", "ip": "192.168.1.1", "rttMs": 2.1, "lossPct": 0 },
    { "hop": 2, "host": "isp-edge", "ip": "203.0.113.1", "rttMs": 7.5, "lossPct": 0 }
  ]
}
```

- Errors:
  - `400` invalid target
  - `408/504` traceroute timeout
  - `429` rate-limited
  - `500` server failure

### `WS /ws-ping`
- Purpose: echo timestamps for RTT measurement.
- Client -> server message:

```json
{ "type": "ping", "sequence": 42, "clientSendTsMs": 1730000000123 }
```

- Server immediate response:

```json
{
  "type": "pong",
  "sequence": 42,
  "clientSendTsMs": 1730000000123,
  "serverRecvTsMs": 1730000000124,
  "serverSendTsMs": 1730000000124
}
```

- Client computes RTT as `nowMs - clientSendTsMs` when pong received.
- Optional server heartbeat: `{"type":"heartbeat","tsMs":...}`.

### CORS and config
- HTTPS required in production (Expo Go networking reliability + security).
- CORS for REST:
  - Allow app origin(s) used in development proxy and production domains.
  - Methods: `GET, OPTIONS`
  - Headers: `Content-Type, Authorization`
- WebSocket:
  - Validate origin where possible.
  - Token-based auth (query token or `Sec-WebSocket-Protocol` bearer style).
- Environment config exposed to app via runtime constants:
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_WS_PING_URL`

## 7) Implementation sequence (no code yet)
1. Bootstrap Expo Router TypeScript project and tab routes.
2. Add settings + config plumbing.
3. Implement probe services (`httpProbe`, `wsProbe`) and deterministic scheduler.
4. Add Zustand slices and derived metric selectors.
5. Add SQLite schema + repositories + migrations.
6. Build monitor/chart screens with live metrics.
7. Build route screen wired to traceroute API.
8. Build history + CSV export.
9. Add reliability checks (timeouts, overlap guards, resume behavior).
10. Polish UX and performance (chart decimation, list virtualization).
