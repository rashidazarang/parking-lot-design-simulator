import { useStore } from './store/useStore';
import { ScenarioList } from './components/ScenarioList';
import { InputPanel } from './components/InputPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { ToastContainer, Tabs } from './components/ui';

function App() {
  const { toasts, removeToast, activeTab, setActiveTab, scenarios } = useStore();

  const resultsCount = scenarios.filter(s => s.result !== null).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-xl font-bold text-gray-900">Parking Flow Simulator</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Evaluate parking lot designs under varying demand, capacity, and exit configurations
            </p>
          </div>
        </div>
      </header>

      {/* Scenario Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScenarioList />
      </div>

      {/* Mobile Tabs */}
      <div className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6">
        <Tabs
          tabs={[
            { id: 'inputs', label: 'Inputs' },
            { id: 'results', label: 'Results', badge: resultsCount },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as 'inputs' | 'results')}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Desktop: 2-column layout */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-900">Configuration</h2>
                </div>
                <div className="p-5">
                  <InputPanel />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-7 xl:col-span-8">
            <ResultsPanel />
          </div>
        </div>

        {/* Mobile: Tabbed layout */}
        <div className="lg:hidden">
          {activeTab === 'inputs' ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Configuration</h2>
              </div>
              <div className="p-5">
                <InputPanel />
              </div>
            </div>
          ) : (
            <ResultsPanel />
          )}
        </div>
      </main>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
