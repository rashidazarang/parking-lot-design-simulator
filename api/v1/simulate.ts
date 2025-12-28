import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runMonteCarloSimulation } from '../../src/engine/monte-carlo.js';
import { validateRequest, checkCapacityWarning } from '../../src/api/validation.js';
import type { SimulationResponse, SimulationMetadata, ErrorResponse, Scenario, SimulationConfig } from '../../src/types/index.js';

const ENGINE_VERSION = '1.0.0';
const DEFAULT_CONFIG: SimulationConfig = {
  iterations: 500,
  master_seed: 42,
  warm_up_minutes: 30,
  stabilization_buffer_minutes: 60,
  thresholds: {
    rejection_rate: 0.05,
    exit_p95_sla_minutes: 3.0
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } });
  }

  const startTime = Date.now();

  // Validate request
  const validation = validateRequest(req.body);

  if (!validation.success) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters',
        details: validation.errors
      }
    };
    return res.status(400).json(errorResponse);
  }

  const { scenarios, config: partialConfig } = validation.data!;

  // Merge with defaults
  const config: SimulationConfig = {
    ...DEFAULT_CONFIG,
    ...partialConfig,
    thresholds: {
      ...DEFAULT_CONFIG.thresholds,
      ...partialConfig?.thresholds
    }
  };

  // Check for capacity warnings
  const warning = checkCapacityWarning(validation.data!);

  try {
    // Convert request scenarios to internal format
    const internalScenarios: Scenario[] = scenarios.map(s => ({
      name: s.name,
      demand: s.demand,
      capacity: s.capacity,
      parking_duration: s.parking_duration,
      entry: s.entry,
      exit: s.exit
    }));

    // Run simulation
    const results = await runMonteCarloSimulation(internalScenarios, config);

    const executionTime = Date.now() - startTime;

    // Build metadata
    const metadata: SimulationMetadata = {
      engine_version: ENGINE_VERSION,
      rng_algorithm: 'PCG-64',
      master_seed: config.master_seed,
      iterations: config.iterations,
      warm_up_minutes: config.warm_up_minutes,
      timestamp_utc: new Date().toISOString(),
      execution_time_ms: executionTime
    };

    const response: SimulationResponse = {
      results,
      metadata
    };

    if (warning) {
      (response as any).warning = warning;
    }

    return res.json(response);

  } catch (error) {
    console.error('Simulation error:', error);
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected engine failure'
      }
    };
    return res.status(500).json(errorResponse);
  }
}
