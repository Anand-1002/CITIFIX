import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subAdminApi, complaintsApi, bidsApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, MapPin, AlertTriangle, CheckCircle, ChevronDown,
  IndianRupee, ShieldCheck, CalendarClock, FileText, X,
  AlertOctagon, Wrench, CheckCircle2, Camera, Upload, ShieldAlert, Gavel, Trophy, ChevronUp
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";

const SubAdminDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [assignedRaisedIssues, setAssignedRaisedIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bid system states
  const [deptBids, setDeptBids] = useState([]);
  const [expandedBidId, setExpandedBidId] = useState(null);
  const [proposalForms, setProposalForms] = useState({}); // { [bidId]: { quotedBudget, proposedDays, teamSize, approach } }
  const [submittingProposal, setSubmittingProposal] = useState(null); // bidId being submitted

  // Extension modal
  const [extensionModal, setExtensionModal] = useState({ isOpen: false, complaintId: null });
  const [extReason, setExtReason] = useState("");
  const [extDays, setExtDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Raise Issue modal
  const [raiseModal, setRaiseModal] = useState({ isOpen: false, complaintId: null, complaintTitle: "" });
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [raising, setRaising] = useState(false);

  // Resolution Proof modal
  const [proofModal, setProofModal] = useState({ isOpen: false, complaintId: null, title: "" });
  const [proofImage, setProofImage] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [complaintsData, raisedData, bidsData] = await Promise.all([
        subAdminApi.myComplaints(),
        subAdminApi.getAssignedRaisedIssues(),
        bidsApi.myDeptBids(),
      ]);
      setComplaints(complaintsData);
      setAssignedRaisedIssues(raisedData);
      setDeptBids(bidsData);
    } catch (err) {
      toast({ title: "Error fetching data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      await subAdminApi.updateStatus(complaintId, newStatus);
      toast({ title: "Status updated" });
      fetchAll();
    } catch (err) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    }
  };

  const openExtensionModal = (complaintId) => {
    setExtReason("");
    setExtDays("");
    setExtensionModal({ isOpen: true, complaintId });
  };

  const handleSubmitExtension = async () => {
    if (!extReason.trim() || !extDays || parseInt(extDays) < 1) {
      toast({ title: "Please provide a reason and number of days (min 1)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await subAdminApi.requestExtension(extensionModal.complaintId, {
        reason: extReason.trim(),
        requestedDays: parseInt(extDays),
      });
      toast({ title: "Extension request submitted ✅", description: "Awaiting SuperAdmin approval." });
      setExtensionModal({ isOpen: false, complaintId: null });
      fetchAll();
    } catch (err) {
      toast({ title: "Failed to submit", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openRaiseModal = (complaint) => {
    setIssueTitle("");
    setIssueDesc("");
    setRaiseModal({ isOpen: true, complaintId: complaint.id, complaintTitle: complaint.title });
  };

  const handleSubmitRaisedIssue = async () => {
    if (!issueTitle.trim() || !issueDesc.trim()) {
      toast({ title: "Please fill in both title and description", variant: "destructive" });
      return;
    }
    setRaising(true);
    try {
      await subAdminApi.raiseIssue(raiseModal.complaintId, {
        title: issueTitle.trim(),
        description: issueDesc.trim(),
      });
      toast({ title: "Issue raised ✅", description: "SuperAdmin will review and assign someone to fix it." });
      setRaiseModal({ isOpen: false, complaintId: null, complaintTitle: "" });
      fetchAll();
    } catch (err) {
      toast({ title: "Failed to raise issue", description: err.message, variant: "destructive" });
    } finally {
      setRaising(false);
    }
  };

  const handleResolveRaisedIssue = async (id) => {
    try {
      await subAdminApi.resolveRaisedIssue(id);
      toast({ title: "Issue resolved ✅", description: "The original project will now resume." });
      fetchAll();
    } catch (err) {
      toast({ title: "Failed to resolve", description: err.message, variant: "destructive" });
    }
  };

  const handleSubmitProposal = async (bidId) => {
    const form = proposalForms[bidId];
    if (!form?.quotedBudget || !form?.proposedDays || !form?.approach?.trim()) {
      toast({ title: "Please fill Budget, Days and Approach", variant: "destructive" });
      return;
    }
    setSubmittingProposal(bidId);
    try {
      await bidsApi.submitProposal(bidId, {
        quotedBudget: form.quotedBudget,
        proposedDays: form.proposedDays,
        teamSize: form.teamSize || undefined,
        approach: form.approach.trim(),
      });
      toast({ title: "📋 Proposal submitted!", description: "The SuperAdmin will review it." });
      fetchAll();
    } catch (err) {
      toast({ title: "Failed to submit proposal", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingProposal(null);
    }
  };

  const initProposalForm = (bid) => {
    const existing = bid.proposals?.[0];
    setProposalForms(prev => ({
      ...prev,
      [bid.id]: {
        quotedBudget: existing?.quotedBudget || "",
        proposedDays: existing?.proposedDays || "",
        teamSize: existing?.teamSize || "",
        approach: existing?.approach || "",
      }
    }));
    setExpandedBidId(prev => prev === bid.id ? null : bid.id);
  };

  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const handleProofImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setProofImage(compressed);
  };

  const handleSubmitProof = async () => {
    if (!proofImage) {
      toast({ title: "Please upload a proof photo", variant: "destructive" });
      return;
    }
    setSubmittingProof(true);
    try {
      await complaintsApi.resolveWithProof(proofModal.complaintId, proofImage);
      toast({ title: "✅ Complaint resolved with proof!", description: "The citizen will be notified." });
      setProofModal({ isOpen: false, complaintId: null, title: "" });
      setProofImage(null);
      fetchAll();
    } catch (err) {
      toast({ title: "Failed to resolve", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingProof(false);
    }
  };

  return (
    <DashboardLayout>
      {/* My Assignments */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Assignments</h1>
        <p className="text-white/60">Manage and resolve issues assigned to you.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">All Caught Up!</h3>
          <p className="text-white/60">You have no pending assignments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {complaints.map((complaint) => {
            const deadline = complaint.projectDeadline || complaint.slaDeadline;
            const isOverdue = deadline && new Date(deadline) < new Date() && complaint.status !== "resolved";
            const daysRemaining = deadline ? Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
            const latestExtRequest = complaint.extensionRequests?.[0];
            const isOnHold = complaint.isOnHold;
            const pendingRaisedIssue = complaint.raisedIssues?.find(r => r.status !== "RESOLVED");

            return (
              <motion.div
                key={complaint.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white/5 backdrop-blur-md rounded-2xl border ${
                  isOnHold
                    ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                    : isOverdue
                    ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                    : "border-white/10"
                } overflow-hidden flex flex-col`}
              >
                {complaint.imageUrl && (
                  <div className="h-48 overflow-hidden relative">
                    <img src={complaint.imageUrl} alt={complaint.title} className="w-full h-full object-cover" />
                    {isOnHold && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" /> WAITING
                      </div>
                    )}
                    {!isOnHold && isOverdue && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> SLA BREACHED
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-white/80">
                      #{complaint.id} · {complaint.category}
                    </span>
                    <div className="flex gap-2 items-center">
                      {isOnHold && !complaint.imageUrl && (
                        <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> WAITING
                        </span>
                      )}
                      {!isOnHold && !complaint.imageUrl && isOverdue && (
                        <span className="text-red-400 text-xs font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> OVERDUE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* WAITING Banner */}
                  {isOnHold && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                      <p className="text-amber-400 text-xs font-bold mb-1 flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3" /> PROJECT ON HOLD
                      </p>
                      {pendingRaisedIssue && (
                        <p className="text-amber-300/70 text-xs">
                          Raised: <span className="font-semibold">{pendingRaisedIssue.title}</span> — awaiting SuperAdmin assignment
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{complaint.title}</h3>
                    <p className="text-white/60 text-sm line-clamp-2">{complaint.description}</p>
                  </div>

                  {/* Project Details */}
                  {(complaint.projectAmount || complaint.warrantyPeriod || complaint.projectNote) && (
                    <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-2">
                      <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Project Details</p>
                      {complaint.projectAmount && (
                        <div className="flex items-center gap-2 text-sm text-white/80">
                          <IndianRupee className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>Budget: <span className="text-amber-400 font-semibold">₹{complaint.projectAmount.toLocaleString()}</span></span>
                        </div>
                      )}
                      {complaint.warrantyPeriod && (
                        <div className="flex items-center gap-2 text-sm text-white/80">
                          <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span>Warranty: <span className="text-blue-400 font-semibold">{complaint.warrantyPeriod} days</span> after resolution</span>
                        </div>
                      )}
                      {complaint.projectNote && (
                        <div className="flex items-start gap-2 text-sm text-white/80">
                          <FileText className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                          <span className="text-white/60 italic">{complaint.projectNote}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Deadline & Location */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="truncate">{complaint.address || "Location provided"}</span>
                    </div>
                    {deadline && (
                      <div className={`flex items-center gap-2 text-sm ${isOverdue ? "text-red-400 font-medium" : "text-white/70"}`}>
                        <CalendarClock className="w-4 h-4" />
                        <span>
                          {complaint.projectDeadline ? "Project Deadline" : "SLA Deadline"}: {new Date(deadline).toLocaleDateString()} ({isOverdue ? "Overdue" : `${daysRemaining}d left`})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Extension Request Status */}
                  {latestExtRequest && (
                    <div className={`rounded-xl border px-4 py-2 text-xs font-medium ${
                      latestExtRequest.status === "PENDING" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                      latestExtRequest.status === "APPROVED" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                      "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}>
                      Extension request: <span className="font-bold">{latestExtRequest.status}</span>
                      {latestExtRequest.status === "PENDING" && " — awaiting SuperAdmin review"}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-white/10 space-y-3 mt-auto">
                    {/* Resolve with Proof button */}
                    {complaint.status !== "resolved" && !isOnHold && (
                      <button
                        onClick={() => { setProofImage(null); setProofModal({ isOpen: true, complaintId: complaint.id, title: complaint.title }); }}
                        className="w-full py-3 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" /> Resolve with Proof Photo
                      </button>
                    )}
                    {complaint.status === "resolved" && (
                      <div className="flex items-center justify-center gap-2 py-2 text-emerald-400 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Resolved
                      </div>
                    )}

                    <div className="flex gap-2">
                      {/* Request Extension button */}
                      {complaint.status !== "resolved" && !isOnHold && (!latestExtRequest || latestExtRequest.status === "REJECTED") && (
                        <button
                          onClick={() => openExtensionModal(complaint.id)}
                          className="flex-1 py-2.5 px-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <Clock className="w-4 h-4" /> Request Extension
                        </button>
                      )}

                      {/* Raise Issue button */}
                      {complaint.status !== "resolved" && !isOnHold && (
                        <button
                          onClick={() => openRaiseModal(complaint)}
                          className="flex-1 py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                        >
                          <AlertOctagon className="w-4 h-4" /> Raise an Issue
                        </button>
                      )}
                    </div>
                    {isOnHold && (
                      <p className="text-amber-400/70 text-xs text-center">⚠️ Status locked while a raised issue is pending</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── Issues Assigned TO This SubAdmin (to resolve) ─── */}
      {assignedRaisedIssues.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center border border-rose-500/30">
              <Wrench className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Issues Assigned to You</h2>
              <p className="text-white/50 text-sm">Resolve these to unblock other project teams</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {assignedRaisedIssues.map((issue) => (
              <motion.div
                key={issue.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Raised Issue #{issue.id}</span>
                    <h3 className="text-white font-semibold text-lg mt-1">{issue.title}</h3>
                  </div>
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 font-bold">
                    {issue.status}
                  </span>
                </div>
                <p className="text-white/60 text-sm">{issue.description}</p>
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Related Project</p>
                  <p className="text-white text-sm font-medium">#{issue.complaint.id} · {issue.complaint.title}</p>
                  <p className="text-white/50 text-xs mt-0.5">{issue.complaint.category}</p>
                </div>
                <p className="text-white/40 text-xs">Raised by: <span className="text-white/70">{issue.raisedBy?.name}</span> · {new Date(issue.createdAt).toLocaleDateString()}</p>
                <button
                  onClick={() => handleResolveRaisedIssue(issue.id)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Project Bids Section ─── */}
      <div className="mt-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/30">
            <Gavel className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Project Bids</h2>
            <p className="text-white/50 text-sm">Open tenders in your department — submit your proposal</p>
          </div>
          {deptBids.filter(b => b.proposals.length === 0).length > 0 && (
            <span className="ml-auto bg-amber-500 text-black text-xs font-bold rounded-full px-3 py-1">
              {deptBids.filter(b => b.proposals.length === 0).length} new
            </span>
          )}
        </div>

        {deptBids.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
            <Gavel className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 italic">No open bids in your department right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deptBids.map(bid => {
              const myProposal = bid.proposals?.[0];
              const isExpanded = expandedBidId === bid.id;
              const form = proposalForms[bid.id] || {};
              const deadlinePassed = new Date(bid.deadline) < new Date();

              return (
                <div key={bid.id} className={`rounded-2xl border overflow-hidden ${
                  myProposal?.status === "AWARDED" ? "border-emerald-500/40 bg-emerald-500/5" :
                  myProposal?.status === "REJECTED" ? "border-rose-500/20 opacity-60" :
                  myProposal ? "border-blue-500/30 bg-blue-500/5" :
                  "border-amber-500/30 bg-amber-500/5"
                }`}>
                  {/* Bid Summary Row */}
                  <div className="p-5 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {myProposal?.status === "AWARDED" && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> YOU WON
                          </span>
                        )}
                        {myProposal?.status === "REJECTED" && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Not Selected</span>
                        )}
                        {myProposal?.status === "PENDING" && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">⏳ Proposal Submitted</span>
                        )}
                        {!myProposal && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">🆕 Open</span>
                        )}
                        <span className="text-white/40 text-xs">#{bid.complaint?.id} · {bid.department}</span>
                      </div>
                      <h4 className="font-bold text-white">{bid.title}</h4>
                      <p className="text-white/50 text-sm line-clamp-2 mt-0.5">{bid.scope}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/40">
                        {bid.estimatedBudget && <span>Est. ₹{bid.estimatedBudget.toLocaleString()}</span>}
                        <span>Exp. timeline: {bid.projectTimeline}d</span>
                        <span className={deadlinePassed ? "text-rose-400 font-bold" : ""}>
                          Bid deadline: {new Date(bid.deadline).toLocaleDateString()}{deadlinePassed ? " (Closed)" : ""}
                        </span>
                      </div>
                    </div>
                    <div>
                      {myProposal?.status !== "REJECTED" && (
                        <button
                          onClick={() => initProposalForm(bid)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                            myProposal?.status === "AWARDED"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : myProposal
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
                          }`}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {myProposal?.status === "AWARDED" ? "View My Proposal" : myProposal ? "Edit Proposal" : "Submit Proposal"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Proposal Form */}
                  {isExpanded && myProposal?.status !== "AWARDED" && (
                    <div className="border-t border-white/10 p-5 space-y-4 bg-black/20">
                      <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">
                        {myProposal ? "Edit Your Proposal (not yet awarded)" : "Your Proposal"}
                      </p>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-white/50 text-xs font-medium mb-1">Your Budget (₹) *</label>
                          <input
                            type="number" placeholder="e.g. 85000"
                            value={form.quotedBudget || ""}
                            onChange={e => setProposalForms(p => ({ ...p, [bid.id]: { ...p[bid.id], quotedBudget: e.target.value } }))}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-white/50 text-xs font-medium mb-1">Days to Complete *</label>
                          <input
                            type="number" placeholder="e.g. 12"
                            value={form.proposedDays || ""}
                            onChange={e => setProposalForms(p => ({ ...p, [bid.id]: { ...p[bid.id], proposedDays: e.target.value } }))}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-white/50 text-xs font-medium mb-1">Team Size</label>
                          <input
                            type="number" placeholder="No. of workers"
                            value={form.teamSize || ""}
                            onChange={e => setProposalForms(p => ({ ...p, [bid.id]: { ...p[bid.id], teamSize: e.target.value } }))}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/50 text-xs font-medium mb-1">Your Approach *</label>
                        <textarea
                          rows={3}
                          placeholder="Describe how you'll complete this project, equipment needed, work phases..."
                          value={form.approach || ""}
                          onChange={e => setProposalForms(p => ({ ...p, [bid.id]: { ...p[bid.id], approach: e.target.value } }))}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 text-sm resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleSubmitProposal(bid.id)}
                        disabled={submittingProposal === bid.id}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Gavel className="w-4 h-4" />
                        {submittingProposal === bid.id ? "Submitting..." : myProposal ? "Update Proposal" : "Submit Proposal"}
                      </button>
                    </div>
                  )}

                  {/* Awarded view */}
                  {isExpanded && myProposal?.status === "AWARDED" && (
                    <div className="border-t border-emerald-500/20 p-5 bg-emerald-500/5">
                      <p className="text-emerald-400 font-bold mb-3 flex items-center gap-2"><Trophy className="w-4 h-4" /> Your Winning Proposal</p>
                      <div className="grid sm:grid-cols-3 gap-3 text-sm">
                        <div><span className="text-white/40 block text-xs">Budget</span><span className="text-amber-400 font-bold">₹{myProposal.quotedBudget.toLocaleString()}</span></div>
                        <div><span className="text-white/40 block text-xs">Timeline</span><span className="text-white font-semibold">{myProposal.proposedDays} days</span></div>
                        {myProposal.teamSize && <div><span className="text-white/40 block text-xs">Team Size</span><span className="text-white font-semibold">{myProposal.teamSize} workers</span></div>}
                      </div>
                      <p className="text-white/60 text-sm mt-3">{myProposal.approach}</p>
                      <p className="text-emerald-400/70 text-xs mt-3">✅ You have been assigned to the complaint. Check your assignments above.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Extension Request Modal ─── */}

      <AnimatePresence>
        {extensionModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center p-5 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-white">Request Time Extension</h3>
                  <p className="text-white/40 text-sm">Your request will be reviewed by a SuperAdmin</p>
                </div>
                <button onClick={() => setExtensionModal({ isOpen: false, complaintId: null })} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1">Additional Days Needed</label>
                  <input
                    type="number" min="1" placeholder="e.g. 7" value={extDays} onChange={e => setExtDays(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1">Reason for Extension</label>
                  <textarea
                    rows={4} placeholder="Explain why more time is needed..." value={extReason} onChange={e => setExtReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500 text-sm resize-none"
                  />
                </div>
                <button onClick={handleSubmitExtension} disabled={submitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all">
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Raise Issue Modal ─── */}
      <AnimatePresence>
        {raiseModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-rose-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center p-5 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-rose-400" /> Raise an Issue
                  </h3>
                  <p className="text-white/40 text-sm mt-0.5">Re: <span className="text-white/60">{raiseModal.complaintTitle}</span></p>
                </div>
                <button onClick={() => setRaiseModal({ isOpen: false, complaintId: null, complaintTitle: "" })} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-amber-400 text-xs">⚠️ Raising an issue will put your project on <span className="font-bold">WAITING</span> status until a SuperAdmin assigns someone to resolve it.</p>
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1">Issue Title</label>
                  <input
                    type="text" placeholder="e.g. Missing materials, blocked access..." value={issueTitle} onChange={e => setIssueTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-rose-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1">Detailed Description</label>
                  <textarea
                    rows={4} placeholder="Describe the issue in detail..." value={issueDesc} onChange={e => setIssueDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-rose-500 text-sm resize-none"
                  />
                </div>
                <button onClick={handleSubmitRaisedIssue} disabled={raising}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                  <AlertOctagon className="w-4 h-4" />
                  {raising ? "Raising Issue..." : "Raise Issue"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Resolution Proof Modal ─── */}
      <AnimatePresence>
        {proofModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111] border border-emerald-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center p-5 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" /> Resolve with Proof
                  </h3>
                  <p className="text-white/40 text-sm mt-0.5 line-clamp-1">{proofModal.title}</p>
                </div>
                <button onClick={() => { setProofModal({ isOpen: false, complaintId: null, title: "" }); setProofImage(null); }} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-sm text-emerald-300">
                  📸 Upload an "after" photo showing the issue has been fixed. The citizen will see this proof and can challenge if unsatisfied.
                </div>

                <div className="flex gap-3">
                  <label className="flex-1 cursor-pointer">
                    <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all">
                      <Camera className="w-6 h-6 text-emerald-400" />
                      <span className="text-sm font-medium">Take Photo</span>
                    </div>
                    <input type="file" accept="image/*" capture="environment" onChange={handleProofImageChange} className="hidden" />
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all">
                      <Upload className="w-6 h-6 text-indigo-400" />
                      <span className="text-sm font-medium">Upload File</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleProofImageChange} className="hidden" />
                  </label>
                </div>

                {proofImage && (
                  <div className="relative">
                    <img src={proofImage} alt="Proof preview" className="w-full rounded-xl max-h-48 object-cover border border-emerald-500/30" />
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Ready
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmitProof}
                  disabled={submittingProof || !proofImage}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {submittingProof
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><CheckCircle2 className="w-4 h-4" /> Submit Resolution Proof</>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default SubAdminDashboard;
