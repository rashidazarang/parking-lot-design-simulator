import { create } from 'zustand';
import type { Scenario, SimulationConfig, SimulationResponse, ScenarioResult } from '../types';
import { DEFAULT_SCENARIO, DEFAULT_CONFIG } from '../types';
import { simulate } from '../lib/api';
import { generateId, deepClone } from '../lib/utils';

export interface ScenarioState {
  id: string;
  scenario: Scenario;
  isDirty: boolean;
  isRunning: boolean;
  result: ScenarioResult | null;
  error: string | null;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface Store {
  // Scenarios
  scenarios: ScenarioState[];
  activeScenarioId: string | null;
  config: SimulationConfig;

  // Results
  lastMetadata: SimulationResponse['metadata'] | null;

  // UI State
  isRunningAll: boolean;
  toasts: Toast[];
  activeTab: 'inputs' | 'results';

  // Actions - Scenarios
  addScenario: () => void;
  duplicateScenario: (id: string) => void;
  removeScenario: (id: string) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  renameScenario: (id: string, name: string) => void;
  setActiveScenario: (id: string) => void;
  resetScenarioToDefaults: (id: string) => void;

  // Actions - Config
  updateConfig: (updates: Partial<SimulationConfig>) => void;

  // Actions - Simulation
  runScenario: (id: string) => Promise<void>;
  runAllScenarios: () => Promise<void>;

  // Actions - UI
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
  setActiveTab: (tab: 'inputs' | 'results') => void;

  // Computed
  getActiveScenario: () => ScenarioState | undefined;
  getAllResults: () => ScenarioResult[];
}

const createInitialScenario = (): ScenarioState => ({
  id: generateId(),
  scenario: deepClone(DEFAULT_SCENARIO),
  isDirty: false,
  isRunning: false,
  result: null,
  error: null,
});

export const useStore = create<Store>((set, get) => {
  const initialScenario = createInitialScenario();

  return {
    // Initial state
    scenarios: [initialScenario],
    activeScenarioId: initialScenario.id,
    config: deepClone(DEFAULT_CONFIG),
    lastMetadata: null,
    isRunningAll: false,
    toasts: [],
    activeTab: 'inputs',

    // Scenario actions
    addScenario: () => {
      const newScenario = createInitialScenario();
      newScenario.scenario.name = `Scenario ${get().scenarios.length + 1}`;
      set(state => ({
        scenarios: [...state.scenarios, newScenario],
        activeScenarioId: newScenario.id,
      }));
    },

    duplicateScenario: (id) => {
      const source = get().scenarios.find(s => s.id === id);
      if (!source) return;

      const newScenario: ScenarioState = {
        id: generateId(),
        scenario: {
          ...deepClone(source.scenario),
          name: `${source.scenario.name} (copy)`,
        },
        isDirty: true,
        isRunning: false,
        result: null,
        error: null,
      };

      set(state => ({
        scenarios: [...state.scenarios, newScenario],
        activeScenarioId: newScenario.id,
      }));
    },

    removeScenario: (id) => {
      const { scenarios, activeScenarioId } = get();
      if (scenarios.length <= 1) return;

      const newScenarios = scenarios.filter(s => s.id !== id);
      const newActiveId = activeScenarioId === id
        ? newScenarios[0].id
        : activeScenarioId;

      set({
        scenarios: newScenarios,
        activeScenarioId: newActiveId,
      });
    },

    updateScenario: (id, updates) => {
      set(state => ({
        scenarios: state.scenarios.map(s =>
          s.id === id
            ? { ...s, scenario: { ...s.scenario, ...updates }, isDirty: true }
            : s
        ),
      }));
    },

    renameScenario: (id, name) => {
      set(state => ({
        scenarios: state.scenarios.map(s =>
          s.id === id
            ? { ...s, scenario: { ...s.scenario, name }, isDirty: true }
            : s
        ),
      }));
    },

    setActiveScenario: (id) => {
      set({ activeScenarioId: id });
    },

    resetScenarioToDefaults: (id) => {
      set(state => ({
        scenarios: state.scenarios.map(s =>
          s.id === id
            ? {
                ...s,
                scenario: { ...deepClone(DEFAULT_SCENARIO), name: s.scenario.name },
                isDirty: true,
              }
            : s
        ),
      }));
    },

    // Config actions
    updateConfig: (updates) => {
      set(state => ({
        config: { ...state.config, ...updates },
      }));
    },

    // Simulation actions
    runScenario: async (id) => {
      const state = get();
      const scenarioState = state.scenarios.find(s => s.id === id);
      if (!scenarioState) return;

      set(state => ({
        scenarios: state.scenarios.map(s =>
          s.id === id ? { ...s, isRunning: true, error: null } : s
        ),
      }));

      const result = await simulate({
        scenarios: [scenarioState.scenario],
        config: state.config,
      });

      if (result.success) {
        set(state => ({
          scenarios: state.scenarios.map(s =>
            s.id === id
              ? { ...s, isRunning: false, result: result.data.results[0], isDirty: false }
              : s
          ),
          lastMetadata: result.data.metadata,
          activeTab: 'results',
        }));
        get().addToast('success', `Simulation completed for "${scenarioState.scenario.name}"`);
      } else {
        set(state => ({
          scenarios: state.scenarios.map(s =>
            s.id === id
              ? { ...s, isRunning: false, error: result.error.error.message }
              : s
          ),
        }));
        get().addToast('error', result.error.error.message);
      }
    },

    runAllScenarios: async () => {
      const state = get();

      set({
        isRunningAll: true,
        scenarios: state.scenarios.map(s => ({ ...s, isRunning: true, error: null })),
      });

      const result = await simulate({
        scenarios: state.scenarios.map(s => s.scenario),
        config: state.config,
      });

      if (result.success) {
        set(state => ({
          isRunningAll: false,
          scenarios: state.scenarios.map((s, i) => ({
            ...s,
            isRunning: false,
            result: result.data.results[i] || null,
            isDirty: false,
          })),
          lastMetadata: result.data.metadata,
          activeTab: 'results',
        }));
        get().addToast('success', `All ${state.scenarios.length} scenarios completed`);
      } else {
        set(state => ({
          isRunningAll: false,
          scenarios: state.scenarios.map(s => ({
            ...s,
            isRunning: false,
            error: result.error.error.message,
          })),
        }));
        get().addToast('error', result.error.error.message);
      }
    },

    // UI actions
    addToast: (type, message) => {
      const id = generateId();
      set(state => ({
        toasts: [...state.toasts, { id, type, message }],
      }));
      setTimeout(() => get().removeToast(id), 5000);
    },

    removeToast: (id) => {
      set(state => ({
        toasts: state.toasts.filter(t => t.id !== id),
      }));
    },

    setActiveTab: (tab) => {
      set({ activeTab: tab });
    },

    // Computed
    getActiveScenario: () => {
      const { scenarios, activeScenarioId } = get();
      return scenarios.find(s => s.id === activeScenarioId);
    },

    getAllResults: () => {
      return get().scenarios
        .filter(s => s.result !== null)
        .map(s => s.result!);
    },
  };
});
