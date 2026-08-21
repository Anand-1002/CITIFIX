import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { dashboardApi } from '@/lib/api.js';
import { useSocket } from '@/contexts/SocketContext.jsx';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  Activity, TrendingUp, Users, AlertTriangle, CheckCircle, Clock,
  Shield, BarChart3, RefreshCw, Wifi, WifiOff, Zap, Target, Award
} from 'lucide-react';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const STATUS_COLORS = {
  OPEN: '#3b82f6',
  ASSIGNED: '#f59e0b',
  RESOLVED: '#10b981',
  ESCALATED: '#ef4444',
};

const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = displayed;
    const end = value;
    if (start === end) return;

    const increment = (end - start) / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        setDisplayed(end);
        clearInterval(timer);
      } else {
        setDisplayed(Math.round(current));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayed}</span>;
};

const RealTimeDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveKpis, setLiveKpis] = useState(null);
  const { connected, on, emit } = useSocket();

  // Fetch full analytics from API
  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const result = await dashboardApi.analytics();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Subscribe to live analytics stream
  useEffect(() => {
    emit('subscribe:analytics');

    const cleanup = on('analytics:update', (update) => {
      setLiveKpis(update);
      setLastUpdated(new Date(update.timestamp));
    });

    return () => {
      emit('unsubscribe:analytics');
      cleanup();
    };
  }, [on, emit]);

  // Auto-refresh full data every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchAnalytics(), 30000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const kpis = liveKpis || data?.kpis || {};

  const kpiCards = [
    { label: 'Total Complaints', value: kpis.totalComplaints || 0, icon: BarChart3, color: 'from-blue-600/20 to-blue-500/10', iconColor: 'text-blue-400', borderColor: 'border-blue-500/30' },
    { label: 'Active Issues', value: kpis.pendingCount || 0, icon: Clock, color: 'from-amber-600/20 to-amber-500/10', iconColor: 'text-amber-400', borderColor: 'border-amber-500/30' },
    { label: 'Resolved', value: kpis.resolvedCount || 0, icon: CheckCircle, color: 'from-emerald-600/20 to-emerald-500/10', iconColor: 'text-emerald-400', borderColor: 'border-emerald-500/30' },
    { label: 'Escalated', value: kpis.escalatedCount || 0, icon: AlertTriangle, color: 'from-rose-600/20 to-rose-500/10', iconColor: 'text-rose-400', borderColor: 'border-rose-500/30' },
    { label: 'Total Users', value: kpis.totalUsers || 0, icon: Users, color: 'from-purple-600/20 to-purple-500/10', iconColor: 'text-purple-400', borderColor: 'border-purple-500/30' },
    { label: 'Resolution Rate', value: kpis.resolutionRate || 0, icon: Target, suffix: '%', color: 'from-cyan-600/20 to-cyan-500/10', iconColor: 'text-cyan-400', borderColor: 'border-cyan-500/30' },
    { label: 'SLA Compliance', value: kpis.slaComplianceRate || 0, icon: Shield, suffix: '%', color: 'from-teal-600/20 to-teal-500/10', iconColor: 'text-teal-400', borderColor: 'border-teal-500/30' },
    { label: 'Avg Resolution', value: kpis.avgResolutionHours || 0, icon: Zap, suffix: 'h', color: 'from-indigo-600/20 to-indigo-500/10', iconColor: 'text-indigo-400', borderColor: 'border-indigo-500/30' },
  ];

  return (
    <>
      <Helmet>
        <title>Real-Time Analytics - CITIFIX</title>
        <meta name="description" content="Live analytics dashboard with real-time KPIs, charts, and activity feed." />
      </Helmet>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Real-Time Analytics</h1>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    {connected ? (
                      <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 text-xs font-medium">Live</span></>
                    ) : (
                      <><WifiOff className="w-3.5 h-3.5 text-rose-400" /><span className="text-rose-400 text-xs font-medium">Offline</span></>
                    )}
                  </div>
                  {lastUpdated && (
                    <span className="text-white/40 text-xs">
                      Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium border border-white/20 hover:border-white/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {kpiCards.map((kpi, index) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-gradient-to-br ${kpi.color} backdrop-blur-xl rounded-2xl p-4 sm:p-5 border ${kpi.borderColor} hover:scale-[1.02] transition-transform duration-200`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center`}>
                    <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                  </div>
                  {connected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{kpi.label}</p>
                <p className="text-3xl font-bold text-white mt-1">
                  <AnimatedCounter value={kpi.value} />
                  {kpi.suffix && <span className="text-lg text-white/60 ml-0.5">{kpi.suffix}</span>}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* 7-Day Trend Line Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-lg text-white">7-Day Complaint Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data?.dailyTrend || []}>
                  <defs>
                    <linearGradient id="gradientCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradientResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }}
                    tickFormatter={(d) => new Date(d).toLocaleDateString('en', { weekday: 'short' })} />
                  <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(17,17,17,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="created" stroke="#3b82f6" fill="url(#gradientCreated)" strokeWidth={2} name="Created" />
                  <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="url(#gradientResolved)" strokeWidth={2} name="Resolved" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Status Distribution Pie Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-lg text-white">Status Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data?.complaintsByStatus || []}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                  >
                    {(data?.complaintsByStatus || []).map((entry, i) => (
                      <Cell
                        key={i}
                        fill={STATUS_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(17,17,17,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Category Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-lg text-white">Complaints by Category</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data?.complaintsByCategory || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(17,17,17,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Complaints">
                    {(data?.complaintsByCategory || []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Top Voted Issues */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-lg text-white">Top Voted Issues</h3>
              </div>
              <div className="space-y-3">
                {(data?.topVoted || []).map((issue, i) => (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400' :
                      i === 1 ? 'bg-gray-400/20 text-gray-300' :
                      i === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-white/10 text-white/50'
                    }`}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{issue.title}</p>
                      <p className="text-white/40 text-xs">{issue.category} · {issue.status}</p>
                    </div>
                    <div className="flex items-center gap-1 text-rose-400 text-sm font-bold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {issue.votes}
                    </div>
                  </motion.div>
                ))}
                {(!data?.topVoted || data.topVoted.length === 0) && (
                  <div className="text-center py-8 text-white/40">
                    <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No active issues yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-lg text-white">Recent Activity</h3>
              {connected && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full animate-pulse">LIVE</span>
              )}
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {(data?.activityFeed || []).map((item, i) => {
                const statusColor = {
                  OPEN: 'bg-blue-500',
                  ASSIGNED: 'bg-amber-500',
                  RESOLVED: 'bg-emerald-500',
                  ESCALATED: 'bg-rose-500',
                }[item.status] || 'bg-gray-500';

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 + i * 0.02 }}
                    className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5"
                  >
                    <div className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{item.title}</p>
                      <p className="text-white/40 text-xs">
                        by {item.userName} · {item.category} · {item.votes} votes
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      item.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' :
                      item.status === 'ESCALATED' ? 'bg-rose-500/20 text-rose-400' :
                      item.status === 'ASSIGNED' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {item.status}
                    </span>
                    <span className="text-white/30 text-xs whitespace-nowrap">
                      {new Date(item.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default RealTimeDashboard;
