import { useRef, useEffect, useState } from 'react';

const THRESHOLD = 72;

function pathMatches(path) {
  if (!path) return true;
  if (path === '/') return window.location.pathname === '/';
  return window.location.pathname === path || window.location.pathname.startsWith(`${path}/`);
}

function getScrollElement() {
  const activePersistent = document.querySelector('[data-persistent-scroll="true"][data-active="true"]');
  return activePersistent || document.scrollingElement || document.documentElement;
}

/**
 * Native-style pull-to-refresh that works with both the document scroller and
 * Top 7's persistent mobile tab scrollers.
 *
 * Pass { path } for persistent pages so only the currently visible tab handles
 * the gesture. This prevents hidden, still-mounted tabs from refreshing too.
 */
export default function usePullToRefresh(onRefresh, { enabled = true, path = null } = {}) {
  const startY = useRef(null);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) return undefined;

    const onTouchStart = (e) => {
      if (!pathMatches(path) || refreshingRef.current || e.touches.length !== 1) return;
      const scrollEl = getScrollElement();
      if ((scrollEl?.scrollTop || 0) <= 0) {
        startY.current = e.touches[0].clientY;
        distanceRef.current = 0;
      }
    };

    const onTouchMove = (e) => {
      if (startY.current === null || !pathMatches(path) || e.touches.length !== 1) return;
      const scrollEl = getScrollElement();
      if ((scrollEl?.scrollTop || 0) > 0) {
        startY.current = null;
        distanceRef.current = 0;
        setPulling(false);
        setPullDistance(0);
        return;
      }

      const dist = e.touches[0].clientY - startY.current;
      if (dist > 0) {
        if (e.cancelable) e.preventDefault();
        const damped = Math.min(dist * 0.72, THRESHOLD * 1.5);
        distanceRef.current = damped;
        setPulling(true);
        setPullDistance(damped);
      }
    };

    const onTouchEnd = async () => {
      if (startY.current === null || !pathMatches(path)) return;
      const shouldRefresh = distanceRef.current >= THRESHOLD;

      startY.current = null;
      setPulling(false);

      if (shouldRefresh && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        try {
          await onRefreshRef.current?.();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
        }
      }

      distanceRef.current = 0;
      setPullDistance(0);
    };

    const onTouchCancel = () => {
      startY.current = null;
      distanceRef.current = 0;
      setPulling(false);
      setPullDistance(0);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [enabled, path]);

  return { pulling, pullDistance, refreshing, threshold: THRESHOLD };
}
