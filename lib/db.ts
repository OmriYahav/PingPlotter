import * as SQLite from 'expo-sqlite';
import { RouteHop, Sample, Session, TargetMode } from './types';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDb() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('pingplotter.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL,
      target TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      latency_ms REAL,
      success INTEGER NOT NULL,
      timed_out INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);
  return db;
}

async function getDb() {
  return db ?? initDb();
}

export async function createSession(mode: TargetMode, target: string) {
  const d = await getDb();
  const now = Date.now();
  const result = await d.runAsync('INSERT INTO sessions (mode, target, started_at) VALUES (?, ?, ?)', [mode, target, now]);
  return Number(result.lastInsertRowId);
}

export async function endSession(sessionId: number) {
  const d = await getDb();
  await d.runAsync('UPDATE sessions SET ended_at = ? WHERE id = ?', [Date.now(), sessionId]);
}

export async function insertSample(sessionId: number, sample: Sample) {
  const d = await getDb();
  await d.runAsync(
    'INSERT INTO samples (session_id, timestamp, latency_ms, success, timed_out) VALUES (?, ?, ?, ?, ?)',
    [sessionId, sample.timestamp, sample.latencyMs, sample.success ? 1 : 0, sample.timedOut ? 1 : 0],
  );
}

export async function listSessions(): Promise<Session[]> {
  const d = await getDb();
  const rows = await d.getAllAsync<any>('SELECT id, mode, target, started_at, ended_at FROM sessions ORDER BY started_at DESC');
  return rows.map((r) => ({ id: r.id, mode: r.mode, target: r.target, startedAt: r.started_at, endedAt: r.ended_at }));
}

export async function getSessionSamples(sessionId: number): Promise<Sample[]> {
  const d = await getDb();
  const rows = await d.getAllAsync<any>(
    'SELECT id, session_id, timestamp, latency_ms, success, timed_out FROM samples WHERE session_id = ? ORDER BY timestamp ASC',
    [sessionId],
  );
  return rows.map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    timestamp: r.timestamp,
    latencyMs: r.latency_ms,
    success: !!r.success,
    timedOut: !!r.timed_out,
  }));
}

export async function deleteSession(sessionId: number) {
  const d = await getDb();
  await d.runAsync('DELETE FROM samples WHERE session_id = ?', [sessionId]);
  await d.runAsync('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

export function hopsToCsv(hops: RouteHop[]) {
  const header = 'hop,host,ip,avgLatency,lossPct';
  const lines = hops.map((h) => `${h.hop},${h.host},${h.ip},${h.avgLatency ?? ''},${h.lossPct}`);
  return [header, ...lines].join('\n');
}

export function samplesToCsv(samples: Sample[]) {
  const header = 'timestamp,latencyMs,success,timedOut';
  const lines = samples.map((s) => `${s.timestamp},${s.latencyMs ?? ''},${s.success ? 1 : 0},${s.timedOut ? 1 : 0}`);
  return [header, ...lines].join('\n');
}
