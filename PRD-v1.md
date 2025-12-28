# Product Requirements Document (PRD)

## Parking Flow Simulator

**Parking Capacity & Exit Queue Simulator**

**Version:** 1.0
**Last Updated:** 2025-01-15

---

## Purpose

Provide a deterministic, auditable simulation engine to evaluate parking lot designs under varying demand, capacity, and exit configurations, with a minimal interface and statistically sound outputs.

The system is designed to support architectural and operational decisions, not visualization or forecasting.

---

## Goals

1. Evaluate whether a parking design meets capacity and exit performance constraints.
2. Quantify exit queue behavior using percentile-based metrics with confidence intervals.
3. Compare multiple design scenarios side-by-side.
4. Ensure reproducibility and auditability of results.

---

## Non-Goals

- No real-time monitoring.
- No predictive analytics or ML.
- No 3D or spatial visualization.
- No UI-driven optimization or auto-tuning in v1.
- No user authentication or persistence beyond session storage.
- No multi-entry or multi-exit spatial modeling in v1.

---

## Target User

- Engineers
- Architects
- Operations planners
- Developers validating infrastructure assumptions

---

## Success Criteria

A scenario is considered successful if:

- Rejection rate is below a configurable threshold (default: 5%).
- Exit wait time p95 is below a configurable SLA (default: 3 minutes).
- The system identifies the dominant bottleneck correctly.

---

## Functional Requirements

### 1. Scenario Input Model

The system must accept a complete scenario definition as structured input.

#### 1.1 Demand Parameters

| Parameter | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `arrival_rate_per_hour` | float | Base arrival rate during non-peak periods | > 0 |
| `peak_multiplier` | float | Multiplier applied to arrival rate during peak | >= 1.0 |
| `peak_start_minute` | integer | Minute offset when peak period begins | >= 0 |
| `peak_duration_minutes` | integer | Duration of peak demand period | > 0 |

**Arrival Pattern:** Arrivals follow a non-homogeneous Poisson process:
- Base rate: `arrival_rate_per_hour` outside peak period
- Peak rate: `arrival_rate_per_hour × peak_multiplier` during peak period
- Transitions are instantaneous (step function)

#### 1.2 Capacity Parameters

| Parameter | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `floors` | integer | Number of parking floors | >= 1 |
| `spots_per_floor` | integer | Parking spots per floor | >= 1 |

**Total capacity** = `floors × spots_per_floor`

#### 1.3 Parking Duration Parameters

| Parameter | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `mean_parking_duration_minutes` | float | Expected parking duration | > 0 |
| `variability_level` | enum | Controls duration distribution spread | LOW, MEDIUM, HIGH |

**Variability Mapping:**

Parking duration follows a **lognormal distribution** with parameters derived from:

| Level | Coefficient of Variation (CV) | σ (lognormal) | Interpretation |
|-------|------------------------------|---------------|----------------|
| LOW | 0.3 | 0.294 | Predictable durations (e.g., employee parking) |
| MEDIUM | 0.6 | 0.555 | Moderate variance (e.g., retail parking) |
| HIGH | 1.0 | 0.833 | High variance (e.g., event parking) |

Where: `σ = sqrt(ln(1 + CV²))` and `μ = ln(mean) - σ²/2`

#### 1.4 Entry Parameters

| Parameter | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `entry_channels` | integer | Number of parallel entry lanes | >= 1 |
| `mean_entry_service_time_seconds` | float | Average time to process entry | > 0 |

**Entry Queue Behavior:**
- Entry follows an M/M/c queue model
- Vehicles queue if all entry channels are busy
- No balking or reneging in v1

#### 1.5 Exit Parameters

| Parameter | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `exit_channels` | integer | Number of parallel exit lanes | >= 1 |
| `mean_exit_service_time_seconds` | float | Average time to process exit (payment, barrier) | > 0 |

**Exit Queue Behavior:**
- Exit follows an M/M/c queue model
- FIFO discipline
- No balking or reneging

#### 1.6 Rejection Behavior

When lot reaches full capacity:
- Arriving vehicles are **immediately rejected** (no entry queue overflow)
- Rejection is recorded as an event
- Vehicle does not retry

---

### 2. Simulation Engine

#### 2.1 Core Model

- **Architecture:** Discrete-event simulation (DES)
- **Arrival process:** Non-homogeneous Poisson (time-varying rate)
- **Entry service:** Exponential service times, M/M/c queue
- **Parking duration:** Lognormal distribution (per variability level)
- **Exit service:** Exponential service times, M/M/c queue

#### 2.2 Time Handling

| Parameter | Value | Description |
|-----------|-------|-------------|
| Time unit | Minutes | All durations expressed in minutes |
| Event resolution | Continuous | Events processed in floating-point time |
| Warm-up period | 30 minutes (configurable) | Excluded from metric collection |
| Stabilization buffer | 60 minutes | Added after peak to capture exit queue drain |

**Total simulated duration** = `warm_up + peak_start + peak_duration + stabilization_buffer`

Warm-up period allows the system to reach steady state before metrics collection begins.

#### 2.3 Monte Carlo Execution

| Parameter | Default | Description |
|-----------|---------|-------------|
| `iterations` | 500 | Number of independent simulation runs |
| `master_seed` | 42 | Base seed for reproducibility |

**Seed Strategy:**
- Run `i` uses seed: `master_seed + i`
- RNG Algorithm: **PCG-64** (Permuted Congruential Generator)
- Each run is statistically independent

**Aggregation:**
- Metrics aggregated across all runs
- Point estimates: mean of run-level metrics
- Percentiles: computed from pooled observations across runs
- Confidence intervals: 95% CI using bootstrap (1000 resamples)

---

### 3. Metrics Computed

#### 3.1 Capacity Metrics

| Metric | Description |
|--------|-------------|
| `avg_occupancy_pct` | Mean occupancy as fraction of capacity |
| `max_occupancy` | Peak number of vehicles parked simultaneously |
| `pct_time_full` | Fraction of time lot was at 100% capacity |
| `rejection_rate` | Rejected arrivals / total arrivals |
| `rejection_rate_ci` | 95% confidence interval for rejection rate |

#### 3.2 Entry Queue Metrics

| Metric | Description |
|--------|-------------|
| `entry_wait_avg_seconds` | Mean wait time in entry queue |
| `entry_wait_p95_seconds` | 95th percentile entry wait |
| `entry_queue_max` | Maximum entry queue length observed |

#### 3.3 Exit Queue Metrics

| Metric | Description |
|--------|-------------|
| `exit_wait_avg_minutes` | Mean wait time in exit queue |
| `exit_wait_p90_minutes` | 90th percentile exit wait |
| `exit_wait_p95_minutes` | 95th percentile exit wait |
| `exit_wait_p95_ci` | 95% confidence interval for p95 |
| `exit_wait_p99_minutes` | 99th percentile exit wait |
| `exit_queue_max` | Maximum exit queue length observed |
| `exit_queue_avg` | Average exit queue length |

#### 3.4 Throughput Metrics

| Metric | Description |
|--------|-------------|
| `arrivals_total` | Total vehicles that arrived |
| `exits_total` | Total vehicles that exited |
| `throughput_per_hour` | Average exits per hour (excluding warm-up) |

---

### 4. Bottleneck Classification

The system classifies the dominant constraint as:

| Classification | Condition |
|----------------|-----------|
| `NONE` | Rejection rate ≤ threshold AND exit p95 ≤ SLA |
| `ENTRY` | Rejection rate > threshold AND exit p95 ≤ SLA |
| `EXIT` | Rejection rate ≤ threshold AND exit p95 > SLA |
| `BOTH` | Rejection rate > threshold AND exit p95 > SLA |

**Default Thresholds:**

| Threshold | Default | Configurable |
|-----------|---------|--------------|
| `rejection_rate_threshold` | 0.05 (5%) | Yes |
| `exit_p95_sla_minutes` | 3.0 | Yes |

---

### 5. Scenario Comparison

- User can define up to **10 scenarios** per request
- Each scenario is simulated independently (parallelizable)
- Results are returned in request order
- No automatic ranking or optimization in v1
- Comparison table highlights which scenarios pass/fail thresholds

---

## Output Specification

### 6.1 Summary Output (per scenario)

```json
{
  "scenario_name": "baseline",
  "capacity": 240,
  "metrics": {
    "avg_occupancy_pct": 0.78,
    "max_occupancy": 238,
    "pct_time_full": 0.12,
    "rejection_rate": 0.031,
    "rejection_rate_ci": [0.025, 0.038],
    "entry_wait": {
      "avg_seconds": 8.2,
      "p95_seconds": 22.1,
      "queue_max": 4
    },
    "exit_wait": {
      "avg_minutes": 1.1,
      "p90_minutes": 1.9,
      "p95_minutes": 2.3,
      "p95_ci": [2.1, 2.5],
      "p99_minutes": 4.8,
      "queue_max": 14,
      "queue_avg": 3.2
    },
    "throughput_per_hour": 118
  },
  "bottleneck": "NONE",
  "passed": true
}
```

### 6.2 Reproducibility Metadata

```json
{
  "engine_version": "1.0.0",
  "rng_algorithm": "PCG-64",
  "master_seed": 42,
  "iterations": 500,
  "warm_up_minutes": 30,
  "timestamp_utc": "2025-01-15T14:32:00Z",
  "execution_time_ms": 1842
}
```

---

## API Specification

### Endpoint

```
POST /simulate
```

### Request Schema

```json
{
  "scenarios": [
    {
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
    }
  ],
  "config": {
    "iterations": 500,
    "master_seed": 42,
    "warm_up_minutes": 30,
    "thresholds": {
      "rejection_rate": 0.05,
      "exit_p95_sla_minutes": 3.0
    }
  }
}
```

### Success Response

```
HTTP 200 OK
Content-Type: application/json

{
  "results": [ ... ],
  "metadata": { ... }
}
```

### Error Response Schema

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "scenarios[0].demand.arrival_rate_per_hour",
        "reason": "Must be greater than 0",
        "value": -5
      }
    ]
  }
}
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input parameters |
| `SCENARIO_LIMIT_EXCEEDED` | 400 | More than 10 scenarios |
| `TIMEOUT` | 408 | Simulation exceeded time limit |
| `INTERNAL_ERROR` | 500 | Unexpected engine failure |

### Request Limits

| Limit | Value |
|-------|-------|
| Max scenarios per request | 10 |
| Max iterations | 2000 |
| Request timeout | 30 seconds |
| Max request body size | 64 KB |

---

## UI Requirements

### General

- Single-page layout
- No animations
- Responsive down to 1024px width
- Keyboard-accessible form controls

### Input Panel

Inputs grouped into collapsible sections:

1. **Demand** — arrival rate, peak multiplier, peak timing
2. **Capacity** — floors, spots per floor
3. **Parking Duration** — mean duration, variability dropdown
4. **Entry** — channels, service time
5. **Exit** — channels, service time
6. **Simulation Config** — iterations, seed, thresholds

All numeric inputs show explicit units (e.g., "vehicles/hour", "seconds").

### Output Panel

**Headline Metrics (large, prominent):**

| Metric | Display |
|--------|---------|
| Capacity Status | ✓ OK / ✗ OVER (based on rejection threshold) |
| Exit p95 Wait | Value in minutes with pass/fail indicator |
| Bottleneck | NONE / ENTRY / EXIT / BOTH with color coding |

**Detailed Metrics Table:**
- Compact table per scenario
- Sortable columns
- Failing metrics highlighted in red
- Confidence intervals shown on hover

### Scenario Comparison View

- Side-by-side cards (2-3 visible)
- Horizontal scroll for additional scenarios
- Diff highlighting for changed parameters

---

## Validation Rules

### Input Constraints

| Field | Rule | Error Message |
|-------|------|---------------|
| All numeric inputs | > 0 | "Must be a positive number" |
| `peak_multiplier` | >= 1.0 | "Peak multiplier must be at least 1.0" |
| `floors` | >= 1, integer | "Must be at least 1 floor" |
| `spots_per_floor` | >= 1, integer | "Must be at least 1 spot per floor" |
| `entry_channels` | >= 1, integer | "Must have at least 1 entry channel" |
| `exit_channels` | >= 1, integer | "Must have at least 1 exit channel" |
| `variability` | enum | "Must be LOW, MEDIUM, or HIGH" |
| `iterations` | 1-2000, integer | "Iterations must be between 1 and 2000" |

### Capacity Warning

If `peak_arrival_rate × peak_duration > capacity × 0.8`, display warning:
> "Peak arrivals may exceed 80% of capacity. Consider increasing capacity or reducing peak duration."

This is a **warning only** — simulation proceeds.

### Validation Behavior

- Invalid input blocks simulation
- All validation errors returned at once (not fail-fast)
- UI shows inline validation errors per field

---

## Performance Requirements

| Scenario | Target |
|----------|--------|
| Single scenario, 500 iterations | < 2 seconds |
| 5 parallel scenarios, 500 iterations each | < 5 seconds |
| 10 scenarios, 500 iterations each | < 10 seconds |

Engine must support headless execution for CI/testing.

---

## Technical Constraints

- Simulation engine must be **stateless**
- No shared global state between runs
- **Deterministic outputs** for identical inputs + seed
- Code must be testable without UI
- Engine and API must be deployable independently of frontend

---

## Testing Requirements

### Unit Tests

- Event scheduling correctness
- Queue discipline (FIFO)
- Lognormal distribution parameter derivation
- Bottleneck classification logic

### Statistical Tests

- Little's Law validation: `L = λW` (queue length = arrival rate × wait time)
- Verify rejection rate converges with increasing iterations
- Chi-squared test for Poisson arrival distribution
- Kolmogorov-Smirnov test for parking duration distribution

### Reproducibility Tests

- Same seed produces identical metrics
- Different seeds produce statistically different results
- Cross-platform reproducibility (PCG-64 is portable)

### Edge Case Tests

| Case | Expected Behavior |
|------|-------------------|
| Zero arrivals | All metrics zero, no errors |
| Capacity = 1 | Valid simulation, high rejection expected |
| Exit channels = 1, high load | Long exit queues, EXIT bottleneck |
| Peak multiplier = 1.0 | No peak effect, constant arrival rate |
| Very short peak (1 min) | Minimal impact on metrics |

### Integration Tests

- API request/response contract
- Error response format
- Timeout handling
- Concurrent request handling

---

## Versioning

| Component | Version Strategy |
|-----------|------------------|
| Engine | Semantic versioning (e.g., 1.0.0) |
| API | URL path versioning (e.g., `/v1/simulate`) |
| Input schema | Explicit version field in request |

**Breaking changes** require major version increment.

Engine version included in every response for audit trail.

---

## Glossary

| Term | Definition |
|------|------------|
| M/M/c queue | Markovian queue with Poisson arrivals, exponential service, c servers |
| DES | Discrete-event simulation |
| PCG | Permuted Congruential Generator (fast, statistically robust RNG) |
| CV | Coefficient of variation (σ/μ) |
| p95 | 95th percentile |
| SLA | Service level agreement (target threshold) |
| CI | Confidence interval |
| Warm-up | Initial simulation period excluded from metrics |

---

## Open Questions (Deferred to v2)

- Cost modeling (revenue, operational costs)
- Dynamic pricing simulation
- Historical data calibration
- Multi-entry / multi-exit with routing
- Time-of-day arrival profiles (beyond single peak)
- Vehicle type differentiation (compact, standard, oversized)
- Reservation system modeling

---

## Definition of Done

- [ ] All metrics computed correctly per specification
- [ ] Results reproducible across runs with same seed
- [ ] Bottleneck classification deterministic and correct
- [ ] 95% confidence intervals computed for key metrics
- [ ] UI reflects engine outputs exactly
- [ ] API returns proper error responses for all validation failures
- [ ] Performance targets met
- [ ] All tests passing
- [ ] No undocumented assumptions in code

---

## Appendix A: Mathematical Reference

### Lognormal Distribution Parameters

Given desired mean `m` and coefficient of variation `CV`:

```
σ² = ln(1 + CV²)
μ = ln(m) - σ²/2
```

Random variate: `X = exp(μ + σ × Z)` where `Z ~ N(0,1)`

### Little's Law Validation

For a stable queue:
```
L = λ × W
```
Where:
- `L` = average number in system
- `λ` = arrival rate
- `W` = average time in system

Use this to validate simulation correctness.

### M/M/c Queue Steady-State

Traffic intensity: `ρ = λ / (c × μ)`

System is stable if `ρ < 1`.

If `ρ >= 1`, queue grows unboundedly — simulation should flag this condition.

---

## Appendix B: Default Configuration

```json
{
  "iterations": 500,
  "master_seed": 42,
  "warm_up_minutes": 30,
  "stabilization_buffer_minutes": 60,
  "thresholds": {
    "rejection_rate": 0.05,
    "exit_p95_sla_minutes": 3.0
  },
  "rng_algorithm": "PCG-64",
  "bootstrap_resamples": 1000
}
```
