import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { adminApi, leaderboardApi } from '@/lib/api.js';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Award,
  Clock,
  CheckCircle,
  BarChart as BarChartIcon,
  TrendingUp,
  Download,
  AlertOctagon
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const DEPARTMENTS = ['Roads', 'Water', 'Waste', 'Electricity', 'Parks', 'Traffic', 'Other'];

const AdminAnalytics = () => {
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const handleExportCSV = () => {
    if (filteredComplaints.length === 0) return;
    
    const headers = ["ID", "Title", "Category", "Status", "Votes", "Created At", "Resolved At", "SLA Breached"];
    const rows = filteredComplaints.map(c => [
      c.id,
      `"${(c.title || 'Untitled').replace(/"/g, '""')}"`,
      c.category,
      c.status,
      c.votes,
      new Date(c.createdAt).toLocaleString(),
      c.resolvedAt ? new Date(c.resolvedAt).toLocaleString() : 'N/A',
      c.slaBreached ? 'YES' : 'NO'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `citifix_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* -------------------- LOAD & SANITIZE DATA -------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const complaintsResponse = await adminApi.complaints();
        const leaderboard = await leaderboardApi.list();

        const loadedComplaints = complaintsResponse.complaints || [];
        setComplaints(
          loadedComplaints
            .map((c) => ({ ...c, status: String(c.status || '').toLowerCase() }))
            .filter((c) => c && c.category && c.status && c.createdAt)
        );

        setUsers((leaderboard || []).slice(0, 5));
      } catch {
        setComplaints([]);
        setUsers([]);
      }
    };

    load();
  }, []);

  /* -------------------- FILTERED COMPLAINTS -------------------- */
  const filteredComplaints = useMemo(() => {
    return departmentFilter === 'all'
      ? complaints
      : complaints.filter(c => c.category === departmentFilter);
  }, [complaints, departmentFilter]);

  /* -------------------- STATUS COUNTS -------------------- */
  const statusCounts = useMemo(() => ({
    open: filteredComplaints.filter(c => c.status === 'open').length,
    assigned: filteredComplaints.filter(c => c.status === 'assigned').length,
    resolved: filteredComplaints.filter(c => c.status === 'resolved').length
  }), [filteredComplaints]);

  /* -------------------- TREND DATA (SAFE) -------------------- */
  const trendData = useMemo(() => {
    const map = {};

    filteredComplaints.forEach(c => {
      const dateObj = new Date(c.createdAt);
      if (isNaN(dateObj)) return;

      const date = dateObj.toISOString().split('T')[0];
      map[date] = map[date]
        ? { date, count: map[date].count + 1 }
        : { date, count: 1 };
    });

    return Object.values(map).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [filteredComplaints]);

  /* -------------------- COMPLAINTS BY DEPARTMENT -------------------- */
  const complaintByDept = useMemo(() => {
    return DEPARTMENTS.map(dep => ({
      name: dep,
      count: filteredComplaints.filter(c => c.category === dep).length || 0
    }));
  }, [filteredComplaints]);

  /* -------------------- STATS -------------------- */
  const stats = useMemo(() => {
    const total = filteredComplaints.length;
    const resolved = statusCounts.resolved;
    const breached = filteredComplaints.filter(c => c.slaBreached).length;
    
    return [
      { icon: Clock, label: 'Open Issues', value: statusCounts.open, color: 'text-blue-400' },
      { icon: CheckCircle, label: 'Resolved', value: resolved, color: 'text-emerald-400' },
      { icon: AlertOctagon, label: 'SLA Breaches', value: breached, color: 'text-rose-400' },
      { 
        icon: TrendingUp, 
        label: 'Resolution Rate', 
        value: total > 0 ? `${((resolved / total) * 100).toFixed(1)}%` : '0%',
        color: 'text-amber-400'
      }
    ];
  }, [filteredComplaints, statusCounts]);

  /* -------------------- AVG RESOLUTION TIME BY DEPT -------------------- */
  const avgResolutionTimeByDept = useMemo(() => {
    return DEPARTMENTS.map(dept => {
      const deptComplaints = filteredComplaints.filter(c => c.category === dept && c.status === 'resolved' && c.resolvedAt);
      if (deptComplaints.length === 0) return { name: dept, days: 0 };
      
      const totalDays = deptComplaints.reduce((acc, c) => {
        const start = new Date(c.createdAt);
        const end = new Date(c.resolvedAt);
        return acc + (end - start) / (1000 * 60 * 60 * 24);
      }, 0);
      
      return { name: dept, days: parseFloat((totalDays / deptComplaints.length).toFixed(1)) };
    });
  }, [filteredComplaints]);

  /* -------------------- SLA COMPLIANCE DATA -------------------- */
  const slaComplianceData = useMemo(() => {
    const resolved = filteredComplaints.filter(c => c.status === 'resolved');
    const onTime = resolved.filter(c => !c.slaBreached).length;
    const breached = resolved.filter(c => c.slaBreached).length;
    
    return [
      { name: 'On Time', value: onTime, color: '#10b981' },
      { name: 'Breached', value: breached, color: '#f43f5e' }
    ];
  }, [filteredComplaints]);

  return (
    <>
      <Helmet>
        <title>Analytics - CITIFIX</title>
        <meta name="description" content="View real-time analytics for civic issues." />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  Analytics Dashboard
                </h1>
                <p className="text-white/60 mt-1">Real-time insights and trends</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg shadow-emerald-900/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>

              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[220px] bg-white/10 text-white border-white/20 backdrop-blur-sm hover:bg-white/15">
                  <SelectValue placeholder="Filter by Department" />
                </SelectTrigger>
                <SelectContent className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl border-white/20 text-white">
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map(dep => (
                    <SelectItem key={dep} value={dep}>
                      {dep}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-xl text-white">Daily Complaint Trends</h3>
                <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                  Live Feed
                </div>
              </div>

              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(17, 17, 17, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={4}
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#111' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-white/20 italic">No trend data available</div>
              )}
            </div>

            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <h3 className="font-bold text-xl text-white mb-6">Top Contributing Citizens</h3>
              <div className="space-y-4">
                {users.length > 0 ? users.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white border border-white/10 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition-all">
                        {index + 1}
                      </div>
                      <span className="text-white font-medium">{user.name}</span>
                    </div>
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                      <Award className="w-4 h-4" />
                      {user.rewardPoints || 0}
                    </span>
                  </motion.div>
                )) : (
                  <div className="py-10 text-center text-white/20 italic">No citizens ranked yet</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <h3 className="font-bold text-xl text-white mb-6 uppercase tracking-widest text-xs opacity-50">Department Efficiency</h3>
              <h4 className="font-bold text-2xl text-white mb-6">Avg. Resolution Time (Days)</h4>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={avgResolutionTimeByDept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(17, 17, 17, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="days" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
              <h3 className="font-bold text-xl text-white mb-6 uppercase tracking-widest text-xs opacity-50">Compliance Monitor</h3>
              <h4 className="font-bold text-2xl text-white mb-6">SLA Performance Breakdown</h4>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={slaComplianceData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {slaComplianceData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(17, 17, 17, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-4">
                  {slaComplianceData.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="text-white/50 text-xs uppercase font-bold">{item.name}</p>
                        <p className="text-xl font-bold text-white">{item.value} <span className="text-sm font-normal opacity-50 text-white">cases</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
            <h3 className="font-bold text-xl text-white mb-6">Complaints Distribution by Category</h3>
            {complaintByDept.some(d => d.count > 0) && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={complaintByDept} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.6)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(17, 17, 17, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default AdminAnalytics;
