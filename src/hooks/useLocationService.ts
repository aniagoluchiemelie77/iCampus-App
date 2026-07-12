import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export const useLocationServices = () => {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<string>('undetermined');
  const isMounted = useRef(true);

  useEffect(() => {
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

  const checkLocationPermission = useCallback(async () => {
    const status = await request(
      Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
    );
    if (!isMounted.current) return;
    setLocationPermission(status);
    if (status === RESULTS.GRANTED) getLocation();
  }, [getLocation]);

  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  return { userCoords, locationPermission };
};