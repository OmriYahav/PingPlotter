import { Sample, Stats } from './types';

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export function computeStats(samples: Sample[]): Stats {
  if (!samples.length) {
    return { current: null, avg: null, min: null, max: null, p95: null, jitter: null, lossPct: 0 };
  }
  const successful = samples.filter((s) => s.success && s.latencyMs !== null).map((s) => s.latencyMs as number);
  const losses = samples.length - successful.length;
  const current = samples[samples.length - 1]?.latencyMs ?? null;
  const avg = successful.length ? successful.reduce((a, b) => a + b, 0) / successful.length : null;
  const min = successful.length ? Math.min(...successful) : null;
  const max = successful.length ? Math.max(...successful) : null;
  const p95 = percentile(successful, 95);

  let jitter: number | null = null;
  if (successful.length > 1) {
    let sum = 0;
    for (let i = 1; i < successful.length; i += 1) {
      sum += Math.abs(successful[i] - successful[i - 1]);
    }
    jitter = sum / (successful.length - 1);
  }

  return { current, avg, min, max, p95, jitter, lossPct: (losses / samples.length) * 100 };
}

export function windowSamples(samples: Sample[], ms: number) {
  const cutoff = Date.now() - ms;
  return samples.filter((s) => s.timestamp >= cutoff);
}
