import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, MapPin, Clock, LogOut, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  is_active: boolean;
}

interface Employee {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  assignedSites: string[];
}

interface TimeEntry {
  id: string;
  user: { full_name: string; email: string };
  site: { name: string };
  clock_in_time: string;
  clock_out_time?: string;
  total_hours?: number;
}

export const AdminDashboard: React.FC = () => {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'sites' | 'employees' | 'reports'>('sites');
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSite, setEditingSite] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [newSite, setNewSite] = useState(false);
  const [newEmployee, setNewEmployee] = useState(false);

  const [siteForm, setSiteForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    geofence_radius: '100',
  });

  const [employeeForm, setEmployeeForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'sites') {
      await loadSites();
    } else if (activeTab === 'employees') {
      await loadEmployees();
    } else if (activeTab === 'reports') {
      await loadTimeEntries();
    }
    setLoading(false);
  };

  const loadSites = async () => {
    const { data, error } = await supabase
      .from('tt_sites')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading sites:', error);
    } else {
      setSites(data || []);
    }
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        is_active,
        tt_user_sites (site_id)
      `)
      .eq('organization_id', profile?.organization_id)
      .eq('role', 'employee');

    if (error) {
      console.error('Error loading employees:', error);
    } else {
      const formatted = data?.map(emp => ({
        ...emp,
        assignedSites: emp.tt_user_sites?.map((us: any) => us.site_id) || [],
      })) || [];
      setEmployees(formatted);
    }
  };

  const loadTimeEntries = async () => {
    const { data, error } = await supabase
      .from('tt_time_entries')
      .select(`
        id,
        clock_in_time,
        clock_out_time,
        total_hours,
        user:users!tt_time_entries_user_id_fkey (full_name, email),
        site:tt_sites!tt_time_entries_site_id_fkey (name)
      `)
      .order('clock_in_time', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading time entries:', error);
    } else {
      setTimeEntries(data as any || []);
    }
  };

  const handleCreateSite = async () => {
    const { error } = await supabase
      .from('tt_sites')
      .insert({
        organization_id: profile?.organization_id,
        name: siteForm.name,
        address: siteForm.address,
        latitude: parseFloat(siteForm.latitude),
        longitude: parseFloat(siteForm.longitude),
        geofence_radius: parseInt(siteForm.geofence_radius),
      });

    if (error) {
      alert('Error creating site: ' + error.message);
    } else {
      setNewSite(false);
      setSiteForm({ name: '', address: '', latitude: '', longitude: '', geofence_radius: '100' });
      loadSites();
    }
  };

  const handleUpdateSite = async (id: string) => {
    const site = sites.find(s => s.id === id);
    if (!site) return;

    const { error } = await supabase
      .from('tt_sites')
      .update({
        name: site.name,
        address: site.address,
        latitude: site.latitude,
        longitude: site.longitude,
        geofence_radius: site.geofence_radius,
      })
      .eq('id', id);

    if (error) {
      alert('Error updating site: ' + error.message);
    } else {
      setEditingSite(null);
      loadSites();
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm('Are you sure you want to delete this site?')) return;

    const { error } = await supabase
      .from('tt_sites')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting site: ' + error.message);
    } else {
      loadSites();
    }
  };

  const handleCreateEmployee = async () => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: employeeForm.email,
      password: employeeForm.password,
    });

    if (authError) {
      alert('Error creating employee: ' + authError.message);
      return;
    }

    if (!authData.user) {
      alert('Failed to create employee');
      return;
    }

    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: employeeForm.email,
        full_name: employeeForm.full_name,
        phone: employeeForm.phone,
        role: 'employee',
        organization_id: profile?.organization_id,
      });

    if (profileError) {
      alert('Error creating employee profile: ' + profileError.message);
    } else {
      setNewEmployee(false);
      setEmployeeForm({ email: '', full_name: '', phone: '', password: '' });
      loadEmployees();
    }
  };

  const handleToggleEmployeeActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('users')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('Error updating employee: ' + error.message);
    } else {
      loadEmployees();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TimeTracker Admin</h1>
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
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('sites')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'sites'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MapPin className="w-5 h-5" />
            Sites
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'employees'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Employees
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-5 h-5" />
            Time Reports
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'sites' && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Manage Sites</h2>
                  <button
                    onClick={() => setNewSite(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Site
                  </button>
                </div>
                <div className="p-6">
                  {newSite && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-4">New Site</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Site Name"
                          value={siteForm.name}
                          onChange={e => setSiteForm({ ...siteForm, name: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Address"
                          value={siteForm.address}
                          onChange={e => setSiteForm({ ...siteForm, address: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Latitude"
                          value={siteForm.latitude}
                          onChange={e => setSiteForm({ ...siteForm, latitude: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Longitude"
                          value={siteForm.longitude}
                          onChange={e => setSiteForm({ ...siteForm, longitude: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          placeholder="Geofence Radius (meters)"
                          value={siteForm.geofence_radius}
                          onChange={e => setSiteForm({ ...siteForm, geofence_radius: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={handleCreateSite}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={() => setNewSite(false)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {sites.map(site => (
                      <div key={site.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                        {editingSite === site.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={site.name}
                              onChange={e => setSites(sites.map(s => s.id === site.id ? { ...s, name: e.target.value } : s))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <input
                              type="text"
                              value={site.address}
                              onChange={e => setSites(sites.map(s => s.id === site.id ? { ...s, address: e.target.value } : s))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="number"
                                step="any"
                                value={site.latitude}
                                onChange={e => setSites(sites.map(s => s.id === site.id ? { ...s, latitude: parseFloat(e.target.value) } : s))}
                                className="px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <input
                                type="number"
                                step="any"
                                value={site.longitude}
                                onChange={e => setSites(sites.map(s => s.id === site.id ? { ...s, longitude: parseFloat(e.target.value) } : s))}
                                className="px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <input
                                type="number"
                                value={site.geofence_radius}
                                onChange={e => setSites(sites.map(s => s.id === site.id ? { ...s, geofence_radius: parseInt(e.target.value) } : s))}
                                className="px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateSite(site.id)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                              >
                                <Save className="w-4 h-4" />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingSite(null)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900">{site.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{site.address}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {site.latitude}, {site.longitude} • Radius: {site.geofence_radius}m
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingSite(site.id)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSite(site.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'employees' && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Manage Employees</h2>
                  <button
                    onClick={() => setNewEmployee(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Employee
                  </button>
                </div>
                <div className="p-6">
                  {newEmployee && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="font-semibold text-gray-900 mb-4">New Employee</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="email"
                          placeholder="Email"
                          value={employeeForm.email}
                          onChange={e => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={employeeForm.full_name}
                          onChange={e => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="tel"
                          placeholder="Phone (optional)"
                          value={employeeForm.phone}
                          onChange={e => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="password"
                          placeholder="Password"
                          value={employeeForm.password}
                          onChange={e => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={handleCreateEmployee}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={() => setNewEmployee(false)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {employees.map(emp => (
                      <div key={emp.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{emp.full_name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{emp.email}</p>
                            {emp.phone && <p className="text-xs text-gray-500 mt-1">{emp.phone}</p>}
                            <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${
                              emp.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {emp.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleToggleEmployeeActive(emp.id, emp.is_active)}
                            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            {emp.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Time Reports</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clock Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {timeEntries.map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{entry.user.full_name}</div>
                            <div className="text-xs text-gray-500">{entry.user.email}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{entry.site.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(entry.clock_in_time).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {entry.clock_out_time ? new Date(entry.clock_out_time).toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {entry.total_hours ? entry.total_hours.toFixed(2) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};