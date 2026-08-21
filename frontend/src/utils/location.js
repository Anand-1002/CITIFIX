/**
 * Get device GPS with progressive accuracy improvement.
 * Strategy:
 *   1. First try a quick low-accuracy fix (network/WiFi) — fast but ~100m
 *   2. Then wait for a high-accuracy GPS fix — slower but ~10m
 *   3. If GPS times out, use the best fix we got so far
 *   4. Only fall back to IP geolocation if the device has NO geolocation at all
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      // Device has no GPS at all — fall back to IP (city-level)
      fetchIpLocation().then(resolve).catch(reject);
      return;
    }

    let bestFix = null;           // best position seen so far
    let resolved = false;

    const done = (position, isFallback = false) => {
      if (resolved) return;
      resolved = true;
      resolve({
        latitude:  position.coords ? position.coords.latitude  : position.latitude,
        longitude: position.coords ? position.coords.longitude : position.longitude,
        accuracy:  position.coords ? position.coords.accuracy  : 999,
        fallback:  isFallback,
      });
    };

    // Watch position — keeps improving accuracy as GPS locks on
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy; // metres — lower = better

        // Always store the best fix
        if (!bestFix || acc < bestFix.coords.accuracy) {
          bestFix = pos;
        }

        // If accuracy is good enough (≤ 100m), accept immediately
        if (acc <= 100) {
          navigator.geolocation.clearWatch(watchId);
          clearTimeout(hardTimeout);
          done(pos);
        }
      },
      (err) => {
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(hardTimeout);
        if (bestFix) {
          // Use the best fix we managed to get
          done(bestFix);
        } else {
          // Permission denied or no signal at all — IP fallback
          fetchIpLocation().then(loc => done(loc, true)).catch(reject);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,       // 20s per individual position attempt
        maximumAge: 0,        // never use cached position
      }
    );

    // Hard deadline: 25 seconds total. Use best fix so far or IP fallback.
    const hardTimeout = setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      if (bestFix) {
        done(bestFix);
      } else {
        fetchIpLocation().then(loc => done(loc, true)).catch(reject);
      }
    }, 25000);
  });
};

const fetchIpLocation = () =>
  fetch('https://ipapi.co/json/')
    .then(r => r.json())
    .then(d => ({
      latitude:  d.latitude,
      longitude: d.longitude,
      accuracy:  5000,   // IP geolocation is ~5km accurate
      fallback:  true,
      city:      d.city,
      region:    d.region,
    }));

export const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
};