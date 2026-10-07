import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  BarChart3,
  Recycle,
  Layers,
  PlusCircle,
} from 'lucide-react';
import {
  WasteIncident,
  IncidentStatus,
  INCIDENT_STATUS_WORKFLOW,
  PriorityLevel,
  RecyclingRateConfig,
} from '../types';
import { detectWasteHotspots } from '../utils/priorityEngine';
import { WasteMap } from './WasteMap';
import { FieldWorkerPanel } from './FieldWorkerPanel';
import { AskEcoSymphony } from './AskEcoSymphony';

interface WasteDashboardProps {
  incidents: WasteIncident[];
  selectedIncidentId: string | null;
  onSelectIncidentId: (id: string) => void;
  onUpdateIncident: (updated: WasteIncident) => void;
  recyclingRates: RecyclingRateConfig;
  onUpdateRates: (rates: RecyclingRateConfig) => void;
  isDemoMode: boolean;
  onToggleDemoMode: (val: boolean) => void;
  onNavigateToScanner: () => void;
}

export const WasteDashboard: React.FC<WasteDashboardProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncidentId,
  onUpdateIncident,
  recyclingRates,
  onUpdateRates,
  isDemoMode,
  onToggleDemoMode,
  onNavigateToScanner,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Compute Dashboard Statistics from Stored Reports
  const stats = useMemo(() => {
    const total = incidents.length;
    const resolvedStatuses: IncidentStatus[] = ['Cleanup Verified', 'Recovered', 'Closed'];
    const resolved = incidents.filter((i) => resolvedStatuses.includes(i.status)).length;
    const pending = total - resolved;
    const highPriority = incidents.filter(
      (i) => i.priority === 'HIGH' || i.priority === 'CRITICAL'
    ).length;
    const recyclable = incidents.filter(
      (i) => i.recyclable === 'Yes' || i.recyclable === 'Partially'
    ).length;
    const mixed = incidents.filter((i) => i.mixedWaste === 'Yes').length;

    // 1. Waste Categories Distribution
    const byCategory: Record<string, number> = {};
    // 2. Priority Distribution
    const byPriority: Record<PriorityLevel, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    // 3. Incident Status Distribution
    const byStatus: Record<string, number> = {};
    // 4. Reports by Area
    const byArea: Record<string, number> = {};

    incidents.forEach((inc) => {
      byCategory[inc.wasteType] = (byCategory[inc.wasteType] || 0) + 1;
      byPriority[inc.priority] = (byPriority[inc.priority] || 0) + 1;
      byStatus[inc.status] = (byStatus[inc.status] || 0) + 1;
      const areaKey = inc.location.localBody.replace(' Municipal Council', '');
      byArea[areaKey] = (byArea[areaKey] || 0) + 1;
    });

    return {
      total,
      pending,
      highPriority,
      resolved,
      recyclable,
      mixed,
      byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
      byPriority,
      byStatus: INCIDENT_STATUS_WORKFLOW.map((st) => ({
        status: st,
        count: byStatus[st] || 0,
      })),
      byArea: Object.entries(byArea).sort((a, b) => b[1] - a[1]),
    };
  }, [incidents]);

  const hotspots = useMemo(() => detectWasteHotspots(incidents), [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && inc.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = inc.id.toLowerCase().includes(q);
        const matchArea = inc.location.area.toLowerCase().includes(q);
        const matchBody = inc.location.localBody.toLowerCase().includes(q);
        const matchType = inc.wasteType.toLowerCase().includes(q);
        if (!matchId && !matchArea && !matchBody && !matchType) return false;
      }
      return true;
    });
  }, [incidents, statusFilter, priorityFilter, searchQuery]);

  const activeIncident =
    incidents.find((i) => i.id === selectedIncidentId) || filteredIncidents[0] || incidents[0];

  return (
    <div className="space-y-8">
      {/* Prominent Demo Data / Real Session Data Banner (Section 9 & 20) */}
      <div
        className={`rounded-xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDemoMode
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {isDemoMode
                ? 'DEMO DATA – NOT OFFICIAL GOVERNMENT DATA · FOR PRESENTATION ONLY'
                : 'LIVE SESSION USER REPORTS – SEPARATED FROM PRELOADED DEMO DATA'}
            </span>
          </div>
          <p className="text-xs opacity-90">
            {isDemoMode
              ? 'Showing preloaded sample incidents in Cuncolim & Salcete, Goa alongside any newly scanned reports in Demo Mode.'
              : 'Showing strictly user-created waste reports from this browser session without preloaded demo records.'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white/90 rounded-lg border border-slate-300 shrink-0">
          <button
            type="button"
            onClick={() => onToggleDemoMode(true)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              isDemoMode
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Demo Presentation Mode
          </button>
          <button
            type="button"
            onClick={() => onToggleDemoMode(false)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              !isDemoMode
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Real User Reports Only
          </button>
        </div>
      </div>

      {/* Dashboard Title Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold">
            Municipal & Waste Management Operations
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
            EcoSymphony AI – Waste Intelligence Dashboard
          </h2>
        </div>
        <button
          type="button"
          onClick={onNavigateToScanner}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Scan / Report New Waste Incident</span>
        </button>
      </div>

      {/* 6 Required Dashboard Metric Cards (Tabular Numerals, Single-Elevation Depth) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Reports', value: stats.total, note: 'Stored incidents' },
          { label: 'Pending', value: stats.pending, note: 'Awaiting closure' },
          { label: 'High Priority', value: stats.highPriority, note: 'High + Critical' },
          { label: 'Resolved', value: stats.resolved, note: 'Verified / Closed' },
          { label: 'Recyclable Reports', value: stats.recyclable, note: 'Recoverable stream' },
          { label: 'Mixed Waste Reports', value: stats.mixed, note: 'Needs segregation' },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
          >
            <span className="text-xs font-medium text-slate-500">{card.label}</span>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 my-1.5">
              {card.value}
            </div>
            <span className="text-[11px] text-slate-500">{card.note}</span>
          </div>
        ))}
      </div>

      {/* 4 Required Analytics Charts (Waste Categories, Priority Distribution, Incident Status, Reports by Area) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Chart 1: Waste Categories */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Waste Categories
          </h3>
          {stats.byCategory.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No data in current mode.</p>
          ) : (
            <div className="space-y-2.5 text-xs">
              {stats.byCategory.map(([cat, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-800 truncate pr-2">{cat}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 2: Priority Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            2. Priority Distribution
          </h3>
          <div className="space-y-2.5 text-xs">
            {(
              [
                { level: 'CRITICAL', color: 'bg-red-600' },
                { level: 'HIGH', color: 'bg-orange-500' },
                { level: 'MEDIUM', color: 'bg-amber-500' },
                { level: 'LOW', color: 'bg-emerald-600' },
              ] as { level: PriorityLevel; color: string }[]
            ).map(({ level, color }) => {
              const count = stats.byPriority[level];
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={level} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-800">{level}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: Incident Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            3. Incident Status Workflow
          </h3>
          <div className="space-y-2 text-xs">
            {stats.byStatus.map(({ status, count }) => {
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={status} className="flex items-center justify-between gap-2">
                  <span className="text-slate-700 truncate w-28">{status}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-800 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono tabular-nums text-slate-600 w-6 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 4: Reports by Area */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            4. Reports by Local Body / Area
          </h3>
          {stats.byArea.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No area reports logged yet.</p>
          ) : (
            <div className="space-y-2.5 text-xs">
              {stats.byArea.map(([areaName, count]) => {
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={areaName} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-800 truncate pr-2">{areaName}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Geospatial Waste Map & Hotspot Detection (Sections 10 & 11) */}
      <WasteMap
        incidents={incidents}
        hotspots={hotspots}
        selectedIncidentId={activeIncident?.id || null}
        onSelectIncident={(inc) => onSelectIncidentId(inc.id)}
        isDemoMode={isDemoMode}
      />

      {/* Waste Incident Table (Section 9) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/60">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Structured Waste Incident Registry
            </h3>
            <p className="text-xs text-slate-500">
              Click any incident row to inspect photos, assign field collection, or update workflow status.
            </p>
          </div>

          {/* Search & Segmented Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, Cuncolim, waste..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Only</option>
              <option value="MEDIUM">Medium Only</option>
              <option value="LOW">Low Only</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">All Statuses</option>
              {INCIDENT_STATUS_WORKFLOW.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              No waste incidents match your current filter or data mode.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Switch to Demo Presentation Mode to view preloaded sample data, or scan a new waste report with the AI camera.
            </p>
            <button
              type="button"
              onClick={onNavigateToScanner}
              className="px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Scan First Waste Report
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Waste</th>
                  <th className="py-3 px-4">Materials & Recyclable</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Authorized Status Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredIncidents.map((inc) => {
                  const isSelected = activeIncident?.id === inc.id;
                  return (
                    <tr
                      key={inc.id}
                      onClick={() => onSelectIncidentId(inc.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {inc.id}
                        <span className="block text-[10px] font-normal text-slate-500">
                          {inc.dateTime}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        <div className="font-medium">{inc.location.area}</div>
                        <div className="text-slate-500 text-[11px]">{inc.location.localBody}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-medium">
                        {inc.wasteType}
                        <div className="text-slate-500 font-normal text-[11px]">
                          Qty: {inc.estimatedQuantity} · Mixed: {inc.mixedWaste}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{inc.materials.slice(0, 2).join(', ')}</div>
                        <div className="text-[11px] text-emerald-700">
                          Recyclable: {inc.recyclable}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap">
                        {inc.priority === 'CRITICAL' && (
                          <span className="text-red-700">CRITICAL</span>
                        )}
                        {inc.priority === 'HIGH' && (
                          <span className="text-orange-700">High</span>
                        )}
                        {inc.priority === 'MEDIUM' && (
                          <span className="text-amber-700">Medium</span>
                        )}
                        {inc.priority === 'LOW' && (
                          <span className="text-emerald-700">Low</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {inc.status}
                      </td>
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={inc.status}
                          onChange={(e) =>
                            onUpdateIncident({
                              ...inc,
                              status: e.target.value as IncidentStatus,
                            })
                          }
                          aria-label={`Update status for ${inc.id}`}
                          className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        >
                          {INCIDENT_STATUS_WORKFLOW.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Incident Collection Workflow & Before/After Verification (Sections 12, 13, 14) */}
      {activeIncident && (
        <FieldWorkerPanel
          incident={activeIncident}
          recyclingRates={recyclingRates}
          onUpdateIncident={onUpdateIncident}
          onUpdateRates={onUpdateRates}
        />
      )}

      {/* Ask EcoSymphony AI Grounded Assistant (Section 15) */}
      <AskEcoSymphony incidents={incidents} isDemoMode={isDemoMode} />
    </div>
  );
};
