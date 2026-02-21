import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Mail, Phone, ChevronDown, ChevronRight, Wrench, MapPin, ArrowLeft } from 'lucide-react';

type Tool = {
  id: string;
  name: string;
  purchase_price: number | null;
  serial_number: string | null;
  status: string;
  location_name?: string | null;
};

type Person = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  toolValue?: number;
  tools?: Tool[];
};

export default function PeopleManager({ onUpdate, onBack }: { onUpdate: () => void; onBack: () => void }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    try {
      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .order('name');

      if (peopleError) throw peopleError;

      const peopleWithValues = await Promise.all(
        (peopleData || []).map(async (person) => {
          const { data: userLocations } = await supabase
            .from('user_locations')
            .select('location_id')
            .eq('person_id', person.id);

          const locationIds = (userLocations || []).map((ul: any) => ul.location_id);

          let tools: Tool[] = [];
          if (locationIds.length > 0) {
            const { data: assignmentsData } = await supabase
              .from('tool_assignments')
              .select('tool_id, tools(id, name, purchase_price, serial_number, status), locations(name)')
              .in('location_id', locationIds)
              .is('returned_at', null);

            tools = (assignmentsData || [])
              .filter((a: any) => a.tools)
              .map((a: any) => ({
                id: a.tools.id,
                name: a.tools.name,
                purchase_price: a.tools.purchase_price,
                serial_number: a.tools.serial_number,
                status: a.tools.status,
                location_name: a.locations?.name || null,
              }));
          }

          const toolValue = tools.reduce((sum: number, tool: Tool) => {
            return sum + (tool.purchase_price || 0);
          }, 0);

          return { ...person, toolValue, tools };
        })
      );

      setPeople(peopleWithValues);
    } catch (error) {
      console.error('Error loading people:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deletePerson(id: string) {
    if (!confirm('Are you sure you want to delete this person?')) return;

    try {
      const { error } = await supabase.from('people').delete().eq('id', id);
      if (error) throw error;
      await loadPeople();
      onUpdate();
    } catch (error) {
      console.error('Error deleting person:', error);
      alert('Error deleting person');
    }
  }

  function handleEdit(person: Person) {
    setEditingPerson(person);
    setShowForm(true);
  }

  function handleAdd() {
    setEditingPerson(null);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditingPerson(null);
    loadPeople();
    onUpdate();
  }

  function toggleExpanded(personId: string) {
    setExpandedPeople(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
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
            <h2 className="text-2xl font-bold text-gray-900 mb-1">People</h2>
            <p className="text-gray-600">Manage people who can possess tools</p>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Person</span>
        </button>
      </div>

      {showForm && <PersonForm person={editingPerson} onClose={handleFormClose} />}

      <div className="grid gap-4">
        {people.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No people yet. Add the first person to get started.</p>
          </div>
        ) : (
          people.map((person) => {
            const isExpanded = expandedPeople.has(person.id);
            const hasTools = person.tools && person.tools.length > 0;

            return (
              <div
                key={person.id}
                className="border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{person.name}</h3>
                      </div>
                      <div className="space-y-1 mb-2">
                        {person.email && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{person.email}</span>
                          </div>
                        )}
                        {person.phone && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{person.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Total Value:</span>
                        <span className={`px-2 py-1 text-sm font-semibold rounded ${
                          person.toolValue && person.toolValue > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}>
                          ${(person.toolValue || 0).toFixed(2)}
                        </span>
                        {hasTools && (
                          <span className="text-xs text-gray-500">
                            ({person.tools!.length} tool{person.tools!.length !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {hasTools && (
                        <button
                          onClick={() => toggleExpanded(person.id)}
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
                      <button
                        onClick={() => handleEdit(person)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePerson(person.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && hasTools && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Tools in Possession:</h4>
                    <div className="space-y-2">
                      {person.tools!.map((tool) => (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center space-x-3">
                            <Wrench className="w-4 h-4 text-amber-500" />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{tool.name}</span>
                                {tool.serial_number && (
                                  <span className="text-xs text-gray-500">S/N: {tool.serial_number}</span>
                                )}
                              </div>
                              {tool.location_name && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  {tool.location_name}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              tool.status === 'in_use' ? 'bg-amber-100 text-amber-800' :
                              tool.status === 'damaged' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {tool.status}
                            </span>
                            {tool.purchase_price !== null && (
                              <span className="text-sm font-medium text-gray-700">
                                ${tool.purchase_price.toFixed(2)}
                              </span>
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

function PersonForm({
  person,
  onClose,
}: {
  person: Person | null;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: person?.name || '',
    email: person?.email || '',
    phone: person?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
      };

      if (person) {
        const { error } = await supabase
          .from('people')
          .update(data)
          .eq('id', person.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('people').insert([data]);
        if (error) throw error;
      }
      onClose();
    } catch (error) {
      console.error('Error saving person:', error);
      alert('Error saving person');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {person ? 'Edit Person' : 'Add New Person'}
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
              Name *
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
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
              {saving ? 'Saving...' : person ? 'Update' : 'Add Person'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
