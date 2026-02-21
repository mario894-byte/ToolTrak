import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, X, CheckCircle, User, MapPin, AlertTriangle, XCircle, Wrench, ArrowLeft } from 'lucide-react';

type Tool = {
  id: string;
  name: string;
  status: string;
};

type Location = {
  id: string;
  name: string;
  is_base_warehouse: boolean;
};

type Assignment = {
  id: string;
  tool_id: string;
  person_id: string | null;
  location_id: string | null;
  assigned_to: string | null;
  assigned_at: string;
  returned_at: string | null;
  notes: string | null;
  return_condition: string | null;
  return_notes: string | null;
  return_location_id: string | null;
  return_status: string;
  return_requested_at: string | null;
  return_approved_by: string | null;
  return_approved_at: string | null;
  tools: { name: string } | null;
  people: { name: string } | null;
  locations: { name: string } | null;
  return_locations: { name: string } | null;
};

type UserLocation = {
  location_id: string;
};

export default function AssignmentsManager({ onUpdate, isAdmin, onBack }: { onUpdate: () => void; isAdmin: boolean; onBack: () => void }) {
  const { user } = useAuth();
  const [activeAssignments, setActiveAssignments] = useState<Assignment[]>([]);
  const [historyAssignments, setHistoryAssignments] = useState<Assignment[]>([]);
  const [pendingReturns, setPendingReturns] = useState<Assignment[]>([]);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'active' | 'history' | 'pending'>('active');
  const [returningAssignment, setReturningAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    loadAssignments();
  }, [view]);

  async function loadAssignments() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      if (!isAdmin) {
        const { data: userLocs } = await supabase
          .from('user_locations')
          .select('location_id')
          .eq('user_id', user.id);

        if (userLocs) {
          setUserLocations(userLocs);
        }
      }

      const query = supabase
        .from('tool_assignments')
        .select(`
          id,
          tool_id,
          person_id,
          location_id,
          assigned_to,
          assigned_at,
          returned_at,
          notes,
          return_condition,
          return_notes,
          return_location_id,
          return_status,
          return_requested_at,
          return_approved_by,
          return_approved_at,
          tools!inner(name),
          people(name),
          locations!tool_assignments_location_id_fkey(name),
          return_locations:locations!tool_assignments_return_location_id_fkey(name)
        `)
        .order('assigned_at', { ascending: false });

      if (!isAdmin) {
        query.eq('assigned_to', user.id);
      }

      if (view === 'active') {
        query.is('returned_at', null).eq('return_status', 'active');
      } else if (view === 'pending') {
        query.is('returned_at', null).eq('return_status', 'pending_return');
      } else {
        query.not('returned_at', 'is', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (view === 'active') {
        setActiveAssignments(data as Assignment[] || []);
      } else if (view === 'pending') {
        setPendingReturns(data as Assignment[] || []);
      } else {
        setHistoryAssignments(data as Assignment[] || []);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFormClose() {
    setShowForm(false);
    loadAssignments();
    onUpdate();
  }

  function handleReturnClose() {
    setReturningAssignment(null);
    loadAssignments();
    onUpdate();
  }

  const conditionBadge = (condition: string | null) => {
    switch (condition) {
      case 'damaged':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800"><AlertTriangle className="w-3 h-3" />Damaged</span>;
      case 'lost':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800"><XCircle className="w-3 h-3" />Lost</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3" />Good</span>;
    }
  };

  function canReturnTool(assignment: Assignment): boolean {
    if (isAdmin) return true;
    if (!assignment.location_id) return false;
    return userLocations.some(ul => ul.location_id === assignment.location_id);
  }

  async function approveReturn(assignment: Assignment) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: assignmentError } = await supabase
        .from('tool_assignments')
        .update({
          returned_at: new Date().toISOString(),
          return_status: 'returned',
          return_approved_by: user.id,
          return_approved_at: new Date().toISOString(),
        })
        .eq('id', assignment.id);

      if (assignmentError) throw assignmentError;

      let newStatus = 'available';
      if (assignment.return_condition === 'maintenance') newStatus = 'maintenance';
      if (assignment.return_condition === 'damaged') newStatus = 'damaged';
      if (assignment.return_condition === 'lost') newStatus = 'lost';

      const { error: toolError } = await supabase
        .from('tools')
        .update({ status: newStatus })
        .eq('id', assignment.tool_id);

      if (toolError) throw toolError;

      loadAssignments();
      onUpdate();
    } catch (error) {
      console.error('Error approving return:', error);
      alert('Error approving return');
    }
  }

  async function rejectReturn(assignment: Assignment) {
    try {
      const { error } = await supabase
        .from('tool_assignments')
        .update({
          return_status: 'active',
          return_requested_at: null,
          return_location_id: null,
          return_condition: null,
          return_notes: null,
        })
        .eq('id', assignment.id);

      if (error) throw error;

      loadAssignments();
      onUpdate();
    } catch (error) {
      console.error('Error rejecting return:', error);
      alert('Error rejecting return');
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  const assignments = view === 'active' ? activeAssignments : view === 'pending' ? pendingReturns : historyAssignments;

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
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Tool Assignments</h2>
            <p className="text-gray-600">Track who has which tools and where they are</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Assignment</span>
          </button>
        )}
      </div>

      {showForm && <AssignmentForm onClose={handleFormClose} />}
      {returningAssignment && (
        <ReturnDialog
          assignment={returningAssignment}
          onClose={handleReturnClose}
          isAdmin={isAdmin}
        />
      )}

      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setView('active')}
          className={`px-4 py-2 font-medium transition-colors ${
            view === 'active'
              ? 'text-amber-600 border-b-2 border-amber-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Active ({activeAssignments.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setView('pending')}
            className={`px-4 py-2 font-medium transition-colors ${
              view === 'pending'
                ? 'text-amber-600 border-b-2 border-amber-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Returns ({pendingReturns.length})
          </button>
        )}
        <button
          onClick={() => setView('history')}
          className={`px-4 py-2 font-medium transition-colors ${
            view === 'history'
              ? 'text-amber-600 border-b-2 border-amber-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          History
        </button>
      </div>

      <div className="grid gap-4">
        {assignments.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">
              {view === 'active'
                ? isAdmin ? 'No active assignments. Create one to get started.' : 'No tools assigned to you.'
                : view === 'pending'
                ? 'No pending return requests.'
                : 'No assignment history yet.'}
            </p>
          </div>
        ) : (
          assignments.map((assignment) => {
            const canReturn = canReturnTool(assignment);
            return (
              <div
                key={assignment.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {assignment.tools?.name || 'Unknown Tool'}
                    </h3>
                    <div className="space-y-1 mb-2">
                      {assignment.person_id ? (
                        <div className="flex items-center space-x-2 text-gray-700">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>Assigned to: {assignment.people?.name || 'Unknown'}</span>
                        </div>
                      ) : isAdmin ? (
                        <div className="flex items-center space-x-2 text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>Location: {assignment.locations?.name || 'Unknown'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>At: {assignment.locations?.name || 'Unknown location'}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span>
                        Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                      </span>
                      {assignment.return_requested_at && view === 'pending' && (
                        <span>
                          Requested: {new Date(assignment.return_requested_at).toLocaleDateString()}
                        </span>
                      )}
                      {assignment.returned_at && (
                        <span>
                          Returned: {new Date(assignment.returned_at).toLocaleDateString()}
                        </span>
                      )}
                      {view === 'history' && assignment.return_condition && (
                        conditionBadge(assignment.return_condition)
                      )}
                      {view === 'pending' && assignment.return_condition && (
                        conditionBadge(assignment.return_condition)
                      )}
                    </div>
                    {isAdmin && view === 'history' && assignment.return_location_id && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Returned to: {assignment.return_locations?.name || 'Unknown'}</span>
                      </div>
                    )}
                    {isAdmin && view === 'pending' && assignment.return_location_id && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Return to: {assignment.return_locations?.name || 'Unknown'}</span>
                      </div>
                    )}
                    {assignment.notes && (
                      <p className="mt-2 text-sm text-gray-600 italic">{assignment.notes}</p>
                    )}
                    {assignment.return_notes && (
                      <p className="mt-1 text-sm text-orange-700 bg-orange-50 rounded px-2 py-1">
                        Return notes: {assignment.return_notes}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    {view === 'active' && canReturn && (
                      <button
                        onClick={() => setReturningAssignment(assignment)}
                        className="flex items-center space-x-2 px-3 py-2 text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Return</span>
                      </button>
                    )}
                    {view === 'active' && !canReturn && !isAdmin && (
                      <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
                        Return not available
                      </div>
                    )}
                    {view === 'pending' && isAdmin && (
                      <>
                        <button
                          onClick={() => approveReturn(assignment)}
                          className="flex items-center space-x-2 px-3 py-2 text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => rejectReturn(assignment)}
                          className="flex items-center space-x-2 px-3 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </>
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

function ReturnDialog({ assignment, onClose, isAdmin }: { assignment: Assignment; onClose: () => void; isAdmin: boolean }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [returnLocationId, setReturnLocationId] = useState('');
  const [condition, setCondition] = useState<'good' | 'maintenance' | 'damaged' | 'lost'>('good');
  const [returnNotes, setReturnNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    const { data } = await supabase
      .from('locations')
      .select('id, name, is_base_warehouse')
      .order('is_base_warehouse', { ascending: false })
      .order('name');

    if (data) {
      setLocations(data);
      const defaultWarehouse = data.find(l => l.is_base_warehouse);
      if (defaultWarehouse) {
        setReturnLocationId(defaultWarehouse.id);
      }
    }
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (isAdmin) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: tool } = await supabase
          .from('tools')
          .select('status, location_id')
          .eq('id', assignment.tool_id)
          .maybeSingle();

        const { error: assignmentError } = await supabase
          .from('tool_assignments')
          .update({
            returned_at: new Date().toISOString(),
            return_location_id: condition === 'lost' ? null : returnLocationId || null,
            return_condition: condition,
            return_notes: returnNotes || null,
            return_status: 'returned',
            return_approved_by: user.id,
            return_approved_at: new Date().toISOString(),
          })
          .eq('id', assignment.id);

        if (assignmentError) throw assignmentError;

        let newStatus = 'available';
        if (condition === 'maintenance') newStatus = 'maintenance';
        if (condition === 'damaged') newStatus = 'damaged';
        if (condition === 'lost') newStatus = 'lost';

        const { error: toolError } = await supabase
          .from('tools')
          .update({ status: newStatus })
          .eq('id', assignment.tool_id);

        if (toolError) throw toolError;

        await supabase.from('tool_event_log').insert([{
          tool_id: assignment.tool_id,
          event_type: 'returned',
          from_location_id: assignment.location_id,
          to_location_id: returnLocationId,
          old_status: tool?.status || null,
          new_status: newStatus,
          notes: `Returned with condition: ${condition}${returnNotes ? '. ' + returnNotes : ''}`,
          user_id: user.id
        }]);
      } else {
        const { error: assignmentError } = await supabase
          .from('tool_assignments')
          .update({
            return_status: 'pending_return',
            return_requested_at: new Date().toISOString(),
            return_location_id: condition === 'lost' ? null : returnLocationId || null,
            return_condition: condition,
            return_notes: returnNotes || null,
          })
          .eq('id', assignment.id);

        if (assignmentError) throw assignmentError;
      }

      onClose();
    } catch (error) {
      console.error('Error returning tool:', error);
      alert('Error returning tool');
    } finally {
      setSaving(false);
    }
  }

  const baseWarehouses = locations.filter(l => l.is_base_warehouse);
  const otherLocations = locations.filter(l => !l.is_base_warehouse);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Return Tool</h3>
            <p className="text-sm text-gray-500 mt-1">{assignment.tools?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleReturn} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setCondition('good')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                  condition === 'good'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Good</span>
              </button>
              <button
                type="button"
                onClick={() => setCondition('maintenance')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                  condition === 'maintenance'
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Wrench className="w-5 h-5" />
                <span className="text-sm font-medium">Maintenance</span>
              </button>
              <button
                type="button"
                onClick={() => setCondition('damaged')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                  condition === 'damaged'
                    ? 'border-orange-500 bg-orange-50 text-orange-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Damaged</span>
              </button>
              <button
                type="button"
                onClick={() => setCondition('lost')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                  condition === 'lost'
                    ? 'border-red-500 bg-red-50 text-red-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <XCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Lost</span>
              </button>
            </div>
          </div>

          {condition !== 'lost' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return Location *
              </label>
              <select
                required
                value={returnLocationId}
                onChange={(e) => setReturnLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select return location</option>
                {baseWarehouses.length > 0 && (
                  <optgroup label="Base Warehouses">
                    {baseWarehouses.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </optgroup>
                )}
                {otherLocations.length > 0 && (
                  <optgroup label="Other Locations">
                    {otherLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {(condition === 'maintenance' || condition === 'damaged' || condition === 'lost') && (
            <div className={`p-4 rounded-lg border ${
              condition === 'maintenance' ? 'bg-blue-50 border-blue-200' :
              condition === 'damaged' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'
            }`}>
              <label className={`block text-sm font-medium mb-1 ${
                condition === 'maintenance' ? 'text-blue-800' :
                condition === 'damaged' ? 'text-orange-800' : 'text-red-800'
              }`}>
                {condition === 'maintenance' ? 'Maintenance notes *' :
                 condition === 'damaged' ? 'Describe the damage *' : 'Describe what happened *'}
              </label>
              <textarea
                required
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                rows={3}
                placeholder={
                  condition === 'maintenance'
                    ? 'What maintenance is needed? Be specific...'
                    : condition === 'damaged'
                    ? 'What damage occurred? Be specific...'
                    : 'When and where was the tool last seen?'
                }
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 ${
                  condition === 'maintenance'
                    ? 'border-blue-300 focus:ring-blue-400 focus:border-blue-400'
                    : condition === 'damaged'
                    ? 'border-orange-300 focus:ring-orange-400 focus:border-orange-400'
                    : 'border-red-300 focus:ring-red-400 focus:border-red-400'
                } bg-white`}
              />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
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
              className={`px-4 py-2 font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                condition === 'lost'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : condition === 'damaged'
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {saving
                ? (isAdmin ? 'Returning...' : 'Requesting...')
                : isAdmin
                  ? (condition === 'lost' ? 'Report Lost' : condition === 'damaged' ? 'Return as Damaged' : 'Return Tool')
                  : (condition === 'lost' ? 'Request Report Lost' : condition === 'damaged' ? 'Request Return as Damaged' : 'Request Return')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignmentForm({ onClose }: { onClose: () => void }) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [formData, setFormData] = useState({
    tool_id: '',
    assignment_type: 'person' as 'person' | 'location' | 'user',
    person_id: '',
    location_id: '',
    user_id: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [toolsResult, peopleResult, locationsResult, usersResult] = await Promise.all([
      supabase.from('tools').select('id, name, status').eq('status', 'available').order('name'),
      supabase.from('people').select('id, name').order('name'),
      supabase.from('locations').select('id, name').order('name'),
      supabase.auth.admin.listUsers(),
    ]);

    if (toolsResult.data) setTools(toolsResult.data);
    if (peopleResult.data) setPeople(peopleResult.data);
    if (locationsResult.data) setLocations(locationsResult.data);
    if (usersResult.data?.users) {
      setUsers(usersResult.data.users.map(u => ({ id: u.id, email: u.email || '' })));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: tool } = await supabase
        .from('tools')
        .select('status, location_id')
        .eq('id', formData.tool_id)
        .maybeSingle();

      const assignmentData = {
        tool_id: formData.tool_id,
        person_id: formData.assignment_type === 'person' ? formData.person_id : null,
        location_id: formData.assignment_type === 'location' ? formData.location_id : (formData.assignment_type === 'user' ? formData.location_id : null),
        assigned_to: formData.assignment_type === 'user' ? formData.user_id : null,
        notes: formData.notes || null,
        return_status: 'active',
      };

      const { error: assignmentError } = await supabase
        .from('tool_assignments')
        .insert([assignmentData]);

      if (assignmentError) throw assignmentError;

      const { error: toolError } = await supabase
        .from('tools')
        .update({ status: 'in_use' })
        .eq('id', formData.tool_id);

      if (toolError) throw toolError;

      await supabase.from('tool_event_log').insert([{
        tool_id: formData.tool_id,
        event_type: 'assigned',
        from_location_id: tool?.location_id || null,
        to_location_id: assignmentData.location_id,
        to_person_id: assignmentData.person_id,
        old_status: tool?.status || null,
        new_status: 'in_use',
        notes: formData.notes || 'Tool assigned',
        user_id: user?.id || null
      }]);

      onClose();
    } catch (error) {
      console.error('Error creating assignment:', error);
      alert('Error creating assignment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">New Assignment</h3>
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
              Tool *
            </label>
            <select
              required
              value={formData.tool_id}
              onChange={(e) => setFormData({ ...formData, tool_id: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Select a tool</option>
              {tools.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.name}
                </option>
              ))}
            </select>
            {tools.length === 0 && (
              <p className="mt-1 text-sm text-orange-600">
                No available tools. All tools are currently assigned.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to *
            </label>
            <div className="flex space-x-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={formData.assignment_type === 'person'}
                  onChange={() =>
                    setFormData({ ...formData, assignment_type: 'person', location_id: '', user_id: '' })
                  }
                  className="mr-2"
                />
                <span>Person</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={formData.assignment_type === 'user'}
                  onChange={() =>
                    setFormData({ ...formData, assignment_type: 'user', person_id: '' })
                  }
                  className="mr-2"
                />
                <span>User</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={formData.assignment_type === 'location'}
                  onChange={() =>
                    setFormData({ ...formData, assignment_type: 'location', person_id: '', user_id: '' })
                  }
                  className="mr-2"
                />
                <span>Location</span>
              </label>
            </div>

            {formData.assignment_type === 'person' ? (
              <select
                required
                value={formData.person_id}
                onChange={(e) => setFormData({ ...formData, person_id: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select a person</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            ) : formData.assignment_type === 'user' ? (
              <>
                <select
                  required
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 mb-3"
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={formData.location_id}
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Select location for assignment</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <select
                required
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Select a location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Optional notes about this assignment"
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
              disabled={saving || tools.length === 0}
              className="px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
