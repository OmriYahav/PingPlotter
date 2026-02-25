import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { exec } from 'node:child_process';
import os from 'node:os';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

function tracerouteCommand(target) {
  const platform = os.platform();
  if (platform === 'win32') return `tracert -d ${target}`;
  if (platform === 'darwin') return `traceroute -n ${target}`;
  return `traceroute -n ${target}`;
}

function parseTraceroute(stdout) {
  const lines = stdout.split('\n');
  const hops = [];
  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\s+(.+)$/);
    if (!match) continue;
    const hop = Number(match[1]);
    const rest = match[2].trim();
    if (rest.includes('*')) {
      hops.push({ hop, host: '', ip: '', avgLatency: null, lossPct: 100 });
      continue;
    }
    const ip = (rest.match(/(\d+\.\d+\.\d+\.\d+)/) || [])[1] || '';
    const msMatches = [...rest.matchAll(/(\d+(?:\.\d+)?)\s*ms/g)].map((m) => Number(m[1]));
    const avgLatency = msMatches.length ? msMatches.reduce((a, b) => a + b, 0) / msMatches.length : null;
    hops.push({ hop, host: ip, ip, avgLatency, lossPct: 0 });
  }
  return hops;
}

app.get('/traceroute', (req, res) => {
  const target = String(req.query.target || '').trim();
  if (!target) return res.status(400).json({ error: 'target is required' });

  exec(tracerouteCommand(target), { timeout: 30_000 }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'traceroute failed', details: stderr || error.message, hops: [] });
    }
    const hops = parseTraceroute(stdout);
    return res.json({ hops, raw: stdout });
  });
});

const server = app.listen(3001, () => {
  console.log('Backend listening on http://localhost:3001');
});

const wss = new WebSocketServer({ server, path: '/ws-ping' });
wss.on('connection', (socket) => {
  socket.on('message', (data) => {
    socket.send(data.toString());
  });
});
