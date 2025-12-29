# Parking Flow Simulator

A deterministic, auditable simulation engine to evaluate parking lot designs under varying demand, capacity, and exit configurations.

## Features

- **Discrete-Event Simulation**: Accurate modeling of parking dynamics using DES
- **Non-Homogeneous Poisson Arrivals**: Time-varying arrival rates with configurable peak periods
- **M/M/c Queue Models**: Realistic entry and exit queue behavior
- **Monte Carlo Execution**: Multiple iterations with bootstrap confidence intervals
- **Bottleneck Classification**: Automatic identification of capacity vs exit constraints
- **Multi-Scenario Comparison**: Side-by-side analysis with sortable metrics table

## Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

## Quick Start

```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Start development servers (API on :3001, Frontend on :3000)
npm run dev
```

Then open http://localhost:3000 in your browser.

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/rashidazarang/parking-lot-design-simulator.git
cd parking-lot-design-simulator

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Environment Setup (Optional)

Create a `.env` file in the `frontend` directory:

```bash
cp frontend/.env.example frontend/.env
```

Default configuration:
```
VITE_API_BASE_URL=http://localhost:3001
```

## Development

### Run Both Servers (Recommended)

```bash
npm run dev
```

This starts:
- **API Server**: http://localhost:3001
- **Frontend**: http://localhost:3000

### Run Servers Separately

```bash
# Terminal 1: API Server
npm run dev:api

# Terminal 2: Frontend
npm run dev:frontend
```

### Run Tests

```bash
# Backend tests
npm test

# Frontend tests
npm run test:frontend

# Watch mode
npm run test:watch
```

## Production Build

```bash
# Build everything
npm run build:all

# Start production server
npm start
```

For production, serve the frontend from `frontend/dist` using a static file server (nginx, Vercel, etc.) and point it to the API server.

## Project Structure

```
parking-simulator/
├── src/                    # Backend source
│   ├── engine/             # Simulation engine
│   │   ├── pcg.ts          # PCG-64 random number generator
│   │   ├── simulation.ts   # Discrete-event simulation
│   │   └── monte-carlo.ts  # Monte Carlo runner
│   ├── api/                # REST API
│   │   ├── routes.ts       # Express routes
│   │   └── validation.ts   # Zod input validation
│   ├── types/              # TypeScript types
│   └── index.ts            # API server entry
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/          # Zustand state management
│   │   ├── lib/            # Utilities and API client
│   │   └── App.tsx         # Main application
│   └── ...
├── tests/                  # Backend tests
└── docs/                   # Documentation
```

## API Reference

### POST /v1/simulate

Run parking simulation for one or more scenarios.

**Request:**
```json
{
  "scenarios": [{
    "name": "baseline",
    "demand": {
      "arrival_rate_per_hour": 120,
      "peak_multiplier": 1.5,
      "peak_start_minute": 0,
      "peak_duration_minutes": 60
    },
    "capacity": {
      "floors": 4,
      "spots_per_floor": 60
    },
    "parking_duration": {
      "mean_minutes": 90,
      "variability": "MEDIUM"
    },
    "entry": {
      "channels": 2,
      "mean_service_time_seconds": 10
    },
    "exit": {
      "channels": 2,
      "mean_service_time_seconds": 15
    }
  }],
  "config": {
    "iterations": 500,
    "master_seed": 42,
    "thresholds": {
      "rejection_rate": 0.05,
      "exit_p95_sla_minutes": 3.0
    }
  }
}
```

**Response:**
```json
{
  "results": [{
    "scenario_name": "baseline",
    "capacity": 240,
    "metrics": {
      "avg_occupancy_pct": 0.78,
      "rejection_rate": 0.031,
      "exit_wait": {
        "p95_minutes": 2.3,
        "p95_ci": [2.1, 2.5]
      }
    },
    "bottleneck": "NONE",
    "passed": true
  }],
  "metadata": {
    "engine_version": "1.0.0",
    "execution_time_ms": 1842
  }
}
```

### GET /health

Health check endpoint.

## Configuration Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `iterations` | 500 | Number of Monte Carlo runs |
| `master_seed` | 42 | RNG seed for reproducibility |
| `warm_up_minutes` | 30 | Warm-up period (excluded from metrics) |
| `rejection_rate` | 0.05 | Threshold for capacity bottleneck |
| `exit_p95_sla_minutes` | 3.0 | Threshold for exit bottleneck |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
