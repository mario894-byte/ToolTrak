import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, FileText, Package, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Search, ArrowLeft } from 'lucide-react';

type ToolRequest = {
  id: string;
  user_id: string;
  request_type: 'new' | 'existing';
  tool_id: string | null;
  tool_name: string;
  destination_location_id: string | null;
  destination_location?: { id: string; name: string };
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  created_at: string;
  updated_at: string;
};

type Tool = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

type Location = {
  id: string;
  name: string;
};

export default function ToolRequestsManager({ onUpdate, onBack }: { onUpdate: () => void; onBack: () => void }) {
  const { user, isAdmin } = useAuth();
  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const { data, error } = await supabase
        .from('tool_requests')
        .select('*, destination_location:locations!destination_location_id(id, name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function cancelRequest(id: string) {
    if (!confirm('Are you sure you want to cancel this request?')) return;

    try {
      const { error } = await supabase.from('tool_requests').delete().eq('id', id);
      if (error) throw error;
      await loadRequests();
      onUpdate();
    } catch (error) {
      console.error('Error canceling request:', error);
      alert('Error canceling request');
    }
  }

  async function updateRequestStatus(id: string, status: ToolRequest['status']) {
    try {
      const request = requests.find(r => r.id === id);

      if (status === 'fulfilled' && request?.tool_id && request?.destination_location_id) {
        const { error: toolError } = await supabase
          .from('tools')
          .update({ location_id: request.destination_location_id })
          .eq('id', request.tool_id);
        if (toolError) throw toolError;
      }

      const { error } = await supabase
        .from('tool_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      await loadRequests();
      onUpdate();
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Error updating request');
    }
  }

  function handleFormClose() {
    setShowForm(false);
    loadRequests();
    onUpdate();
  }

  const filteredRequests = requests.filter(
    (req) => filterStatus === 'all' || req.status === filterStatus
  );

  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    approved: { color: 'bg-amber-100 text-amber-800', icon: CheckCircle },
    fulfilled: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
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
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Tool Requests</h2>
            <p className="text-gray-600">Request new tools or available tools from locations</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Request</span>
        </button>
      </div>

      {showForm && <RequestForm onClose={handleFormClose} />}

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        {['all', 'pending', 'approved', 'fulfilled', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              filterStatus === status
                ? 'bg-amber-500 text-gray-900 font-medium'
                : 'bg-stone-100 text-gray-700 hover:bg-stone-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">
              {filterStatus === 'all'
                ? 'No tool requests yet. Create your first request to get started.'
                : `No ${filterStatus} requests found.`}
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const StatusIcon = statusConfig[request.status].icon;
            const isOwner = request.user_id === user?.id;

            return (
              <div
                key={request.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {request.request_type === 'new' ? (
                      <Package className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <FileText className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.tool_name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            statusConfig[request.status].color
                          } flex items-center gap-1`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {request.status}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {request.request_type === 'new' ? 'New Tool' : 'Existing Tool'}
                        </span>
                        {isOwner && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700">
                            Your Request
                          </span>
                        )}
                      </div>
                      {request.destination_location && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                          <MapPin className="w-4 h-4" />
                          <span>Destination: {request.destination_location.name}</span>
                        </div>
                      )}
                      {request.notes && (
                        <p className="text-sm text-gray-600 mt-2">{request.notes}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Requested: {new Date(request.created_at).toLocaleString()}</span>
                        {request.updated_at !== request.created_at && (
                          <span>Updated: {new Date(request.updated_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {isOwner && request.status === 'pending' && (
                      <button
                        onClick={() => cancelRequest(request.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    {isAdmin && request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateRequestStatus(request.id, 'approved')}
                          className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateRequestStatus(request.id, 'rejected')}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {isAdmin && request.status === 'approved' && (
                      <button
                        onClick={() => updateRequestStatus(request.id, 'fulfilled')}
                        className="px-3 py-1 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        Mark Fulfilled
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RequestForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [userLocations, setUserLocations] = useState<Location[]>([]);
  const [formData, setFormData] = useState({
    destination_location_id: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadUserLocations();

    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadUserLocations() {
    if (!user) return;
    try {
      const { data: personData } = await supabase
        .from('people')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!personData) return;

      const { data: locationData } = await supabase
        .from('user_locations')
        .select('location:locations(id, name)')
        .eq('person_id', personData.id);

      if (locationData) {
        const locations = locationData
          .map(ul => ul.location)
          .filter((loc): loc is Location => loc !== null);
        setUserLocations(locations);
        if (locations.length === 1) {
          setFormData(prev => ({ ...prev, destination_location_id: locations[0].id }));
        }
      }
    } catch (error) {
      console.error('Error loading user locations:', error);
    }
  }

  async function searchTools(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const q = query.trim();
      const { data, error } = await supabase
        .from('tools')
        .select('id, name, description, status')
        .or(`name.ilike.*${q}*,description.ilike.*${q}*`)
        .order('name')
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching tools:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  const isToolAvailable = (tool: Tool) => tool.status === 'available';

  function handleSelectTool(tool: Tool) {
    setSelectedTool(tool);
    setSearchQuery(tool.name);
    setShowDropdown(false);
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setSelectedTool(null);
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchTools(value), 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (!formData.destination_location_id) {
      alert('Please select a destination location');
      return;
    }
    setSaving(true);

    try {
      const requestData = {
        user_id: user?.id,
        request_type: selectedTool ? 'existing' as const : 'new' as const,
        tool_id: selectedTool?.id || null,
        tool_name: selectedTool ? selectedTool.name : searchQuery.trim(),
        destination_location_id: formData.destination_location_id,
        notes: formData.notes || null,
        status: 'pending' as const,
      };

      const { error } = await supabase.from('tool_requests').insert([requestData]);
      if (error) throw error;
      onClose();
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Error creating request');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">New Tool Request</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div ref={searchRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tool Name *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Search existing tools or type a new tool name..."
              />
            </div>

            {selectedTool && (
              <div className={`mt-2 flex items-center gap-2 p-2.5 rounded-lg border ${
                isToolAvailable(selectedTool)
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  isToolAvailable(selectedTool) ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
                <span className={`text-sm font-medium ${
                  isToolAvailable(selectedTool) ? 'text-emerald-800' : 'text-red-800'
                }`}>
                  {selectedTool.name}
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  isToolAvailable(selectedTool)
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {isToolAvailable(selectedTool) ? 'Available' : selectedTool.status.replace('_', ' ')}
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedTool(null); setSearchQuery(''); }}
                  className={`ml-auto ${
                    isToolAvailable(selectedTool)
                      ? 'text-emerald-600 hover:text-emerald-800'
                      : 'text-red-500 hover:text-red-700'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {showDropdown && !selectedTool && searchQuery.trim().length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                {searching ? (
                  <div className="px-3 py-4 text-center">
                    <div className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-gray-400 mt-2">Searching tools...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Available
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          In use
                        </span>
                      </div>
                    </div>
                    {searchResults.map((tool) => {
                      const available = isToolAvailable(tool);
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => handleSelectTool(tool)}
                          className={`w-full text-left px-3 py-2.5 transition-colors border-l-4 border-b border-b-stone-50 last:border-b-0 cursor-pointer ${
                            available
                              ? 'border-l-emerald-500 hover:bg-emerald-50/60'
                              : 'border-l-red-400 hover:bg-red-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${available ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className={`font-medium ${available ? 'text-gray-900' : 'text-gray-500'}`}>
                                {tool.name}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              available
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {available ? 'Available' : tool.status.replace('_', ' ')}
                            </span>
                          </div>
                          {tool.description && (
                            <p className="text-xs text-gray-400 mt-0.5 ml-4 line-clamp-1">{tool.description}</p>
                          )}
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500">No matching tools in inventory.</p>
                    <p className="text-xs text-gray-400 mt-1">This will be submitted as a new tool request.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {!selectedTool && searchQuery.trim().length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-200 rounded-lg">
              <Package className="w-4 h-4 text-stone-500" />
              <span className="text-sm text-stone-600">
                Will be requested as a <strong>new tool</strong>: "{searchQuery.trim()}"
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination Location *
            </label>
            {userLocations.length === 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  You don't have any assigned locations. Please contact an admin to be assigned to a location.
                </p>
              </div>
            ) : (
              <select
                required
                value={formData.destination_location_id}
                onChange={(e) => setFormData({ ...formData, destination_location_id: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select destination location</option>
                {userLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes / Additional Details
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Any additional information about your request..."
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              {selectedTool
                ? 'Your request will be reviewed. When fulfilled, the tool will be moved to your selected destination location.'
                : 'Your request for a new tool will be reviewed by administrators.'}
            </p>
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
              disabled={saving || !searchQuery.trim() || userLocations.length === 0 || !formData.destination_location_id}
              className="px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
