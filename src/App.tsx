import { useState } from 'react';
import AuthForm from './components/AuthForm';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import Dashboard from './components/Dashboard';
import ToolsManager from './components/ToolsManager';
import PeopleManager from './components/PeopleManager';
import LocationsManager from './components/LocationsManager';
import AssignmentsManager from './components/AssignmentsManager';
import ToolRequestsManager from './components/ToolRequestsManager';
import EventLog from './components/EventLog';
import UserManagement from './components/UserManagement';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import { Clock, HardHat, Menu, X, LogOut, Bell, Languages, Package, Users, MapPin, ClipboardList, FileText, History, Settings } from 'lucide-react';

type View = 'dashboard' | 'tools' | 'people' | 'locations' | 'assignments' | 'requests' | 'events' | 'users';
type AppMode = 'tool-inventory' | 'time-tracking';

function App() {
  const { user, profile, loading, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [appMode, setAppMode] = useState<AppMode>('tool-inventory');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(prev => prev + 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthForm />;
  }

  // Time Tracking App
  if (appMode === 'time-tracking') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setAppMode('tool-inventory')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all border-2 border-gray-200 hover:border-amber-400"
          >
            <HardHat className="w-5 h-5 text-gray-700" />
            <span className="text-sm font-medium text-gray-700">Switch to Tool Inventory</span>
          </button>
        </div>
        {profile.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />}
      </div>
    );
  }

  // Tool Inventory App
  const isAdmin = profile.role === 'admin';

  const navItems = [
    { id: 'dashboard' as View, label: t('nav.dashboard'), icon: Package, badge: 0 },
    ...(isAdmin ? [
      { id: 'tools' as View, label: t('nav.tools'), icon: Package, badge: 0 },
      { id: 'people' as View, label: t('nav.people'), icon: Users, badge: 0 },
      { id: 'locations' as View, label: t('nav.locations'), icon: MapPin, badge: 0 },
      { id: 'assignments' as View, label: t('nav.assignments'), icon: ClipboardList, badge: 0 },
      { id: 'requests' as View, label: t('nav.requests'), icon: Bell, badge: 0 },
      { id: 'events' as View, label: t('nav.events'), icon: History, badge: 0 },
      { id: 'users' as View, label: t('nav.users'), icon: Settings, badge: 0 },
    ] : [
      { id: 'requests' as View, label: t('nav.requests'), icon: Bell, badge: 0 },
    ]),
  ];

  return (
    <div className="min-h-screen bg-stone-100">
      <nav className="bg-gray-900 shadow-lg sticky top-0 z-30">
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-800 active:bg-gray-700 transition-colors text-gray-300 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-400 rounded-lg flex items-center justify-center">
                <HardHat className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
              </div>
              <h1 className="text-base sm:text-xl font-bold text-white truncate">
                <span className="hidden sm:inline">Tool Inventory Tracker</span>
                <span className="sm:hidden">Tool Tracker</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setAppMode('time-tracking')}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Time Tracking</span>
              </button>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold bg-amber-400 text-gray-900 rounded">
                    Admin
                  </span>
                )}
                <span className="text-xs sm:text-sm text-gray-400 truncate max-w-[120px] sm:max-w-none">{user.email}</span>
              </div>
              <button
                onClick={() => setLanguage(language === 'en' ? 'et' : 'en')}
                className="flex items-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 active:bg-gray-700 rounded-lg transition-colors touch-manipulation min-h-[44px]"
                title={language === 'en' ? 'Switch to Estonian' : 'Vaheta inglise keelele'}
              >
                <Languages className="w-4 h-4" />
                <span className="font-semibold">{language.toUpperCase()}</span>
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 active:bg-gray-700 rounded-lg transition-colors touch-manipulation min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t('nav.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 lg:py-6">
        <div className="flex gap-4 lg:gap-6">
          <aside className={`
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            fixed lg:relative
            inset-y-0 left-0
            z-20
            w-64 lg:w-64
            bg-gray-900 lg:bg-transparent
            shadow-lg lg:shadow-none
            transition-transform duration-300 ease-in-out
            lg:flex-shrink-0
            pt-16 lg:pt-0
            px-4 lg:px-0
          `}>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 min-h-[48px] text-sm font-medium rounded-lg transition-all touch-manipulation select-none ${
                      isActive
                        ? 'bg-amber-500 text-gray-900 lg:bg-amber-50 lg:text-amber-700'
                        : 'text-gray-300 lg:text-gray-700 hover:bg-gray-800 lg:hover:bg-stone-200 active:bg-gray-700 lg:active:bg-stone-300 active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        isActive
                          ? 'bg-gray-900 text-amber-400 lg:bg-amber-600 lg:text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {mobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-3 sm:p-4 lg:p-6">
              {currentView === 'dashboard' && <Dashboard key={refreshKey} onNavigate={setCurrentView} isAdmin={isAdmin} />}
              {currentView === 'tools' && <ToolsManager onUpdate={refresh} isAdmin={isAdmin} onBack={() => setCurrentView('dashboard')} />}
              {currentView === 'people' && <PeopleManager onUpdate={refresh} onBack={() => setCurrentView('dashboard')} />}
              {currentView === 'locations' && <LocationsManager onUpdate={refresh} isAdmin={isAdmin} onBack={() => setCurrentView('dashboard')} />}
              {currentView === 'assignments' && <AssignmentsManager onUpdate={refresh} isAdmin={isAdmin} onBack={() => setCurrentView('dashboard')} />}
              {currentView === 'requests' && <ToolRequestsManager onUpdate={refresh} onBack={() => setCurrentView('dashboard')} />}
              {currentView === 'events' && <EventLog onBack={() => setCurrentView('dashboard')} />}
              {currentView === 'users' && <UserManagement onBack={() => setCurrentView('dashboard')} />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;