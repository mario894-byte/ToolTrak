import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Search, Warehouse, ArrowLeft, History, Clock, MapPin, User, Activity } from 'lucide-react';

type Tool = {
  id: string;
  name: string;
  description: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  status: 'available' | 'in_use' | 'maintenance' | 'retired' | 'damaged' | 'lost';
  location_id: string | null;
  person_id: string | null;
  location?: { id: string; name: string } | null;
  person?: { id: string; name: string } | null;
  created_at?: string;
  total_usage_days?: number;
  usage_percentage?: number;
};

type Location = {
  id: string;
  name: string;
  is_base_warehouse?: boolean;
};

type Person = {
  id: string;
  name: string;
};

type ToolFormData = {
  name: string;
  description: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  status: Tool['status'];
  location_id: string | null;
  person_id: string | null;
};

type EventLog = {
  id: string;
  event_type: string;
  from_location?: { name: string } | null;
  to_location?: { name: string } | null;
  from_person?: { name: string } | null;
  to_person?: { name: string } | null;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
};

export default function ToolsManager({ onUpdate, isAdmin, onBack }: { onUpdate: () => void; isAdmin: boolean; onBack: () => void }) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [baseWarehouses, setBaseWarehouses] = useState<Location[]>([]);
  const [assigningToolId, setAssigningToolId] = useState<string | null>(null);
  const [viewingHistoryToolId, setViewingHistoryToolId] = useState<string | null>(null);
  const [toolHistory, setToolHistory] = useState<EventLog[]>([]);

  useEffect(() => {
    loadTools();
    loadLocationsAndPeople();
  }, []);

  async function loadLocationsAndPeople() {
    const [{ data: locData }, { data: pplData }] = await Promise.all([
      supabase.from('locations').select('id, name, is_base_warehouse').order('name'),
      supabase.from('people').select('id, name').order('name'),
    ]);
    setLocations(locData || []);
    setPeople(pplData || []);
    setBaseWarehouses((locData || []).filter(l => l.is_base_warehouse));
  }

  async function assignToWarehouse(toolId: string, warehouseId: string) {
    try {
      const { error } = await supabase
        .from('tools')
        .update({ location_id: warehouseId })
        .eq('id', toolId);
      if (error) throw error;
      setAssigningToolId(null);
      await loadTools();
      onUpdate();
    } catch (error) {
      console.error('Error assigning tool to warehouse:', error);
      alert('Error assigning tool to warehouse');
    }
  }

  async function viewToolHistory(toolId: string) {
    setViewingHistoryToolId(toolId);
    try {
      const { data, error } = await supabase
        .from('tool_event_log')
        .select(`
          *,
          from_location:locations!from_location_id(name),
          to_location:locations!to_location_id(name),
          from_person:people!from_person_id(name),
          to_person:people!to_person_id(name)
        `)
        .eq('tool_id', toolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setToolHistory(data || []);
    } catch (error) {
      console.error('Error loading tool history:', error);
      alert('Error loading tool history');
    }
  }

  function closeHistory() {
    setViewingHistoryToolId(null);
    setToolHistory([]);
  }

  async function loadTools() {
    try {
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select('*')
        .order('name');

      if (toolsError) throw toolsError;

      const [{ data: locsData }, { data: pplData }, { data: userLocsData }, { data: activeAssignments }] = await Promise.all([
        supabase.from('locations').select('id, name'),
        supabase.from('people').select('id, name'),
        supabase.from('user_locations').select('person_id, location_id'),
        supabase.from('tool_assignments').select('tool_id, location_id').is('returned_at', null),
      ]);

      const locsMap = new Map((locsData || []).map(l => [l.id, l]));
      const pplMap = new Map((pplData || []).map(p => [p.id, p]));

      const locationToPersonMap = new Map<string, string>();
      (userLocsData || []).forEach((ul: any) => {
        if (!locationToPersonMap.has(ul.location_id)) {
          locationToPersonMap.set(ul.location_id, ul.person_id);
        }
      });

      const toolAssignmentMap = new Map<string, string>();
      (activeAssignments || []).forEach((a: any) => {
        if (a.location_id) {
          toolAssignmentMap.set(a.tool_id, a.location_id);
        }
      });

      let toolsWithStats = (toolsData || []).map(tool => {
        const assignedLocationId = toolAssignmentMap.get(tool.id);
        const personId = assignedLocationId ? locationToPersonMap.get(assignedLocationId) : null;
        const location = assignedLocationId ? locsMap.get(assignedLocationId) : (tool.location_id ? locsMap.get(tool.location_id) : null);
        const person = personId ? pplMap.get(personId) : (tool.person_id ? pplMap.get(tool.person_id) : null);

        return {
          ...tool,
          location: location || null,
          person: person || null,
        };
      });

      if (isAdmin) {
        toolsWithStats = await Promise.all(
          toolsWithStats.map(async (tool) => {
            let total_usage_days = 0;
            let usage_percentage = 0;

            const { data: assignments } = await supabase
              .from('tool_assignments')
              .select('assigned_at, returned_at')
              .eq('tool_id', tool.id);

            if (assignments && assignments.length > 0) {
              total_usage_days = assignments.reduce((total, assignment) => {
                const startDate = new Date(assignment.assigned_at);
                const endDate = assignment.returned_at
                  ? new Date(assignment.returned_at)
                  : new Date();
                const daysInUse = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
                return total + daysInUse;
              }, 0);

              const inventoryStartDate = new Date(tool.purchase_date || tool.created_at);
              const now = new Date();
              const totalDaysInInventory = (now.getTime() - inventoryStartDate.getTime()) / (1000 * 60 * 60 * 24);

              usage_percentage = totalDaysInInventory > 0
                ? (total_usage_days / totalDaysInInventory) * 100
                : 0;
            }

            return {
              ...tool,
              total_usage_days: Math.round(total_usage_days),
              usage_percentage: Math.round(usage_percentage),
            };
          })
        );
      }

      setTools(toolsWithStats);
    } catch (error) {
      console.error('Error loading tools:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    const query = searchQuery.toLowerCase().trim();
    return tools.filter(tool => {
      const nameMatch = tool.name.toLowerCase().includes(query);
      const descMatch = tool.description?.toLowerCase().includes(query);
      const serialMatch = tool.serial_number?.toLowerCase().includes(query);
      const locationMatch = tool.location?.name.toLowerCase().includes(query);
      const personMatch = tool.person?.name.toLowerCase().includes(query);
      const statusMatch = tool.status.replace('_', ' ').toLowerCase().includes(query);
      return nameMatch || descMatch || serialMatch || locationMatch || personMatch || statusMatch;
    });
  }, [tools, searchQuery]);

  async function deleteTool(id: string) {
    if (!confirm('Are you sure you want to delete this tool?')) return;

    try {
      const { error } = await supabase.from('tools').delete().eq('id', id);
      if (error) throw error;
      await loadTools();
      onUpdate();
    } catch (error) {
      console.error('Error deleting tool:', error);
      alert('Error deleting tool');
    }
  }

  function handleEdit(tool: Tool) {
    setEditingTool(tool);
    setShowForm(true);
  }

  function handleAdd() {
    setEditingTool(null);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingTool(null);
    loadTools();
    loadLocationsAndPeople();
    onUpdate();
  }

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-100 text-emerald-800',
    in_use: 'bg-amber-100 text-amber-800',
    maintenance: 'bg-orange-100 text-orange-800',
    retired: 'bg-stone-200 text-stone-700',
    damaged: 'bg-orange-100 text-orange-800',
    lost: 'bg-red-100 text-red-800',
  };

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
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Tools</h2>
            <p className="text-gray-600">Manage your tool inventory</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={handleAdd}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Tool</span>
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tools by name, serial number, location, person, or status..."
          className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow text-gray-900 placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {showForm && (
        <ToolForm
          tool={editingTool}
          locations={locations}
          people={people}
          onClose={handleFormClose}
        />
      )}

      {searchQuery && (
        <div className="text-sm text-gray-500">
          Found {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}
          {filteredTools.length !== tools.length && ` out of ${tools.length}`}
        </div>
      )}

      <div className="grid gap-4">
        {tools.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No tools yet. Add your first tool to get started.</p>
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No tools match your search.</p>
          </div>
        ) : (
          filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{tool.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[tool.status]
                      }`}
                    >
                      {tool.status.replace('_', ' ')}
                    </span>
                  </div>
                  {tool.description && (
                    <p className="text-gray-600 mb-2">{tool.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {tool.serial_number && (
                      <span>Serial: {tool.serial_number}</span>
                    )}
                    {tool.location && (
                      <span className="text-sky-700 font-medium">Location: {tool.location.name}</span>
                    )}
                    {tool.person && (
                      <span className="text-teal-700 font-medium">With: {tool.person.name}</span>
                    )}
                    {isAdmin && tool.purchase_date && (
                      <span>
                        Purchased: {new Date(tool.purchase_date).toLocaleDateString()}
                      </span>
                    )}
                    {isAdmin && tool.purchase_price && (
                      <span>Price: ${tool.purchase_price.toFixed(2)}</span>
                    )}
                  </div>
                  {isAdmin && tool.total_usage_days !== undefined && tool.total_usage_days > 0 && (
                    <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Usage Statistics</span>
                        <span className="text-sm text-gray-600">{tool.total_usage_days} days in use</span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(tool.usage_percentage || 0, 100)}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 text-right">
                        {tool.usage_percentage}% utilization
                      </div>
                    </div>
                  )}
                  {isAdmin && tool.status === 'available' && !tool.location && baseWarehouses.length > 0 && (
                    <div className="mt-3">
                      {assigningToolId === tool.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                            onChange={(e) => {
                              if (e.target.value) {
                                assignToWarehouse(tool.id, e.target.value);
                              }
                            }}
                            defaultValue=""
                          >
                            <option value="" disabled>Select warehouse</option>
                            {baseWarehouses.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setAssigningToolId(null)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningToolId(tool.id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
                        >
                          <Warehouse className="w-4 h-4" />
                          <span>Assign to warehouse</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => viewToolHistory(tool.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View History"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEdit(tool)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTool(tool.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {viewingHistoryToolId && (
        <ToolHistoryModal
          toolId={viewingHistoryToolId}
          toolName={tools.find(t => t.id === viewingHistoryToolId)?.name || 'Tool'}
          history={toolHistory}
          onClose={closeHistory}
        />
      )}
    </div>
  );
}

function ToolHistoryModal({
  toolId,
  toolName,
  history,
  onClose,
}: {
  toolId: string;
  toolName: string;
  history: EventLog[];
  onClose: () => void;
}) {
  const eventTypeIcons: Record<string, any> = {
    assigned: User,
    returned: MapPin,
    moved: MapPin,
    status_changed: Activity,
    created: Activity,
    updated: Activity,
  };

  const eventTypeColors: Record<string, string> = {
    assigned: 'text-blue-600 bg-blue-50',
    returned: 'text-green-600 bg-green-50',
    moved: 'text-amber-600 bg-amber-50',
    status_changed: 'text-purple-600 bg-purple-50',
    created: 'text-gray-600 bg-gray-50',
    updated: 'text-gray-600 bg-gray-50',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Tool History</h3>
              <p className="text-sm text-gray-600">{toolName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {history.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No history available for this tool</p>
          ) : (
            <div className="space-y-3">
              {history.map((event) => {
                const Icon = eventTypeIcons[event.event_type] || Activity;
                return (
                  <div
                    key={event.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${eventTypeColors[event.event_type] || 'text-gray-600 bg-gray-50'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-900 capitalize">
                            {event.event_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.created_at).toLocaleString()}
                          </span>
                        </div>
                        {event.from_location && event.to_location && (
                          <p className="text-sm text-gray-700">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            From: <span className="font-medium">{event.from_location.name}</span>
                            {' → '}
                            To: <span className="font-medium">{event.to_location.name}</span>
                          </p>
                        )}
                        {event.to_person && (
                          <p className="text-sm text-gray-700">
                            <User className="w-3 h-3 inline mr-1" />
                            Assigned to: <span className="font-medium">{event.to_person.name}</span>
                          </p>
                        )}
                        {event.old_status && event.new_status && (
                          <p className="text-sm text-gray-700">
                            <Activity className="w-3 h-3 inline mr-1" />
                            Status: <span className="font-medium">{event.old_status}</span>
                            {' → '}
                            <span className="font-medium">{event.new_status}</span>
                          </p>
                        )}
                        {event.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolForm({
  tool,
  locations,
  people,
  onClose,
}: {
  tool: Tool | null;
  locations: Location[];
  people: Person[];
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<ToolFormData>({
    name: tool?.name || '',
    description: tool?.description || null,
    serial_number: tool?.serial_number || null,
    purchase_date: tool?.purchase_date || null,
    purchase_price: tool?.purchase_price || null,
    status: tool?.status || 'available',
    location_id: tool?.location_id || null,
    person_id: tool?.person_id || null,
  });
  const [saving, setSaving] = useState(false);
  const [locationType, setLocationType] = useState<'none' | 'location' | 'person'>(
    tool?.person_id ? 'person' : tool?.location_id ? 'location' : 'none'
  );

  function handleLocationTypeChange(type: 'none' | 'location' | 'person') {
    setLocationType(type);
    if (type === 'none') {
      setFormData({ ...formData, location_id: null, person_id: null });
    } else if (type === 'location') {
      setFormData({ ...formData, person_id: null });
    } else {
      setFormData({ ...formData, location_id: null });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (tool) {
        const { error } = await supabase
          .from('tools')
          .update(formData)
          .eq('id', tool.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tools').insert([formData]);
        if (error) throw error;
      }
      onClose();
    } catch (error) {
      console.error('Error saving tool:', error);
      alert('Error saving tool');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {tool ? 'Edit Tool' : 'Add New Tool'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tool Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value || null })
              }
              rows={3}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                value={formData.serial_number || ''}
                onChange={(e) =>
                  setFormData({ ...formData, serial_number: e.target.value || null })
                }
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as Tool['status'],
                  })
                }
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
                <option value="damaged">Damaged</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={formData.purchase_date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, purchase_date: e.target.value || null })
                }
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.purchase_price || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    purchase_price: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Location
            </label>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="locationType"
                  checked={locationType === 'none'}
                  onChange={() => handleLocationTypeChange('none')}
                  className="text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">Not assigned</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="locationType"
                  checked={locationType === 'location'}
                  onChange={() => handleLocationTypeChange('location')}
                  className="text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">At location</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="locationType"
                  checked={locationType === 'person'}
                  onChange={() => handleLocationTypeChange('person')}
                  className="text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">With person</span>
              </label>
            </div>

            {locationType === 'location' && (
              <select
                value={formData.location_id || ''}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            )}

            {locationType === 'person' && (
              <select
                value={formData.person_id || ''}
                onChange={(e) => setFormData({ ...formData, person_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select person</option>
                {people.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
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
              className="px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : tool ? 'Update' : 'Add Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
