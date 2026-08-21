import { useEffect, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext.jsx';

/**
 * Hook to subscribe to a specific socket event.
 * Automatically handles cleanup on unmount.
 *
 * @param {string} event - Socket event name
 * @param {Function} callback - Event handler
 */
export const useSocketEvent = (event, callback) => {
  const { on } = useSocket();

  useEffect(() => {
    if (!event || !callback) return;
    const cleanup = on(event, callback);
    return cleanup;
  }, [event, callback, on]);
};

/**
 * Hook to subscribe to live analytics updates.
 * Subscribes on mount, unsubscribes on unmount.
 *
 * @param {Function} onUpdate - Called with analytics data each update
 */
export const useAnalyticsStream = (onUpdate) => {
  const { subscribeAnalytics, unsubscribeAnalytics, on } = useSocket();

  useEffect(() => {
    subscribeAnalytics();

    const cleanup = on('analytics:update', onUpdate);

    return () => {
      unsubscribeAnalytics();
      cleanup();
    };
  }, [subscribeAnalytics, unsubscribeAnalytics, on, onUpdate]);
};

export default useSocketEvent;
