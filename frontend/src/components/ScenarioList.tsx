import { useState } from 'react';
import { useStore, ScenarioState } from '../store/useStore';
import { Button } from './ui';
import { cn } from '../lib/utils';

export function ScenarioList() {
  const {
    scenarios,
    activeScenarioId,
    setActiveScenario,
    addScenario,
    duplicateScenario,
    removeScenario,
    renameScenario,
    runScenario,
    runAllScenarios,
    isRunningAll,
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEditing = (scenario: ScenarioState) => {
    setEditingId(scenario.id);
    setEditName(scenario.scenario.name);
  };

  const finishEditing = () => {
    if (editingId && editName.trim()) {
      renameScenario(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') finishEditing();
    if (e.key === 'Escape') setEditingId(null);
  };

  const anyRunning = scenarios.some(s => s.isRunning) || isRunningAll;

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Scenarios</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={addScenario}
            disabled={scenarios.length >= 10}
            title="Add Scenario"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={runAllScenarios}
            disabled={anyRunning}
            isLoading={isRunningAll}
          >
            Run All
          </Button>
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="flex overflow-x-auto">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className={cn(
              'group flex items-center gap-2 px-4 py-2 border-r border-gray-100 cursor-pointer min-w-0',
              activeScenarioId === s.id
                ? 'bg-primary-50 border-b-2 border-b-primary-500'
                : 'hover:bg-gray-50'
            )}
            onClick={() => setActiveScenario(s.id)}
          >
            {/* Status indicator */}
            <div className="flex-shrink-0">
              {s.isRunning ? (
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              ) : s.result ? (
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    s.result.passed ? 'bg-green-500' : 'bg-red-500'
                  )}
                />
              ) : s.isDirty ? (
                <div className="w-2 h-2 rounded-full bg-amber-400" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </div>

            {/* Name */}
            {editingId === s.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={handleKeyDown}
                className="text-sm bg-white border border-gray-300 rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-primary-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="text-sm font-medium text-gray-700 truncate max-w-[120px]"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEditing(s);
                }}
                title={s.scenario.name}
              >
                {s.scenario.name}
              </span>
            )}

            {/* Actions - visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  runScenario(s.id);
                }}
                disabled={anyRunning}
                className="p-1 text-gray-400 hover:text-primary-600 disabled:opacity-50"
                title="Run"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateScenario(s.id);
                }}
                disabled={scenarios.length >= 10}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                title="Duplicate"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeScenario(s.id);
                }}
                disabled={scenarios.length <= 1}
                className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
