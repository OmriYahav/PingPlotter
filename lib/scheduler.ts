export function startDriftCorrectedScheduler(intervalMs: number, tick: () => Promise<void> | void) {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let nextAt = Date.now() + intervalMs;
  let inFlight = false;

  const run = async () => {
    if (cancelled) return;
    const now = Date.now();
    if (!inFlight) {
      inFlight = true;
      try {
        await tick();
      } finally {
        inFlight = false;
      }
    }
    while (nextAt <= now) nextAt += intervalMs;
    const delay = Math.max(0, nextAt - Date.now());
    timer = setTimeout(run, delay);
  };

  timer = setTimeout(run, intervalMs);

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
