import React, { useState } from 'react';
import citifixLogo from '@/assets/citifix-logo.png';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext.jsx';
import { motion } from 'framer-motion';
import { Home, FileText, Users, Award, LogOut, Shield, BarChart2, Map, Menu, X, MessageCircle, Settings, Activity, Lock, Wifi, WifiOff } from 'lucide-react';
import NotificationCenter from './NotificationCenter.jsx';
import SidebarLiveAnalytics from './SidebarLiveAnalytics.jsx';
import Beams from '../components/Background';

const commonLinks = [
  { to: '/analytics', icon: Activity, label: 'Real-Time Analytics', isLive: true },
  { to: '/community', icon: Users, label: 'Community' },
  { to: '/leaderboard', icon: Award, label: 'Leaderboard' },
  { to: '/assistant', icon: MessageCircle, label: 'AI Assistant' },
  { to: '/settings/security', icon: Lock, label: 'Security' },
];

const citizenLinks = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/my-complaints', icon: FileText, label: 'My Complaints' },
];

const adminLinks = [
  { to: '/admin', icon: Shield, label: 'Dashboard' },
  { to: '/admin/analytics', icon: BarChart2, label: 'Reports' },
  { to: '/admin/map', icon: Map, label: 'Map View' },
];

const superAdminLinks = [
  { to: '/superadmin', icon: Settings, label: 'System Control' },
  ...adminLinks,
];

const subAdminLinks = [
  { to: '/subadmin', icon: FileText, label: 'My Assignments' },
];

const SidebarLink = ({ to, icon: Icon, label, onClick, isLive }) => (
  <NavLink
    to={to}
    end={to === '/admin'}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
          : 'text-white/70 hover:bg-white/10 hover:text-white backdrop-blur-sm border border-transparent hover:border-white/20'
      }`
    }
  >
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </div>
    {isLive && (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        Live
      </span>
    )}
  </NavLink>
);

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logoUrl = citifixLogo;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  let links = citizenLinks;
  let roleTitle = "Citizen Portal";
  if (user.role === 'superadmin') {
    links = superAdminLinks;
    roleTitle = "SuperAdmin Control";
  } else if (user.role === 'admin') {
    links = adminLinks;
    roleTitle = "Admin Panel";
  } else if (user.role === 'subadmin') {
    links = subAdminLinks;
    roleTitle = "Sub-Admin Portal";
  }

  return (
    <div className="relative flex min-h-screen bg-black text-white overflow-hidden">
 
      <div className="fixed inset-0 z-0">
        <Beams
          beamWidth={2}
          beamHeight={15}
          beamNumber={12}
          lightColor="#ffffff"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={0}
        />
      </div>


      {!sidebarOpen && (
  <button
    onClick={() => setSidebarOpen(true)}
    className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all"
  >
    <Menu className="w-6 h-6" />
  </button>
)}


    
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-72 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl
          border-r border-white/10 p-6
          flex flex-col justify-between overflow-y-auto
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]
        `}
      >
        <div>
          <div className="lg:hidden absolute top-4 right-4 z-50">
  <button
    onClick={() => setSidebarOpen(false)}
    className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all"
  >
    <X className="w-6 h-6" />
  </button>
</div>

          <div className="flex items-center gap-3 mb-10 p-3 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
            <img src={logoUrl} alt="CITIFIX Logo" className="w-11 h-11 rounded-xl shadow-lg" />
            <div>
              <span className="text-xl font-bold text-white block">CITIFIX</span>
              <span className="text-xs text-white/60">{roleTitle}</span>
            </div>
          </div>

          <div className="mb-8 p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-full flex items-center justify-center text-white font-bold text-lg border border-white/20">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{user.name}</p>
                <p className="text-white/60 text-sm truncate">{user.email || user.phone}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            {links.map(link => (
              <SidebarLink 
                key={link.to} 
                {...link} 
                onClick={() => setSidebarOpen(false)}
              />
            ))}
            <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
              {commonLinks.map(link => (
                <SidebarLink 
                  key={link.to} 
                  {...link}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </div>
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10 mt-6">
          <SidebarLiveAnalytics onNavigate={() => setSidebarOpen(false)} />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-white transition-all duration-300 backdrop-blur-sm border border-transparent hover:border-red-500/30 group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

     <main className="relative flex-1 pt-20 sm:pt-6 lg:pt-8 p-4 overflow-auto z-10">

        {/* Top bar with notification bell and connection status */}
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-3 mb-4 px-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            {connected ? (
              <><Wifi className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400 text-[11px] font-medium">Live</span></>
            ) : (
              <><WifiOff className="w-3.5 h-3.5 text-white/40" /><span className="text-white/40 text-[11px] font-medium">Offline</span></>
            )}
          </div>
          <NotificationCenter />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto"
        >
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(255,255,255,0.1)] p-6 sm:p-8 min-h-[calc(100vh-8rem)]">
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default DashboardLayout;