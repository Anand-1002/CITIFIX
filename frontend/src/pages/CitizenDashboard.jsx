import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { complaintsApi } from '@/lib/api.js';
import { Award, FileText, TrendingUp, Plus, LogOut, Users, ArrowRight, PieChart as PieChartIcon, BarChart2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout.jsx';
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
  Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const CitizenDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userComplaints, setUserComplaints] = React.useState([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const mine = await complaintsApi.listMine();
        setUserComplaints(mine);
      } catch {
        setUserComplaints([]);
      }
    };
    load();
  }, []);
  
  const stats = [
    { 
      icon: FileText, 
      label: 'Total Complaints', 
      value: userComplaints.length,
    },
    { 
      icon: TrendingUp, 
      label: 'Resolved', 
      value: userComplaints.filter(c => c.status === 'resolved').length,
    },
    { 
      icon: Award, 
      label: 'Reward Points', 
      value: user.rewardPoints || 0,
    }
  ];

  const complaintByDept = React.useMemo(() => {
    const map = {};
    userComplaints.forEach(c => {
      if (!c.category) return;
      map[c.category] = (map[c.category] || 0) + 1;
    });
    return Object.keys(map).map(key => ({ name: key, count: map[key] })).sort((a, b) => b.count - a.count);
  }, [userComplaints]);

  const complaintByStatus = React.useMemo(() => {
    const map = {};
    userComplaints.forEach(c => {
      const status = c.status ? String(c.status).toUpperCase() : 'UNKNOWN';
      map[status] = (map[status] || 0) + 1;
    });
    return Object.keys(map).map(key => ({ name: key, count: map[key] }));
  }, [userComplaints]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - CITIFIX</title>
        <meta name="description" content="View your complaints, track resolutions, and manage your CITIFIX account." />
      </Helmet>
      
      <DashboardLayout>
        <div className="space-y-8">
   
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Welcome back, {user.name}! 👋</h1>
              <p className="text-white/60 mt-2">Track your civic contributions and make an impact</p>
            </div>
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="bg-white/5 text-white border-white/20 hover:bg-white/10 hover:border-white/30 hover:text-white backdrop-blur-sm transition-all"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

  
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform backdrop-blur-sm border border-white/20">
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-white/60 text-sm font-medium">{stat.label}</p>
                <p className="text-4xl font-bold mt-2 text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>

      
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="group relative overflow-hidden bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-xl rounded-2xl p-8 text-white cursor-pointer border border-white/20 hover:border-white/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/10"
              onClick={() => navigate('/report')}
            >
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-white/30">
                  <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Report New Issue</h3>
                <p className="text-white/70 mb-4">Help improve your community</p>
                <div className="flex items-center text-sm font-medium">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="group relative overflow-hidden bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-xl rounded-2xl p-8 text-white cursor-pointer border border-white/20 hover:border-white/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-white/10"
              onClick={() => navigate('/my-complaints')}
            >
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-white/30">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">My Complaints</h3>
                <p className="text-white/70 mb-4">Track your submissions</p>
                <div className="flex items-center text-sm font-medium">
                  <span>View All</span>
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          </div>


            {userComplaints.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <BarChart2 className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">Project Analysis</h2>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Category Chart */}
                  <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <h3 className="font-bold text-xl text-white mb-4">
                      My Reports by Category
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={complaintByDept}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
                        <YAxis stroke="rgba(255,255,255,0.6)" />
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Status Chart */}
                  <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                    <h3 className="font-bold text-xl text-white mb-4">
                      Resolution Status
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={complaintByStatus}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) =>
                            percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                          }
                        >
                          {complaintByStatus.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Complaints Feed directly in Dashboard */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">My Reported Issues</h2>
                </div>
                {userComplaints.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/my-complaints')}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    View All ({userComplaints.length}) <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>

              {userComplaints.length === 0 ? (
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 text-center">
                  <p className="text-white/60 mb-3">You haven't reported any civic complaints yet.</p>
                  <Button onClick={() => navigate('/report')} className="bg-white text-black hover:bg-white/90 font-medium">
                    <Plus className="w-4 h-4 mr-2" /> Report Your First Issue
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {userComplaints.slice(0, 4).map((c) => {
                    const imgSrc = c.imageUrl || c.image;
                    const statusColor = 
                      c.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                      c.status === 'in_progress' || c.status === 'assigned' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      c.status === 'escalated' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                      'bg-blue-500/20 text-blue-300 border-blue-500/30';

                    return (
                      <div
                        key={c.id}
                        onClick={() => navigate('/my-complaints')}
                        className="group cursor-pointer bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 hover:border-white/30 transition-all duration-300 flex gap-4 items-center"
                      >
                        {imgSrc ? (
                          <img 
                            src={imgSrc} 
                            alt={c.title} 
                            className="w-16 h-16 rounded-xl object-cover border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 flex-shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs text-white/40 font-mono">#{c.id}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusColor}`}>
                              {c.status || 'open'}
                            </span>
                          </div>
                          <h4 className="text-white font-semibold text-sm truncate group-hover:text-amber-300 transition-colors">
                            {c.title}
                          </h4>
                          <p className="text-white/50 text-xs truncate mt-0.5">
                            {c.address || c.category || 'Reported Issue'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-lg cursor-pointer border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1"
              onClick={() => navigate('/community')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-white/20">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">Community Portal</h3>
                  <p className="text-white/60 text-sm">View and vote on community issues</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl p-6 shadow-lg cursor-pointer border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1"
              onClick={() => navigate('/leaderboard')}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-white/20">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">Leaderboard</h3>
                  <p className="text-white/60 text-sm">See top contributors</p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default CitizenDashboard;