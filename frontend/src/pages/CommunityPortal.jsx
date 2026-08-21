import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { complaintsApi } from '@/lib/api.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { ThumbsUp, Tag, Users, TrendingUp, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout.jsx';

const DEPARTMENTS = ['All', 'Roads', 'Water', 'Waste', 'Electricity', 'Parks', 'Traffic', 'Other'];

const DEPT_ICONS = {
  All: '🗂️',
  Roads: '🛣️',
  Water: '🌊',
  Waste: '🗑️',
  Electricity: '⚡',
  Parks: '🌳',
  Traffic: '🚦',
  Other: '📋',
};

const STATUS_FILTERS = ['All', 'Open', 'Resolved'];

const STATUS_CONFIG = {
  open:     { label: 'OPEN',     color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     icon: Clock },
  assigned: { label: 'ASSIGNED', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',  icon: AlertCircle },
  resolved: { label: 'RESOLVED', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  escalated:{ label: 'ESCALATED', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',   icon: AlertCircle },
};

const CommunityPortal = () => {
  const [allComplaints, setAllComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortFilter, setSortFilter] = useState('Most Voted');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const { user } = useAuth();
  const { toast } = useToast();

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Only OPEN and ESCALATED issues can receive upvotes
  const canUpvote = (complaint) => {
    const s = (complaint.status || '').toLowerCase();
    return s === 'open' || s === 'escalated';
  };

  // Fetch once
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await complaintsApi.list();
        setAllComplaints(Array.isArray(data) ? data : []);
      } catch {
        setAllComplaints([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // All filtering + sorting derived in one useMemo — no extra fetches
  const displayedComplaints = useMemo(() => {
    let list = [...allComplaints];

    // 1. Department filter
    if (deptFilter !== 'All') {
      list = list.filter(c => c.category === deptFilter);
    }

    // 2. Status filter (admin only)
    if (isAdmin && statusFilter !== 'All') {
      const target = statusFilter.toLowerCase();
      list = list.filter(c => {
        const s = (c.status || '').toLowerCase();
        if (target === 'open')     return s === 'open' || s === 'assigned' || s === 'escalated';
        if (target === 'resolved') return s === 'resolved';
        return true;
      });
    }

    // 3. Sort
    if (sortFilter === 'Most Voted') {
      list.sort((a, b) => b.votes - a.votes);
    } else if (sortFilter === 'Most Recent') {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return list;
  }, [allComplaints, deptFilter, statusFilter, sortFilter, isAdmin]);

  const handleVote = async (id) => {
    if (!user) {
      toast({ title: 'Please login to vote', variant: 'destructive' });
      return;
    }
    try {
      await complaintsApi.vote(id);
      toast({ title: 'Vote counted!', description: 'Thank you for your feedback.' });
      // Optimistic local update
      setAllComplaints(prev =>
        prev.map(c =>
          c.id === id ? { ...c, votes: c.votes + 1, hasVoted: true } : c
        )
      );
    } catch (error) {
      toast({ title: error.message || 'Unable to vote', variant: 'destructive' });
    }
  };

  const departmentCounts = useMemo(() => {
    const counts = { All: allComplaints.length };
    allComplaints.forEach(c => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [allComplaints]);

  return (
    <>
      <Helmet>
        <title>Community Portal - CITIFIX</title>
        <meta name="description" content="View and vote on issues reported by the community." />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Community Portal</h1>
              <p className="text-white/60 mt-1">See what's happening in your city. Your vote matters!</p>
            </div>
          </div>

          {/* ── Filter Bar ── */}
          <div className="space-y-4">

            {/* Row 1: Sort + (Admin) Status filter */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-white/60">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Sort by:</span>
              </div>
              {['Most Voted', 'Most Recent'].map(f => (
                <Button
                  key={f}
                  variant={sortFilter === f ? 'default' : 'outline'}
                  className={sortFilter === f
                    ? 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                    : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white'}
                  onClick={() => setSortFilter(f)}
                >
                  {f}
                </Button>
              ))}

              {/* Status filter — admin only */}
              {isAdmin && (
                <>
                  <div className="w-px h-6 bg-white/20 mx-1" />
                  <span className="text-sm font-medium text-white/60">Status:</span>
                  {STATUS_FILTERS.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        statusFilter === s
                          ? s === 'Open'     ? 'bg-blue-500/30 text-blue-300 border-blue-500/50'
                          : s === 'Resolved' ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                          :                   'bg-white/20 text-white border-white/40'
                          : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {s === 'Open' ? '🔵 Open' : s === 'Resolved' ? '🟢 Resolved' : 'All'}
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Row 2: Department filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white/60 mr-1">Department:</span>
              {DEPARTMENTS.map(dept => {
                const count = departmentCounts[dept] ?? 0;
                const isActive = deptFilter === dept;
                return (
                  <button
                    key={dept}
                    onClick={() => setDeptFilter(dept)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      isActive
                        ? 'bg-white text-black border-white shadow-md'
                        : 'bg-white/5 text-white/60 border-white/15 hover:bg-white/10 hover:text-white hover:border-white/30'
                    }`}
                  >
                    <span>{DEPT_ICONS[dept]}</span>
                    <span>{dept}</span>
                    <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results count */}
          {!loading && (
            <p className="text-white/40 text-sm">
              Showing <span className="text-white/70 font-semibold">{displayedComplaints.length}</span> of {allComplaints.length} complaints
              {deptFilter !== 'All' && <> in <span className="text-white/70 font-semibold">{deptFilter}</span></>}
              {isAdmin && statusFilter !== 'All' && <> · <span className="text-white/70 font-semibold">{statusFilter}</span> only</>}
            </p>
          )}

          {/* Cards Grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/5 rounded-2xl h-64 animate-pulse border border-white/10" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <AnimatePresence mode="popLayout">
                {displayedComplaints.map((c, i) => {
                  const statusKey = (c.status || 'open').toLowerCase();
                  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.open;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: Math.min(i * 0.04, 0.3) }}
                      className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1"
                    >
                      {/* Image */}
                      <div className="relative overflow-hidden h-48">
                        <img
                          src={c.image || 'https://via.placeholder.com/400x250?text=No+Image'}
                          alt={c.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                        {/* Top-right badges */}
                        <div className="absolute top-3 right-3 flex gap-2 flex-col items-end">
                          {c.votes > 20 && (
                            <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-white/30">
                              <TrendingUp className="w-3 h-3" /> Trending
                            </span>
                          )}
                          {/* Status badge — visible to ALL users */}
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-sm ${statusCfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-5">
                        <h3 className="text-xl font-bold mb-3 text-white line-clamp-2">{c.title}</h3>

                        <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
                          <Tag className="w-4 h-4" />
                          <span>{c.category}</span>
                        </div>

                        <p className="text-white/70 text-sm mb-4 line-clamp-2">{c.description}</p>

                        {/* Footer */}
                        <div className="flex justify-between items-center pt-4 border-t border-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                              <ThumbsUp className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-xl text-white">{c.votes}</span>
                          </div>

                          <Button
                            onClick={() => handleVote(c.id)}
                            disabled={!!c.hasVoted || !canUpvote(c)}
                            title={!canUpvote(c) ? 'Voting is only allowed on Open and Escalated issues' : ''}
                            className={`${
                              c.hasVoted
                                ? 'bg-white/10 text-white/60 border border-white/20 cursor-not-allowed'
                                : !canUpvote(c)
                                ? 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed opacity-50'
                                : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                            }`}
                            size="sm"
                          >
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            {c.hasVoted ? 'Voted' : !canUpvote(c) ? 'Closed' : 'Upvote'}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state */}
          {!loading && displayedComplaints.length === 0 && (
            <div className="text-center py-16 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <Users className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 text-lg">No complaints found</p>
              <p className="text-white/40 text-sm mt-2">
                {deptFilter !== 'All'
                  ? `No issues in the "${deptFilter}" department${isAdmin && statusFilter !== 'All' ? ` with status "${statusFilter}"` : ''}.`
                  : 'Be the first to report an issue!'}
              </p>
              {deptFilter !== 'All' && (
                <button
                  onClick={() => { setDeptFilter('All'); setStatusFilter('All'); }}
                  className="mt-4 text-sm text-white/50 hover:text-white underline transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

        </div>
      </DashboardLayout>
    </>
  );
};

export default CommunityPortal;