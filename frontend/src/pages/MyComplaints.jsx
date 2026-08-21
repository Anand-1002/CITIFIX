
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { complaintsApi } from '@/lib/api.js';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, Calendar, CheckCircle, Clock, BarChart, Megaphone,
  ShieldAlert, X, AlertTriangle, ShieldCheck, MapPin, ThumbsUp,
  ImageOff
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast.js';

// Strip markdown bold/italic for clean display
const stripMarkdown = (text = '') =>
  text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/#{1,6}\s/g, '');

const STATUS_CONFIG = {
  open:      { label: 'Open',      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',     icon: Clock },
  assigned:  { label: 'Assigned',  color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',   icon: BarChart },
  resolved:  { label: 'Resolved',  color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle },
  escalated: { label: 'Escalated', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Megaphone },
};

const CATEGORY_COLORS = {
  Roads:       'bg-red-500/20 text-red-300',
  Water:       'bg-blue-500/20 text-blue-300',
  Waste:       'bg-green-500/20 text-green-300',
  Electricity: 'bg-yellow-500/20 text-yellow-300',
  Parks:       'bg-emerald-500/20 text-emerald-300',
  Traffic:     'bg-purple-500/20 text-purple-300',
  Other:       'bg-pink-500/20 text-pink-300',
};

const StatusBadge = ({ status, challenged }) => {
  if (challenged) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
      <ShieldAlert className="w-3 h-3" /> Challenged
    </span>
  );
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
};

const MyComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [challengeModal, setChallengeModal] = useState({ open: false, complaintId: null, title: '' });
  const [challengeReason, setChallengeReason] = useState('');
  const [submittingChallenge, setSubmittingChallenge] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const mine = await complaintsApi.listMine();
      setComplaints(mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChallenge = async () => {
    if (!challengeReason.trim()) {
      toast({ title: 'Please provide a reason', variant: 'destructive' });
      return;
    }
    setSubmittingChallenge(true);
    try {
      await complaintsApi.challengeResolution(challengeModal.complaintId, challengeReason);
      toast({ title: '⚠️ Resolution Challenged!', description: 'The complaint has been re-opened for review.' });
      setChallengeModal({ open: false, complaintId: null, title: '' });
      setChallengeReason('');
      await load();
    } catch (err) {
      toast({ title: 'Failed to challenge', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingChallenge(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>My Complaints - CITIFIX</title>
        <meta name="description" content="Track your submitted complaints and challenge fake resolutions." />
      </Helmet>

      <DashboardLayout>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Complaints</h1>
            <p className="text-white/40 text-sm mt-1">Track and manage your reported issues</p>
          </div>
          <span className="px-3 py-1.5 bg-white/10 rounded-xl text-white/60 text-sm font-medium">
            {complaints.length} {complaints.length === 1 ? 'complaint' : 'complaints'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/5 rounded-2xl h-48 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-24 bg-white/5 rounded-2xl border border-white/10">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-white text-xl font-semibold mb-2">No complaints yet</p>
            <p className="text-white/40 text-sm">Issues you report will appear here</p>
          </div>
        ) : (
          <div className="space-y-5">
            {complaints.map((c, i) => {
              const isExpanded = expandedId === c.id;
              const cleanDesc = stripMarkdown(c.description);
              const imgSrc = c.imageUrl || c.image;

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Image panel */}
                    <div className="sm:w-52 sm:flex-shrink-0 h-44 sm:h-auto relative bg-white/5">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={c.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/20">
                          <ImageOff className="w-8 h-8" />
                          <span className="text-xs">No photo</span>
                        </div>
                      )}
                      {/* Category pill over image */}
                      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_COLORS[c.category] || CATEGORY_COLORS.Other}`}>
                        {c.category}
                      </div>
                    </div>

                    {/* Content panel */}
                    <div className="flex-1 p-5 flex flex-col gap-3 min-w-0">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white/30 text-xs mb-1">#{c.id}</p>
                          <h2 className="text-white font-bold text-lg leading-snug">{c.title}</h2>
                        </div>
                        <StatusBadge status={c.status} challenged={c.resolutionChallenged} />
                      </div>

                      {/* Description */}
                      <div>
                        <p className={`text-white/55 text-sm leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {cleanDesc}
                        </p>
                        {cleanDesc.length > 120 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="text-white/40 hover:text-white/70 text-xs mt-1 transition-colors"
                          >
                            {isExpanded ? 'Show less ↑' : 'Read more ↓'}
                          </button>
                        )}
                      </div>

                      {/* Resolution proof photo */}
                      {c.resolutionImageUrl && (
                        <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-emerald-500/5">
                          <div className="px-3 py-1.5 bg-emerald-500/10 flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 text-xs font-bold">Resolution Proof Photo</span>
                          </div>
                          <img
                            src={c.resolutionImageUrl}
                            alt="Resolution proof"
                            className="w-full max-h-40 object-cover"
                          />
                        </div>
                      )}

                      {/* Footer row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-auto pt-3 border-t border-white/10">
                        <div className="flex items-center gap-4 text-white/35 text-xs">
                          {c.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[140px]">{c.address}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {c.votes || 0}
                          </span>
                        </div>

                        {/* Challenge button */}
                        {c.status === 'resolved' && !c.resolutionChallenged && (
                          <button
                            onClick={() => setChallengeModal({ open: true, complaintId: c.id, title: c.title })}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Challenge Resolution
                          </button>
                        )}
                        {c.resolutionChallenged && (
                          <span className="text-rose-400/60 text-xs italic flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> Challenge submitted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </DashboardLayout>

      {/* Challenge Modal */}
      <AnimatePresence>
        {challengeModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-start p-5 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" /> Challenge Resolution
                  </h3>
                  <p className="text-white/40 text-sm mt-0.5 line-clamp-1">{challengeModal.title}</p>
                </div>
                <button
                  onClick={() => { setChallengeModal({ open: false, complaintId: null, title: '' }); setChallengeReason(''); }}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-300">
                  ⚠️ This will re-open the complaint and notify the SuperAdmin that the resolution was not satisfactory.
                </div>
                <div>
                  <label className="text-white/60 text-xs font-medium block mb-2">Why is this resolution unsatisfactory?</label>
                  <textarea
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-rose-500 text-sm resize-none"
                    placeholder="e.g. The pothole was not properly filled, it's still dangerous..."
                    value={challengeReason}
                    onChange={e => setChallengeReason(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleChallenge}
                  disabled={submittingChallenge || !challengeReason.trim()}
                  className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {submittingChallenge
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><ShieldAlert className="w-4 h-4" /> Submit Challenge</>
                  }
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MyComplaints;
