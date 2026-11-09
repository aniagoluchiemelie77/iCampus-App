import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

// Location libraries are stubbed on web (metro.config.js).
const IS_WEB = Platform.OS === 'web';
const LOCATION_PERMISSION =
  Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

interface Options {
  /**
   * Ask the user for location access when true. Leave false on screens that
   * only benefit from a location: they still get one, silently, if access
   * was already granted. Flip it to true when the location is actually
   * needed (e.g. when the Store tab is opened), never just because a screen
   * mounted in the background.
   */
  prompt?: boolean;
}

export const useLocationServices = ({ prompt = false }: Options = {}) => {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<string>('undetermined');
  const isMounted = useRef(true);
  const requestedRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const getLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        if (isMounted.current) {
          setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      },
      (error) => console.log('[GEOLOCATION_ERROR]', error.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  /** Shows the system prompt (if not already decided) and reads the location. */
  const requestLocation = useCallback(async () => {
    if (IS_WEB) return RESULTS.UNAVAILABLE;
    try {
      const status = await request(LOCATION_PERMISSION);
      if (typeof status !== 'string' || !isMounted.current) return status;
      setLocationPermission(status);
      if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) getLocation();
      return status;
    } catch {
      return RESULTS.UNAVAILABLE;
    }
  }, [getLocation]);

  // On mount: no prompt, just use the location if access was already given.
  useEffect(() => {
    if (IS_WEB) return;
    let cancelled = false;
    Promise.resolve(check(LOCATION_PERMISSION))
      .then(status => {
        if (cancelled || !isMounted.current || typeof status !== 'string') return;
        setLocationPermission(status);
        if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) getLocation();
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [getLocation]);

  // Ask once, only when the caller says the location is needed now.
  useEffect(() => {
    if (!prompt || requestedRef.current) return;
    requestedRef.current = true;
    requestLocation();
  }, [prompt, requestLocation]);

  return { userCoords, locationPermission, requestLocation };
};
