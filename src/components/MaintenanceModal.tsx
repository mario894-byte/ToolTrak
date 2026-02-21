import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Wrench, MapPin, CheckCircle } from 'lucide-react';

type MaintenanceTool = {
  id: string;
  name: string;
  description: string | null;
  location_id: string | null;
  locations: { name: string } | null;
};

type MaintenanceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
};

export default function MaintenanceModal({ isOpen, onClose, onUpdate }: MaintenanceModalProps) {
  const { t } = useLanguage();
  const [tools, setTools] = useState<MaintenanceTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMaintenanceTools();
    }
  }, [isOpen]);

  async function loadMaintenanceTools() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tools')
        .select(`
          id,
          name,
          description,
          location_id,
          locations(name)
        `)
        .eq('status', 'maintenance')
        .order('name');

      if (error) throw error;
      setTools(data || []);
    } catch (error) {
      console.error('Error loading maintenance tools:', error);
    } finally {
      setLoading(false);
    }
  }

  async function returnToService(toolId: string) {
    setReturning(toolId);
    try {
      const { error } = await supabase
        .from('tools')
        .update({ status: 'available' })
        .eq('id', toolId);

      if (error) throw error;

      await loadMaintenanceTools();
      onUpdate();
    } catch (error) {
      console.error('Error returning tool to service:', error);
      alert('Failed to return tool to service');
    } finally {
      setReturning(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('maintenance.title')}</h2>
              <p className="text-sm text-gray-500">{t('maintenance.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">{t('common.loading')}</p>
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-lg border border-stone-200">
              <Wrench className="w-16 h-16 text-stone-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">{t('maintenance.noTools')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('maintenance.noToolsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="bg-stone-50 border border-stone-200 rounded-lg p-4 hover:bg-stone-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Wrench className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">{tool.name}</h3>
                          {tool.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{tool.description}</p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>
                              {tool.locations?.name || t('maintenance.noLocation')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => returnToService(tool.id)}
                      disabled={returning === tool.id}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {returning === tool.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{t('maintenance.returning')}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>{t('maintenance.returnToService')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
