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
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-gray-50/80 to-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-700">Scenarios</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{scenarios.length}/10</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={addScenario}
            disabled={scenarios.length >= 10}
            title="Add Scenario"
            className="!px-2"
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
            className="shadow-md shadow-blue-500/20"
          >
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Run All
          </Button>
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="flex overflow-x-auto bg-gray-50/50">
        {scenarios.map((s, index) => (
          <div
            key={s.id}
            className={cn(
              'group flex items-center gap-2.5 px-4 py-2.5 cursor-pointer min-w-0 transition-all',
              index !== scenarios.length - 1 && 'border-r border-gray-200/60',
              activeScenarioId === s.id
                ? 'bg-white shadow-sm border-b-2 border-b-blue-500'
                : 'hover:bg-white/60'
            )}
            onClick={() => setActiveScenario(s.id)}
          >
            {/* Status indicator */}
            <div className="flex-shrink-0">
              {s.isRunning ? (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse ring-4 ring-blue-500/20" />
              ) : s.result ? (
                <div
                  className={cn(
                    'w-2.5 h-2.5 rounded-full ring-4',
                    s.result.passed
                      ? 'bg-emerald-500 ring-emerald-500/20'
                      : 'bg-red-500 ring-red-500/20'
                  )}
                />
              ) : s.isDirty ? (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-gray-300 ring-4 ring-gray-300/20" />
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
                className="text-sm bg-white border border-blue-300 rounded-md px-2 py-1 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className={cn(
                  'text-sm font-medium truncate max-w-[120px] transition-colors',
                  activeScenarioId === s.id ? 'text-gray-900' : 'text-gray-600'
                )}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEditing(s);
                }}
                title={`${s.scenario.name} (double-click to rename)`}
              >
                {s.scenario.name}
              </span>
            )}

            {/* Actions - visible on hover */}
            <div className={cn(
              'flex items-center gap-0.5 transition-opacity ml-auto',
              activeScenarioId === s.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  runScenario(s.id);
                }}
                disabled={anyRunning}
                className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                title="Run"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateScenario(s.id);
                }}
                disabled={scenarios.length >= 10}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
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
                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
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
