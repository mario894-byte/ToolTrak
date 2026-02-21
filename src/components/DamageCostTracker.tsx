import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { AlertTriangle, User, MapPin, DollarSign } from 'lucide-react';

type DamageCostByPerson = {
  person_id: string;
  person_name: string;
  total_cost: number;
  tool_count: number;
};

type DamageCostByLocation = {
  location_id: string;
  location_name: string;
  total_cost: number;
  tool_count: number;
};

export default function DamageCostTracker() {
  const { t } = useLanguage();
  const [costsByPerson, setCostsByPerson] = useState<DamageCostByPerson[]>([]);
  const [costsByLocation, setCostsByLocation] = useState<DamageCostByLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'person' | 'location'>('person');

  useEffect(() => {
    loadDamageCosts();
  }, []);

  async function loadDamageCosts() {
    setLoading(true);
    try {
      // Get all lost or damaged tools with their assignments
      const { data: damagedTools, error: toolsError } = await supabase
        .from('tools')
        .select('id, purchase_price, status')
        .in('status', ['damaged', 'lost']);

      if (toolsError) throw toolsError;

      if (!damagedTools || damagedTools.length === 0) {
        setCostsByPerson([]);
        setCostsByLocation([]);
        setLoading(false);
        return;
      }

      // Get the most recent assignment for each damaged/lost tool
      const toolIds = damagedTools.map(t => t.id);
      const { data: assignments, error: assignmentsError } = await supabase
        .from('tool_assignments')
        .select(`
          tool_id,
          person_id,
          location_id,
          assigned_at,
          people(name),
          locations(name)
        `)
        .in('tool_id', toolIds)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Group by person
      const personMap = new Map<string, { name: string; total: number; count: number }>();
      const locationMap = new Map<string, { name: string; total: number; count: number }>();

      damagedTools.forEach(tool => {
        const price = tool.purchase_price || 0;

        // Find the most recent assignment for this tool
        const assignment = assignments?.find(a => a.tool_id === tool.id);

        if (assignment) {
          // Group by person
          if (assignment.person_id && assignment.people) {
            const existing = personMap.get(assignment.person_id);
            if (existing) {
              existing.total += price;
              existing.count += 1;
            } else {
              personMap.set(assignment.person_id, {
                name: assignment.people.name,
                total: price,
                count: 1,
              });
            }
          }

          // Group by location
          if (assignment.location_id && assignment.locations) {
            const existing = locationMap.get(assignment.location_id);
            if (existing) {
              existing.total += price;
              existing.count += 1;
            } else {
              locationMap.set(assignment.location_id, {
                name: assignment.locations.name,
                total: price,
                count: 1,
              });
            }
          }
        }
      });

      // Convert maps to arrays
      const personCosts: DamageCostByPerson[] = Array.from(personMap.entries()).map(
        ([person_id, data]) => ({
          person_id,
          person_name: data.name,
          total_cost: data.total,
          tool_count: data.count,
        })
      ).sort((a, b) => b.total_cost - a.total_cost);

      const locationCosts: DamageCostByLocation[] = Array.from(locationMap.entries()).map(
        ([location_id, data]) => ({
          location_id,
          location_name: data.name,
          total_cost: data.total,
          tool_count: data.count,
        })
      ).sort((a, b) => b.total_cost - a.total_cost);

      setCostsByPerson(personCosts);
      setCostsByLocation(locationCosts);
    } catch (error) {
      console.error('Error loading damage costs:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-stone-200 p-6">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const hasData = costsByPerson.length > 0 || costsByLocation.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white rounded-lg border border-stone-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('damageCost.title')}</h3>
            <p className="text-sm text-gray-500">{t('damageCost.subtitle')}</p>
          </div>
        </div>
        <div className="text-center py-8 bg-emerald-50 rounded-lg border border-emerald-200">
          <p className="text-emerald-700 font-medium">{t('damageCost.noDamage')}</p>
          <p className="text-sm text-emerald-600 mt-1">{t('damageCost.noDamageDesc')}</p>
        </div>
      </div>
    );
  }

  const currentData = viewMode === 'person' ? costsByPerson : costsByLocation;

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('damageCost.title')}</h3>
            <p className="text-sm text-gray-500">{t('damageCost.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('person')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'person'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-stone-100 text-gray-600 hover:bg-stone-200'
            }`}
          >
            <User className="w-4 h-4 inline mr-1" />
            {t('damageCost.byUser')}
          </button>
          <button
            onClick={() => setViewMode('location')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'location'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-stone-100 text-gray-600 hover:bg-stone-200'
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-1" />
            {t('damageCost.byLocation')}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {currentData.map((item) => (
          <div
            key={viewMode === 'person' ? (item as DamageCostByPerson).person_id : (item as DamageCostByLocation).location_id}
            className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {viewMode === 'person' ? (
                  <User className="w-4 h-4 text-orange-600" />
                ) : (
                  <MapPin className="w-4 h-4 text-orange-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {viewMode === 'person'
                    ? (item as DamageCostByPerson).person_name
                    : (item as DamageCostByLocation).location_name}
                </div>
                <div className="text-sm text-gray-500">
                  {item.tool_count} {item.tool_count === 1 ? 'tool' : 'tools'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 font-semibold text-orange-700">
              <DollarSign className="w-5 h-5" />
              <span className="text-lg">{item.total_cost.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
