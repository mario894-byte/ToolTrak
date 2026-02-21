import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, MapPin, Trash2, Plus, X, ArrowLeft } from 'lucide-react';

type Person = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  created_at: string;
  is_admin: boolean;
};

type Location = {
  id: string;
  name: string;
  description: string | null;
};

type UserLocation = {
  id: string;
  person_id: string;
  location_id: string;
  location?: Location;
};

export default function UserManagement({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const [people, setPeople] = useState<Person[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [peopleResult, locationsResult, userLocationsResult, allowedEmailsResult] = await Promise.all([
        supabase.from('people').select('*').order('name'),
        supabase.from('locations').select('*').order('name'),
        supabase.from('user_locations').select('*, location:locations(*)'),
        supabase.from('allowed_emails').select('*')
      ]);

      if (locationsResult.data) {
        setLocations(locationsResult.data);
      }

      if (userLocationsResult.data) {
        setUserLocations(userLocationsResult.data);
      }

      if (peopleResult.data && allowedEmailsResult.data) {
        const allPeople = peopleResult.data.map(person => {
          const allowedEmail = allowedEmailsResult.data.find(
            ae => ae.email === person.email?.toLowerCase()
          );
          return {
            ...person,
            is_admin: allowedEmail?.is_admin || false
          };
        });
        setPeople(allPeople);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getPersonLocations(personId: string): UserLocation[] {
    return userLocations.filter(ul => ul.person_id === personId);
  }

  async function openPersonModal(person: Person) {
    setSelectedPerson(person);
    const assignedLocationIds = getPersonLocations(person.id).map(ul => ul.location_id);
    const available = locations.filter(loc => !assignedLocationIds.includes(loc.id)).map(loc => loc.id);
    setAvailableLocations(available);
  }

  function closePersonModal() {
    setSelectedPerson(null);
    setAvailableLocations([]);
  }

  async function assignLocation(locationId: string) {
    if (!selectedPerson) return;

    try {
      const { error } = await supabase
        .from('user_locations')
        .insert({
          person_id: selectedPerson.id,
          location_id: locationId
        });

      if (error) throw error;

      await loadData();
      const assignedLocationIds = [...getPersonLocations(selectedPerson.id).map(ul => ul.location_id), locationId];
      const available = locations.filter(loc => !assignedLocationIds.includes(loc.id)).map(loc => loc.id);
      setAvailableLocations(available);
    } catch (error: any) {
      console.error('Error assigning location:', error);
      alert(error.message || 'Failed to assign location');
    }
  }

  async function removeLocation(userLocationId: string) {
    if (!selectedPerson) return;

    try {
      const { error } = await supabase
        .from('user_locations')
        .delete()
        .eq('id', userLocationId);

      if (error) throw error;

      await loadData();
      const assignedLocationIds = getPersonLocations(selectedPerson.id).map(ul => ul.location_id);
      const available = locations.filter(loc => !assignedLocationIds.includes(loc.id)).map(loc => loc.id);
      setAvailableLocations(available);
    } catch (error: any) {
      console.error('Error removing location:', error);
      alert(error.message || 'Failed to remove location');
    }
  }

  async function toggleAdminStatus(person: Person) {
    if (!person.email) return;

    try {
      const { error } = await supabase
        .from('allowed_emails')
        .upsert({
          email: person.email.toLowerCase(),
          is_admin: !person.is_admin
        }, { onConflict: 'email' });

      if (error) throw error;

      await loadData();
    } catch (error: any) {
      console.error('Error updating admin status:', error);
      alert(error.message || 'Failed to update admin status');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Users className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500">Manage users and assign them to locations</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-stone-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Locations
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {people.map((person) => {
                const personLocs = getPersonLocations(person.id);
                return (
                  <tr key={person.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">{person.name}</div>
                        {person.user_id ? (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Registered</span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">Not registered</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{person.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleAdminStatus(person)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          person.is_admin
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {person.is_admin ? 'Admin' : 'User'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {personLocs.length === 0 ? (
                          <span className="text-sm text-gray-400">No locations assigned</span>
                        ) : (
                          personLocs.map((ul) => (
                            <span
                              key={ul.id}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                            >
                              {ul.location?.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openPersonModal(person)}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Manage Locations
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPerson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Manage Locations</h3>
                  <p className="text-sm text-gray-500">{selectedPerson.name} ({selectedPerson.email})</p>
                </div>
              </div>
              <button
                onClick={closePersonModal}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Assigned Locations</h4>
                <div className="space-y-2">
                  {getPersonLocations(selectedPerson.id).length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">
                      No locations assigned yet
                    </p>
                  ) : (
                    getPersonLocations(selectedPerson.id).map((ul) => (
                      <div
                        key={ul.id}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-900">{ul.location?.name}</span>
                          {ul.location?.description && (
                            <span className="text-sm text-blue-700">- {ul.location.description}</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeLocation(ul.id)}
                          className="p-1 hover:bg-blue-200 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {availableLocations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Location</h4>
                  <div className="space-y-2">
                    {locations
                      .filter((loc) => availableLocations.includes(loc.id))
                      .map((location) => (
                        <button
                          key={location.id}
                          onClick={() => assignLocation(location.id)}
                          className="w-full flex items-center justify-between p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">{location.name}</span>
                            {location.description && (
                              <span className="text-sm text-gray-600">- {location.description}</span>
                            )}
                          </div>
                          <Plus className="w-4 h-4 text-blue-600" />
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-stone-200 flex justify-end">
              <button
                onClick={closePersonModal}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
