import { useStore } from '../store/useStore';
import { Button, Input, Select, Accordion } from './ui';
import type { VariabilityLevel } from '../types';

const VARIABILITY_OPTIONS = [
  { value: 'LOW', label: 'Low (CV=0.3) - Predictable' },
  { value: 'MEDIUM', label: 'Medium (CV=0.6) - Moderate' },
  { value: 'HIGH', label: 'High (CV=1.0) - Variable' },
];

const TOOLTIPS = {
  arrival_rate: 'Average number of vehicles arriving per hour during non-peak periods. Higher values mean more traffic.',
  peak_multiplier: 'Multiplier applied during peak hours. A value of 2.0 means double the normal arrival rate.',
  peak_duration: 'How long the peak period lasts. Longer peaks stress the system more.',
  mean_parking_duration: 'Average time a vehicle stays parked. Longer durations mean slower turnover.',
  exit_channels: 'Number of parallel exit lanes. More lanes reduce exit queues but cost more.',
  exit_service_time: 'Average time to process an exit (payment, barrier). Faster processing reduces queues.',
};

export function InputPanel() {
  const {
    getActiveScenario,
    updateScenario,
    resetScenarioToDefaults,
    config,
    updateConfig,
    runScenario,
    isRunningAll,
  } = useStore();

  const activeScenarioState = getActiveScenario();
  if (!activeScenarioState) return null;

  const { id, scenario, isRunning, isDirty } = activeScenarioState;

  const updateDemand = (updates: Partial<typeof scenario.demand>) => {
    updateScenario(id, { demand: { ...scenario.demand, ...updates } });
  };

  const updateCapacity = (updates: Partial<typeof scenario.capacity>) => {
    updateScenario(id, { capacity: { ...scenario.capacity, ...updates } });
  };

  const updateParkingDuration = (updates: Partial<typeof scenario.parking_duration>) => {
    updateScenario(id, { parking_duration: { ...scenario.parking_duration, ...updates } });
  };

  const updateEntry = (updates: Partial<typeof scenario.entry>) => {
    updateScenario(id, { entry: { ...scenario.entry, ...updates } });
  };

  const updateExit = (updates: Partial<typeof scenario.exit>) => {
    updateScenario(id, { exit: { ...scenario.exit, ...updates } });
  };

  const updateThresholds = (updates: Partial<typeof config.thresholds>) => {
    updateConfig({ thresholds: { ...config.thresholds, ...updates } });
  };

  const totalCapacity = scenario.capacity.floors * scenario.capacity.spots_per_floor;
  const anyRunning = isRunning || isRunningAll;

  return (
    <div className="space-y-4">
      {/* Demand Section */}
      <Accordion title="Demand">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Arrival Rate"
            unit="vehicles/hour"
            type="number"
            min={1}
            value={scenario.demand.arrival_rate_per_hour}
            onChange={(e) => updateDemand({ arrival_rate_per_hour: Number(e.target.value) })}
            tooltip={TOOLTIPS.arrival_rate}
          />
          <Input
            label="Peak Multiplier"
            type="number"
            min={1}
            step={0.1}
            value={scenario.demand.peak_multiplier}
            onChange={(e) => updateDemand({ peak_multiplier: Number(e.target.value) })}
            tooltip={TOOLTIPS.peak_multiplier}
          />
          <Input
            label="Peak Start"
            unit="minutes"
            type="number"
            min={0}
            value={scenario.demand.peak_start_minute}
            onChange={(e) => updateDemand({ peak_start_minute: Number(e.target.value) })}
          />
          <Input
            label="Peak Duration"
            unit="minutes"
            type="number"
            min={1}
            value={scenario.demand.peak_duration_minutes}
            onChange={(e) => updateDemand({ peak_duration_minutes: Number(e.target.value) })}
            tooltip={TOOLTIPS.peak_duration}
          />
        </div>
      </Accordion>

      {/* Capacity Section */}
      <Accordion title="Capacity">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Floors"
            type="number"
            min={1}
            value={scenario.capacity.floors}
            onChange={(e) => updateCapacity({ floors: Number(e.target.value) })}
          />
          <Input
            label="Spots per Floor"
            type="number"
            min={1}
            value={scenario.capacity.spots_per_floor}
            onChange={(e) => updateCapacity({ spots_per_floor: Number(e.target.value) })}
          />
        </div>
        <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">
            Total Capacity: <span className="font-semibold text-gray-900">{totalCapacity} spots</span>
          </span>
        </div>
      </Accordion>

      {/* Parking Duration Section */}
      <Accordion title="Parking Duration">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Mean Duration"
            unit="minutes"
            type="number"
            min={1}
            value={scenario.parking_duration.mean_minutes}
            onChange={(e) => updateParkingDuration({ mean_minutes: Number(e.target.value) })}
            tooltip={TOOLTIPS.mean_parking_duration}
          />
          <Select
            label="Variability"
            options={VARIABILITY_OPTIONS}
            value={scenario.parking_duration.variability}
            onChange={(e) => updateParkingDuration({ variability: e.target.value as VariabilityLevel })}
          />
        </div>
      </Accordion>

      {/* Entry Section */}
      <Accordion title="Entry">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Channels"
            type="number"
            min={1}
            value={scenario.entry.channels}
            onChange={(e) => updateEntry({ channels: Number(e.target.value) })}
          />
          <Input
            label="Service Time"
            unit="seconds"
            type="number"
            min={1}
            value={scenario.entry.mean_service_time_seconds}
            onChange={(e) => updateEntry({ mean_service_time_seconds: Number(e.target.value) })}
          />
        </div>
      </Accordion>

      {/* Exit Section */}
      <Accordion title="Exit">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Channels"
            type="number"
            min={1}
            value={scenario.exit.channels}
            onChange={(e) => updateExit({ channels: Number(e.target.value) })}
            tooltip={TOOLTIPS.exit_channels}
          />
          <Input
            label="Service Time"
            unit="seconds"
            type="number"
            min={1}
            value={scenario.exit.mean_service_time_seconds}
            onChange={(e) => updateExit({ mean_service_time_seconds: Number(e.target.value) })}
            tooltip={TOOLTIPS.exit_service_time}
          />
        </div>
      </Accordion>

      {/* Simulation Config Section */}
      <Accordion title="Simulation Config" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Iterations"
            type="number"
            min={1}
            max={2000}
            value={config.iterations}
            onChange={(e) => updateConfig({ iterations: Number(e.target.value) })}
          />
          <Input
            label="Master Seed"
            type="number"
            value={config.master_seed}
            onChange={(e) => updateConfig({ master_seed: Number(e.target.value) })}
          />
          <Input
            label="Warm-up Period"
            unit="minutes"
            type="number"
            min={0}
            value={config.warm_up_minutes}
            onChange={(e) => updateConfig({ warm_up_minutes: Number(e.target.value) })}
          />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Thresholds</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rejection Rate"
              unit="%"
              type="number"
              min={0}
              max={100}
              step={1}
              value={config.thresholds.rejection_rate * 100}
              onChange={(e) => updateThresholds({ rejection_rate: Number(e.target.value) / 100 })}
            />
            <Input
              label="Exit p95 SLA"
              unit="minutes"
              type="number"
              min={0.1}
              step={0.1}
              value={config.thresholds.exit_p95_sla_minutes}
              onChange={(e) => updateThresholds({ exit_p95_sla_minutes: Number(e.target.value) })}
            />
          </div>
        </div>
      </Accordion>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="primary"
          className="flex-1"
          onClick={() => runScenario(id)}
          disabled={anyRunning}
          isLoading={isRunning}
        >
          Run Simulation
        </Button>
        <Button
          variant="secondary"
          onClick={() => resetScenarioToDefaults(id)}
          disabled={anyRunning}
        >
          Reset
        </Button>
      </div>

      {isDirty && !isRunning && (
        <p className="text-xs text-amber-600 text-center">
          Unsaved changes - run simulation to update results
        </p>
      )}
    </div>
  );
}
