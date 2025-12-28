import { z } from 'zod';
import { ValidationErrorDetail } from '../types/index.js';

// Variability level enum
const VariabilityLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

// Demand parameters schema
const DemandSchema = z.object({
  arrival_rate_per_hour: z.number().positive('Must be a positive number'),
  peak_multiplier: z.number().min(1.0, 'Peak multiplier must be at least 1.0'),
  peak_start_minute: z.number().int().min(0, 'Must be a non-negative integer'),
  peak_duration_minutes: z.number().positive('Must be a positive number')
});

// Capacity parameters schema
const CapacitySchema = z.object({
  floors: z.number().int().min(1, 'Must be at least 1 floor'),
  spots_per_floor: z.number().int().min(1, 'Must be at least 1 spot per floor')
});

// Parking duration parameters schema
const ParkingDurationSchema = z.object({
  mean_minutes: z.number().positive('Must be a positive number'),
  variability: VariabilityLevelSchema
});

// Entry parameters schema
const EntrySchema = z.object({
  channels: z.number().int().min(1, 'Must have at least 1 entry channel'),
  mean_service_time_seconds: z.number().positive('Must be a positive number')
});

// Exit parameters schema
const ExitSchema = z.object({
  channels: z.number().int().min(1, 'Must have at least 1 exit channel'),
  mean_service_time_seconds: z.number().positive('Must be a positive number')
});

// Scenario schema
const ScenarioSchema = z.object({
  name: z.string().min(1, 'Scenario name is required'),
  demand: DemandSchema,
  capacity: CapacitySchema,
  parking_duration: ParkingDurationSchema,
  entry: EntrySchema,
  exit: ExitSchema
});

// Thresholds schema
const ThresholdsSchema = z.object({
  rejection_rate: z.number().min(0).max(1).default(0.05),
  exit_p95_sla_minutes: z.number().positive().default(3.0)
});

// Config schema
const ConfigSchema = z.object({
  iterations: z.number().int().min(1).max(2000, 'Iterations must be between 1 and 2000').default(500),
  master_seed: z.number().int().default(42),
  warm_up_minutes: z.number().min(0).default(30),
  stabilization_buffer_minutes: z.number().min(0).default(60),
  thresholds: ThresholdsSchema.default({})
}).default({});

// Complete request schema
export const SimulationRequestSchema = z.object({
  scenarios: z.array(ScenarioSchema)
    .min(1, 'At least one scenario is required')
    .max(10, 'Maximum 10 scenarios allowed'),
  config: ConfigSchema
});

// Type inference
export type ValidatedRequest = z.infer<typeof SimulationRequestSchema>;

/**
 * Validate simulation request
 */
export function validateRequest(data: unknown): {
  success: boolean;
  data?: ValidatedRequest;
  errors?: ValidationErrorDetail[];
} {
  const result = SimulationRequestSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Convert Zod errors to our format
  const errors: ValidationErrorDetail[] = result.error.issues.map(issue => ({
    field: issue.path.join('.'),
    reason: issue.message,
    value: undefined
  }));

  return { success: false, errors };
}

/**
 * Check for capacity warning
 * Returns warning message if peak arrivals may exceed capacity
 */
export function checkCapacityWarning(request: ValidatedRequest): string | null {
  const warnings: string[] = [];

  for (const scenario of request.scenarios) {
    const peakRate = scenario.demand.arrival_rate_per_hour * scenario.demand.peak_multiplier;
    const peakArrivals = (peakRate / 60) * scenario.demand.peak_duration_minutes;
    const totalCapacity = scenario.capacity.floors * scenario.capacity.spots_per_floor;

    if (peakArrivals > totalCapacity * 0.8) {
      warnings.push(
        `Scenario "${scenario.name}": Peak arrivals may exceed 80% of capacity. ` +
        `Consider increasing capacity or reducing peak duration.`
      );
    }
  }

  return warnings.length > 0 ? warnings.join('\n') : null;
}
