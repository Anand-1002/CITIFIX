
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster';
import LandingPage from '@/pages/LandingPage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';
import RegisterPage from '@/pages/RegisterPage.jsx';
import CitizenDashboard from '@/pages/CitizenDashboard.jsx';
import AdminDashboard from '@/pages/AdminDashboard.jsx';
import AdminAnalytics from '@/pages/AdminAnalytics.jsx';
import AdminMap from '@/pages/AdminMap.jsx';
import CommunityPortal from '@/pages/CommunityPortal.jsx';
import ReportIssue from '@/pages/ReportIssue.jsx';
import MyComplaints from '@/pages/MyComplaints.jsx';
import Leaderboard from '@/pages/Leaderboard.jsx';
import Chatbot from '@/pages/Chatbot.jsx';
import SuperAdminPanel from '@/pages/SuperAdminPanel.jsx';
import SubAdminDashboard from '@/pages/SubAdminDashboard.jsx';
import CityHeatmap from '@/pages/CityHeatmap.jsx';
import RealTimeDashboard from '@/pages/RealTimeDashboard.jsx';
import SecuritySettings from '@/pages/SecuritySettings.jsx';
import { AuthProvider, useAuth } from '@/contexts/AuthContext.jsx';
import { SocketProvider } from '@/contexts/SocketContext.jsx';

function PrivateRoute({ children, role }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) {
      if (user.role === 'superadmin') return <Navigate to="/superadmin" />;
      if (user.role === 'admin') return <Navigate to="/admin" />;
      if (user.role === 'subadmin') return <Navigate to="/subadmin" />;
      return <Navigate to="/dashboard" />;
    }
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <Router>
        <Helmet>
          <title>CITIFIX - Civic Tech Platform</title>
          <meta name="description" content="Report public issues, track resolutions, and earn rewards. A civic-tech platform connecting citizens with municipal authorities." />
        </Helmet>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/community" element={<CommunityPortal />} />
            <Route path="/map" element={<CityHeatmap />} />
            
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute role="citizen">
                  <CitizenDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/report" 
              element={
                <PrivateRoute role="citizen">
                  <ReportIssue />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/my-complaints" 
              element={
                <PrivateRoute role="citizen">
                  <MyComplaints />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/leaderboard" 
              element={
                <PrivateRoute>
                  <Leaderboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/assistant" 
              element={
                <PrivateRoute>
                  <Chatbot />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/superadmin" 
              element={
                <PrivateRoute role="superadmin">
                  <SuperAdminPanel />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/subadmin" 
              element={
                <PrivateRoute role="subadmin">
                  <SubAdminDashboard />
                </PrivateRoute>
              } 
            />
            
            <Route 
              path="/admin" 
              element={
                <PrivateRoute role={["admin", "superadmin"]}>
                  <AdminDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/analytics" 
              element={
                <PrivateRoute role={["admin", "superadmin"]}>
                  <AdminAnalytics />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/map" 
              element={
                <PrivateRoute role={["admin", "superadmin"]}>
                  <AdminMap />
                </PrivateRoute>
              } 
            />

            <Route 
              path="/analytics" 
              element={
                <PrivateRoute role={["admin", "superadmin"]}>
                  <RealTimeDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/settings/security" 
              element={
                <PrivateRoute>
                  <SecuritySettings />
                </PrivateRoute>
              } 
            />
          </Routes>
          <Toaster />
        </div>
      </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
