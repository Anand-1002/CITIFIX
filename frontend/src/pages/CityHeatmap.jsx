import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { complaintsApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_COLORS = {
  Roads:       { color: '#ef4444', label: '🛣️ Roads' },
  Water:       { color: '#3b82f6', label: '🌊 Water' },
  Waste:       { color: '#22c55e', label: '🗑️ Waste' },
  Electricity: { color: '#f59e0b', label: '⚡ Electric' },
  Parks:       { color: '#10b981', label: '🌳 Parks' },
  Traffic:     { color: '#8b5cf6', label: '🚦 Traffic' },
  Other:       { color: '#ec4899', label: '📋 Other' },
};

const STATUS_LABELS = {
  open:      { color: '#f97316', text: 'OPEN' },
  assigned:  { color: '#3b82f6', text: 'ASSIGNED' },
  resolved:  { color: '#22c55e', text: 'RESOLVED' },
  escalated: { color: '#ef4444', text: 'ESCALATED' },
};

// Auto-fit map to complaint bounds
function MapAutoFit({ complaints }) {
  const map = useMap();
  useEffect(() => {
    if (complaints.length === 0) return;
    const lats = complaints.map(c => c.latitude);
    const lngs = complaints.map(c => c.longitude);
    const bounds = [
      [Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
      [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01],
    ];
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [complaints, map]);
  return null;
}

const CityHeatmap = () => {
  const [complaints, setComplaints] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, escalated: 0 });
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      const data = await complaintsApi.heatmap();
      setComplaints(data);
      setLastUpdated(new Date());
      setStats({
        total:     data.length,
        open:      data.filter(c => c.status === 'OPEN').length,
        resolved:  data.filter(c => c.status === 'RESOLVED').length,
        escalated: data.filter(c => c.status === 'ESCALATED').length,
      });
    } catch (err) {
      console.error('Heatmap fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000); // auto-refresh every 30s
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    let result = complaints;
    if (selectedCategory !== 'All') result = result.filter(c => c.category === selectedCategory);
    if (selectedStatus !== 'All')   result = result.filter(c => c.status.toUpperCase() === selectedStatus);
    setFiltered(result);
  }, [complaints, selectedCategory, selectedStatus]);

  const defaultCenter = complaints.length > 0
    ? [complaints[0].latitude, complaints[0].longitude]
    : [20.5937, 78.9629]; // India center

  return (
    <>
      <Helmet>
        <title>CitiFix — Live City Issue Map</title>
        <meta name="description" content="Real-time map of civic complaints across the city. No login required." />
      </Helmet>

      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Header */}
        <div className="relative z-10 bg-black/60 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-lg font-bold">🗺️</div>
              <div>
                <h1 className="text-xl font-bold text-white">CitiFix Live City Map</h1>
                <p className="text-white/50 text-xs">Public • No login required • Auto-refreshes every 30s</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-white/40 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  Live — {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <a href="/" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-xl transition-all border border-white/10">
                ← Back to CitiFix
              </a>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="relative z-10 bg-black/40 backdrop-blur-sm border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Issues', value: stats.total,     color: 'text-white' },
              { label: 'Open',         value: stats.open,      color: 'text-orange-400' },
              { label: 'Resolved',     value: stats.resolved,  color: 'text-emerald-400' },
              { label: 'Escalated',    value: stats.escalated, color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-white/40 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="relative z-10 bg-black/30 backdrop-blur-sm border-b border-white/5 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-2 items-center">
            <span className="text-white/40 text-xs font-medium uppercase tracking-wider">Category:</span>
            {['All', ...Object.keys(CATEGORY_COLORS)].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {cat === 'All' ? '🌐 All' : CATEGORY_COLORS[cat]?.label}
              </button>
            ))}
            <span className="text-white/40 text-xs font-medium uppercase tracking-wider ml-4">Status:</span>
            {['All', 'OPEN', 'ASSIGNED', 'RESOLVED', 'ESCALATED'].map(s => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedStatus === s
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {s === 'All' ? 'All Status' : s}
              </button>
            ))}
            <span className="ml-auto text-white/30 text-xs">{filtered.length} complaints shown</span>
          </div>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/60">Loading city data...</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={12}
              style={{ height: '100%', width: '100%', background: '#0a0a0f' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {complaints.length > 0 && <MapAutoFit complaints={filtered.length > 0 ? filtered : complaints} />}
              {filtered.map(complaint => {
                const catInfo = CATEGORY_COLORS[complaint.category] || CATEGORY_COLORS.Other;
                const radius = 8 + Math.min(complaint.votes || 0, 20);
                return (
                  <CircleMarker
                    key={complaint.id}
                    center={[complaint.latitude, complaint.longitude]}
                    radius={radius}
                    pathOptions={{
                      color: catInfo.color,
                      fillColor: catInfo.color,
                      fillOpacity: 0.75,
                      weight: 2,
                    }}
                  >
                    <Popup className="citifix-popup">
                      <div className="bg-[#111] text-white rounded-xl p-3 min-w-[220px] border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: catInfo.color + '33', color: catInfo.color }}>
                            {catInfo.label}
                          </span>
                          <span className="text-xs text-white/40">#{complaint.id}</span>
                        </div>
                        <p className="font-semibold text-sm mb-1 text-white">{complaint.title}</p>
                        {complaint.address && (
                          <p className="text-xs text-white/50 mb-2">📍 {complaint.address}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ color: STATUS_LABELS[complaint.status?.toLowerCase()]?.color || '#fff' }}>
                            {STATUS_LABELS[complaint.status?.toLowerCase()]?.text || complaint.status}
                          </span>
                          <span className="text-xs text-white/40">👍 {complaint.votes} votes</span>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}

          {/* Legend overlay */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Categories</p>
            <div className="space-y-2">
              {Object.entries(CATEGORY_COLORS).map(([cat, { color, label }]) => (
                <div key={cat} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-white/70 text-xs">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-white/30 text-xs mt-3 pt-3 border-t border-white/10">Dot size = vote count</p>
          </div>
        </div>
      </div>

      <style>{`
        .leaflet-popup-content-wrapper { background: transparent !important; border: none !important; box-shadow: none !important; }
        .leaflet-popup-tip { display: none !important; }
        .leaflet-popup-content { margin: 0 !important; }
        .citifix-popup .leaflet-popup-content-wrapper { background: transparent; }
      `}</style>
    </>
  );
};

export default CityHeatmap;
