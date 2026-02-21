import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, MapPin, ChevronDown, ChevronRight, Wrench, Warehouse, ArrowLeft, RotateCcw, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Tool = {
  id: string;
  name: string;
  purchase_price: number | null;
};

type Location = {
  id: string;
  name: string;
  description: string | null;
  is_base_warehouse: boolean;
  toolValue?: number;
  tools?: Tool[];
};

export default function LocationsManager({ onUpdate, isAdmin, onBack }: { onUpdate: () => void; isAdmin: boolean; onBack: () => void }) {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState<number>(10);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (deletingLocationId !== null && deleteCountdown > 0) {
      const timer = setTimeout(() => {
        setDeleteCountdown(deleteCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [deletingLocationId, deleteCountdown]);

  async function loadLocations() {
    try {
      const [{ data: locationsData, error: locationsError }, { data: allTools }, { data: activeAssignments }] = await Promise.all([
        supabase.from('locations').select('*').order('name'),
        supabase.from('tools').select('id, name, purchase_price, location_id, status'),
        supabase.from('tool_assignments').select('tool_id, location_id').is('returned_at', null),
      ]);

      if (locationsError) throw locationsError;

      const assignedToolIds = new Set((activeAssignments || []).map((a: any) => a.tool_id));
      const toolAssignmentMap = new Map<string, string>();
      (activeAssignments || []).forEach((a: any) => {
        if (a.location_id) {
          toolAssignmentMap.set(a.tool_id, a.location_id);
        }
      });

      const locationsWithValues = (locationsData || []).map((location) => {
        const toolsAtLocation: Tool[] = [];

        (allTools || []).forEach((tool: any) => {
          const assignedLocationId = toolAssignmentMap.get(tool.id);

          if (assignedLocationId === location.id) {
            toolsAtLocation.push({ id: tool.id, name: tool.name, purchase_price: tool.purchase_price });
          } else if (!assignedToolIds.has(tool.id) && tool.location_id === location.id) {
            toolsAtLocation.push({ id: tool.id, name: tool.name, purchase_price: tool.purchase_price });
          }
        });

        const toolValue = toolsAtLocation.reduce((sum, tool) => sum + (tool.purchase_price || 0), 0);

        return { ...location, toolValue, tools: toolsAtLocation };
      });

      setLocations(locationsWithValues);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  }

  function initiateDeleteLocation(id: string) {
    setDeletingLocationId(id);
    setDeleteCountdown(10);
  }

  function cancelDelete() {
    setDeletingLocationId(null);
    setDeleteCountdown(10);
  }

  async function confirmDeleteLocation() {
    if (!deletingLocationId) return;

    try {
      const { error } = await supabase.from('locations').delete().eq('id', deletingLocationId);
      if (error) throw error;
      setDeletingLocationId(null);
      setDeleteCountdown(10);
      await loadLocations();
      onUpdate();
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Error deleting location');
      setDeletingLocationId(null);
      setDeleteCountdown(10);
    }
  }

  function handleEdit(location: Location) {
    setEditingLocation(location);
    setShowForm(true);
  }

  function handleAdd() {
    setEditingLocation(null);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingLocation(null);
    loadLocations();
    onUpdate();
  }

  function toggleExpanded(locationId: string) {
    setExpandedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  }

  async function returnToolToWarehouse(toolId: string, toolName: string, currentLocationId: string) {
    if (!confirm(`Return ${toolName} to warehouse?`)) return;

    try {
      const { data: baseWarehouses } = await supabase
        .from('locations')
        .select('id, name')
        .eq('is_base_warehouse', true)
        .limit(1)
        .maybeSingle();

      if (!baseWarehouses) {
        alert('No base warehouse found. Please create a base warehouse first.');
        return;
      }

      const { data: tool } = await supabase
        .from('tools')
        .select('status, location_id')
        .eq('id', toolId)
        .maybeSingle();

      const { error: updateError } = await supabase
        .from('tools')
        .update({
          location_id: baseWarehouses.id,
          status: 'available'
        })
        .eq('id', toolId);

      if (updateError) throw updateError;

      await supabase.from('tool_event_log').insert([{
        tool_id: toolId,
        event_type: 'returned',
        from_location_id: currentLocationId,
        to_location_id: baseWarehouses.id,
        old_status: tool?.status || null,
        new_status: 'available',
        notes: 'Returned to warehouse from location',
        user_id: user?.id || null
      }]);

      await loadLocations();
      onUpdate();
    } catch (error) {
      console.error('Error returning tool:', error);
      alert('Error returning tool to warehouse');
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Locations</h2>
            <p className="text-gray-600">Manage storage locations for tools</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Location</span>
          </button>
        )}
      </div>

      {showForm && <LocationForm location={editingLocation} onClose={handleFormClose} />}

      {deletingLocationId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <div className="mb-4">
                <Clock className="w-16 h-16 text-red-500 mx-auto mb-2" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Location?</h3>
                <p className="text-gray-600 mb-4">
                  You are about to delete this location. This action cannot be undone.
                </p>
              </div>

              {deleteCountdown > 0 ? (
                <div className="space-y-4">
                  <div className="relative pt-1">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-4xl font-bold text-red-600">{deleteCountdown}</span>
                    </div>
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-red-100">
                      <div
                        style={{ width: `${((10 - deleteCountdown) / 10) * 100}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500 transition-all duration-1000"
                      ></div>
                    </div>
                  </div>
                  <button
                    onClick={cancelDelete}
                    className="w-full px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-lg font-semibold text-red-600 mb-4">Proceed with deletion?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={cancelDelete}
                      className="flex-1 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteLocation}
                      className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {locations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No locations yet. Add the first location to get started.</p>
          </div>
        ) : (
          locations.map((location) => {
            const isExpanded = expandedLocations.has(location.id);
            const hasTools = location.tools && location.tools.length > 0;

            return (
              <div
                key={location.id}
                className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {location.is_base_warehouse ? (
                          <Warehouse className="w-5 h-5 text-amber-600" />
                        ) : (
                          <MapPin className="w-5 h-5 text-gray-400" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                        {location.is_base_warehouse && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                            Base Warehouse
                          </span>
                        )}
                      </div>
                      {location.description && (
                        <p className="text-gray-600 ml-7 mb-2">{location.description}</p>
                      )}
                      <div className="ml-7 flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Total Value:</span>
                        <span className={`px-2 py-1 text-sm font-semibold rounded ${
                          location.toolValue && location.toolValue > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          ${(location.toolValue || 0).toFixed(2)}
                        </span>
                        {hasTools && (
                          <span className="text-xs text-gray-500">
                            ({location.tools!.length} tool{location.tools!.length !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {hasTools && (
                        <button
                          onClick={() => toggleExpanded(location.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={isExpanded ? 'Hide tools' : 'Show tools'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleEdit(location)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => initiateDeleteLocation(location.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && hasTools && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Tools at Location:</h4>
                    <div className="space-y-2">
                      {location.tools!.map((tool) => (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                        >
                          <div className="flex items-center space-x-2">
                            <Wrench className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{tool.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {tool.purchase_price !== null && (
                              <span className="text-sm font-medium text-gray-700">
                                ${tool.purchase_price.toFixed(2)}
                              </span>
                            )}
                            {!location.is_base_warehouse && (
                              <button
                                onClick={() => returnToolToWarehouse(tool.id, tool.name, location.id)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                title="Return to warehouse"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function LocationForm({
  location,
  onClose,
}: {
  location: Location | null;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: location?.name || '',
    description: location?.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (showConfirmation && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showConfirmation, countdown]);

  function initiateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowConfirmation(true);
    setCountdown(10);
  }

  function cancelSubmit() {
    setShowConfirmation(false);
    setCountdown(10);
  }

  async function confirmSubmit() {
    setSaving(true);

    try {
      const data = {
        name: formData.name,
        description: formData.description || null,
      };

      if (location) {
        const { error } = await supabase
          .from('locations')
          .update(data)
          .eq('id', location.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('locations').insert([data]);
        if (error) throw error;
      }
      onClose();
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Error saving location');
      setShowConfirmation(false);
      setCountdown(10);
    } finally {
      setSaving(false);
    }
  }

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
          <div className="text-center">
            <div className="mb-4">
              <Clock className="w-16 h-16 text-amber-500 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {location ? 'Update Location?' : 'Add New Location?'}
              </h3>
              <p className="text-gray-600 mb-4">
                You are about to {location ? 'update' : 'create'} a location.
              </p>
            </div>

            {countdown > 0 ? (
              <div className="space-y-4">
                <div className="relative pt-1">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-4xl font-bold text-amber-600">{countdown}</span>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-amber-100">
                    <div
                      style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500 transition-all duration-1000"
                    ></div>
                  </div>
                </div>
                <button
                  onClick={cancelSubmit}
                  className="w-full px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-lg font-semibold text-amber-600 mb-4">
                  Proceed with {location ? 'update' : 'creation'}?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={cancelSubmit}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmSubmit}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : location ? 'Update Now' : 'Add Now'}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {location ? 'Edit Location' : 'Add New Location'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={initiateSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Workshop, Warehouse A, Storage Room"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Additional details about this location"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-stone-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : location ? 'Update' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
