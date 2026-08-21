import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  // Connect socket when user logs in
  useEffect(() => {
    if (!user) {
      // Disconnect on logout
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('citifix_token');
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] ✅ Connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ Disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setConnected(false);
    });

    // Listen for new notifications
    newSocket.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Subscribe to a specific event
  const on = useCallback((event, callback) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on(event, callback);
    return () => socketRef.current?.off(event, callback);
  }, []);

  // Emit an event
  const emit = useCallback((event, data) => {
    if (!socketRef.current) return;
    socketRef.current.emit(event, data);
  }, []);

  // Subscribe to analytics room
  const subscribeAnalytics = useCallback(() => {
    emit('subscribe:analytics');
  }, [emit]);

  const unsubscribeAnalytics = useCallback(() => {
    emit('unsubscribe:analytics');
  }, [emit]);

  // Mark a notification as read locally
  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Mark all as read locally
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Set notifications from API
  const setInitialNotifications = useCallback((notifs, count) => {
    setNotifications(notifs);
    setUnreadCount(count);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        notifications,
        unreadCount,
        on,
        emit,
        subscribeAnalytics,
        unsubscribeAnalytics,
        markNotificationRead,
        markAllRead,
        setInitialNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
