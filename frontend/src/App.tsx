import { useState } from 'react';
import { useMetrics } from './hooks/useMetrics';
import { formatTime, formatPct } from './utils';

function App() {
  const { factory, workers, workstations, loading, refresh } = useMetrics();
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [selectedStation, setSelectedStation] = useState<string>('all');

  if (loading && !factory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-medium text-gray-500 animate-pulse">Loading AI Metrics...</div>
      </div>
    );
  }

  const filteredWorkers = selectedWorker === 'all' ? workers : workers.filter(w => w.id === selectedWorker);
  const filteredStations = selectedStation === 'all' ? workstations : workstations.filter(s => s.id === selectedStation);

  return (
    <div className="min-h-screen p-8 bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Productivity Dashboard</h1>
            <p className="text-slate-500 mt-1">Real-time computer vision factory metrics</p>
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium text-sm"
          >
            Refresh Data
          </button>
        </header>

        {/* Factory Summary Cards */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Factory Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Productive Time" value={formatTime(factory?.total_productive_time_s)} />
            <MetricCard title="Total Units Produced" value={factory?.total_units?.toLocaleString()} />
            <MetricCard title="Avg Worker Utilization" value={formatPct(factory?.avg_utilization_pct)} />
            <MetricCard title="Avg Production Rate (/hr)" value={(factory?.avg_production_rate_hr || 0).toFixed(1)} />
          </div>
        </section>

        {/* Filters */}
        <section className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-600 mb-1">Filter by Worker</label>
            <select
              className="w-full border-slate-200 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={selectedWorker}
              onChange={e => setSelectedWorker(e.target.value)}
            >
              <option value="all">All Workers</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-600 mb-1">Filter by Workstation</label>
            <select
              className="w-full border-slate-200 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={selectedStation}
              onChange={e => setSelectedStation(e.target.value)}
            >
              <option value="all">All Workstations</option>
              {workstations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
            </select>
          </div>
        </section>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Workers Table */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-800">Worker Metrics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-medium">Worker</th>
                    <th className="px-6 py-3 font-medium">Active Time</th>
                    <th className="px-6 py-3 font-medium">Utilization</th>
                    <th className="px-6 py-3 font-medium">Units</th>
                    <th className="px-6 py-3 font-medium">Rate (/hr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkers.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">{w.name} <span className="text-slate-400 text-xs ml-1">#{w.id}</span></td>
                      <td className="px-6 py-4">{formatTime(w.active_time_s)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${w.utilization_pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{formatPct(w.utilization_pct)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{w.total_units}</td>
                      <td className="px-6 py-4">{w.units_per_hour.toFixed(1)}</td>
                    </tr>
                  ))}
                  {filteredWorkers.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No workers match filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Workstations Table */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-semibold text-slate-800">Workstation Metrics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-medium">Workstation</th>
                    <th className="px-6 py-3 font-medium">Occupancy</th>
                    <th className="px-6 py-3 font-medium">Utilization</th>
                    <th className="px-6 py-3 font-medium">Units</th>
                    <th className="px-6 py-3 font-medium">Throughput</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStations.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {s.name} <span className="inline-block ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">{s.type}</span>
                      </td>
                      <td className="px-6 py-4">{formatTime(s.active_time_s + s.idle_time_s)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.utilization_pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{formatPct(s.utilization_pct)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{s.total_units}</td>
                      <td className="px-6 py-4">{s.units_per_hour.toFixed(1)}/hr</td>
                    </tr>
                  ))}
                  {filteredStations.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No workstations match filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
      <dt className="text-sm font-medium text-slate-500 truncate mb-1">{title}</dt>
      <dd className="text-3xl font-bold tracking-tight text-slate-900">{value}</dd>
    </div>
  );
}

export default App;
