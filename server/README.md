# PingPlotter Backend

## Features
- `GET /health` for availability checks.
- `GET /traceroute?target=host` runs OS traceroute command and parses hops best-effort.
- `WS /ws-ping` echoes payload immediately.

## Run
```bash
cd server
npm install
npm start
```

Server listens on `http://localhost:3001`.

## Notes on traceroute parsing
- Output formats vary by OS and locale.
- Linux/macOS parsing expects `traceroute -n` style lines.
- Windows parsing uses `tracert -d` and may produce partial hop fields depending on output.
- Packet loss per hop is inferred only when hop line contains `*`; this is approximate.
