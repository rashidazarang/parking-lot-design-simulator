// Variability levels for parking duration
export type VariabilityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

// Bottleneck classification
export type BottleneckType = 'NONE' | 'ENTRY' | 'EXIT' | 'BOTH';

// Demand parameters
export interface DemandParams {
  arrival_rate_per_hour: number;
  peak_multiplier: number;
  peak_start_minute: number;
  peak_duration_minutes: number;
}

// Capacity parameters
export interface CapacityParams {
  floors: number;
  spots_per_floor: number;
}

// Parking duration parameters
export interface ParkingDurationParams {
  mean_minutes: number;
  variability: VariabilityLevel;
}

// Entry parameters
export interface EntryParams {
  channels: number;
  mean_service_time_seconds: number;
}

// Exit parameters
export interface ExitParams {
  channels: number;
  mean_service_time_seconds: number;
}

// Complete scenario definition
export interface Scenario {
  name: string;
  demand: DemandParams;
  capacity: CapacityParams;
  parking_duration: ParkingDurationParams;
  entry: EntryParams;
  exit: ExitParams;
}

// Thresholds for pass/fail determination
export interface Thresholds {
  rejection_rate: number;
  exit_p95_sla_minutes: number;
}

// Simulation configuration
export interface SimulationConfig {
  iterations: number;
  master_seed: number;
  warm_up_minutes: number;
  stabilization_buffer_minutes: number;
  thresholds: Thresholds;
}

// Simulation request
export interface SimulationRequest {
  scenarios: Scenario[];
  config?: Partial<SimulationConfig>;
}

// Entry wait metrics
export interface EntryWaitMetrics {
  avg_seconds: number;
  p95_seconds: number;
  queue_max: number;
}

// Exit wait metrics
export interface ExitWaitMetrics {
  avg_minutes: number;
  p90_minutes: number;
  p95_minutes: number;
  p95_ci: [number, number];
  p99_minutes: number;
  queue_max: number;
  queue_avg: number;
}

// Complete metrics for a scenario
export interface ScenarioMetrics {
  avg_occupancy_pct: number;
  max_occupancy: number;
  pct_time_full: number;
  rejection_rate: number;
  rejection_rate_ci: [number, number];
  entry_wait: EntryWaitMetrics;
  exit_wait: ExitWaitMetrics;
  throughput_per_hour: number;
  arrivals_total: number;
  exits_total: number;
}

// Result for a single scenario
export interface ScenarioResult {
  scenario_name: string;
  capacity: number;
  metrics: ScenarioMetrics;
  bottleneck: BottleneckType;
  passed: boolean;
}

// Reproducibility metadata
export interface SimulationMetadata {
  engine_version: string;
  rng_algorithm: string;
  master_seed: number;
  iterations: number;
  warm_up_minutes: number;
  timestamp_utc: string;
  execution_time_ms: number;
}

// Complete simulation response
export interface SimulationResponse {
  results: ScenarioResult[];
  metadata: SimulationMetadata;
}

// Error detail for validation errors
export interface ValidationErrorDetail {
  field: string;
  reason: string;
  value: unknown;
}

// Error response
export interface ErrorResponse {
  error: {
    code: 'VALIDATION_ERROR' | 'SCENARIO_LIMIT_EXCEEDED' | 'TIMEOUT' | 'INTERNAL_ERROR';
    message: string;
    details?: ValidationErrorDetail[];
  };
}

// Event types for discrete-event simulation
export type EventType = 'ARRIVAL' | 'ENTRY_COMPLETE' | 'EXIT_START' | 'EXIT_COMPLETE';

// Simulation event
export interface SimEvent {
  time: number;
  type: EventType;
  vehicleId: number;
}

// Vehicle state
export interface Vehicle {
  id: number;
  arrivalTime: number;
  entryQueueStartTime?: number;
  entryCompleteTime?: number;
  parkingDuration?: number;
  exitStartTime?: number;
  exitQueueStartTime?: number;
  exitCompleteTime?: number;
  rejected: boolean;
}

// Queue state for metrics
export interface QueueSnapshot {
  time: number;
  length: number;
}

// Single run metrics (raw, not aggregated)
export interface RunMetrics {
  totalArrivals: number;
  totalExits: number;
  rejections: number;
  entryWaitTimes: number[];  // seconds
  exitWaitTimes: number[];   // minutes
  occupancySamples: number[];
  maxOccupancy: number;
  timeAtFullCapacity: number;
  maxEntryQueue: number;
  maxExitQueue: number;
  exitQueueSamples: number[];
}

// Default configuration
export const DEFAULT_CONFIG: SimulationConfig = {
  iterations: 500,
  master_seed: 42,
  warm_up_minutes: 30,
  stabilization_buffer_minutes: 60,
  thresholds: {
    rejection_rate: 0.05,
    exit_p95_sla_minutes: 3.0
  }
};

// Variability to CV mapping
export const VARIABILITY_CV: Record<VariabilityLevel, number> = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 1.0
};

export const ENGINE_VERSION = '1.0.0';
