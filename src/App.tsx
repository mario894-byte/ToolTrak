import AuthForm from './components/AuthForm';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { useAuth } from './contexts/AuthContext';
import { Clock } from 'lucide-react';

function App() {
  const { user, profile, loading } = useAuth();

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

  return profile.role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />;
}

export default App;
