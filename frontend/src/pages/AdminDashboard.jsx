import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { adminApi, complaintsApi } from '@/lib/api.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useToast } from '@/components/ui/use-toast';
import { Search, Filter, Clock, CheckCircle, BarChart, ThumbsUp, User, MapPin, Tag, Shield, Layers, AlertCircle } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const DEPARTMENTS = ['Roads', 'Water', 'Waste', 'Electricity', 'Parks', 'Traffic', 'Other'];

const DEPT_META = {
  Roads:       { icon: '🛣️',  label: 'Roads' },
  Water:       { icon: '💧',  label: 'Water' },
  Waste:       { icon: '🗑️',  label: 'Waste' },
  Electricity: { icon: '⚡',  label: 'Electricity' },
  Parks:       { icon: '🌳',  label: 'Parks' },
  Traffic:     { icon: '🚦',  label: 'Traffic' },
  Other:       { icon: '📋',  label: 'Other' },
};

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [filters, setFilters] = useState({ status: 'all', department: 'all', search: '' });
  const [activeDept, setActiveDept] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminApi.complaints();
        const allComplaints = response.complaints || [];
        const normalized = allComplaints.map((c) => ({
          ...c,
          status: String(c.status || '').toLowerCase(),
          image: c.image || c.imageUrl,
          location: c.location || { latitude: c.latitude, longitude: c.longitude },
        }));
        setComplaints(normalized);
        setFilteredComplaints(normalized);
      } catch {
        setComplaints([]);
        setFilteredComplaints([]);
      }
    };
    load();
  }, []);

  // Compute per-department counts from all complaints
  const deptCounts = complaints.reduce((acc, c) => {
    const cat = c.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    let result = complaints;
    if (activeDept !== 'all') {
      result = result.filter(c => c.category === activeDept);
    }
    if (filters.status !== 'all') {
      result = result.filter(c => c.status === filters.status);
    }
    if (filters.search) {
      result = result.filter(c =>
        c.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        c.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    setFilteredComplaints(result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }, [filters, complaints, activeDept]);

  const handleDeptTab = (dept) => {
    setActiveDept(dept);
    setFilters(prev => ({ ...prev, department: dept }));
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const reloadComplaints = async () => {
    const response = await adminApi.complaints();
    const allComplaints = response.complaints || [];
    const normalized = allComplaints.map((c) => ({
      ...c,
      status: String(c.status || '').toLowerCase(),
      image: c.image || c.imageUrl,
      location: c.location || { latitude: c.latitude, longitude: c.longitude },
    }));
    setComplaints(normalized);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await adminApi.updateStatus(id, status);
      if (status === 'resolved') {
        toast({ title: "Issue Resolved!", description: "Citizen has been awarded 10 points." });
      } else {
        toast({ title: "Status Updated!" });
      }
      await reloadComplaints();
      setSelectedComplaint(null);
    } catch (error) {
      toast({ title: "Failed to update status", description: error.message, variant: 'destructive' });
    }
  };
  
  const handleAssignDepartment = async (id, department) => {
    try {
      await complaintsApi.update(id, { assignedDepartment: department, status: 'assigned' });
      toast({ title: "Department Assigned!" });
      await reloadComplaints();
      setSelectedComplaint(null);
    } catch (error) {
      toast({ title: "Failed to assign department", description: error.message, variant: 'destructive' });
    }
  };

  const STATUS_CONFIG = {
    open:      { label: 'OPEN',      color: 'bg-blue-500/25 text-blue-300 border-blue-500/40',       Icon: Clock },
    assigned:  { label: 'ASSIGNED',  color: 'bg-amber-500/25 text-amber-300 border-amber-500/40',    Icon: AlertCircle },
    resolved:  { label: 'RESOLVED',  color: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40', Icon: CheckCircle },
    escalated: { label: 'ESCALATED', color: 'bg-rose-500/25 text-rose-300 border-rose-500/40',       Icon: AlertCircle },
  };

  const getStatusChip = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
    const { label, color, Icon } = cfg;
    return (
      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-sm ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - CITIFIX</title>
        <meta name="description" content="Manage and resolve civic issues." />
      </Helmet>
      <DashboardLayout>
        <div className="space-y-6">

          {/* ── Page Header ── */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-white/60 mt-1">Manage and resolve civic issues</p>
            </div>
          </div>

          {/* ── Department Tab Bar ── */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex flex-wrap gap-2">
              {/* All tab */}
              <button
                onClick={() => handleDeptTab('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeDept === 'all'
                    ? 'bg-white text-gray-900 shadow-md scale-105'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/15'
                }`}
              >
                <Layers className="w-4 h-4" />
                All Issues
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeDept === 'all' ? 'bg-gray-200 text-gray-700' : 'bg-white/20 text-white'
                }`}>
                  {complaints.length}
                </span>
              </button>

              {/* Per-department tabs */}
              {DEPARTMENTS.map(dept => {
                const meta = DEPT_META[dept];
                const count = deptCounts[dept] || 0;
                const isActive = activeDept === dept;
                return (
                  <button
                    key={dept}
                    onClick={() => handleDeptTab(dept)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-md scale-105'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/15'
                    }`}
                  >
                    <span className="text-base leading-none">{meta.icon}</span>
                    {meta.label}
                    {count > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-gray-200 text-gray-700' : 'bg-white/20 text-white'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Search + Status Filter ── */}
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-lg border border-white/10">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 w-5 h-5" />
                <Input
                  placeholder="Search by title or description…"
                  className="pl-10 bg-white/10 text-white border-white/20 placeholder:text-white/40 focus:border-white/40 focus:ring-white/20 backdrop-blur-sm"
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                />
              </div>
              <Select value={filters.status} onValueChange={value => handleFilterChange('status', value)}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white/10 text-white border-white/20 backdrop-blur-sm hover:bg-white/15">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl border-white/20 text-white">
                  <SelectItem value="all" className="hover:bg-white/20">All Statuses</SelectItem>
                  <SelectItem value="open" className="hover:bg-white/20">Open</SelectItem>
                  <SelectItem value="assigned" className="hover:bg-white/20">Assigned</SelectItem>
                  <SelectItem value="resolved" className="hover:bg-white/20">Resolved</SelectItem>
                  <SelectItem value="escalated" className="hover:bg-white/20">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredComplaints.map((c, index) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden cursor-pointer border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1"
                onClick={() => setSelectedComplaint(c)}
              >
               
                <div className="relative h-40 overflow-hidden">
                  <img 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                    alt={c.title} 
                    src={c.image || "https://images.unsplash.com/photo-1516180500701-0685eb8301a2"} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 right-3">
                    {getStatusChip(c.status)}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-lg text-white mb-3 line-clamp-1">{c.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4"/>
                      {c.category}
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4"/>
                      {c.votes}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

       
          {filteredComplaints.length === 0 && (
            <div className="text-center py-16 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <Shield className="w-16 h-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 text-lg">No complaints found</p>
              <p className="text-white/40 text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>

       
        {selectedComplaint && (
          <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
            <DialogContent className="max-w-4xl bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-2xl text-white border-white/20">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{selectedComplaint.title}</DialogTitle>
                <DialogDescription className="mt-2">{getStatusChip(selectedComplaint.status)}</DialogDescription>
              </DialogHeader>
              
              <div className="grid md:grid-cols-2 gap-6 mt-4 max-h-[70vh] overflow-y-auto pr-2">
             
                <div className="space-y-4">
                  <img 
                    className="w-full rounded-xl shadow-lg border border-white/20" 
                    alt={selectedComplaint.title} 
                    src={selectedComplaint.image || "https://images.unsplash.com/photo-1681582383536-bdae40763642"} 
                  />
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="font-semibold text-white mb-2">Description</p>
                    <p className="text-white/80 text-sm">{selectedComplaint.description}</p>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-white/80">
                      <User className="w-4 h-4 text-white/60"/>
                      <strong className="text-white">Reported by:</strong>
                      <span>{selectedComplaint.userName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <Tag className="w-4 h-4 text-white/60"/>
                      <strong className="text-white">Category:</strong>
                      <span>{selectedComplaint.category}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <MapPin className="w-4 h-4 text-white/60"/>
                      <strong className="text-white">Location:</strong>
                      <span className="truncate">{selectedComplaint.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/80">
                      <ThumbsUp className="w-4 h-4 text-white/60"/>
                      <strong className="text-white">Votes:</strong>
                      <span>{selectedComplaint.votes}</span>
                    </div>
                  </div>
                </div>
                
              
                <div className="space-y-4">
                  <div className="h-64 w-full rounded-xl overflow-hidden border border-white/20">
                    <MapContainer 
                      center={[selectedComplaint.location.latitude, selectedComplaint.location.longitude]} 
                      zoom={15} 
                      scrollWheelZoom={false} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[selectedComplaint.location.latitude, selectedComplaint.location.longitude]}>
                        <Popup>{selectedComplaint.title}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 space-y-4">
                    <div>
                      <Label className="text-white font-medium mb-2 block">Assign Department</Label>
                      <Select 
                        onValueChange={value => handleAssignDepartment(selectedComplaint.id, value)} 
                        defaultValue={selectedComplaint.assignedDepartment}
                      >
                        <SelectTrigger className="bg-white/10 text-white border-white/20 hover:bg-white/15">
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl border-white/20 text-white">
                          {DEPARTMENTS.map(dep => (
                            <SelectItem key={dep} value={dep} className="hover:bg-white/20">{dep}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedComplaint.status !== 'resolved' && (
                      <Button 
                        className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
                        onClick={() => handleStatusChange(selectedComplaint.id, 'resolved')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DashboardLayout>
    </>
  );
};

export default AdminDashboard;