import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import MaintenanceModal from './MaintenanceModal';
import InviteUserModal from './InviteUserModal';
import DamageCostTracker from './DamageCostTracker';
import { Package, Users, MapPin, AlertCircle, UserPlus, RotateCcw } from 'lucide-react';

type Tool = {
  id: string;
  name: string;
  status: string;
  serial_number: string | null;
};

type MyTool = {
  id: string;
  name: string;
  description: string | null;
  serial_number: string | null;
  status: string;
};

type Assignment = {
  id: string;
  tool_id: string;
  person_id: string | null;
  location_id: string | null;
  assigned_at: string;
  tools: { name: string } | null;
  people: { name: string } | null;
  locations: { name: string } | null;
};

type View = 'dashboard' | 'tools' | 'people' | 'locations' | 'assignments' | 'requests' | 'users';

export default function Dashboard({ onNavigate, isAdmin }: { onNavigate: (view: View) => void; isAdmin: boolean }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTools: 0,
    available: 0,
    inUse: 0,
    maintenance: 0,
    damaged: 0,
    lost: 0,
    totalPeople: 0,
    totalLocations: 0,
  });
  const [recentAssignments, setRecentAssignments] = useState<Assignment[]>([]);
  const [myTools, setMyTools] = useState<MyTool[]>([]);
  const [returningToolId, setReturningToolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const [toolsResult, peopleResult, locationsResult, assignmentsResult] = await Promise.all([
        supabase.from('tools').select('id, status'),
        supabase.from('people').select('id'),
        supabase.from('locations').select('id'),
        supabase
          .from('tool_assignments')
          .select(`
            id,
            tool_id,
            person_id,
            location_id,
            assigned_at,
            tools!inner(name),
            people(name),
            locations:locations!tool_assignments_location_id_fkey(name)
          `)
          .is('returned_at', null)
          .order('assigned_at', { ascending: false })
          .limit(5),
      ]);

      if (toolsResult.data) {
        const tools = toolsResult.data;
        setStats({
          totalTools: tools.length,
          available: tools.filter((t) => t.status === 'available').length,
          inUse: tools.filter((t) => t.status === 'in_use').length,
          maintenance: tools.filter((t) => t.status === 'maintenance').length,
          damaged: tools.filter((t) => t.status === 'damaged').length,
          lost: tools.filter((t) => t.status === 'lost').length,
          totalPeople: peopleResult.data?.length || 0,
          totalLocations: locationsResult.data?.length || 0,
        });
      }

      if (assignmentsResult.data) {
        setRecentAssignments(assignmentsResult.data as Assignment[]);
      }

      if (user) {
        const { data: personData } = await supabase
          .from('people')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (personData) {
          const { data: userTools } = await supabase
            .from('tools')
            .select('id, name, description, serial_number, status')
            .eq('person_id', personData.id)
            .order('name');

          setMyTools(userTools || []);
        } else {
          setMyTools([]);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReturnTool(toolId: string) {
    if (!confirm('Return this tool?')) return;

    setReturningToolId(toolId);
    try {
      const { error } = await supabase
        .from('tools')
        .update({ person_id: null, status: 'available' })
        .eq('id', toolId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error returning tool:', error);
      alert('Failed to return tool');
    } finally {
      setReturningToolId(null);
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('dashboard.title')}</h2>
          <p className="text-gray-500">Overview of your tool inventory</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            <span>{t('invite.inviteUser')}</span>
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        <StatCard
          icon={Package}
          label={t('dashboard.totalTools')}
          value={stats.totalTools}
          bgColor="bg-amber-50"
          iconColor="text-amber-500"
          borderColor="border-amber-200"
          onClick={() => onNavigate('tools')}
        />
        <StatCard
          icon={Users}
          label={t('dashboard.totalPeople')}
          value={stats.totalPeople}
          bgColor="bg-emerald-50"
          iconColor="text-emerald-500"
          borderColor="border-emerald-200"
          onClick={() => onNavigate('people')}
        />
        {isAdmin && (
          <StatCard
            icon={MapPin}
            label={t('dashboard.totalLocations')}
            value={stats.totalLocations}
            bgColor="bg-sky-50"
            iconColor="text-sky-500"
            borderColor="border-sky-200"
            onClick={() => onNavigate('locations')}
          />
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => onNavigate('tools')}
          className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 text-left hover:bg-emerald-100 active:bg-emerald-200 active:scale-[0.97] transition-all cursor-pointer touch-manipulation select-none min-h-[56px]"
        >
          <div className="text-sm font-medium text-emerald-800 mb-1">{t('dashboard.available')}</div>
          <div className="text-2xl font-bold text-emerald-900">{stats.available}</div>
        </button>
        <button
          onClick={() => onNavigate('assignments')}
          className="bg-amber-50 rounded-lg p-4 border border-amber-200 text-left hover:bg-amber-100 active:bg-amber-200 active:scale-[0.97] transition-all cursor-pointer touch-manipulation select-none min-h-[56px]"
        >
          <div className="text-sm font-medium text-amber-800 mb-1">{t('dashboard.inUse')}</div>
          <div className="text-2xl font-bold text-amber-900">{stats.inUse}</div>
        </button>
        <button
          onClick={() => setMaintenanceModalOpen(true)}
          className="bg-orange-50 rounded-lg p-4 border border-orange-200 text-left hover:bg-orange-100 active:bg-orange-200 active:scale-[0.97] transition-all cursor-pointer touch-manipulation select-none min-h-[56px]"
        >
          <div className="text-sm font-medium text-orange-800 mb-1">{t('dashboard.maintenance')}</div>
          <div className="text-2xl font-bold text-orange-900">{stats.maintenance}</div>
        </button>
        <button
          onClick={() => onNavigate('tools')}
          className="bg-orange-50 rounded-lg p-4 border border-orange-200 text-left hover:bg-orange-100 active:bg-orange-200 active:scale-[0.97] transition-all cursor-pointer touch-manipulation select-none min-h-[56px]"
        >
          <div className="text-sm font-medium text-orange-800 mb-1">{t('tools.damaged')}</div>
          <div className="text-2xl font-bold text-orange-900">{stats.damaged}</div>
        </button>
        <button
          onClick={() => onNavigate('tools')}
          className="bg-red-50 rounded-lg p-4 border border-red-200 text-left hover:bg-red-100 active:bg-red-200 active:scale-[0.97] transition-all cursor-pointer touch-manipulation select-none min-h-[56px]"
        >
          <div className="text-sm font-medium text-red-800 mb-1">{t('tools.lost')}</div>
          <div className="text-2xl font-bold text-red-900">{stats.lost}</div>
        </button>
      </div>

      {myTools.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            My Tools
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-sm rounded-full">
              {myTools.length}
            </span>
          </h3>
          <div className="space-y-2">
            {myTools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{tool.name}</div>
                  {tool.description && (
                    <div className="text-sm text-gray-600 mt-0.5">{tool.description}</div>
                  )}
                  {tool.serial_number && (
                    <div className="text-xs text-gray-500 mt-1">S/N: {tool.serial_number}</div>
                  )}
                </div>
                <button
                  onClick={() => handleReturnTool(tool.id)}
                  disabled={returningToolId === tool.id}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 text-amber-700 font-medium rounded-lg hover:bg-amber-100 active:bg-amber-200 transition-colors disabled:opacity-50 ml-4"
                >
                  <RotateCcw className={`w-4 h-4 ${returningToolId === tool.id ? 'animate-spin' : ''}`} />
                  <span>{returningToolId === tool.id ? 'Returning...' : 'Return'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <button
          onClick={() => onNavigate('assignments')}
          className="text-lg font-semibold text-gray-900 mb-4 hover:text-amber-600 transition-colors flex items-center gap-2 group touch-manipulation min-h-[44px]"
        >
          {t('dashboard.activeAssignments')}
          <span className="text-sm font-normal text-gray-400 group-hover:text-amber-500">View all &rarr;</span>
        </button>
        {recentAssignments.length === 0 ? (
          <div className="text-center py-8 bg-stone-50 rounded-lg border border-stone-200">
            <AlertCircle className="w-12 h-12 text-stone-400 mx-auto mb-2" />
            <p className="text-gray-500">{t('assignments.noActive')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {assignment.tools?.name || 'Unknown Tool'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {assignment.person_id
                      ? `${t('assignments.assignedTo')}: ${assignment.people?.name || 'Unknown'}`
                      : isAdmin
                      ? `${t('locations.title')}: ${assignment.locations?.name || 'Unknown'}`
                      : 'At location'}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(assignment.assigned_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && <DamageCostTracker />}

      <MaintenanceModal
        isOpen={maintenanceModalOpen}
        onClose={() => setMaintenanceModalOpen(false)}
        onUpdate={loadData}
      />

      <InviteUserModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  bgColor,
  iconColor,
  borderColor,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  bgColor: string;
  iconColor: string;
  borderColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${bgColor} rounded-lg p-6 border ${borderColor} w-full text-left hover:shadow-md active:scale-[0.97] active:shadow-none transition-all cursor-pointer group touch-manipulation select-none`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1 group-hover:text-gray-800">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className={`w-12 h-12 ${iconColor} group-hover:scale-110 transition-transform`} />
      </div>
    </button>
  );
}
