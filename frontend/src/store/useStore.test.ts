import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';
import { DEFAULT_SCENARIO } from '../types';

describe('useStore', () => {
  beforeEach(() => {
    // Reset store state
    useStore.setState({
      scenarios: [{
        id: 'test-1',
        scenario: { ...DEFAULT_SCENARIO },
        isDirty: false,
        isRunning: false,
        result: null,
        error: null,
      }],
      activeScenarioId: 'test-1',
      toasts: [],
      isRunningAll: false,
    });
  });

  describe('scenarios', () => {
    it('should add a new scenario', () => {
      const { addScenario, scenarios } = useStore.getState();
      const initialCount = scenarios.length;

      addScenario();

      expect(useStore.getState().scenarios.length).toBe(initialCount + 1);
    });

    it('should duplicate a scenario', () => {
      const { duplicateScenario, scenarios } = useStore.getState();
      const initialCount = scenarios.length;

      duplicateScenario(scenarios[0].id);

      const newScenarios = useStore.getState().scenarios;
      expect(newScenarios.length).toBe(initialCount + 1);
      expect(newScenarios[1].scenario.name).toContain('copy');
    });

    it('should remove a scenario', () => {
      const { addScenario, removeScenario } = useStore.getState();
      addScenario();

      const scenarios = useStore.getState().scenarios;
      expect(scenarios.length).toBe(2);

      removeScenario(scenarios[1].id);
      expect(useStore.getState().scenarios.length).toBe(1);
    });

    it('should not remove the last scenario', () => {
      const { removeScenario, scenarios } = useStore.getState();

      removeScenario(scenarios[0].id);

      expect(useStore.getState().scenarios.length).toBe(1);
    });

    it('should rename a scenario', () => {
      const { renameScenario, scenarios } = useStore.getState();

      renameScenario(scenarios[0].id, 'New Name');

      expect(useStore.getState().scenarios[0].scenario.name).toBe('New Name');
      expect(useStore.getState().scenarios[0].isDirty).toBe(true);
    });

    it('should update scenario', () => {
      const { updateScenario, scenarios } = useStore.getState();

      updateScenario(scenarios[0].id, {
        demand: { ...scenarios[0].scenario.demand, arrival_rate_per_hour: 200 }
      });

      expect(useStore.getState().scenarios[0].scenario.demand.arrival_rate_per_hour).toBe(200);
      expect(useStore.getState().scenarios[0].isDirty).toBe(true);
    });
  });

  describe('toasts', () => {
    it('should add a toast', () => {
      const { addToast } = useStore.getState();

      addToast('success', 'Test message');

      const toasts = useStore.getState().toasts;
      expect(toasts.length).toBe(1);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Test message');
    });

    it('should remove a toast', () => {
      const { addToast, removeToast } = useStore.getState();

      addToast('info', 'Test');
      const toastId = useStore.getState().toasts[0].id;

      removeToast(toastId);

      expect(useStore.getState().toasts.length).toBe(0);
    });
  });

  describe('config', () => {
    it('should update config', () => {
      const { updateConfig } = useStore.getState();

      updateConfig({ iterations: 1000 });

      expect(useStore.getState().config.iterations).toBe(1000);
    });

    it('should update thresholds', () => {
      const { updateConfig, config } = useStore.getState();

      updateConfig({
        thresholds: { ...config.thresholds, rejection_rate: 0.1 }
      });

      expect(useStore.getState().config.thresholds.rejection_rate).toBe(0.1);
    });
  });

  describe('getActiveScenario', () => {
    it('should return active scenario', () => {
      const { getActiveScenario, scenarios } = useStore.getState();

      const active = getActiveScenario();

      expect(active?.id).toBe(scenarios[0].id);
    });
  });
});
