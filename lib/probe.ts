import { Sample, TargetMode } from './types';

async function probeHttp(target: string, timeoutMs: number): Promise<Sample> {
  const controller = new AbortController();
  const t0 = Date.now();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(target, { method: 'GET', signal: controller.signal, cache: 'no-store' });
    const latency = Date.now() - t0;
    return { timestamp: Date.now(), latencyMs: latency, success: true, timedOut: false };
  } catch {
    const timedOut = Date.now() - t0 >= timeoutMs;
    return { timestamp: Date.now(), latencyMs: null, success: false, timedOut };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function probeWs(target: string, timeoutMs: number): Promise<Sample> {
  return new Promise((resolve) => {
    const socket = new WebSocket(target);
    const t0 = Date.now();
    let settled = false;
    const payload = JSON.stringify({ ts: t0, nonce: Math.random().toString(16).slice(2) });

    const finish = (success: boolean, timedOut: boolean) => {
      if (settled) return;
      settled = true;
      const latency = success ? Date.now() - t0 : null;
      resolve({ timestamp: Date.now(), latencyMs: latency, success, timedOut });
      socket.close();
    };

    const timer = setTimeout(() => finish(false, true), timeoutMs);

    socket.onopen = () => socket.send(payload);
    socket.onmessage = () => {
      clearTimeout(timer);
      finish(true, false);
    };
    socket.onerror = () => {
      clearTimeout(timer);
      finish(false, false);
    };
    socket.onclose = () => clearTimeout(timer);
  });
}

export async function runProbe(mode: TargetMode, target: string, timeoutMs: number) {
  return mode === 'http' ? probeHttp(target, timeoutMs) : probeWs(target, timeoutMs);
}
