import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, X, AlertTriangle, TrendingUp, MessageSquare, Shield, Clock } from 'lucide-react';
import { useSocket } from '@/contexts/SocketContext.jsx';
import { notificationsApi } from '@/lib/api.js';

const NOTIFICATION_ICONS = {
  COMPLAINT_CREATED: { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  COMPLAINT_VOTED: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20' },
  VOTE_MILESTONE: { icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  COMPLAINT_ESCALATED: { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  STATUS_CHANGED: { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  SLA_BREACH: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
  DEPARTMENT_ASSIGNED: { icon: Shield, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  RESOLUTION_CHALLENGED: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20' },
};

const timeAgo = (dateStr) => {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const { notifications, unreadCount, markNotificationRead, markAllRead, setInitialNotifications } = useSocket();

  // Load notifications on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await notificationsApi.list(1, 30);
        setInitialNotifications(data.notifications || [], data.unreadCount || 0);
      } catch {
        // Silently fail
      }
    };
    loadNotifications();
  }, [setInitialNotifications]);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkRead = async (id) => {
    markNotificationRead(id);
    try {
      await notificationsApi.markRead(id);
    } catch {
      // Silently fail
    }
  };

  const handleMarkAllRead = async () => {
    markAllRead();
    try {
      await notificationsApi.markAllRead();
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/10 hover:border-white/30 backdrop-blur-sm"
        id="notification-bell"
      >
        <Bell className="w-5 h-5 text-white" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse animation for unread */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-rose-500 rounded-full animate-ping opacity-30" />
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/15 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[11px] font-bold rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-white/10">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                  <Bell className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs mt-1">You'll be notified about updates here</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notif, idx) => {
                    const config = NOTIFICATION_ICONS[notif.type] || NOTIFICATION_ICONS.STATUS_CHANGED;
                    const Icon = config.icon;

                    return (
                      <motion.div
                        key={notif.id || idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => !notif.read && handleMarkRead(notif.id)}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-200 border-b border-white/5 ${
                          notif.read
                            ? 'bg-transparent hover:bg-white/5'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center mt-0.5`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-semibold leading-snug ${notif.read ? 'text-white/60' : 'text-white'}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 leading-relaxed ${notif.read ? 'text-white/40' : 'text-white/60'}`}>
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock className="w-3 h-3 text-white/30" />
                            <span className="text-[10px] text-white/30">
                              {timeAgo(notif.createdAt)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
