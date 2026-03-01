import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Clock, MapPin, LogOut, CheckCircle, XCircle, Navigation } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
}

interface ActiveEntry {
  id: string;
  site_id: string;
  clock_in_time: string;
  site: { name: string };
}

export const EmployeeDashboard: React.FC = () => {
  const { signOut, profile } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [nearestSite, setNearestSite] = useState<{ site: Site; distance: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationLogIntervalRef = useRef<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('0:00:00');
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadSites();
    loadActiveEntry();
    startLocationTracking();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (locationLogIntervalRef.current !== null) {
        clearInterval(locationLogIntervalRef.current);
      }
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentLocation && sites.length > 0) {
      findNearestSite();
    }
  }, [currentLocation, sites]);

  useEffect(() => {
    if (activeEntry) {
      if (currentLocation) {
        logLocation();
      }
      updateTimer();
      timerIntervalRef.current = window.setInterval(updateTimer, 1000);
    } else {
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
      }
      setElapsedTime('0:00:00');
    }

    return () => {
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeEntry]);

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError('');
        },
        (error) => {
          setLocationError('Unable to get your location. Please enable location services.');
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    updateLocation();

    watchIdRef.current = window.setInterval(() => {
      updateLocation();
    }, 900000);

    locationLogIntervalRef.current = window.setInterval(() => {
      if (activeEntry && currentLocation) {
        logLocation();
      }
    }, 900000);
  };

  const loadSites = async () => {
    const { data, error } = await supabase
      .from('tt_sites')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error loading sites:', error);
    } else {
      setSites(data || []);
    }
  };

  const loadActiveEntry = async () => {
    const { data, error } = await supabase
      .from('tt_time_entries')
      .select(`
        id,
        site_id,
        clock_in_time,
        site:sites!time_entries_site_id_fkey (name)
      `)
      .eq('user_id', profile?.id)
      .is('clock_out_time', null)
      .maybeSingle();

    if (error) {
      console.error('Error loading active entry:', error);
    } else {
      setActiveEntry(data as any);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const findNearestSite = () => {
    if (!currentLocation) return;

    let nearest: { site: Site; distance: number } | null = null;

    sites.forEach((site) => {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        site.latitude,
        site.longitude
      );

      if (!nearest || distance < nearest.distance) {
        nearest = { site, distance };
      }
    });

    setNearestSite(nearest);
  };

  const isWithinGeofence = (site: Site): boolean => {
    if (!currentLocation) return false;
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      site.latitude,
      site.longitude
    );
    return distance <= site.geofence_radius;
  };

  const logLocation = async () => {
    if (!activeEntry || !currentLocation) return;

    await supabase.from('tt_location_logs').insert({
      time_entry_id: activeEntry.id,
      user_id: profile?.id,
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      accuracy: 10,
    });
  };

  const handleClockIn = async (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;

    if (!isWithinGeofence(site)) {
      alert(`You must be within ${site.geofence_radius}m of ${site.name} to clock in`);
      return;
    }

    if (!currentLocation) {
      alert('Unable to get your location. Please enable location services.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('tt_time_entries')
      .insert({
        user_id: profile?.id,
        site_id: siteId,
        clock_in_latitude: currentLocation.lat,
        clock_in_longitude: currentLocation.lng,
      })
      .select(`
        id,
        site_id,
        clock_in_time,
        site:sites!time_entries_site_id_fkey (name)
      `)
      .single();

    if (error) {
      alert('Error clocking in: ' + error.message);
    } else {
      setActiveEntry(data as any);
      logLocation();
    }

    setLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeEntry || !currentLocation) return;

    setLoading(true);

    const { error } = await supabase
      .from('tt_time_entries')
      .update({
        clock_out_time: new Date().toISOString(),
        clock_out_latitude: currentLocation.lat,
        clock_out_longitude: currentLocation.lng,
      })
      .eq('id', activeEntry.id);

    if (error) {
      alert('Error clocking out: ' + error.message);
    } else {
      setActiveEntry(null);
    }

    setLoading(false);
  };

  const updateTimer = () => {
    if (!activeEntry) return;

    const start = new Date(activeEntry.clock_in_time);
    const now = new Date();
    const diff = now.getTime() - start.getTime();

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TimeTracker</h1>
              <p className="text-sm text-gray-500">{profile?.full_name}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {locationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">{locationError}</p>
              <p className="text-xs text-red-600 mt-1">Location services are required to clock in/out</p>
            </div>
          </div>
        )}

        {currentLocation && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Location tracking active
              </p>
              <p className="text-xs text-green-600 mt-1">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
            </div>
          </div>
        )}

        {activeEntry ? (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl p-8 mb-8 border-2 border-green-200">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-6 shadow-lg animate-pulse">
                <Clock className="w-12 h-12 text-white" />
              </div>
              <div className="mb-6">
                <div className="inline-block px-4 py-1 bg-green-500 text-white text-sm font-semibold rounded-full mb-4">
                  ACTIVE
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Currently Clocked In</h2>
                <p className="text-lg text-gray-700 font-medium mb-1">{activeEntry.site.name}</p>
                <p className="text-sm text-gray-600">
                  Started at {new Date(activeEntry.clock_in_time).toLocaleTimeString()}
                </p>
              </div>
              <div className="bg-white rounded-xl p-8 mb-8 shadow-md">
                <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">Elapsed Time</p>
                <div className="text-6xl font-bold text-blue-600 font-mono tracking-tight">
                  {elapsedTime}
                </div>
              </div>
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="px-12 py-5 bg-red-600 hover:bg-red-700 text-white text-lg font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                {loading ? 'Clocking Out...' : 'Clock Out'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Available Sites</h2>
            {nearestSite && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Nearest site: {nearestSite.site.name} ({Math.round(nearestSite.distance)}m away)
                </p>
              </div>
            )}
            <div className="space-y-4">
              {sites.map((site) => {
                const distance = currentLocation
                  ? calculateDistance(
                      currentLocation.lat,
                      currentLocation.lng,
                      site.latitude,
                      site.longitude
                    )
                  : null;
                const withinGeofence = isWithinGeofence(site);

                return (
                  <div
                    key={site.id}
                    className={`p-6 border-2 rounded-xl transition-all ${
                      withinGeofence
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{site.address}</p>
                        {distance !== null && (
                          <p className="text-xs text-gray-500 mt-2">
                            {Math.round(distance)}m away • Geofence: {site.geofence_radius}m
                          </p>
                        )}
                      </div>
                      {withinGeofence ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          In Range
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                          <XCircle className="w-3 h-3" />
                          Out of Range
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleClockIn(site.id)}
                      disabled={loading || !withinGeofence || !currentLocation}
                      className={`w-full py-3 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        withinGeofence
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {loading ? 'Clocking In...' : 'Clock In'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">1</span>
              </div>
              <p>Enable location services in your browser to track your position</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">2</span>
              </div>
              <p>Move within the geofence radius of a site to clock in</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">3</span>
              </div>
              <p>Your location is checked every 15 minutes while clocked in to conserve battery</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-xs">4</span>
              </div>
              <p>Clock out when your shift is complete</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};