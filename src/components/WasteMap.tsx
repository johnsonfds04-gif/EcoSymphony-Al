import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { WasteIncident, HotspotCluster, PriorityLevel } from '../types';
import { MapPin, AlertTriangle, Navigation, Layers } from 'lucide-react';

interface WasteMapProps {
  incidents: WasteIncident[];
  hotspots: HotspotCluster[];
  selectedIncidentId: string | null;
  onSelectIncident: (incident: WasteIncident) => void;
  isDemoMode: boolean;
}

function getMarkerColor(incident: WasteIncident): {
  hex: string;
  label: string;
} {
  const isResolved =
    incident.status === 'Cleanup Verified' ||
    incident.status === 'Recovered' ||
    incident.status === 'Closed';

  if (isResolved) {
    return { hex: '#16A34A', label: 'Resolved' }; // Green
  }
  if (incident.priority === 'CRITICAL') {
    return { hex: '#DC2626', label: 'Critical' }; // Red
  }
  if (incident.priority === 'HIGH') {
    return { hex: '#EA580C', label: 'High' }; // Orange
  }
  return { hex: '#CA8A04', label: 'Medium / Low' }; // Yellow/Amber
}

function createColoredIcon(hex: string, isSelected: boolean) {
  const size = isSelected ? 30 : 22;
  const border = isSelected ? '3px solid #0F172A' : '2px solid #FFFFFF';
  return L.divIcon({
    className: 'custom-waste-marker',
    html: `<div style="width:${size}px;height:${size}px;background:${hex};border:${border};border-radius:9999px;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
      <div style="width:6px;height:6px;background:#ffffff;border-radius:9999px;"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export const WasteMap: React.FC<WasteMapProps> = ({
  incidents,
  hotspots,
  selectedIncidentId,
  onSelectIncident,
  isDemoMode,
}) => {
  const [mapStyle, setMapStyle] = useState<'interactive' | 'simulated'>('interactive');
  const [tileError, setTileError] = useState(false);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];
  const defaultCenter: [number, number] = selectedIncident
    ? [selectedIncident.location.latitude, selectedIncident.location.longitude]
    : [15.1773, 73.9939]; // Cuncolim, Salcete, Goa

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Map Top Controls & Legend */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              Geospatial Waste Incident & Hotspot Map
            </h3>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs font-mono text-slate-600">
              {isDemoMode ? 'DEMO DATA – FOR PRESENTATION ONLY' : 'USER SESSION REPORTS'}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Click any marker to inspect Incident ID, photo, priority, location, and current workflow status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Marker Legend */}
          <div className="flex items-center gap-3 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
              Critical
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
              High
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-600 inline-block" />
              Medium
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              Resolved
            </span>
          </div>

          {/* Toggle between OpenStreetMap & Offline Prototype Grid */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
            <button
              type="button"
              onClick={() => setMapStyle('interactive')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mapStyle === 'interactive'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Interactive GIS Map
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('simulated')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mapStyle === 'simulated'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Offline Prototype Grid
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Area + Selected Marker Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 relative h-[420px] bg-slate-100">
          {mapStyle === 'interactive' && !tileError ? (
            <MapContainer
              center={defaultCenter}
              zoom={14}
              className="w-full h-full"
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                eventHandlers={{
                  tileerror: () => setTileError(true),
                }}
              />
              <MapCenterUpdater center={defaultCenter} />

              {/* Hotspot Circles */}
              {hotspots.map((hs) => (
                <Circle
                  key={hs.id}
                  center={[hs.centerLat, hs.centerLng]}
                  radius={220}
                  pathOptions={{
                    color: '#DC2626',
                    fillColor: '#EF4444',
                    fillOpacity: 0.16,
                    dashArray: '6 4',
                  }}
                />
              ))}

              {/* Incident Markers */}
              {incidents.map((inc) => {
                const { hex } = getMarkerColor(inc);
                const isSelected = inc.id === selectedIncident?.id;
                return (
                  <Marker
                    key={inc.id}
                    position={[inc.location.latitude, inc.location.longitude]}
                    icon={createColoredIcon(hex, isSelected)}
                    eventHandlers={{
                      click: () => onSelectIncident(inc),
                    }}
                  >
                    <Popup>
                      <div className="w-52 text-xs space-y-1.5">
                        <div className="font-mono font-semibold text-slate-900">
                          {inc.id} · {inc.priority}
                        </div>
                        <img
                          src={inc.photo}
                          alt={inc.wasteType}
                          referrerPolicy="no-referrer"
                          className="w-full h-24 object-cover rounded border border-slate-200"
                        />
                        <div className="font-medium text-slate-800">{inc.wasteType}</div>
                        <div className="text-slate-600">{inc.location.area}</div>
                        <div className="text-slate-500">Status: {inc.status}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          ) : (
            /* Simulated Prototype Map Fallback (works 100% offline in competition venue) */
            <div className="w-full h-full bg-[#E8F0EC] relative overflow-hidden p-6 flex flex-col justify-between">
              <div
                className="absolute inset-0 opacity-35 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #94A3B8 1px, transparent 1px), linear-gradient(to bottom, #94A3B8 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
              />
              {/* Simulated Roads & Salcete / Cuncolim Waterway */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 420">
                <path
                  d="M 0 280 Q 250 240, 480 260 T 800 210"
                  fill="none"
                  stroke="#BAE6FD"
                  strokeWidth="18"
                />
                <path
                  d="M 140 0 L 340 420 M 0 150 L 800 190"
                  fill="none"
                  stroke="#CBD5E1"
                  strokeWidth="8"
                />
                <text x="24" y="265" fill="#0369A1" fontSize="11" fontFamily="monospace">
                  Sal River / Drainage Corridor (Simulated Prototype Map)
                </text>
                <text x="360" y="175" fill="#475569" fontSize="11" fontFamily="monospace">
                  NH-66 / Cuncolim – Salcete Corridor
                </text>
              </svg>

              <div className="relative z-10 flex items-center justify-between">
                <div className="bg-white/95 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium">
                  PROTOTYPE SIMULATED GIS CANVAS · SALCETE / GOA SECTOR
                </div>
                {tileError && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1 text-xs text-amber-800">
                    Offline Map Mode Active
                  </div>
                )}
              </div>

              {/* Plot markers in simulated viewport */}
              <div className="relative z-10 flex-1 my-4">
                {incidents.map((inc, idx) => {
                  const { hex, label } = getMarkerColor(inc);
                  const isSelected = inc.id === selectedIncident?.id;
                  // Deterministic spread across canvas
                  const leftPct = 18 + ((idx * 21) % 68);
                  const topPct = 22 + ((idx * 29) % 60);
                  return (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => onSelectIncident(inc)}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center focus:outline-none`}
                    >
                      <span
                        style={{ backgroundColor: hex }}
                        className={`w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-transform ${
                          isSelected ? 'scale-125 ring-2 ring-slate-900' : 'group-hover:scale-110'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-white" />
                      </span>
                      <span className="mt-1 px-2 py-0.5 bg-slate-900/90 text-white font-mono text-[11px] rounded whitespace-nowrap">
                        {inc.id} · {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative z-10 text-xs text-slate-600 flex items-center justify-between bg-white/90 px-3 py-2 rounded-lg border border-slate-200">
                <span>Reference Sector: Cuncolim & Margao, Salcete, Goa (15.1773° N, 73.9939° E)</span>
                <span className="font-mono">{incidents.length} incident markers plotted</span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Marker Inspector Panel */}
        <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 p-5 flex flex-col justify-between bg-white">
          {selectedIncident ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs text-slate-500 block">Selected Map Incident</span>
                  <h4 className="text-lg font-bold font-mono text-slate-900">
                    {selectedIncident.id}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Priority & Status</span>
                  <span className="text-xs font-semibold text-slate-900">
                    {selectedIncident.priority} · {selectedIncident.status}
                  </span>
                </div>
              </div>

              <div className="aspect-4/3 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={selectedIncident.photo}
                  alt={selectedIncident.wasteType}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Waste Type: </span>
                  <span className="font-semibold text-slate-900">{selectedIncident.wasteType}</span>
                </div>
                <div>
                  <span className="text-slate-500">Location: </span>
                  <span className="font-medium text-slate-800">
                    {selectedIncident.location.area} · {selectedIncident.location.localBody}
                  </span>
                </div>
                <div className="font-mono text-slate-500">
                  GPS: {selectedIncident.location.latitude.toFixed(4)}° N,{' '}
                  {selectedIncident.location.longitude.toFixed(4)}° E
                </div>
                <div>
                  <span className="text-slate-500">Why Priority {selectedIncident.priority}: </span>
                  <span className="text-slate-700">{selectedIncident.priorityWhy}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              No incidents available to display on map.
            </div>
          )}

          {/* Hotspot Detection Box inside Map Sidebar */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Stored-Data Hotspot Detection</span>
            </div>
            {hotspots.length > 0 ? (
              <div className="space-y-2">
                {hotspots.map((hs) => (
                  <div
                    key={hs.id}
                    className="p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-slate-800"
                  >
                    <div className="font-semibold text-amber-950">
                      Potential Waste Hotspot · {hs.areaName}
                    </div>
                    <div className="text-amber-900 mt-0.5">
                      {hs.count} reports detected around this area ({hs.incidentIds.join(', ')}).
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No multi-report clusters detected in the current dataset yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
