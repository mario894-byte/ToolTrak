import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Clock, Save } from 'lucide-react';
import LocationMapPicker from './LocationMapPicker';

interface Site {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  is_active: boolean;
}

interface SiteFormModalProps {
  site: Site | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    geofence_radius: number;
  }) => Promise<void>;
}

export default function SiteFormModal({ site, onClose, onSave }: SiteFormModalProps) {
  const [formData, setFormData] = useState({
    name: site?.name || '',
    address: site?.address || '',
    latitude: site?.latitude || 40.7128,
    longitude: site?.longitude || -74.0060,
    geofence_radius: site?.geofence_radius || 100,
  });
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [confirmReady, setConfirmReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (showConfirmation) {
      setConfirmReady(false);
      setCountdown(10);
      intervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setConfirmReady(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setConfirmReady(false);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [showConfirmation]);

  const initiateSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmation(true);
  }, []);

  const cancelSubmit = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  const confirmSubmit = useCallback(async () => {
    setSaving(true);
    try {
      await onSave({
        name: formData.name,
        address: formData.address,
        latitude: formData.latitude,
        longitude: formData.longitude,
        geofence_radius: formData.geofence_radius,
      });
      onClose();
    } catch (error) {
      console.error('Error saving site:', error);
      alert('Error saving site');
      setShowConfirmation(false);
    } finally {
      setSaving(false);
    }
  }, [formData, onSave, onClose]);

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <div className="text-center">
            <div className="mb-4">
              <Clock className="w-16 h-16 text-blue-600 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {site ? 'Update Site?' : 'Add New Site?'}
              </h3>
              <p className="text-gray-600 mb-4">
                You are about to {site ? 'update' : 'create'} a site.
              </p>
            </div>

            {!confirmReady ? (
              <div className="space-y-4">
                <div className="relative pt-1">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-4xl font-bold text-blue-600">{countdown}</span>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
                    <div
                      style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-1000"
                    ></div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelSubmit}
                  className="w-full px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-lg font-semibold text-blue-600 mb-4">
                  Proceed with {site ? 'update' : 'creation'}?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={cancelSubmit}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmSubmit}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : site ? 'Update Now' : 'Add Now'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {site ? 'Edit Site' : 'Add New Site'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={initiateSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Site Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Office, Construction Site A"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full street address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location & Geofence
            </label>
            <LocationMapPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              radius={formData.geofence_radius}
              onLocationChange={(lat, lng, radius) => {
                setFormData({
                  ...formData,
                  latitude: lat,
                  longitude: lng,
                  geofence_radius: radius,
                });
              }}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : site ? 'Update' : 'Add Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
