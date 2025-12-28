import { Router, Request, Response } from 'express';
import { runMonteCarloSimulation } from '../engine/monte-carlo.js';
import { validateRequest, checkCapacityWarning } from './validation.js';
import {
  SimulationResponse,
  SimulationMetadata,
  ErrorResponse,
  ENGINE_VERSION,
  DEFAULT_CONFIG,
  Scenario,
  SimulationConfig
} from '../types/index.js';

export const router = Router();

// Request timeout (30 seconds)
const REQUEST_TIMEOUT_MS = 30000;

/**
 * POST /v1/simulate
 * Run parking simulation for one or more scenarios
 */
router.post('/v1/simulate', async (req: Request, res: Response) => {
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

  // Check for capacity warnings (logged but doesn't block)
  const warning = checkCapacityWarning(validation.data!);
  if (warning) {
    console.warn('Capacity warning:', warning);
  }

  // Set up timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, REQUEST_TIMEOUT_MS);
  });

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

    // Run simulation with timeout
    const results = await Promise.race([
      runMonteCarloSimulation(internalScenarios, config),
      timeoutPromise
    ]);

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

    // Include warning in response if present
    if (warning) {
      (response as any).warning = warning;
    }

    return res.json(response);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'TIMEOUT') {
      const errorResponse: ErrorResponse = {
        error: {
          code: 'TIMEOUT',
          message: 'Simulation exceeded time limit'
        }
      };
      return res.status(408).json(errorResponse);
    }

    console.error('Simulation error:', error);
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected engine failure'
      }
    };
    return res.status(500).json(errorResponse);
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    engine_version: ENGINE_VERSION,
    timestamp: new Date().toISOString()
  });
});
