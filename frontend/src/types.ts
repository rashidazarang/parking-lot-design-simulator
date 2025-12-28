export type VariabilityLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type BottleneckType = 'NONE' | 'ENTRY' | 'EXIT' | 'BOTH';

export interface DemandParams {
  arrival_rate_per_hour: number;
  peak_multiplier: number;
  peak_start_minute: number;
  peak_duration_minutes: number;
}

export interface CapacityParams {
  floors: number;
  spots_per_floor: number;
}

export interface ParkingDurationParams {
  mean_minutes: number;
  variability: VariabilityLevel;
}

export interface EntryParams {
  channels: number;
  mean_service_time_seconds: number;
}

export interface ExitParams {
  channels: number;
  mean_service_time_seconds: number;
}

export interface Scenario {
  name: string;
  demand: DemandParams;
  capacity: CapacityParams;
  parking_duration: ParkingDurationParams;
  entry: EntryParams;
  exit: ExitParams;
}

export interface Thresholds {
  rejection_rate: number;
  exit_p95_sla_minutes: number;
}

export interface SimulationConfig {
  iterations: number;
  master_seed: number;
  warm_up_minutes: number;
  thresholds: Thresholds;
}

export interface SimulationRequest {
  scenarios: Scenario[];
  config: Partial<SimulationConfig>;
}

export interface EntryWaitMetrics {
  avg_seconds: number;
  p95_seconds: number;
  queue_max: number;
}

export interface ExitWaitMetrics {
  avg_minutes: number;
  p90_minutes: number;
  p95_minutes: number;
  p95_ci: [number, number];
  p99_minutes: number;
  queue_max: number;
  queue_avg: number;
}

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

export interface ScenarioResult {
  scenario_name: string;
  capacity: number;
  metrics: ScenarioMetrics;
  bottleneck: BottleneckType;
  passed: boolean;
}

export interface SimulationMetadata {
  engine_version: string;
  rng_algorithm: string;
  master_seed: number;
  iterations: number;
  warm_up_minutes: number;
  timestamp_utc: string;
  execution_time_ms: number;
}

export interface SimulationResponse {
  results: ScenarioResult[];
  metadata: SimulationMetadata;
  warning?: string;
}

export interface ValidationErrorDetail {
  field: string;
  reason: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ValidationErrorDetail[];
  };
}

// Default scenario
export const DEFAULT_SCENARIO: Scenario = {
  name: 'Baseline',
  demand: {
    arrival_rate_per_hour: 120,
    peak_multiplier: 1.5,
    peak_start_minute: 0,
    peak_duration_minutes: 60
  },
  capacity: {
    floors: 4,
    spots_per_floor: 60
  },
  parking_duration: {
    mean_minutes: 90,
    variability: 'MEDIUM'
  },
  entry: {
    channels: 2,
    mean_service_time_seconds: 10
  },
  exit: {
    channels: 2,
    mean_service_time_seconds: 15
  }
};

// Default config
export const DEFAULT_CONFIG: SimulationConfig = {
  iterations: 100,
  master_seed: 42,
  warm_up_minutes: 30,
  thresholds: {
    rejection_rate: 0.05,
    exit_p95_sla_minutes: 3.0
  }
};
